use std::{env, path::PathBuf};

use tauri::Manager;

mod commands;
mod core;
mod state;

use state::RepositoryManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    let launch_dir = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

    let repository_manager = RepositoryManager::new(&launch_dir);

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .manage(repository_manager)
        .setup(|app| {
            let state = app.state::<RepositoryManager>();

            if let Err(error) = state.restart_watcher(app.handle().clone()) {
                eprintln!("Failed to start repository watcher: {error}");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::git::get_repo_data,
            commands::git::get_repository_root,
            commands::git::select_repository,
            commands::git::commit,
            commands::git::push,
            commands::git::pull,
            commands::git::fetch,
            commands::git::switch_branch,
            commands::git::rebase,
            commands::git::create_branch,
            commands::git::stage,
            commands::git::unstage,
            commands::git::get_config,
            commands::git::set_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
