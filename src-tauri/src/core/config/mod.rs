pub mod models;

use std::{fs, path::PathBuf};

use tauri::{AppHandle, Manager};

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
