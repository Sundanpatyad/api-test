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
    <title>PayloadX | Authentication Success</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #060606;
            --surface: #0d0d0d;
            --border: rgba(255, 255, 255, 0.05);
            --accent: #ffffff;
            --text: #ffffff;
            --text-dim: #555555;
            --text-muted: #222222;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        .noise {
            position: fixed;
            inset: 0;
            background: url('https://grainy-gradients.vercel.app/noise.svg');
            opacity: 0.02;
            pointer-events: none;
        }
        .container {
            width: 100%;
            max-width: 440px;
            padding: 48px;
            background-color: var(--surface);
            border: 1px solid var(--border);
            text-align: left;
            position: relative;
            z-index: 10;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .logo-box {
            width: 32px;
            height: 32px;
            background-color: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border);
            margin-bottom: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
        }
        .logo-box::after {
            content: '';
            width: 14px;
            height: 14px;
            background-color: white;
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 20% 20%, 20% 80%, 80% 80%, 80% 20%, 20% 20%);
            opacity: 0.8;
        }
        h1 {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 12px;
            letter-spacing: -0.02em;
            text-transform: uppercase;
            color: #fff;
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
            gap: 10px;
            font-size: 10px;
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .status-dot {
            width: 6px;
            height: 6px;
            background-color: #fff;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(255,255,255,0.5);
        }
        .code-block {
            font-family: 'JetBrains Mono', monospace;
            background-color: #050505;
            padding: 16px;
            border: 1px solid var(--border);
            font-size: 10px;
            color: var(--text-muted);
            margin-top: 40px;
            border-radius: 4px;
        }
        .attribution {
            position: absolute;
            bottom: -60px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.3em;
            font-weight: 700;
        }
    </style>
</head>
<body>
    <div class="noise"></div>
    <div class="container">
        <div class="logo-box"></div>
        <h1>Auth Success</h1>
        <p>Your workspace session has been verified. You can now close this tab and return to the PayloadX desktop application.</p>
        <div class="status-container">
            <div class="status-dot"></div>
            <span>Handshake Verified</span>
        </div>
        <div class="code-block">
            $> payloadx auth --id google_v2 --status success
        </div>
        <div class="attribution">
            Created by Sundan Sharma
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
