use std::env;
use std::path::PathBuf;

mod git;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Captured before anything can change the process cwd: the repo we operate
    // on is the one the shell command was run from.
    let launch_dir = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(git::LaunchDir(launch_dir))
        .invoke_handler(tauri::generate_handler![
            git::get_repo_data,
            git::commit,
            git::pull,
            git::fetch,
            git::switch_branch,
            git::checkout_branch,
            git::create_branch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
