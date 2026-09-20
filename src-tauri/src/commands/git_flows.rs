use crate::core::config::models::GitFlow;
use crate::core::config::{
    add_git_flow as add_git_flow_config, get_git_flow, get_git_flows,
    remove_git_flow as remove_git_flow_config,
};
use tauri::AppHandle;

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
