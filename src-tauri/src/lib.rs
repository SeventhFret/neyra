use std::env;
use std::path::PathBuf;

mod git;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // WebKitGTK renders through DMABUF by default, which misbehaves on WSLg and
    // virtualised GPUs: scrolled content is rasterised once at the wrong scale
    // and stays blurry afterwards. Both variables are the standard workarounds
    // and must be set before the webview starts. Drop the compositing one first
    // if you want hardware compositing back and the blur is gone.
    #[cfg(target_os = "linux")]
    {
        env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    // Captured before anything can change the process cwd: the repo we operate
    // on is the one the shell command was run from.
    let launch_dir = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .manage(git::LaunchDir(launch_dir))
        .invoke_handler(tauri::generate_handler![
            git::get_repo_data,
            git::commit,
            git::pull,
            git::fetch,
            git::switch_branch,
            git::rebase,
            git::create_branch,
            git::stage,
            git::unstage,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
