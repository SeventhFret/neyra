use tauri::AppHandle;

use crate::core::{
    config::get_provider,
    providers::{self},
};
use crate::core::{
    config::{
        add_provider as add_provider_config, get_providers, models::ProviderConfig,
        remove_provider as remove_provider_config,
    },
    credentials,
    providers::models::ProviderMergeRequest,
};

#[tauri::command]
pub async fn get_provider_merge_requests(
    app: AppHandle,
    provider_id: String,
) -> Result<Vec<ProviderMergeRequest>, String> {
    let provider = get_provider(&app, &provider_id)?
        .ok_or_else(|| format!("Provider '{}' doesn't exist", provider_id))?;

    let token = credentials::get_token(&provider.id).map_err(|error| {
        format!(
            "Failed to read credentials for provider '{}': {error}",
            provider.id
        )
    })?;

    let merge_requests = providers::get_merge_requests(&provider, &token).await?;

    let provider_id = provider.id.clone();
    let provider_type = provider.provider_type;

    Ok(merge_requests
        .into_iter()
        .map(|merge_request| ProviderMergeRequest {
            merge_request,
            provider_id: provider_id.clone(),
            provider_type,
        })
        .collect())
}

#[tauri::command]
pub fn get_provider_by_id(app: AppHandle, id: String) -> Result<ProviderConfig, String> {
    get_provider(&app, &id)?.ok_or_else(|| format!("Provider '{}' doesn't exist", id))
}

#[tauri::command]
pub fn get_providers_from_config(app: AppHandle) -> Result<Vec<ProviderConfig>, String> {
    get_providers(&app)
}

#[tauri::command]
pub fn add_provider(app: AppHandle, provider: ProviderConfig, token: String) -> Result<(), String> {
    let provider_id = provider.id.clone();

    add_provider_config(&app, provider)?;

    if let Err(error) = credentials::set_token(&provider_id, &token) {
        // Config was written but credential storage failed.
        // Roll the config change back.
        let _ = remove_provider_config(&app, &provider_id);

        return Err(format!(
            "Failed to store credentials for provider '{}': {}",
            provider_id, error
        ));
    }

    Ok(())
}

#[tauri::command]
pub fn remove_provider(app: AppHandle, id: String) -> Result<(), String> {
    remove_provider_config(&app, &id)?;

    match credentials::delete_token(&id) {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),

        Err(error) => Err(format!(
            "Provider '{}' was removed, but its stored credentials could not be deleted: {}",
            id, error
        )),
    }
}

#[tauri::command]
pub fn update_provider_token(
    app: AppHandle,
    provider_id: String,
    token: String,
) -> Result<(), String> {
    get_provider(&app, &provider_id)?
        .ok_or_else(|| format!("Provider '{}' doesn't exist", provider_id))?;

    credentials::set_token(&provider_id, &token).map_err(|error| error.to_string())
}
