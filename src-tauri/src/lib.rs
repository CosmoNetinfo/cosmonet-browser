use tauri::{command, AppHandle, Manager, Runtime, WebviewWindowBuilder, WebviewUrl, Listener};
use serde_json::{json, Value};
use std::fs;

// --- Gestione Browser View (Vero Browser) ---

#[command]
async fn create_browser_window<R: Runtime>(app: AppHandle<R>, url: String, y_offset: f64, height: f64) -> Result<(), String> {
    let label = "content_view";
    
    // Se esiste già, chiudila per ricrearla o naviga?
    if let Some(window) = app.webview_window(label) {
        window.eval(&format!("window.location.href = '{}'", url)).map_err(|e| e.to_string())?;
        return Ok(());
    }

    let main_window = app.webview_window("main").ok_or("Main window not found")?;
    let main_pos = main_window.outer_position().map_err(|e| e.to_string())?;
    let main_size = main_window.inner_size().map_err(|e| e.to_string())?; // Usa inner size per larghezza corretta nel contenuto

    // Crea la finestra contenuto
    let child = WebviewWindowBuilder::new(&app, label, WebviewUrl::External(url.parse().unwrap()))
        .title("Content")
        .decorations(false)
        .resizable(false) // Gestito dalla main
        .visible(false) // Mostra dopo setup
        .skip_taskbar(true)
        .build()
        .map_err(|e| e.to_string())?;

    // Posizionamento iniziale (Sovrapposto alla main window, sotto la toolbar)
    // Nota: Coordinate desktop assolute.
    // Dobbiamo calcolare la posizione relativa al monitor e alla finestra madre.
    // Per ora facciamo un posizionamento semplice. UX migliore richiede hook resize.
    
    // child.set_position(...) - Questo è complesso da sincronizzare perfettamente. 
    // Un approccio migliore per Tauri v2 è usare event hook nel frontend che chiama resize.

    child.show().map_err(|e| e.to_string())?;
    
    // Setup eventi navigazione per aggiornare URL bar
    let app_handle = app.clone();
    child.on_window_event(move |event| {
        if let tauri::WindowEvent::ThemeChanged(_) = event {
            // ...
        }
    });

    Ok(())
}

#[command]
async fn resize_browser_window<R: Runtime>(app: AppHandle<R>, x: f64, y: f64, width: f64, height: f64) -> Result<(), String> {
    if let Some(window) = app.webview_window("content_view") {
        // Le coordinate arrivano dal frontend (dom client rect)
        // Dobbiamo convertirle in coordinate schermo se la window è child o popup
        
        // Per semplicità "Vero Browser MVP": 
        // Faremo navigare la finestra MAIN se non riusciamo a fare l'embedding perfetto oggi.
        // Ma l'utente vuole un browser.
        
        window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: x as i32, y: y as i32 })).map_err(|e| e.to_string())?;
        window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: width as u32, height: height as u32 })).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
async fn navigate_browser<R: Runtime>(app: AppHandle<R>, url: String) -> Result<(), String> {
    if let Some(window) = app.webview_window("content_view") {
         window.eval(&format!("window.location.href = '{}'", url)).map_err(|e| e.to_string())?;
    } else {
        // Fallback: crea finestra
        create_browser_window(app, url, 100.0, 800.0).await?;
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
        .plugin(tauri_plugin_webview::init())
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
