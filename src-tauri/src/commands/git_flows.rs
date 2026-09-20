use crate::core::config::models::GitFlow;
use crate::core::config::{
    add_git_flow as add_git_flow_config, get_git_flow, get_git_flows,
    remove_git_flow as remove_git_flow_config, update_git_flow as update_git_flow_config,
};
use crate::core::git_flows::models::GitFlowContext;
use crate::core::git_flows::runner::run;
use uuid::Uuid;

use tauri::{AppHandle, State};

use crate::{core::git, state::RepositoryManager};

#[tauri::command]
pub fn add_git_flow(app: AppHandle, git_flow: GitFlow) -> Result<(), String> {
    add_git_flow_config(&app, git_flow)
}

#[tauri::command]
pub fn get_git_flow_by_id(app: AppHandle, id: String) -> Result<GitFlow, String> {
    get_git_flow(&app, &id)?.ok_or_else(|| format!("Git Flow with id '{}' doesn't exist", id))
}

#[tauri::command]
pub fn get_git_flows_from_config(app: AppHandle) -> Result<Vec<GitFlow>, String> {
    get_git_flows(&app)
}

#[tauri::command]
pub fn remove_git_flow(app: AppHandle, id: String) -> Result<(), String> {
    remove_git_flow_config(&app, &id)
}

#[tauri::command]
pub fn update_git_flow(app: AppHandle, git_flow: GitFlow) -> Result<(), String> {
    update_git_flow_config(&app, git_flow)
}

#[tauri::command]
pub async fn run_git_flow(
    app: AppHandle,
    state: State<'_, RepositoryManager>,
    id: String,
) -> Result<String, String> {
    let git_flow_config = get_git_flow(&app, &id)?
        .ok_or_else(|| format!("Git Flow with id '{}' doesn't exist", id))?;
    let repo_data = state.with_repo(git::get_repo_data)?;
    let context = GitFlowContext {
        repository_root: repo_data.root,
        current_branch: repo_data.current_branch,
    };
    let run_id = Uuid::new_v4().to_string();

    let runner_id = run_id.clone();

    tauri::async_runtime::spawn(async move {
        if let Err(error) = run(app, runner_id, git_flow_config, context).await {
            eprintln!("Git flow runner failed: {error}");
        }
    });

    Ok(run_id)
}
