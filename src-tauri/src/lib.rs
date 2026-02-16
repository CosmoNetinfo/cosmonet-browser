use tauri::{command, AppHandle, Manager, Runtime};
use serde_json::{json, Value};
use std::fs;
// use url::Url;

#[command]
async fn load_bookmarks<R: Runtime>(app: AppHandle<R>) -> Result<Value, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("bookmarks.json");
    if path.exists() {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(json!([]))
    }
}

#[command]
async fn save_bookmarks<R: Runtime>(app: AppHandle<R>, bookmarks: Value) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("bookmarks.json");
    let content = serde_json::to_string_pretty(&bookmarks).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[command]
async fn load_settings<R: Runtime>(app: AppHandle<R>) -> Result<Value, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("settings.json");
    if path.exists() {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(json!(null))
    }
}

#[command]
async fn save_settings<R: Runtime>(app: AppHandle<R>, settings: Value) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("settings.json");
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[command]
async fn load_history<R: Runtime>(app: AppHandle<R>) -> Result<Value, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("history.json");
    if path.exists() {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(json!([]))
    }
}

#[command]
async fn save_history<R: Runtime>(app: AppHandle<R>, history: Value) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("history.json");
    let content = serde_json::to_string_pretty(&history).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[command]
async fn load_passwords<R: Runtime>(app: AppHandle<R>) -> Result<Value, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("passwords.json");
    if path.exists() {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(json!([]))
    }
}

#[command]
async fn save_passwords<R: Runtime>(app: AppHandle<R>, passwords: Value) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("passwords.json");
    let content = serde_json::to_string_pretty(&passwords).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[command]
async fn get_app_path<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    app.path().app_data_dir().map(|p| p.to_string_lossy().to_string()).map_err(|e| e.to_string())
}

#[command]
async fn create_webview<R: Runtime>(
    _app: AppHandle<R>, 
    _id: String, 
    _url: String, 
    _x: f64, 
    _y: f64, 
    _width: f64, 
    _height: f64
) -> Result<(), String> {
    // Stub per ora, contenuto gestito via iframe nel frontend per stabilità
    Ok(())
}

#[command]
async fn update_webview_bounds<R: Runtime>(
    _app: AppHandle<R>, 
    _id: String, 
    _x: f64, 
    _y: f64, 
    _width: f64, 
    _height: f64
) -> Result<(), String> {
    Ok(())
}

#[command]
async fn set_webview_visibility<R: Runtime>(
    _app: AppHandle<R>, 
    _id: String, 
    _visible: bool
) -> Result<(), String> {
    Ok(())
}

#[command]
async fn navigate_webview<R: Runtime>(
    _app: AppHandle<R>, 
    _id: String, 
    _url: String
) -> Result<(), String> {
    Ok(())
}

#[command]
async fn webview_go_back<R: Runtime>(_app: AppHandle<R>, _id: String) -> Result<(), String> {
    Ok(())
}

#[command]
async fn webview_go_forward<R: Runtime>(_app: AppHandle<R>, _id: String) -> Result<(), String> {
    Ok(())
}

#[command]
async fn webview_reload<R: Runtime>(_app: AppHandle<R>, _id: String) -> Result<(), String> {
    Ok(())
}

#[command]
async fn fetch_rss() -> Result<String, String> {
    let url = "https://www.cosmonet.info/feed/";
    let client = reqwest::Client::builder()
        .user_agent("CosmonetBrowser/1.0")
        .build()
        .map_err(|e| e.to_string())?;
        
    let response = client.get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
        
    response.text().await.map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_log::Builder::new()
            .target(tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout))
            .build())
        .invoke_handler(tauri::generate_handler![
            load_bookmarks, save_bookmarks,
            load_settings, save_settings,
            load_history, save_history,
            load_passwords, save_passwords,
            get_app_path, create_webview,
            update_webview_bounds, set_webview_visibility,
            navigate_webview, webview_go_back,
            webview_go_forward, webview_reload,
            fetch_rss
        ])
        .setup(|_app| {
            // Qui andrà la logica del menu di sistema se necessaria
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
