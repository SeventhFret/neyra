use std::path::Path;

use git2::{Delta, Diff, DiffOptions, ErrorCode, Patch, Repository};

use super::models::{DiffFileStatus, DiffHunk, DiffLine, DiffLineKind, DiffSource, FileDiff};

pub fn file_diff(
    repo: &Repository,
    path: &str,
    source: DiffSource,
) -> Result<Option<FileDiff>, String> {
    let diff = create_diff(repo, path, source)?;

    parse_file_diff(&diff)
}

fn create_diff<'repo>(
    repo: &'repo Repository,
    path: &str,
    source: DiffSource,
) -> Result<Diff<'repo>, String> {
    let mut options = DiffOptions::new();

    options
        .pathspec(path)
        .context_lines(3)
        .include_untracked(true)
        .recurse_untracked_dirs(true)
        .show_untracked_content(true);

    match source {
        DiffSource::Staged => staged_diff(repo, &mut options),
        DiffSource::Unstaged => unstaged_diff(repo, &mut options),
    }
}

fn staged_diff<'repo>(
    repo: &'repo Repository,
    options: &mut DiffOptions,
) -> Result<Diff<'repo>, String> {
    let head_tree = match repo.head() {
        Ok(head) => Some(head.peel_to_tree().map_err(git_error)?),

        Err(error) if matches!(error.code(), ErrorCode::UnbornBranch | ErrorCode::NotFound) => None,

        Err(error) => return Err(git_error(error)),
    };

    repo.diff_tree_to_index(head_tree.as_ref(), None, Some(options))
        .map_err(git_error)
}

fn unstaged_diff<'repo>(
    repo: &'repo Repository,
    options: &mut DiffOptions,
) -> Result<Diff<'repo>, String> {
    repo.diff_index_to_workdir(None, Some(options))
        .map_err(git_error)
}

fn parse_file_diff(diff: &Diff<'_>) -> Result<Option<FileDiff>, String> {
    let Some(delta) = diff.deltas().next() else {
        return Ok(None);
    };

    let Some(patch) = Patch::from_diff(diff, 0).map_err(git_error)? else {
        return Ok(Some(FileDiff {
            old_path: path_to_string(delta.old_file().path()),
            new_path: path_to_string(delta.new_file().path()),
            status: map_status(delta.status()),
            binary: is_binary(&delta),
            hunks: Vec::new(),
        }));
    };

    let mut hunks = Vec::with_capacity(patch.num_hunks());

    for hunk_index in 0..patch.num_hunks() {
        let (hunk, line_count) = patch.hunk(hunk_index).map_err(git_error)?;

        let mut lines = Vec::with_capacity(line_count);

        for line_index in 0..line_count {
            let line = patch
                .line_in_hunk(hunk_index, line_index)
                .map_err(git_error)?;

            let Some(kind) = map_line_kind(line.origin()) else {
                continue;
            };

            lines.push(DiffLine {
                kind,
                old_line_number: line.old_lineno(),
                new_line_number: line.new_lineno(),
                content: diff_line_content(line.content()),
            });
        }

        hunks.push(DiffHunk {
            old_start: hunk.old_start(),
            old_lines: hunk.old_lines(),
            new_start: hunk.new_start(),
            new_lines: hunk.new_lines(),
            header: String::from_utf8_lossy(hunk.header()).trim_end().to_owned(),
            lines,
        });
    }

    Ok(Some(FileDiff {
        old_path: path_to_string(delta.old_file().path()),
        new_path: path_to_string(delta.new_file().path()),
        status: map_status(delta.status()),
        binary: is_binary(&delta),
        hunks,
    }))
}

fn map_status(status: Delta) -> DiffFileStatus {
    match status {
        Delta::Added => DiffFileStatus::Added,
        Delta::Deleted => DiffFileStatus::Deleted,
        Delta::Modified => DiffFileStatus::Modified,
        Delta::Renamed => DiffFileStatus::Renamed,
        Delta::Copied => DiffFileStatus::Copied,
        Delta::Untracked => DiffFileStatus::Untracked,
        Delta::Typechange => DiffFileStatus::TypeChanged,
        Delta::Conflicted => DiffFileStatus::Conflicted,
        _ => DiffFileStatus::Unknown,
    }
}

fn map_line_kind(origin: char) -> Option<DiffLineKind> {
    match origin {
        ' ' => Some(DiffLineKind::Context),
        '+' => Some(DiffLineKind::Addition),
        '-' => Some(DiffLineKind::Deletion),
        _ => None,
    }
}

fn path_to_string(path: Option<&Path>) -> Option<String> {
    path.map(|path| path.to_string_lossy().into_owned())
}

fn is_binary(delta: &git2::DiffDelta<'_>) -> bool {
    delta.old_file().is_binary() || delta.new_file().is_binary()
}

fn diff_line_content(content: &[u8]) -> String {
    let content = String::from_utf8_lossy(content);

    content
        .strip_suffix("\r\n")
        .or_else(|| content.strip_suffix('\n'))
        .unwrap_or(&content)
        .to_owned()
}

fn git_error(error: git2::Error) -> String {
    error.message().to_string()
}
