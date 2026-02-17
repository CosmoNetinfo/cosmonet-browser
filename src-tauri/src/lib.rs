use tauri::{command, AppHandle, Manager, Runtime, webview::WebviewBuilder};
use serde_json::{json, Value};
use std::fs;

// --- Gestione Browser View (Vero Browser) ---

#[command]
async fn create_browser_window<R: Runtime>(
    app: AppHandle<R>,
    label: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    // Crea la finestra contenuto in modo sicuro
    let tauri_url = if url.starts_with("http") {
        match tauri::Url::parse(&url) {
            Ok(u) => tauri::WebviewUrl::External(u),
            Err(e) => return Err(format!("URL non valido: {}", e)),
        }
    } else if url.ends_with(".html") || !url.contains('.') {
        tauri::WebviewUrl::App(url.clone().into())
    } else {
        match tauri::Url::parse(&format!("https://{}", url)) {
            Ok(u) => tauri::WebviewUrl::External(u),
            Err(e) => return Err(format!("URL non valido: {}", e)),
        }
    };

    // Se esiste già, naviga e ridimensiona
    if let Some(webview) = app.get_webview(&label) {
        if let tauri::WebviewUrl::External(u) = tauri_url {
            webview.navigate(u).map_err(|e| e.to_string())?;
        } else if let tauri::WebviewUrl::App(p) = tauri_url {
            let js = format!("window.location.href = '{}'", p.to_string_lossy().replace("'", "\\'"));
            let _ = webview.eval(&js);
        }
        // Aggiorna posizione/dimensione (Relativa alla finestra)
        let _ = webview.set_position(tauri::LogicalPosition { x, y });
        let _ = webview.set_size(tauri::LogicalSize { width, height });
        // In Tauri 2.x v2 Webviews non sono finestre, quindi non hanno show() ma set_visible()
        // Tuttavia, a volte è necessario rinfrescare lo stato
        return Ok(());
    }

    let main_window = app.get_webview_window("main").ok_or("Main window not found")?;

    // In Tauri 2.x, Manager::create_webview è l'API pubblica per aggiungere un webview a una finestra.
    // Questo lo rende parte integrante della finestra (non una finestra separata).
    let _webview = app.create_webview(
        label,
        tauri_url,
        main_window.as_ref().clone(), // Passiamo la finestra a cui agganciarlo
        tauri::LogicalPosition { x, y },
        tauri::LogicalSize { width, height }
    ).map_err(|e: tauri::Error| e.to_string())?;

    Ok(())
}

#[command]
async fn close_browser_window<R: Runtime>(app: AppHandle<R>, label: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&label) {
        webview.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
async fn set_browser_visibility<R: Runtime>(app: AppHandle<R>, label: String, visible: bool) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&label) {
        if visible {
            webview.show().map_err(|e| e.to_string())?;
            webview.set_focus().map_err(|e| e.to_string())?;
        } else {
            webview.hide().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[command]
async fn resize_browser_window<R: Runtime>(app: AppHandle<R>, label: String, x: f64, y: f64, width: f64, height: f64) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&label) {
        let _ = webview.set_position(tauri::LogicalPosition { x, y });
        let _ = webview.set_size(tauri::LogicalSize { width, height });
    }
    Ok(())
}

#[command]
async fn navigate_browser<R: Runtime>(app: AppHandle<R>, label: String, url: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&label) {
        // URL locali (es. home.html)
        if url.ends_with(".html") || url == "home" || (!url.starts_with("http") && !url.contains('.')) {
            let path = if url == "home" { "home.html" } else { &url };
            let js = format!("window.location.href = '{}'", path.replace("'", "\\'"));
            let _ = webview.eval(&js);
            return Ok(());
        }
        
        let target_url = if url.starts_with("http") { url } else { format!("https://{}", url) };
        if let Ok(u) = tauri::Url::parse(&target_url) {
            webview.navigate(u).map_err(|e| e.to_string())?;
        } else {
            let js = format!("window.location.href = '{}'", target_url.replace("'", "\\'"));
            let _ = webview.eval(&js);
        }
    }
    Ok(())
}

#[command]
async fn webview_reload<R: Runtime>(app: AppHandle<R>, label: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&label) {
        let _ = webview.eval("location.reload()");
    }
    Ok(())
}

#[command]
async fn open_browser_devtools<R: Runtime>(app: AppHandle<R>, label: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&label) {
        #[cfg(debug_assertions)]
        {
            webview.open_devtools();
        }
        
        let _ = webview.eval("if (window.eruda) { eruda.show() } else { console.log('DevTools requested'); }");
    }
    Ok(())
}

// --- Comandi Esistenti ---

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
    fs::write(path, serde_json::to_string_pretty(&bookmarks).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
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
    fs::write(path, serde_json::to_string_pretty(&history).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

#[command]
async fn load_settings<R: Runtime>(app: AppHandle<R>) -> Result<Value, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("settings.json");
    if path.exists() {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(json!({}))
    }
}

#[command]
async fn save_settings<R: Runtime>(app: AppHandle<R>, settings: Value) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("settings.json");
    fs::write(path, serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
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
    fs::write(path, serde_json::to_string_pretty(&passwords).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

#[command]
async fn get_app_path<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    app.path().app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[command]
async fn webview_go_back<R: Runtime>(app: AppHandle<R>, label: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&label) {
        webview.eval("history.back()").map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[command]
async fn webview_go_forward<R: Runtime>(app: AppHandle<R>, label: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&label) {
        webview.eval("history.forward()").map_err(|e: tauri::Error| e.to_string())?;
    }
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
            load_history, save_history,
            load_settings, save_settings,
            load_passwords, save_passwords,
            get_app_path,
            fetch_rss,
            // Nuovi comandi browser
            create_browser_window,
            resize_browser_window,
            navigate_browser,
            webview_reload,
            open_browser_devtools,
            webview_go_back,
            webview_go_forward,
            close_browser_window,
            set_browser_visibility
        ])
        .setup(|_app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

