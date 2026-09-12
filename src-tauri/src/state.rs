use std::{
    path::{Path, PathBuf},
    sync::{mpsc, Arc, Mutex},
    thread,
    time::Duration,
};

use git2::{ErrorCode, Repository, Status};
use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

const REPO_CHANGED_EVENT: &str = "repo-changed";
const WATCH_DEBOUNCE: Duration = Duration::from_millis(300);

struct ActiveRepository {
    repo: Repository,
    root: PathBuf,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RepoChangedPayload {
    root: String,
}

pub struct RepositoryManager {
    active: Arc<Mutex<Option<ActiveRepository>>>,
    watcher: Mutex<Option<RecommendedWatcher>>,
    operation: Mutex<()>,
}

impl RepositoryManager {
    pub fn new(launch_dir: &Path) -> Self {
        let active = Repository::discover(launch_dir)
            .ok()
            .and_then(Self::active_repository);

        Self {
            active: Arc::new(Mutex::new(active)),
            watcher: Mutex::new(None),
            operation: Mutex::new(()),
        }
    }

    fn active_repository(repo: Repository) -> Option<ActiveRepository> {
        let root = repo.workdir()?.to_path_buf();

        Some(ActiveRepository { repo, root })
    }

    pub fn root(&self) -> Result<PathBuf, String> {
        let active = self.active.lock().map_err(lock_error)?;

        active
            .as_ref()
            .map(|active| active.root.clone())
            .ok_or_else(|| "No repository selected".to_string())
    }

    pub fn root_optional(&self) -> Option<PathBuf> {
        self.active
            .lock()
            .ok()
            .and_then(|active| active.as_ref().map(|repo| repo.root.clone()))
    }

    pub fn with_repo<T>(
        &self,
        operation: impl FnOnce(&Repository) -> Result<T, String>,
    ) -> Result<T, String> {
        let _operation_guard = self.operation.lock().map_err(lock_error)?;
        let active = self.active.lock().map_err(lock_error)?;

        let active = active
            .as_ref()
            .ok_or_else(|| "No repository selected".to_string())?;

        operation(&active.repo)
    }

    pub fn select(&self, path: &Path, app: AppHandle) -> Result<PathBuf, String> {
        let _operation_guard = self.operation.lock().map_err(lock_error)?;

        let repo = Repository::discover(path).map_err(|error| {
            format!(
                "{} is not inside a Git repository: {}",
                path.display(),
                error.message()
            )
        })?;

        let active = Self::active_repository(repo)
            .ok_or_else(|| "Bare repositories are not supported".to_string())?;

        let root = active.root.clone();

        {
            let mut current = self.active.lock().map_err(lock_error)?;
            *current = Some(active);
        }

        self.restart_watcher(app)?;

        Ok(root)
    }

    pub fn restart_watcher(&self, app: AppHandle) -> Result<(), String> {
        let paths = {
            let active = self.active.lock().map_err(lock_error)?;

            let Some(active) = active.as_ref() else {
                *self.watcher.lock().map_err(lock_error)? = None;
                return Ok(());
            };

            watch_paths(active)
        };

        let active = Arc::clone(&self.active);
        let (tx, rx) = mpsc::channel::<Vec<PathBuf>>();

        let mut watcher = notify::recommended_watcher(move |result: notify::Result<Event>| {
            if let Ok(event) = result {
                let _ = tx.send(event.paths);
            }
        })
        .map_err(|error| format!("Failed to create repository watcher: {error}"))?;

        for path in paths {
            watcher
                .watch(&path, RecursiveMode::Recursive)
                .map_err(|error| format!("Failed to watch {}: {error}", path.display()))?;
        }

        thread::spawn(move || {
            watch_worker(active, app, rx);
        });

        *self.watcher.lock().map_err(lock_error)? = Some(watcher);

        Ok(())
    }
}

fn watch_worker(
    active: Arc<Mutex<Option<ActiveRepository>>>,
    app: AppHandle,
    rx: mpsc::Receiver<Vec<PathBuf>>,
) {
    while let Ok(mut paths) = rx.recv() {
        loop {
            match rx.recv_timeout(WATCH_DEBOUNCE) {
                Ok(mut additional) => {
                    paths.append(&mut additional);
                }

                Err(mpsc::RecvTimeoutError::Timeout) => {
                    if let Some(root) = relevant_change(&active, &paths) {
                        let _ = app.emit(
                            REPO_CHANGED_EVENT,
                            RepoChangedPayload {
                                root: root.to_string_lossy().into_owned(),
                            },
                        );
                    }

                    break;
                }

                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    return;
                }
            }
        }
    }
}

fn relevant_change(
    active: &Arc<Mutex<Option<ActiveRepository>>>,
    paths: &[PathBuf],
) -> Option<PathBuf> {
    let active = active.lock().ok()?;
    let active = active.as_ref()?;

    for path in paths {
        if path.starts_with(active.repo.path()) || path.starts_with(active.repo.commondir()) {
            return Some(active.root.clone());
        }

        let Ok(relative) = path.strip_prefix(&active.root) else {
            continue;
        };

        if relative.as_os_str().is_empty() {
            return Some(active.root.clone());
        }

        match active.repo.status_file(relative) {
            Ok(status) if !status.contains(Status::IGNORED) => {
                return Some(active.root.clone());
            }

            Ok(_) => {}

            Err(error) if error.code() == ErrorCode::NotFound => {
                if !active.repo.status_should_ignore(relative).unwrap_or(false) {
                    return Some(active.root.clone());
                }
            }

            Err(_) => {
                return Some(active.root.clone());
            }
        }
    }

    None
}

fn watch_paths(active: &ActiveRepository) -> Vec<PathBuf> {
    let mut paths = vec![active.root.clone()];

    for path in [active.repo.path(), active.repo.commondir()] {
        if !paths.iter().any(|existing| path.starts_with(existing)) {
            paths.push(path.to_path_buf());
        }
    }

    paths
}

fn lock_error<T>(error: std::sync::PoisonError<T>) -> String {
    format!("Repository state lock failed: {error}")
}
