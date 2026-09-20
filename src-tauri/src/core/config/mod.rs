pub mod models;

use std::{fs, path::PathBuf};

use tauri::{AppHandle, Manager};

use crate::core::config::models::GitFlow;

use self::models::{AppConfig, ProviderConfig};

const CONFIG_FILE: &str = "config.json";

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;

    Ok(directory.join(CONFIG_FILE))
}

pub fn load(app: &AppHandle) -> Result<AppConfig, String> {
    let path = config_path(app)?;

    if !path.exists() {
        return Ok(AppConfig::default());
    }

    let contents = fs::read_to_string(&path).map_err(|error| error.to_string())?;

    serde_json::from_str(&contents).map_err(|error| error.to_string())
}

pub fn save(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let path = config_path(app)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let contents = serde_json::to_string_pretty(config).map_err(|error| error.to_string())?;

    fs::write(path, contents).map_err(|error| error.to_string())
}

pub fn get_provider(app: &AppHandle, id: &str) -> Result<Option<ProviderConfig>, String> {
    let config = load(app)?;

    Ok(config
        .providers
        .into_iter()
        .find(|provider| provider.id == id))
}

pub fn get_providers(app: &AppHandle) -> Result<Vec<ProviderConfig>, String> {
    let config = load(app)?;

    Ok(config.providers)
}

pub fn add_provider(app: &AppHandle, provider: ProviderConfig) -> Result<(), String> {
    let mut config = load(app)?;

    if config
        .providers
        .iter()
        .any(|existing| existing.id == provider.id)
    {
        return Err(format!("Provider '{}' already exists", provider.id));
    }

    config.providers.push(provider);

    save(app, &config)
}

pub fn remove_provider(app: &AppHandle, id: &str) -> Result<(), String> {
    let mut config = load(app)?;

    let original_len = config.providers.len();

    config.providers.retain(|provider| provider.id != id);

    if config.providers.len() == original_len {
        return Err(format!("Provider '{}' doesn't exist", id));
    }

    save(app, &config)
}

pub fn add_git_flow(app: &AppHandle, git_flow: GitFlow) -> Result<(), String> {
    let mut config = load(app)?;

    if config
        .git_flows
        .iter()
        .any(|existing| existing.id == git_flow.id)
    {
        return Err(format!("Git Flow with id '{}' already exists", git_flow.id));
    }

    config.git_flows.push(git_flow);

    save(app, &config)
}

pub fn get_git_flow(app: &AppHandle, id: &str) -> Result<Option<GitFlow>, String> {
    let config = load(app)?;

    Ok(config.git_flows.into_iter().find(|flow| flow.id == id))
}

pub fn get_git_flows(app: &AppHandle) -> Result<Vec<GitFlow>, String> {
    let config = load(app)?;

    Ok(config.git_flows)
}

pub fn remove_git_flow(app: &AppHandle, id: &str) -> Result<(), String> {
    let mut config = load(app)?;

    let original_len = config.git_flows.len();

    config.git_flows.retain(|flow| flow.id != id);

    if config.git_flows.len() == original_len {
        return Err(format!("Git Flow with id '{}' doesn't exist", id));
    }

    save(app, &config)
}

pub fn update_git_flow(app: &AppHandle, git_flow: GitFlow) -> Result<(), String> {
    let mut config = load(app)?;

    let existing = config
        .git_flows
        .iter_mut()
        .find(|flow| flow.id == git_flow.id)
        .ok_or_else(|| format!("Git Flow with id '{}' doesn't exist", git_flow.id))?;

    *existing = git_flow;

    save(app, &config)
}
