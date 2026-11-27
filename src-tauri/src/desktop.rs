use crate::{Bounds, BrowserState, PresentationState, Request};
use serde_json::{json, Value};
use tauri::{webview::{NewWindowResponse, PageLoadEvent, WebviewBuilder}, AppHandle, Emitter, Manager, WebviewUrl};

fn event(app: &AppHandle, data: Value) { let _ = app.emit_to("main", "browser-event", data); }

fn sync_visibility(app:&AppHandle)->Result<(),String> {
    let presentation=app.state::<PresentationState>();
    let presentation=presentation.0.lock().map_err(|_|"Stato non disponibile")?;
    let labels=app.state::<BrowserState>().0.lock().map_err(|_|"Stato non disponibile")?.clone();
    for label in labels {
        if let Some(view)=app.get_webview(&label) {
            if !presentation.overlay_open && presentation.active.as_ref()==Some(&label) {view.show().map_err(|_|"Scheda non disponibile")?;}
            else {view.hide().map_err(|_|"Scheda non disponibile")?;}
        }
    }
    Ok(())
}

fn state(app: &AppHandle, label: &str) {
    #[cfg(windows)]
    if let Some(view) = app.get_webview(label) {
        let app = app.clone(); let label = label.to_string();
        let _ = view.with_webview(move |platform| unsafe {
            if let Ok(core) = platform.controller().CoreWebView2() {
                let mut back = Default::default(); let mut forward = Default::default();
                let _ = core.CanGoBack(&mut back); let _ = core.CanGoForward(&mut forward);
                event(&app, json!({"label":label,"back":back.as_bool(),"forward":forward.as_bool()}));
            }
        });
    }
}

fn target(input: &str) -> Result<WebviewUrl, String> {
    if input == "home" { return Ok(WebviewUrl::App("home.html".into())); }
    Ok(WebviewUrl::External(crate::web_url(input)?))
}

pub async fn dispatch(app: &AppHandle, request: &Request) -> Result<Value, String> {
    let label = &request.label;
    match request.action.as_str() {
        "create" => {
            let bounds = request.bounds.as_ref().ok_or("Dimensioni mancanti")?;
            let nav_app = app.clone(); let nav_label = label.clone();
            let pop_app = app.clone();
            let builder = WebviewBuilder::new(label, target(&request.url)?)
                .on_navigation(move |url| {
                    let allowed = matches!(url.scheme(), "http" | "https" | "tauri" | "about");
                    if allowed { event(&nav_app, json!({"label":nav_label,"url":url.as_str()})); }
                    allowed
                })
                .on_document_title_changed(|view, title| {
                    event(view.app_handle(), json!({"label":view.label(),"title":title}));
                })
                .on_page_load(|view, page| {
                    event(view.app_handle(), json!({"label":view.label(),"url":page.url().as_str(),
                        "loading":matches!(page.event(),PageLoadEvent::Started)}));
                    state(view.app_handle(), view.label());
                })
                .on_new_window(move |url, _| {
                    if crate::web_url(url.as_str()).is_ok() { event(&pop_app,json!({"newTab":url.as_str()})); }
                    NewWindowResponse::Deny
                });
            let window = app.get_window("main").ok_or("Finestra principale non disponibile")?;
            let view = window.add_child(builder, tauri::LogicalPosition::new(bounds.x, bounds.y),
                tauri::LogicalSize::new(bounds.width,bounds.height)).map_err(|_| "Creazione scheda non riuscita")?;
            #[cfg(windows)] {
                use windows_core::Interface;
                use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings4;
                view.with_webview(|platform| unsafe {
                    if let Ok(core)=platform.controller().CoreWebView2() {
                        if let Ok(settings)=core.Settings().and_then(|s|s.cast::<ICoreWebView2Settings4>()) {
                            let _=settings.SetIsPasswordAutosaveEnabled(false);
                            let _=settings.SetIsGeneralAutofillEnabled(false);
                        }
                    }
                }).map_err(|_|"Configurazione privacy non riuscita")?;
            }
            view.hide().map_err(|_| "Creazione scheda non riuscita")?;
        }
        "activate" => {
            app.state::<PresentationState>().0.lock().map_err(|_|"Stato non disponibile")?.active=Some(label.clone());
            sync_visibility(app)?;
            state(app, label);
        }
        "overlay" => {
            let open=request.data.get("open").and_then(Value::as_bool).ok_or("Stato pannello non valido")?;
            app.state::<PresentationState>().0.lock().map_err(|_|"Stato non disponibile")?.overlay_open=open;
            sync_visibility(app)?;
        }
        #[cfg(windows)]
        "visibility" if crate::smoke_mode() => {
            let labels=app.state::<BrowserState>().0.lock().map_err(|_|"Stato non disponibile")?.clone();
            let mut visible=0;
            for label in labels {
                if let Some(view)=app.get_webview(&label) {
                    let (tx,rx)=std::sync::mpsc::channel();
                    view.with_webview(move|platform|unsafe{
                        let mut flag=Default::default();
                        let result=platform.controller().IsVisible(&mut flag).map(|_|flag.as_bool()).unwrap_or(false);
                        let _=tx.send(result);
                    }).map_err(|_|"Visibilità non disponibile")?;
                    if rx.recv_timeout(std::time::Duration::from_secs(5)).map_err(|_|"Verifica visibilità scaduta")? {visible+=1;}
                }
            }
            return Ok(json!({"visible":visible}));
        }
        "hide" => { if let Some(view)=app.get_webview(label) { view.hide().map_err(|_|"Scheda non disponibile")?; } }
        "bounds" => {
            let b: &Bounds = request.bounds.as_ref().ok_or("Dimensioni mancanti")?;
            app.get_webview(label).ok_or("Scheda non trovata")?.set_bounds(tauri::Rect {
                position:tauri::LogicalPosition::new(b.x,b.y).into(),
                size:tauri::LogicalSize::new(b.width,b.height).into(),
            }).map_err(|_| "Ridimensionamento non riuscito")?;
        }
        "navigate" => {
            let view=app.get_webview(label).ok_or("Scheda non trovata")?;
            if request.url == "home" {
                // Resolve the app URL through a new local page, without trusting remote JS.
                let mut url=app.get_webview("main").ok_or("Interfaccia non disponibile")?.url().map_err(|_|"URL non disponibile")?;
                url.set_path("/home.html"); url.set_query(None); url.set_fragment(None);
                view.navigate(url).map_err(|_|"Navigazione non riuscita")?;
            } else { view.navigate(crate::web_url(&request.url)?).map_err(|_|"Navigazione non riuscita")?; }
        }
        "reload" => app.get_webview(label).ok_or("Scheda non trovata")?.reload().map_err(|_|"Ricaricamento non riuscito")?,
        "back" | "forward" => {
            let view=app.get_webview(label).ok_or("Scheda non trovata")?;
            #[cfg(windows)] {
                let back=request.action=="back";
                view.with_webview(move |platform| unsafe {
                    if let Ok(core)=platform.controller().CoreWebView2() {
                        if back { let _=core.GoBack(); } else { let _=core.GoForward(); }
                    }
                }).map_err(|_|"Navigazione non riuscita")?;
            }
        }
        "close" => { if let Some(view)=app.get_webview(label) { view.close().map_err(|_|"Chiusura non riuscita")?; } }
        "devtools" => app.get_webview(label).ok_or("Scheda non trovata")?.open_devtools(),
        "console" => {
            app.get_webview(label).ok_or("Scheda non trovata")?.eval(concat!(include_str!("../../app/vendor/eruda.js"),"\n;if(!window.__cosmoEruda){eruda.init();window.__cosmoEruda=true;}eruda.show();")).map_err(|_|"Console non disponibile")?;
        }
        "theme" => {
            let view=app.get_webview(label).ok_or("Scheda non trovata")?;
            let url=view.url().map_err(|_|"URL non disponibile")?;
            if url.path()=="/home.html" && matches!(url.host_str(),Some("localhost"|"tauri.localhost")) {
                let theme=request.data.get("theme").and_then(Value::as_str).unwrap_or("system");
                if !["system","light","dark","sand"].contains(&theme){return Err("Tema non valido".into());}
                view.eval(format!("document.documentElement.dataset.theme={};",serde_json::to_string(theme).unwrap())).map_err(|_|"Tema non disponibile")?;
            }
        }
        "reader" => {
            let view=app.get_webview(label).ok_or("Scheda non trovata")?;
            let url=view.url().map_err(|_|"URL non disponibile")?;
            if url.scheme()!="https" || !matches!(url.host_str(),Some("www.cosmonet.info"|"cosmonet.info")) {
                return Err("Il modulo Lettura CosmoNet funziona solo su cosmonet.info".into());
            }
            view.eval(include_str!("../../modules/cosmonet-reader/reader.js")).map_err(|_|"Modulo non disponibile")?;
        }
        #[cfg(windows)]
        "vault_list" | "vault_save" | "vault_delete" | "vault_fill" => return crate::vault::dispatch(app,request),
        _ => return Err("Operazione non supportata".into()),
    }
    Ok(json!({}))
}
