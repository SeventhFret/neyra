use std::path::PathBuf;

use tauri::{AppHandle, State};

use crate::{core::git, state::RepositoryManager};

#[tauri::command(async)]
pub fn get_repo_data(state: State<'_, RepositoryManager>) -> Result<git::RepoData, String> {
    state.with_repo(git::get_repo_data)
}

#[tauri::command(async)]
pub fn get_repository_root(state: State<'_, RepositoryManager>) -> Option<String> {
    state
        .root_optional()
        .map(|root| root.to_string_lossy().into_owned())
}

#[tauri::command(async)]
pub fn select_repository(
    path: String,
    app: AppHandle,
    state: State<'_, RepositoryManager>,
) -> Result<String, String> {
    let root = state.select(&PathBuf::from(path), app)?;

    Ok(root.to_string_lossy().into_owned())
}

#[tauri::command(async)]
pub fn switch_branch(
    branch: String,
    state: State<'_, RepositoryManager>,
) -> Result<String, String> {
    state.with_repo(|repo| git::switch_branch(repo, branch))
}

#[tauri::command(async)]
pub fn stage(
    paths: Option<Vec<String>>,
    state: State<'_, RepositoryManager>,
) -> Result<String, String> {
    state.with_repo(|repo| git::stage(repo, paths))
}

#[tauri::command(async)]
pub fn unstage(paths: Vec<String>, state: State<'_, RepositoryManager>) -> Result<String, String> {
    state.with_repo(|repo| git::unstage(repo, paths))
}

#[tauri::command(async)]
pub fn rebase(branch: String, state: State<'_, RepositoryManager>) -> Result<String, String> {
    state.with_repo(|repo| git::rebase(repo, branch))
}

#[tauri::command(async)]
pub fn create_branch(
    name: String,
    start_point: Option<String>,
    state: State<'_, RepositoryManager>,
) -> Result<String, String> {
    state.with_repo(|repo| git::create_branch(repo, name, start_point))
}

#[tauri::command(async)]
pub fn commit(
    message: String,
    push: Option<bool>,
    force_with_lease: Option<bool>,
    remote: Option<String>,
    state: State<'_, RepositoryManager>,
) -> Result<String, String> {
    state.with_repo(|repo| git::commit(repo, message, push, force_with_lease, remote))
}

#[tauri::command(async)]
pub fn push(
    force_with_lease: Option<bool>,
    remote: Option<String>,
    state: State<'_, RepositoryManager>,
) -> Result<String, String> {
    state.with_repo(|repo| git::push(repo, force_with_lease, remote))
}

#[tauri::command(async)]
pub fn pull(
    rebase: Option<bool>,
    branch: Option<String>,
    remote: Option<String>,
    state: State<'_, RepositoryManager>,
) -> Result<String, String> {
    state.with_repo(|repo| git::pull(repo, rebase, branch, remote))
}

#[tauri::command(async)]
pub fn fetch(
    remote: Option<String>,
    state: State<'_, RepositoryManager>,
) -> Result<String, String> {
    state.with_repo(|repo| git::fetch(repo, remote))
}

#[tauri::command(async)]
pub fn get_config(
    name: String,
    global: Option<bool>,
    state: State<'_, RepositoryManager>,
) -> Result<Option<String>, String> {
    state.with_repo(|repo| git::get_config(repo, name, global))
}

#[tauri::command(async)]
pub fn set_config(
    name: String,
    value: String,
    global: Option<bool>,
    state: State<'_, RepositoryManager>,
) -> Result<(), String> {
    state.with_repo(|repo| git::set_config(repo, name, value, global))
}
