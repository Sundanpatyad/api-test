use tauri::Manager;

mod commands;
mod security;

use commands::http::execute_request;
use commands::files::{save_local_file, read_local_file, list_local_files};

use std::sync::Mutex;
use std::collections::HashMap;

#[derive(Default)]
pub struct AppCookieJar(pub Mutex<HashMap<String, HashMap<String, String>>>);

fn main() {
    // Persistent HTTP client
    let http_client = reqwest::Client::builder()
        .build()
        .expect("Failed to build HTTP client");

    tauri::Builder::default()
        .manage(http_client)
        .manage(AppCookieJar::default())
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
