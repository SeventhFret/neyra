use std::path::{Path, PathBuf};
use std::process::{Command, Output};

use serde::Serialize;
use tauri::State;

/// How many commits `get_repo_data` reads from the log.
const LOG_LIMIT: usize = 50;

/// Fields inside one `git log` record, then records themselves. Both are
/// control characters git will never emit as part of a field.
const FIELD_SEP: char = '\x1f';
const RECORD_SEP: char = '\x1e';

/// Ends with `%B`, the raw message, rather than `%s`/`%b`: git's subject is the
/// first *paragraph*, so a message with no blank line after the header comes
/// back as one run-on subject with an empty body. We split on the first line
/// instead, which is right whether or not the blank line is there.
/// Includes `%d` to capture decorated refs (branches/tags this commit belongs to).
const LOG_FORMAT: &str = "%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%d%x1f%B%x1e";

/// `%(HEAD)` marks the checked out branch with `*`, and `%(upstream:track)`
/// gives the `[ahead 1, behind 2]` summary parsed out below.
const BRANCH_FORMAT: &str = "%(HEAD)%1f%(refname)%1f%(refname:short)%1f%(upstream:short)%1f%(upstream:track)%1f%(objectname:short)%1f%(contents:subject)%1f%(committerdate:iso-strict)%1e";

/// Directory the app was launched from, captured at startup. The tool is meant
/// to be run as a shell command from inside the repo it should operate on.
pub struct LaunchDir(pub PathBuf);

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoData {
    pub root: String,
    /// `None` when HEAD is detached.
    pub current_branch: Option<String>,
    pub status: Vec<StatusEntry>,
    /// What plain `git status` prints, for showing as-is.
    pub status_message: String,
    pub remotes: Vec<Remote>,
    /// Local branches first, then remote-tracking ones.
    pub branches: Vec<Branch>,
    pub commits: Vec<Commit>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Branch {
    /// Short name: `main` for a local branch, `origin/main` for a remote one.
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    /// Which remote a remote branch belongs to.
    pub remote: Option<String>,
    /// Upstream a local branch tracks, e.g. `origin/main`.
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    /// Upstream is configured but no longer exists on the remote.
    pub upstream_gone: bool,
    pub short_hash: String,
    pub subject: String,
    /// ISO 8601 date of the branch tip.
    pub date: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusEntry {
    /// Porcelain code for the index side, e.g. "M", "A", "?", " ".
    pub index_status: String,
    /// Porcelain code for the worktree side.
    pub worktree_status: String,
    pub path: String,
    /// Where the file came from, for renames and copies.
    pub original_path: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Remote {
    pub name: String,
    pub fetch_url: Option<String>,
    pub push_url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub hash: String,
    pub short_hash: String,
    pub author_name: String,
    pub author_email: String,
    /// ISO 8601, straight from `%aI`.
    pub date: String,
    /// Branch/ref this commit belongs to, e.g. "main", "origin/develop".
    pub ref_name: Option<String>,
    pub subject: String,
    pub body: String,
}

/// Every command below is `#[tauri::command(async)]` rather than plain
/// `#[tauri::command]`. The bodies stay synchronous — the attribute only moves
/// them off the main thread, which the webview also runs on: a plain command
/// blocks it for as long as git takes, so the frontend cannot paint and the
/// buttons' loading spinners never appear before the call is already over.
///
/// Runs git once. Arguments are passed to the process directly, so no shell is
/// involved and nothing needs quoting or escaping.
///
/// On failure both streams end up in the error: git reports some refusals on
/// stdout ("nothing added to commit"), others on stderr, and hooks write to
/// either — dropping one stream turns a clear message into a bare "failed".
fn run_git(cwd: &Path, args: &[&str]) -> Result<Output, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|err| format!("failed to run `git {}`: {err}", args.join(" ")))?;

    if !output.status.success() {
        let mut report = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output.stderr);
        if !stderr.trim().is_empty() {
            if !report.is_empty() {
                report.push('\n');
            }
            report.push_str(stderr.trim());
        }

        return Err(if report.is_empty() {
            format!("`git {}` failed", args.join(" "))
        } else {
            report
        });
    }

    Ok(output)
}

/// Returns stdout only. Use for commands whose output gets parsed, so warnings
/// on stderr cannot corrupt the parse.
fn git(cwd: &Path, args: &[&str]) -> Result<String, String> {
    let output = run_git(cwd, args)?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Returns stdout and stderr together. Use for commands whose output is shown
/// to the user — push and pull report progress on stderr.
fn git_verbose(cwd: &Path, args: &[&str]) -> Result<String, String> {
    let output = run_git(cwd, args)?;

    let mut report = String::from_utf8_lossy(&output.stdout).to_string();
    report.push_str(&String::from_utf8_lossy(&output.stderr));
    Ok(report.trim().to_string())
}

fn repo_root(cwd: &Path) -> Result<PathBuf, String> {
    let root = git(cwd, &["rev-parse", "--show-toplevel"])
        .map_err(|err| format!("{} is not inside a git repository: {err}", cwd.display()))?;
    Ok(PathBuf::from(root.trim()))
}

/// `None` means HEAD is detached — `symbolic-ref` exits non-zero in that case.
fn current_branch(root: &Path) -> Option<String> {
    git(root, &["symbolic-ref", "--quiet", "--short", "HEAD"])
        .ok()
        .map(|branch| branch.trim().to_string())
        .filter(|branch| !branch.is_empty())
}

fn status(root: &Path) -> Result<Vec<StatusEntry>, String> {
    // --untracked-files=all so the Files tree gets one entry per new file:
    // without it git collapses an untracked directory into a single `dir/` row,
    // which cannot be shown or staged file by file. Ignored files are still
    // excluded, so this walks the working tree, not everything on disk.
    let raw = git(
        root,
        &["status", "--porcelain", "-z", "--untracked-files=all"],
    )?;

    // NUL-separated records of the form "XY path". Renames and copies are
    // followed by a second record holding the original path.
    let mut fields = raw.split('\0').filter(|field| !field.is_empty());
    let mut entries = Vec::new();

    while let Some(field) = fields.next() {
        if field.len() < 4 {
            continue;
        }

        let (codes, path) = field.split_at(3);
        let index_status = codes[0..1].to_string();
        let worktree_status = codes[1..2].to_string();
        let is_move = ["R", "C"].contains(&index_status.as_str())
            || ["R", "C"].contains(&worktree_status.as_str());

        entries.push(StatusEntry {
            index_status,
            worktree_status,
            path: path.to_string(),
            original_path: if is_move {
                fields.next().map(str::to_string)
            } else {
                None
            },
        });
    }

    Ok(entries)
}

/// The human-readable `git status`. Color is forced off so the string stays
/// clean even when the user's config sets `color.status = always`.
fn status_message(root: &Path) -> Result<String, String> {
    let raw = git(root, &["-c", "color.status=never", "status"])?;
    Ok(raw.trim_end().to_string())
}

fn remotes(root: &Path) -> Result<Vec<Remote>, String> {
    let raw = git(root, &["remote", "-v"])?;
    let mut remotes: Vec<Remote> = Vec::new();

    // Two lines per remote: "name\turl (fetch)" and "name\turl (push)".
    for line in raw.lines() {
        let mut parts = line.split_whitespace();
        let (Some(name), Some(url), kind) = (parts.next(), parts.next(), parts.next()) else {
            continue;
        };

        let index = match remotes.iter().position(|remote| remote.name == name) {
            Some(index) => index,
            None => {
                remotes.push(Remote {
                    name: name.to_string(),
                    fetch_url: None,
                    push_url: None,
                });
                remotes.len() - 1
            }
        };

        if kind == Some("(push)") {
            remotes[index].push_url = Some(url.to_string());
        } else {
            remotes[index].fetch_url = Some(url.to_string());
        }
    }

    Ok(remotes)
}

/// Parses git's decorated refs format from %d: "(HEAD -> main, feature, tag: v1.0)"
/// Returns the first non-HEAD ref, or the current branch if that's all there is.
/// Examples:
///   "(HEAD -> main)" → Some("main")
///   "(HEAD -> main, feature)" → Some("feature")
///   "(feature)" → Some("feature")
///   "" → None
fn parse_decorated_refs(decorated: &str) -> Option<String> {
    // Strip outer parentheses and whitespace
    let inner = decorated.trim().trim_start_matches('(').trim_end_matches(')').trim();
    
    if inner.is_empty() {
        return None;
    }

    // Split by commas and find the best ref to display
    let refs: Vec<&str> = inner.split(',').map(|s| s.trim()).collect();
    
    // Prefer a regular branch ref over HEAD and tags
    let selected_ref = refs.iter()
        .find(|r| !r.starts_with("HEAD") && !r.starts_with("tag:"))
        .copied()
        .or_else(|| {
            // Fall back to the HEAD -> branch_name entry
            refs.iter()
                .find(|r| r.contains("HEAD ->"))
                .copied()
        })
        .or_else(|| refs.first().copied())
        .unwrap_or("");

    // Extract the actual branch name
    let cleaned = selected_ref
        .strip_prefix("HEAD -> ")
        .unwrap_or(selected_ref)
        .strip_prefix("tag: ")
        .unwrap_or_else(|| selected_ref.strip_prefix("HEAD -> ").unwrap_or(selected_ref))
        .trim();

    if cleaned.is_empty() {
        None
    } else {
        Some(cleaned.to_string())
    }
}

/// Reads `[ahead 1, behind 2]`, `[gone]`, or an empty string into counts.
fn parse_track(track: &str) -> (u32, u32, bool) {
    let inner = track.trim().trim_start_matches('[').trim_end_matches(']');

    if inner == "gone" {
        return (0, 0, true);
    }

    let mut ahead = 0;
    let mut behind = 0;
    for part in inner.split(',') {
        let part = part.trim();
        if let Some(count) = part.strip_prefix("ahead ") {
            ahead = count.trim().parse().unwrap_or(0);
        } else if let Some(count) = part.strip_prefix("behind ") {
            behind = count.trim().parse().unwrap_or(0);
        }
    }

    (ahead, behind, false)
}

fn branches(root: &Path) -> Result<Vec<Branch>, String> {
    let format_arg = format!("--format={BRANCH_FORMAT}");
    let raw = git(
        root,
        &[
            "for-each-ref",
            format_arg.as_str(),
            "refs/heads",
            "refs/remotes",
        ],
    )?;

    let mut branches = Vec::new();
    for record in raw.split(RECORD_SEP) {
        let record = record.trim_start_matches('\n');
        if record.is_empty() {
            continue;
        }

        let mut fields = record.split(FIELD_SEP);
        let mut next = || fields.next().unwrap_or_default().to_string();

        let head = next();
        let refname = next();
        let name = next();
        let upstream = next();
        let track = next();
        let short_hash = next();
        let subject = next();
        let date = next();

        // `refs/remotes/origin/HEAD` is a symbolic alias for the remote's
        // default branch, not a branch anyone checks out.
        if refname.ends_with("/HEAD") {
            continue;
        }

        let is_remote = refname.starts_with("refs/remotes/");
        let (ahead, behind, upstream_gone) = parse_track(&track);

        branches.push(Branch {
            is_current: head.trim() == "*",
            is_remote,
            remote: if is_remote {
                name.split_once('/').map(|(remote, _)| remote.to_string())
            } else {
                None
            },
            upstream: if upstream.is_empty() {
                None
            } else {
                Some(upstream)
            },
            ahead,
            behind,
            upstream_gone,
            short_hash,
            subject,
            date,
            name,
        });
    }

    // Local branches first so the UI can show them without re-sorting.
    branches.sort_by_key(|branch| branch.is_remote);
    Ok(branches)
}

fn commits(root: &Path, limit: usize) -> Result<Vec<Commit>, String> {
    // A repo without commits has no HEAD to log.
    if git(root, &["rev-parse", "--verify", "--quiet", "HEAD"]).is_err() {
        return Ok(Vec::new());
    }

    let limit_arg = format!("--max-count={limit}");
    let format_arg = format!("--format={LOG_FORMAT}");
    let raw = git(root, &["log", limit_arg.as_str(), format_arg.as_str()])?;

    let mut commits = Vec::new();
    for record in raw.split(RECORD_SEP) {
        // Records after the first are preceded by the newline git puts between them.
        let record = record.trim_start_matches('\n');
        if record.is_empty() {
            continue;
        }

        let mut fields = record.split(FIELD_SEP);
        let mut next = || fields.next().unwrap_or_default().to_string();

        let hash = next();
        let short_hash = next();
        let author_name = next();
        let author_email = next();
        let date = next();
        let decorated_refs = next();

        // First line is the header, everything after it is the body. Trimming
        // drops the blank separator line and git's trailing newline.
        let message = next();
        let mut lines = message.splitn(2, '\n');
        let subject = lines.next().unwrap_or_default().trim().to_string();
        let body = lines.next().unwrap_or_default().trim().to_string();

        // Parse decorated_refs: git's %d format gives us "(HEAD -> main, feature)" or empty string.
        // We want to extract the actual branch name, preferring non-HEAD refs.
        let ref_name = parse_decorated_refs(&decorated_refs);

        commits.push(Commit {
            hash,
            short_hash,
            author_name,
            author_email,
            date,
            ref_name,
            subject,
            body,
        });
    }

    Ok(commits)
}

#[tauri::command(async)]
pub fn get_repo_data(launch_dir: State<LaunchDir>) -> Result<RepoData, String> {
    let root = repo_root(&launch_dir.0)?;

    // Each collector spawns its own git process and none of them depend on the
    // others, so they run concurrently. Sequentially this cost the sum of every
    // scan; on a large repository the two `git status` runs dominate that sum.
    std::thread::scope(|scope| {
        let status_handle = scope.spawn(|| status(&root));
        let message_handle = scope.spawn(|| status_message(&root));
        let remotes_handle = scope.spawn(|| remotes(&root));
        let branches_handle = scope.spawn(|| branches(&root));
        let commits_handle = scope.spawn(|| commits(&root, LOG_LIMIT));
        let current_handle = scope.spawn(|| current_branch(&root));

        Ok(RepoData {
            current_branch: current_handle
                .join()
                .map_err(|_| "reading the current branch panicked".to_string())?,
            status: join_git(status_handle)?,
            status_message: join_git(message_handle)?,
            remotes: join_git(remotes_handle)?,
            branches: join_git(branches_handle)?,
            commits: join_git(commits_handle)?,
            root: root.to_string_lossy().to_string(),
        })
    })
}

/// Unwraps a scoped worker, turning a panic into an ordinary error.
fn join_git<T>(handle: std::thread::ScopedJoinHandle<'_, Result<T, String>>) -> Result<T, String> {
    handle
        .join()
        .map_err(|_| "a git command panicked".to_string())?
}

fn ref_exists(root: &Path, refname: &str) -> bool {
    git(root, &["show-ref", "--verify", "--quiet", refname]).is_ok()
}

/// Switches to a branch that already exists locally — never creates one.
///
/// Given a remote name such as `origin/foo` this switches to a local `foo` if
/// there is one, and otherwise says so rather than creating a tracking branch.
#[tauri::command(async)]
pub fn switch_branch(branch: String, launch_dir: State<LaunchDir>) -> Result<String, String> {
    let branch = branch.trim().to_string();
    if branch.is_empty() {
        return Err("No branch given".to_string());
    }

    let root = repo_root(&launch_dir.0)?;

    if ref_exists(&root, &format!("refs/heads/{branch}")) {
        return git_verbose(&root, &["switch", branch.as_str()]);
    }

    if ref_exists(&root, &format!("refs/remotes/{branch}")) {
        let local = branch
            .split_once('/')
            .map(|(_, rest)| rest)
            .unwrap_or(branch.as_str());

        if ref_exists(&root, &format!("refs/heads/{local}")) {
            return git_verbose(&root, &["switch", local]);
        }

        return Err(format!(
            "{branch} has no local branch {local} to switch to — create it first"
        ));
    }

    Err(format!("There is no branch named {branch}"))
}

/// Stages paths — `git add`. With no paths, stages everything (`git add --all`).
#[tauri::command(async)]
pub fn stage(paths: Option<Vec<String>>, launch_dir: State<LaunchDir>) -> Result<String, String> {
    let root = repo_root(&launch_dir.0)?;
    let paths = paths.unwrap_or_default();

    if paths.is_empty() {
        return git_verbose(&root, &["add", "--all"]);
    }

    // `--` keeps a path that looks like a flag from being read as one.
    let mut args = vec!["add", "--"];
    args.extend(paths.iter().map(String::as_str));
    git_verbose(&root, &args)
}

/// Unstages paths — `git restore --staged`, falling back to `git rm --cached`
/// before the first commit, where there is no HEAD to restore the index from.
#[tauri::command(async)]
pub fn unstage(paths: Vec<String>, launch_dir: State<LaunchDir>) -> Result<String, String> {
    if paths.is_empty() {
        return Err("No paths given".to_string());
    }

    let root = repo_root(&launch_dir.0)?;
    let has_head = git(&root, &["rev-parse", "--verify", "--quiet", "HEAD"]).is_ok();

    let mut args = if has_head {
        vec!["restore", "--staged", "--"]
    } else {
        vec!["rm", "--cached", "-r", "--"]
    };
    args.extend(paths.iter().map(String::as_str));
    git_verbose(&root, &args)
}

/// Replays the current branch onto `branch` — plain `git rebase <branch>`.
/// Conflicts, `--continue` and `--abort` are left to the CLI.
#[tauri::command(async)]
pub fn rebase(branch: String, launch_dir: State<LaunchDir>) -> Result<String, String> {
    let branch = branch.trim().to_string();
    if branch.is_empty() {
        return Err("No branch given".to_string());
    }

    let root = repo_root(&launch_dir.0)?;
    git_verbose(&root, &["rebase", branch.as_str()])
}

/// Creates a branch and switches to it — `git switch -c`. Branches from the
/// current HEAD unless `start_point` names something else.
#[tauri::command(async)]
pub fn create_branch(
    name: String,
    start_point: Option<String>,
    launch_dir: State<LaunchDir>,
) -> Result<String, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Branch name is empty".to_string());
    }

    let root = repo_root(&launch_dir.0)?;
    let start_owned = start_point.unwrap_or_default();
    let start = start_owned.trim();

    let mut args = vec!["switch", "-c", name.as_str()];
    if !start.is_empty() {
        args.push(start);
    }

    git_verbose(&root, &args)
}

/// Commits what is staged, optionally pushing the current branch afterwards.
#[tauri::command(async)]
pub fn commit(
    message: String,
    push: Option<bool>,
    force_with_lease: Option<bool>,
    remote: Option<String>,
    launch_dir: State<LaunchDir>,
) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("Commit message is empty".to_string());
    }

    let root = repo_root(&launch_dir.0)?;
    let mut report = git_verbose(&root, &["commit", "-m", message.as_str()])?;

    if push.unwrap_or(false) {
        report.push('\n');
        report.push_str(&push_current(&root, force_with_lease, remote)?);
    }

    Ok(report.trim().to_string())
}

/// Pushes the current branch to `remote`.
fn push_current(
    root: &Path,
    force_with_lease: Option<bool>,
    remote: Option<String>,
) -> Result<String, String> {
    let branch =
        current_branch(root).ok_or("HEAD is detached, there is no current branch to push to")?;
    let remote = remote.unwrap_or_else(|| "origin".to_string());

    let mut args = vec!["push"];
    if force_with_lease.unwrap_or(false) {
        args.push("--force-with-lease");
    }
    args.push(remote.as_str());
    args.push(branch.as_str());

    git_verbose(root, &args)
}

/// Pushes the current branch without committing first — for getting a branch
/// the working tree already matches onto the remote, such as after a reset.
#[tauri::command(async)]
pub fn push(
    force_with_lease: Option<bool>,
    remote: Option<String>,
    launch_dir: State<LaunchDir>,
) -> Result<String, String> {
    let root = repo_root(&launch_dir.0)?;
    push_current(&root, force_with_lease, remote)
}

/// Pulls `branch` (the current branch by default) from `remote`.
#[tauri::command(async)]
pub fn pull(
    rebase: Option<bool>,
    branch: Option<String>,
    remote: Option<String>,
    launch_dir: State<LaunchDir>,
) -> Result<String, String> {
    let root = repo_root(&launch_dir.0)?;
    let remote = remote.unwrap_or_else(|| "origin".to_string());
    let branch = match branch {
        Some(branch) => branch,
        None => current_branch(&root)
            .ok_or("HEAD is detached, pass the branch to pull from explicitly")?,
    };

    let args = vec![
        "pull",
        if rebase.unwrap_or(false) {
            "--rebase"
        } else {
            "--no-rebase"
        },
        remote.as_str(),
        branch.as_str(),
    ];

    git_verbose(&root, &args)
}

/// Checks a config name before it is passed to `git config`, which takes the
/// name as a positional argument: a name starting with `-` would be read as an
/// option instead. Names are `section.key`, so anything outside that shape is
/// rejected rather than handed to git.
///
/// Values need no equivalent check — arguments reach the process directly, with
/// no shell involved, and git treats everything after the name as data. A value
/// with spaces, quotes, newlines or a leading `-` is stored verbatim.
fn config_name(name: &str) -> Result<String, String> {
    let name = name.trim();

    if name.is_empty() {
        return Err("No config name given".to_string());
    }
    if name.starts_with('-') || !name.contains('.') {
        return Err(format!("{name} is not a section.key config name"));
    }
    if !name
        .chars()
        .all(|char| char.is_ascii_alphanumeric() || matches!(char, '.' | '-' | '_'))
    {
        return Err(format!("{name} is not a valid config name"));
    }

    Ok(name.to_string())
}

/// Reads a config value, e.g. `user.name` or `user.email`. `None` means the
/// name is not set. Without `global` this is the value that actually applies to
/// the repository, where a local setting overrides the global one.
#[tauri::command(async)]
pub fn get_config(
    name: String,
    global: Option<bool>,
    launch_dir: State<LaunchDir>,
) -> Result<Option<String>, String> {
    let name = config_name(&name)?;
    let root = repo_root(&launch_dir.0)?;

    // An unset name normally exits 1 with no output, which would come back as a
    // failure indistinguishable from a real error. `--default` makes git print
    // an empty value and exit 0 instead.
    let mut args = vec!["config", "--get", "--default", ""];
    if global.unwrap_or(false) {
        args.push("--global");
    }
    args.push(name.as_str());

    let value = git(&root, &args)?;
    let value = value.trim_end_matches('\n');

    Ok(if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    })
}

/// Writes a config value. Goes to the repository's own config unless `global`
/// is set, in which case it goes to `~/.gitconfig`.
#[tauri::command(async)]
pub fn set_config(
    name: String,
    value: String,
    global: Option<bool>,
    launch_dir: State<LaunchDir>,
) -> Result<(), String> {
    let name = config_name(&name)?;
    let root = repo_root(&launch_dir.0)?;

    let mut args = vec!["config"];
    if global.unwrap_or(false) {
        args.push("--global");
    }
    // --replace-all so a name that already has several entries is left with the
    // one value; plain `git config` refuses to write in that case.
    args.push("--replace-all");
    args.push(name.as_str());
    args.push(value.as_str());

    git(&root, &args)?;
    Ok(())
}

#[tauri::command(async)]
pub fn fetch(remote: Option<String>, launch_dir: State<LaunchDir>) -> Result<String, String> {
    let root = repo_root(&launch_dir.0)?;
    let remote = remote.unwrap_or_else(|| "origin".to_string());

    let args = vec!["fetch", remote.as_str()];

    git_verbose(&root, &args)
}
