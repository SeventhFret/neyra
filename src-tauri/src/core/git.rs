use std::{
    path::{Path, PathBuf},
    process::{Command, Output},
};

use chrono::{DateTime, FixedOffset, SecondsFormat, Utc};
use git2::{BranchType, Repository, Sort};
use serde::Serialize;

const LOG_LIMIT: usize = 50;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoData {
    pub root: String,
    pub current_branch: Option<String>,
    pub status: Vec<StatusEntry>,
    pub status_message: String,
    pub remotes: Vec<Remote>,
    pub branches: Vec<Branch>,
    pub commits: Vec<Commit>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Branch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub remote: Option<String>,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub upstream_gone: bool,
    pub short_hash: String,
    pub subject: String,
    pub date: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusEntry {
    pub index_status: String,
    pub worktree_status: String,
    pub path: String,
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
    pub date: String,
    pub ref_name: Option<String>,
    pub subject: String,
    pub body: String,
}

pub fn get_repo_data(repo: &Repository) -> Result<RepoData, String> {
    let root = repo_root(repo)?;

    Ok(RepoData {
        root: root.to_string_lossy().into_owned(),
        current_branch: current_branch(repo),
        status: status(&root)?,
        status_message: status_message(&root)?,
        remotes: remotes(repo)?,
        branches: branches(repo)?,
        commits: commits(repo, LOG_LIMIT)?,
    })
}

pub fn repo_root(repo: &Repository) -> Result<PathBuf, String> {
    repo.workdir()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Bare repositories are not supported".to_string())
}

pub fn current_branch(repo: &Repository) -> Option<String> {
    match repo.head() {
        Ok(head) => head.shorthand().ok().map(str::to_string),

        Err(error) if error.code() == git2::ErrorCode::UnbornBranch => {
            let head = std::fs::read_to_string(repo.path().join("HEAD")).ok()?;

            head.trim()
                .strip_prefix("ref: refs/heads/")
                .map(str::to_string)
        }

        Err(_) => None,
    }
}

fn status(root: &Path) -> Result<Vec<StatusEntry>, String> {
    let raw = git(
        root,
        &[
            "--no-optional-locks",
            "status",
            "--porcelain",
            "-z",
            "--untracked-files=all",
        ],
    )?;

    let mut fields = raw.split('\0').filter(|field| !field.is_empty());
    let mut entries = Vec::new();

    while let Some(field) = fields.next() {
        if field.len() < 4 {
            continue;
        }

        let (codes, path) = field.split_at(3);
        let index_status = codes[0..1].to_string();
        let worktree_status = codes[1..2].to_string();

        let is_move = matches!(index_status.as_str(), "R" | "C")
            || matches!(worktree_status.as_str(), "R" | "C");

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

fn status_message(root: &Path) -> Result<String, String> {
    let raw = git(
        root,
        &["--no-optional-locks", "-c", "color.status=never", "status"],
    )?;

    Ok(raw.trim_end().to_string())
}

fn remotes(repo: &Repository) -> Result<Vec<Remote>, String> {
    let names = repo.remotes().map_err(git_error)?;
    let mut result = Vec::new();

    for name_result in names.iter() {
        let Some(name) = name_result.map_err(git_error)? else {
            continue;
        };

        let remote = repo.find_remote(name).map_err(git_error)?;

        let fetch_url = Some(remote.url().map_err(git_error)?.to_string());

        let push_url = remote
            .pushurl()
            .map_err(git_error)?
            .map(str::to_string)
            .or_else(|| fetch_url.clone());

        result.push(Remote {
            name: name.to_string(),
            fetch_url,
            push_url,
        });
    }

    Ok(result)
}

fn branches(repo: &Repository) -> Result<Vec<Branch>, String> {
    let mut result = local_branches(repo)?;
    result.extend(remote_branches(repo)?);

    Ok(result)
}

fn local_branches(repo: &Repository) -> Result<Vec<Branch>, String> {
    let current = current_branch(repo);

    let branches = repo.branches(Some(BranchType::Local)).map_err(git_error)?;

    let mut result = Vec::new();

    for item in branches {
        let (branch, _) = item.map_err(git_error)?;

        let Some(name) = branch.name().map_err(git_error)? else {
            continue;
        };

        let reference = branch.get();

        let full_ref_name = reference.name().map_err(git_error)?;

        let upstream_ref = repo
            .branch_upstream_name(full_ref_name)
            .ok()
            .and_then(|name| name.as_str().ok().map(str::to_string));

        let upstream = upstream_ref.as_deref().map(short_remote_ref);

        let (ahead, behind, upstream_gone) =
            tracking_info(repo, reference, upstream_ref.as_deref());

        let (short_hash, subject, date) = branch_tip(repo, reference)?;

        result.push(Branch {
            name: name.to_string(),
            is_current: current.as_deref() == Some(name),
            is_remote: false,
            remote: None,
            upstream,
            ahead,
            behind,
            upstream_gone,
            short_hash,
            subject,
            date,
        });
    }

    Ok(result)
}

fn remote_branches(repo: &Repository) -> Result<Vec<Branch>, String> {
    let branches = repo.branches(Some(BranchType::Remote)).map_err(git_error)?;

    let mut result = Vec::new();

    for item in branches {
        let (branch, _) = item.map_err(git_error)?;

        let Some(name) = branch.name().map_err(git_error)? else {
            continue;
        };

        if name.ends_with("/HEAD") {
            continue;
        }

        let (short_hash, subject, date) = branch_tip(repo, branch.get())?;

        result.push(Branch {
            name: name.to_string(),
            is_current: false,
            is_remote: true,
            remote: name.split_once('/').map(|(remote, _)| remote.to_string()),
            upstream: None,
            ahead: 0,
            behind: 0,
            upstream_gone: false,
            short_hash,
            subject,
            date,
        });
    }

    Ok(result)
}

fn tracking_info(
    repo: &Repository,
    local_ref: &git2::Reference<'_>,
    upstream_ref_name: Option<&str>,
) -> (u32, u32, bool) {
    let Some(upstream_ref_name) = upstream_ref_name else {
        return (0, 0, false);
    };

    let Ok(local_commit) = local_ref.peel_to_commit() else {
        return (0, 0, false);
    };

    let Ok(upstream_ref) = repo.find_reference(upstream_ref_name) else {
        return (0, 0, true);
    };

    let Ok(upstream_commit) = upstream_ref.peel_to_commit() else {
        return (0, 0, true);
    };

    match repo.graph_ahead_behind(local_commit.id(), upstream_commit.id()) {
        Ok((ahead, behind)) => (
            u32::try_from(ahead).unwrap_or(u32::MAX),
            u32::try_from(behind).unwrap_or(u32::MAX),
            false,
        ),

        Err(_) => (0, 0, false),
    }
}

fn branch_tip(
    repo: &Repository,
    reference: &git2::Reference<'_>,
) -> Result<(String, String, String), String> {
    let commit = reference.peel_to_commit().map_err(git_error)?;

    let short_hash = short_id(repo, commit.id())?;

    let subject = commit
        .summary()
        .map_err(git_error)?
        .unwrap_or_default()
        .to_string();

    let date = format_git_time(commit.committer().when());

    Ok((short_hash, subject, date))
}

fn short_remote_ref(full: &str) -> String {
    full.strip_prefix("refs/remotes/")
        .unwrap_or(full)
        .to_string()
}

fn commits(repo: &Repository, limit: usize) -> Result<Vec<Commit>, String> {
    if repo.is_empty().unwrap_or(false) {
        return Ok(Vec::new());
    }

    let mut walk = repo.revwalk().map_err(git_error)?;

    if walk.push_head().is_err() {
        return Ok(Vec::new());
    }

    walk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME)
        .map_err(git_error)?;

    let mut result = Vec::new();

    for oid in walk.take(limit) {
        let oid = oid.map_err(git_error)?;
        let commit = repo.find_commit(oid).map_err(git_error)?;

        let author = commit.author();
        let message = commit.message().unwrap_or_default();

        let mut lines = message.splitn(2, '\n');

        let subject = lines.next().unwrap_or_default().trim().to_string();

        let body = lines.next().unwrap_or_default().trim().to_string();

        result.push(Commit {
            hash: oid.to_string(),
            short_hash: short_id(repo, oid)?,
            author_name: author.name().unwrap_or_default().to_string(),
            author_email: author.email().unwrap_or_default().to_string(),
            date: format_git_time(author.when()),
            ref_name: commit_ref_name(repo, oid),
            subject,
            body,
        });
    }

    Ok(result)
}

fn commit_ref_name(repo: &Repository, oid: git2::Oid) -> Option<String> {
    let references = repo.references().ok()?;

    let mut local: Option<String> = None;
    let mut remote: Option<String> = None;
    let mut tag: Option<String> = None;

    for reference_result in references {
        let reference = match reference_result {
            Ok(reference) => reference,
            Err(_) => continue,
        };

        let commit = match reference.peel_to_commit() {
            Ok(commit) => commit,
            Err(_) => continue,
        };

        if commit.id() != oid {
            continue;
        }

        let full = match reference.name() {
            Ok(name) => name,
            Err(_) => continue,
        };

        let short = match reference.shorthand() {
            Ok(name) => name.to_string(),
            Err(_) => continue,
        };

        if full.starts_with("refs/heads/") {
            if local.is_none() {
                local = Some(short);
            }
        } else if full.starts_with("refs/remotes/") && !full.ends_with("/HEAD") {
            if remote.is_none() {
                remote = Some(short);
            }
        } else if full.starts_with("refs/tags/") && tag.is_none() {
            tag = Some(short);
        }
    }

    local.or(remote).or(tag).or_else(|| {
        let head = repo.head().ok()?;
        let commit = head.peel_to_commit().ok()?;

        if commit.id() != oid {
            return None;
        }

        head.shorthand()
            .ok()
            .map(str::to_string)
            .or_else(|| Some("HEAD".to_string()))
    })
}

fn short_id(repo: &Repository, oid: git2::Oid) -> Result<String, String> {
    let object = repo.find_object(oid, None).map_err(git_error)?;

    let short = object.short_id().map_err(git_error)?;

    short.as_str().map(str::to_string).map_err(git_error)
}

fn format_git_time(time: git2::Time) -> String {
    let Some(utc) = DateTime::<Utc>::from_timestamp(time.seconds(), 0) else {
        return String::new();
    };

    let seconds = time.offset_minutes().saturating_mul(60);

    match FixedOffset::east_opt(seconds) {
        Some(offset) => utc
            .with_timezone(&offset)
            .to_rfc3339_opts(SecondsFormat::Secs, false),

        None => utc.to_rfc3339_opts(SecondsFormat::Secs, true),
    }
}

pub fn switch_branch(repo: &Repository, branch: String) -> Result<String, String> {
    let branch = branch.trim();

    if branch.is_empty() {
        return Err("No branch given".to_string());
    }

    let root = repo_root(repo)?;

    if ref_exists(repo, &format!("refs/heads/{branch}")) {
        return git_verbose(&root, &["switch", branch]);
    }

    if ref_exists(repo, &format!("refs/remotes/{branch}")) {
        let local = branch
            .split_once('/')
            .map(|(_, rest)| rest)
            .unwrap_or(branch);

        if ref_exists(repo, &format!("refs/heads/{local}")) {
            return git_verbose(&root, &["switch", local]);
        }

        return Err(format!(
            "{branch} has no local branch {local} to switch to — create it first"
        ));
    }

    Err(format!("There is no branch named {branch}"))
}

pub fn stage(repo: &Repository, paths: Option<Vec<String>>) -> Result<String, String> {
    let root = repo_root(repo)?;
    let paths = paths.unwrap_or_default();

    if paths.is_empty() {
        return git_verbose(&root, &["add", "--all"]);
    }

    let mut args = vec!["add", "--"];
    args.extend(paths.iter().map(String::as_str));

    git_verbose(&root, &args)
}

pub fn unstage(repo: &Repository, paths: Vec<String>) -> Result<String, String> {
    if paths.is_empty() {
        return Err("No paths given".to_string());
    }

    let root = repo_root(repo)?;
    let has_head = repo.head().is_ok();

    let mut args = if has_head {
        vec!["restore", "--staged", "--"]
    } else {
        vec!["rm", "--cached", "-r", "--"]
    };

    args.extend(paths.iter().map(String::as_str));

    git_verbose(&root, &args)
}

pub fn rebase(repo: &Repository, branch: String) -> Result<String, String> {
    let branch = branch.trim();

    if branch.is_empty() {
        return Err("No branch given".to_string());
    }

    let root = repo_root(repo)?;

    git_verbose(&root, &["rebase", branch])
}

pub fn create_branch(
    repo: &Repository,
    name: String,
    start_point: Option<String>,
) -> Result<String, String> {
    let name = name.trim();

    if name.is_empty() {
        return Err("Branch name is empty".to_string());
    }

    let root = repo_root(repo)?;

    let start_point = start_point.unwrap_or_default();
    let start = start_point.trim();

    let mut args = vec!["switch", "-c", name];

    if !start.is_empty() {
        args.push(start);
    }

    git_verbose(&root, &args)
}

pub fn commit(
    repo: &Repository,
    message: String,
    push: Option<bool>,
    force_with_lease: Option<bool>,
    remote: Option<String>,
) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("Commit message is empty".to_string());
    }

    let root = repo_root(repo)?;

    let mut report = git_verbose(&root, &["commit", "-m", message.as_str()])?;

    if push.unwrap_or(false) {
        report.push('\n');
        report.push_str(&push_current(repo, force_with_lease, remote)?);
    }

    Ok(report.trim().to_string())
}

pub fn push(
    repo: &Repository,
    force_with_lease: Option<bool>,
    remote: Option<String>,
) -> Result<String, String> {
    push_current(repo, force_with_lease, remote)
}

fn push_current(
    repo: &Repository,
    force_with_lease: Option<bool>,
    remote: Option<String>,
) -> Result<String, String> {
    let root = repo_root(repo)?;

    let branch = current_branch(repo)
        .ok_or_else(|| "HEAD is detached, there is no current branch to push to".to_string())?;

    let remote = remote.unwrap_or_else(|| "origin".to_string());

    let mut args = vec!["push"];

    if force_with_lease.unwrap_or(false) {
        args.push("--force-with-lease");
    }

    args.push(remote.as_str());
    args.push(branch.as_str());

    git_verbose(&root, &args)
}

pub fn pull(
    repo: &Repository,
    rebase: Option<bool>,
    branch: Option<String>,
    remote: Option<String>,
) -> Result<String, String> {
    let root = repo_root(repo)?;
    let remote = remote.unwrap_or_else(|| "origin".to_string());

    let branch = match branch {
        Some(branch) => branch,

        None => current_branch(repo).ok_or_else(|| {
            "HEAD is detached, pass the branch to pull from explicitly".to_string()
        })?,
    };

    let args = [
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

pub fn fetch(repo: &Repository, remote: Option<String>) -> Result<String, String> {
    let root = repo_root(repo)?;
    let remote = remote.unwrap_or_else(|| "origin".to_string());

    git_verbose(&root, &["fetch", remote.as_str()])
}

pub fn get_config(
    repo: &Repository,
    name: String,
    global: Option<bool>,
) -> Result<Option<String>, String> {
    let name = config_name(&name)?;
    let root = repo_root(repo)?;

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

pub fn set_config(
    repo: &Repository,
    name: String,
    value: String,
    global: Option<bool>,
) -> Result<(), String> {
    let name = config_name(&name)?;
    let root = repo_root(repo)?;

    let mut args = vec!["config"];

    if global.unwrap_or(false) {
        args.push("--global");
    }

    args.extend(["--replace-all", name.as_str(), value.as_str()]);

    git(&root, &args)?;

    Ok(())
}

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
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_'))
    {
        return Err(format!("{name} is not a valid config name"));
    }

    Ok(name.to_string())
}

fn ref_exists(repo: &Repository, refname: &str) -> bool {
    repo.find_reference(refname).is_ok()
}

fn run_git(cwd: &Path, args: &[&str]) -> Result<Output, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|error| format!("failed to run `git {}`: {error}", args.join(" ")))?;

    if output.status.success() {
        return Ok(output);
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    let report = [stdout, stderr]
        .into_iter()
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    Err(if report.is_empty() {
        format!("`git {}` failed", args.join(" "))
    } else {
        report
    })
}

fn git(cwd: &Path, args: &[&str]) -> Result<String, String> {
    let output = run_git(cwd, args)?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn git_verbose(cwd: &Path, args: &[&str]) -> Result<String, String> {
    let output = run_git(cwd, args)?;

    let mut report = String::from_utf8_lossy(&output.stdout).to_string();

    report.push_str(&String::from_utf8_lossy(&output.stderr));

    Ok(report.trim().to_string())
}

fn git_error(error: git2::Error) -> String {
    error.message().to_string()
}
