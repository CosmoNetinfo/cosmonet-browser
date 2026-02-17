use tauri::{command, AppHandle, Manager, Runtime, WebviewWindowBuilder, WebviewUrl, Listener, Emitter, Webview};
use serde_json::{json, Value};
use std::fs;
use url::Url;

// --- Gestione Browser View (Vero Browser) ---

#[command]
async fn create_browser_window<R: Runtime>(app: AppHandle<R>, label: String, url: String, y_offset: f64, height: f64) -> Result<(), String> {
    // Se esiste già, naviga
    if let Some(window) = app.get_webview_window(&label) {
        window.eval(&format!("window.location.href = '{}'", url)).map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Crea la finestra contenuto in modo sicuro
    let tauri_url = if url.starts_with("http") {
        match url::Url::parse(&url) {
            Ok(u) => tauri::WebviewUrl::External(u),
            Err(e) => return Err(format!("URL non valido: {}", e)),
        }
    } else {
        // Se non è un URL assoluto, prova a interpretarlo come percorso app o premetti https
        match url::Url::parse(&format!("https://{}", url)) {
            Ok(u) => tauri::WebviewUrl::External(u),
            Err(e) => return Err(format!("URL non valido: {}", e)),
        }
    };

    let main_window = app.get_webview_window("main").ok_or("Main window not found")?;

    let child = WebviewWindowBuilder::new(&app, &label, tauri_url)
        .title("Content")
        .decorations(false)
        .resizable(false)
        .visible(false)
        .skip_taskbar(true)
        .parent(&main_window).map_err(|e| e.to_string())?
        .build();

    let child = match child {
        Ok(c) => c,
        Err(e) => {
            println!("Errore fatale creazione finestra {}: {}", label, e);
            return Err(e.to_string());
        }
    };

    // Listener eventi navigazione per barra caricamento e titoli
    let app_handle = app.clone();
    let l_label = label.clone();
    
    // Temporaneamente commentati per garantire la compilazione stabile e il test della navigazione
    /*
    child.on_navigation(move |url: &tauri::Url| {
        let _ = app_handle.emit(&format!("browser-loading-{}", l_label), json!({ "url": url.to_string(), "loading": true }));
        true
    });

    let app_handle_2 = app.clone();
    let l_label_2 = label.clone();
    child.on_page_load(move |_payload: tauri::webview::PageLoadPayload| {
        let _ = app_handle_2.emit(&format!("browser-loaded-{}", l_label_2), json!({ "url": "", "loading": false }));
    });
    */

    child.show().map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
async fn close_browser_window<R: Runtime>(app: AppHandle<R>, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
async fn set_browser_visibility<R: Runtime>(app: AppHandle<R>, label: String, visible: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        if visible {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        } else {
            window.hide().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[command]
async fn resize_browser_window<R: Runtime>(app: AppHandle<R>, label: String, x: f64, y: f64, width: f64, height: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y })).map_err(|e| e.to_string())?;
        window.set_size(tauri::Size::Logical(tauri::LogicalSize { width, height })).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
async fn navigate_browser<R: Runtime>(app: AppHandle<R>, label: String, url: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        let target_url = if url.starts_with("http") { url } else { format!("https://{}", url) };
        let js = format!("window.location.href = '{}'", target_url.replace("'", "\\'"));
        let _ = window.eval(&js);
    }
    Ok(())
}

#[command]
async fn webview_reload<R: Runtime>(app: AppHandle<R>, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.eval("location.reload()");
    }
    Ok(())
}

#[command]
async fn open_browser_devtools<R: Runtime>(app: AppHandle<R>, label: String) -> Result<(), String> {
    #[cfg(debug_assertions)]
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.open_devtools();
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
    if let Some(window) = app.get_webview_window(&label) {
        window.eval("history.back()").map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[command]
async fn webview_go_forward<R: Runtime>(app: AppHandle<R>, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.eval("history.forward()").map_err(|e: tauri::Error| e.to_string())?;
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

