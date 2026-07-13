#[cfg(any(target_os = "windows", target_os = "ios"))]
compile_error!("This fork currently supports Tauri on macOS and Android only.");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running UnThink");
}
