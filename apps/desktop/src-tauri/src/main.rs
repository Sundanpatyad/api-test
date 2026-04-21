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

#[tauri::command]
async fn system_open(app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    tauri::api::shell::open(&app_handle.shell_scope(), url, None)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn start_oauth_flow(window: tauri::Window) -> Result<u16, String> {
    let success_html = r#"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayloadX Auth</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #000000;
            --surface: #0a0a0a;
            --border: #222222;
            --accent: #00dc82;
            --text: #ffffff;
            --text-dim: #666666;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'JetBrains Mono', monospace;
            background-color: var(--bg);
            color: var(--text);
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            width: 100%;
            max-width: 440px;
            padding: 40px;
            background-color: var(--surface);
            border: 1px solid var(--border);
            text-align: left;
            position: relative;
        }
        .logo-box {
            width: 32px;
            height: 32px;
            background-color: var(--accent);
            margin-bottom: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo-box::after {
            content: 'P';
            font-weight: 700;
            color: black;
            font-size: 18px;
        }
        h1 {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }
        p {
            font-size: 13px;
            color: var(--text-dim);
            line-height: 1.6;
            margin-bottom: 32px;
        }
        .status-container {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 12px;
            color: var(--accent);
        }
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: var(--accent);
            border-radius: 50%;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.9); }
            100% { opacity: 1; transform: scale(1); }
        }
        .code-block {
            background-color: #050505;
            padding: 12px;
            border: 1px solid var(--border);
            font-size: 11px;
            color: #444;
            margin-top: 32px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-box"></div>
        <h1>AUTH_SUCCESS</h1>
        <p>Your session for PayloadX API Studio has been verified. You may now return to the desktop application.</p>
        <div class="status-container">
            <div class="status-dot"></div>
            <span>HANDSHAKE_COMPLETE</span>
        </div>
        <div class="code-block">
            $> payloadx auth --status verified --id oauth_v2_google
        </div>
    </div>
    <script>
        setTimeout(() => { window.close(); }, 3000);
    </script>
</body>
</html>
"#;

    let config = tauri_plugin_oauth::OauthConfig {
        ports: None,
        response: Some(success_html.into()),
    };

    tauri_plugin_oauth::start_with_config(config, move |url| {
        let _ = window.emit("oauth_callback", url);
    })
    .map_err(|e| e.to_string())
}

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
        .plugin(tauri_plugin_oauth::init())
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
            start_oauth_flow,
            system_open,
        ])
        .run(tauri::generate_context!())
        .expect("error while running PayloadX API Studio");
}
