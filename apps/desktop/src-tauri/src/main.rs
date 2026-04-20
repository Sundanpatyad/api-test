// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod commands;
mod security;

use commands::http::execute_request;
use commands::files::{save_local_file, read_local_file, list_local_files};
use commands::json::parse_json;

use std::sync::Mutex;
use std::collections::HashMap;

#[derive(Default)]
pub struct AppCookieJar(pub Mutex<HashMap<String, HashMap<String, String>>>);

fn main() {
    // Persistent HTTP client with proper configuration for Linux
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .connect_timeout(std::time::Duration::from_secs(10))
        .pool_max_idle_per_host(10)
        .user_agent("PayloadX-API-Studio/1.3.7")
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
            parse_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running PayloadX API Studio");
}
