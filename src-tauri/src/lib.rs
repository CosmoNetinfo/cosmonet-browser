use serde_json::{json, Value};
use std::fs;
use tauri::{command, AppHandle, Manager, Runtime, Emitter};


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
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("bookmarks.json");
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
        Ok(Value::Null)
    }
}

#[command]
async fn save_settings<R: Runtime>(app: AppHandle<R>, settings: Value) -> Result<(), String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("settings.json");
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[command]
async fn get_app_path<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    app.path().app_data_dir().map(|p| p.to_string_lossy().to_string()).map_err(|e| e.to_string())
}

// Simplified webview management - tabs are handled in the frontend
// These commands are kept for compatibility but do minimal work
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
    // In Tauri 2.0, we use a single webview with frontend tab management
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())

        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_bookmarks,
            save_bookmarks,
            load_settings,
            save_settings,
            get_app_path,
            create_webview,
            update_webview_bounds,
            set_webview_visibility,
            navigate_webview,
            webview_go_back,
            webview_go_forward,
            webview_reload
        ])
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem, Submenu, PredefinedMenuItem};

            let handle = app.handle();
            
            // File Menu
            let file_menu = Submenu::with_items(handle, "File", true, &[
                &MenuItem::with_id(handle, "new-tab", "Nuova Tab", true, Some("CmdOrCtrl+T"))?,
                &MenuItem::with_id(handle, "close-tab", "Chiudi Tab", true, Some("CmdOrCtrl+W"))?,
                &PredefinedMenuItem::separator(handle)?,
                &PredefinedMenuItem::quit(handle, None)?,
            ])?;

            // Edit Menu
            let edit_menu = Submenu::with_items(handle, "Modifica", true, &[
                &PredefinedMenuItem::undo(handle, None)?,
                &PredefinedMenuItem::redo(handle, None)?,
                &PredefinedMenuItem::separator(handle)?,
                &PredefinedMenuItem::cut(handle, None)?,
                &PredefinedMenuItem::copy(handle, None)?,
                &PredefinedMenuItem::paste(handle, None)?,
            ])?;

            // View Menu
            let view_menu = Submenu::with_items(handle, "Visualizza", true, &[
                &MenuItem::with_id(handle, "reload-tab", "Ricarica", true, Some("CmdOrCtrl+R"))?,
                &PredefinedMenuItem::separator(handle)?,
                &MenuItem::with_id(handle, "zoom-in", "Zoom In", true, Some("CmdOrCtrl+Plus"))?,
                &MenuItem::with_id(handle, "zoom-out", "Zoom Out", true, Some("CmdOrCtrl+-"))?,
                &MenuItem::with_id(handle, "zoom-reset", "Zoom Reset", true, Some("CmdOrCtrl+0"))?,
                &PredefinedMenuItem::separator(handle)?,
                &PredefinedMenuItem::fullscreen(handle, None)?,
            ])?;

            // Tools Menu
            let tools_menu = Submenu::with_items(handle, "Strumenti", true, &[
                &MenuItem::with_id(handle, "devtools", "Console sviluppatore", true, Some("F12".to_string()))?,
            ])?;

            // Help Menu
            let help_menu = Submenu::with_items(handle, "Aiuto", true, &[
                &MenuItem::with_id(handle, "visit-site", "Visita cosmonet.info", true, None::<String>)?,
                &MenuItem::with_id(handle, "about", "Informazioni", true, None::<String>)?,
            ])?;

            let menu = Menu::with_items(handle, &[
                &file_menu,
                &edit_menu,
                &view_menu,
                &tools_menu,
                &help_menu,
            ])?;

            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                match event.id.as_ref() {
                    "new-tab" => { let _ = app_handle.emit("new-tab", ()); }
                    "close-tab" => { let _ = app_handle.emit("close-tab", ()); }
                    "reload-tab" => { let _ = app_handle.emit("reload-tab", ()); }
                    "visit-site" => { let _ = app_handle.emit("navigate-to", "https://www.cosmonet.info/"); }
                    "about" => {
                        use tauri_plugin_dialog::DialogExt;
                        app_handle.dialog()
                            .message("Cosmonet Browser v1.2.1\n\nBrowser personalizzato per cosmonet.info\n\nSviluppato con Tauri 2.0\n© 2026 Cosmonet.info")
                            .title("Informazioni")
                            .show(|_| {});
                    }
                    _ => {}
                }
            });

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
