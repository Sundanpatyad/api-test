use tauri::Manager;

mod commands;
mod security;

use commands::http::execute_request;
use commands::files::{save_local_file, read_local_file, list_local_files};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            execute_request,
            save_local_file,
            read_local_file,
            list_local_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SyncNest API Studio");
}
