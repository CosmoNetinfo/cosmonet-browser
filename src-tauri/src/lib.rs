use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::HashSet, fs, sync::Mutex};
use tauri::{AppHandle, Manager};

#[cfg(desktop)]
mod desktop;
#[cfg(windows)]
mod vault;
#[cfg(windows)]
mod updates;

#[derive(Default)]
struct BrowserState(Mutex<HashSet<String>>);

#[derive(Default)]
struct Presentation { overlay_open:bool, active:Option<String> }
#[derive(Default)]
struct PresentationState(Mutex<Presentation>);

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bounds { pub x: f64, pub y: f64, pub width: f64, pub height: f64 }

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    pub action: String,
    #[serde(default)] pub label: String,
    #[serde(default)] pub url: String,
    #[serde(default)] pub bounds: Option<Bounds>,
    #[serde(default)] pub data: Value,
}

pub fn web_url(input: &str) -> Result<url::Url, String> {
    let parsed = url::Url::parse(input).map_err(|_| "Indirizzo non valido")?;
    if !matches!(parsed.scheme(), "http" | "https") || parsed.host_str().is_none()
        || !parsed.username().is_empty() || parsed.password().is_some() || input.len() > 8192 {
        return Err("Sono consentiti solo indirizzi web http e https senza credenziali".into());
    }
    Ok(parsed)
}

fn trusted_ui(webview: &tauri::Webview) -> bool {
    webview.label() == "main" && webview.url().map(|url| {
        (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
            || (matches!(url.scheme(), "http" | "https") && url.host_str() == Some("tauri.localhost"))
    }).unwrap_or(false)
}

fn validate_bounds(bounds: &Bounds) -> Result<(), String> {
    if [bounds.x, bounds.y, bounds.width, bounds.height].iter().any(|v| !v.is_finite())
        || bounds.x < 0.0 || bounds.y < 0.0 || bounds.width < 1.0 || bounds.height < 1.0
        || bounds.width > 20000.0 || bounds.height > 20000.0 {
        return Err("Dimensioni non valide".into());
    }
    Ok(())
}

fn smoke_mode() -> bool { std::env::args().any(|arg|arg=="--smoke-test") }
fn smoke_url() -> String { if smoke_mode(){std::env::var("COSMO_SMOKE_URL").unwrap_or_default()}else{String::new()} }

fn local_data_dir(app:&AppHandle)->Result<std::path::PathBuf,String> {
    let dir=app.path().app_local_data_dir().map_err(|_|"Archivio locale non disponibile")?;
    fs::create_dir_all(&dir).map_err(|_|"Archivio locale non disponibile")?;
    #[cfg(windows)]
    {
        let previous=app.path().app_data_dir().map_err(|_|"Archivio precedente non disponibile")?;
        if previous!=dir {
            // Migrate only our encrypted vault and preferences. Never import plaintext passwords.
            for name in ["credentials.dpapi","browser-profile.json"] {
                let source=previous.join(name);
                let destination=dir.join(name);
                if source.exists() && !destination.exists() {
                    fs::rename(source,destination).map_err(|_|"Spostamento dei dati nella cartella locale non riuscito")?;
                }
            }
        }
    }
    Ok(dir)
}

fn profile_dir(app:&AppHandle)->Result<std::path::PathBuf,String> {
    if smoke_mode() { return app.path().app_cache_dir().map(|p|p.join("smoke-profile")).map_err(|_|"Archivio non disponibile".into()); }
    local_data_dir(app)
}

#[tauri::command]
async fn browser_command(webview: tauri::Webview, app: AppHandle, mut request: Request) -> Result<Value, String> {
    if !trusted_ui(&webview) { return Err("Comando consentito solo all'interfaccia locale".into()); }
    #[cfg(windows)]
    if matches!(request.action.as_str(),"update_check"|"update_download"|"update_install") {
        let action=request.action.clone();
        return tauri::async_runtime::spawn_blocking(move||updates::dispatch(&app,&action)).await.map_err(|_|"Aggiornamento non disponibile")?;
    }
    if request.action=="smoke_finish" && smoke_mode() {
        let count=app.state::<BrowserState>().0.lock().map_err(|_|"Stato non disponibile")?.len();
        if count!=1 { return Err("Smoke test: numero schede inatteso".into()); }
        if let Ok(path)=std::env::var("COSMO_SMOKE_REPORT") {
            fs::write(path,serde_json::to_vec(&json!({"ok":true,"openTabs":count,"nativePages":request.data})).map_err(|_|"Report non disponibile")?).map_err(|_|"Report non disponibile")?;
        }
        if std::env::var("COSMO_SMOKE_CAPTURE").ok().as_deref()!=Some("1") { app.exit(0); }
        return Ok(json!({"ok":true}));
    }
    if let Some(bounds) = &request.bounds { validate_bounds(bounds)?; }
    if matches!(request.action.as_str(), "create" | "navigate") && request.url != "home" {
        request.url = web_url(&request.url)?.to_string();
    }
    #[cfg(target_os = "android")]
    {
        if matches!(request.action.as_str(), "create" | "navigate") && request.url == "home" {
            if !request.data.is_object() { request.data=json!({}); }
            request.data["html"] = json!(include_str!("../../app/home.html"));
        }
        if request.action == "reader" {
            request.data = json!({"script":include_str!("../../modules/cosmonet-reader/reader.js")});
        }
        if request.action == "console" || request.action == "devtools" {
            request.data = json!({"script":concat!(include_str!("../../app/vendor/eruda.js"),"\n;if(!window.__cosmoEruda){eruda.init();window.__cosmoEruda=true;}eruda.show();")});
        }
    }
    if request.action == "profile_load" || request.action == "profile_save" {
        return profile(&app, &request);
    }
    let global = app.state::<BrowserState>();
    {
        let mut labels = global.0.lock().map_err(|_| "Stato non disponibile")?;
        if !request.label.starts_with("tab-") || request.label.len() > 80
            || !request.label.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
            return Err("Identificativo scheda non valido".into());
        }
        if request.action == "create" {
            if labels.len() >= 32 || labels.contains(&request.label) { return Err("Limite schede raggiunto".into()); }
            labels.insert(request.label.clone());
        } else if !labels.contains(&request.label) { return Err("Scheda non trovata".into()); }
    }
    #[cfg(desktop)]
    let result = desktop::dispatch(&app, &request).await;
    #[cfg(target_os = "android")]
    let result = tauri_plugin_browser::dispatch(&app, &serde_json::to_value(&request).map_err(|_| "Richiesta non valida")?);
    #[cfg(target_os = "ios")]
    let result: Result<Value, String> = Err("Piattaforma non supportata".into());
    if (request.action == "create" && result.is_err()) || (request.action == "close" && result.is_ok()) {
        if let Ok(mut labels) = global.0.lock() { labels.remove(&request.label); }
    }
    result
}

fn profile(app: &AppHandle, request: &Request) -> Result<Value, String> {
    let dir = profile_dir(app)?;
    fs::create_dir_all(&dir).map_err(|_| "Archivio non disponibile")?;
    let file = dir.join("browser-profile.json");
    if request.action == "profile_load" {
        if !file.exists() { return Ok(json!({"theme":if smoke_mode(){std::env::var("COSMO_SMOKE_THEME").unwrap_or("system".into())}else{"system".into()},"engine":"duckduckgo","siteMode":"mobile","rememberHistory":true,"platform":std::env::consts::OS,"version":env!("CARGO_PKG_VERSION"),"bookmarks":[],"history":[],"smoke":smoke_mode(),"smokeUrl":smoke_url()})); }
        if fs::metadata(&file).map_err(|_|"Profilo non disponibile")?.len()>2_000_000 { return Err("Profilo troppo grande".into()); }
        let mut result:Value=serde_json::from_slice(&fs::read(file).map_err(|_| "Lettura non riuscita")?).map_err(|_| "Profilo non valido")?;
        if !result.is_object() { return Err("Profilo non valido".into()); }
        result["smoke"]=json!(smoke_mode());
        result["smokeUrl"]=json!(smoke_url());
        result["platform"]=json!(std::env::consts::OS);
        result["version"]=json!(env!("CARGO_PKG_VERSION"));
        if smoke_mode() { if let Ok(theme)=std::env::var("COSMO_SMOKE_THEME") { result["theme"]=json!(theme); } }
        return Ok(result);
    }
    // Only non-sensitive, bounded preferences are stored in JSON.
    let theme = request.data.get("theme").and_then(Value::as_str).unwrap_or("system");
    if !["system", "light", "dark", "sand"].contains(&theme) { return Err("Tema non valido".into()); }
    let sanitize = |field: &str, limit: usize| -> Vec<Value> {
        request.data.get(field).and_then(Value::as_array).map(|items| items.iter().take(limit).filter_map(|item| {
            let url = web_url(item.get("url")?.as_str()?).ok()?;
            let title: String = item.get("title").and_then(Value::as_str).unwrap_or("").chars().take(256).collect();
            Some(json!({"url":url.as_str(),"title":title}))
        }).collect()).unwrap_or_default()
    };
    let engine=request.data.get("engine").and_then(Value::as_str).unwrap_or("duckduckgo");
    if !["duckduckgo","google","bing"].contains(&engine) { return Err("Motore di ricerca non valido".into()); }
    let mode=request.data.get("siteMode").and_then(Value::as_str).unwrap_or("mobile");
    if !["mobile","desktop"].contains(&mode) { return Err("Modalità sito non valida".into()); }
    let remember=request.data.get("rememberHistory").and_then(Value::as_bool).unwrap_or(true);
    let auto_updates=request.data.get("autoUpdates").and_then(Value::as_bool).unwrap_or(true);
    let safe = json!({"theme":theme,"engine":engine,"siteMode":mode,"rememberHistory":remember,"autoUpdates":auto_updates,"bookmarks":sanitize("bookmarks",500),"history":sanitize("history",1000)});
    let bytes = serde_json::to_vec(&safe).map_err(|_| "Profilo non valido")?;
    let temporary = dir.join("browser-profile.tmp");
    fs::write(&temporary, bytes).map_err(|_| "Salvataggio non riuscito")?;
    fs::rename(temporary, file).map_err(|_| "Salvataggio non riuscito")?;
    Ok(safe)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(BrowserState::default())
        .manage(PresentationState::default())
        .plugin(tauri_plugin_browser::init())
        .plugin(tauri::plugin::Builder::<tauri::Wry>::new("ui-boundary").on_navigation(|webview, url| {
            if webview.label() != "main" { return true; }
            (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
                || (matches!(url.scheme(), "http" | "https") && url.host_str() == Some("tauri.localhost"))
        }).build())
        .setup(|app| {
            #[cfg(windows)]
            if let Some(view)=app.get_webview("main") {
                use windows_core::Interface;
                use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings4;
                view.with_webview(|platform|unsafe{
                    if let Ok(core)=platform.controller().CoreWebView2(){
                        if let Ok(settings)=core.Settings().and_then(|s|s.cast::<ICoreWebView2Settings4>()){
                            let _=settings.SetIsPasswordAutosaveEnabled(false);
                            let _=settings.SetIsGeneralAutofillEnabled(false);
                        }
                    }
                })?;
            }
            if smoke_mode() && std::env::var("COSMO_SMOKE_CAPTURE").ok().as_deref()!=Some("1") { if let Some(window)=app.get_webview_window("main") { let _=window.hide(); } }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![browser_command])
        .run(tauri::generate_context!())
        .expect("Impossibile avviare Cosmo Browser");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn rejects_non_web_targets() {
        for input in ["javascript:alert(1)", "file:///etc/passwd", "data:text/html,x", "tauri://localhost"] {
            assert!(web_url(input).is_err());
        }
        assert!(web_url("https://www.cosmonet.info/").is_ok());
    }
    #[test] fn bounds_reject_nan_and_negative() {
        assert!(validate_bounds(&Bounds{x:0.0,y:0.0,width:f64::NAN,height:100.0}).is_err());
        assert!(validate_bounds(&Bounds{x:-1.0,y:0.0,width:100.0,height:100.0}).is_err());
    }
}
