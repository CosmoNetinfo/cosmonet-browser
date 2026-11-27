use tauri::{plugin::{Builder, TauriPlugin}, Runtime};
#[cfg(target_os = "android")]
use tauri::Manager;

#[cfg(target_os = "android")]
struct Browser<R: Runtime>(tauri::plugin::PluginHandle<R>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("browser")
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            {
                let handle = _api.register_android_plugin("info.cosmonet.browser.nativebridge", "BrowserPlugin")?;
                _app.manage(Browser(handle));
            }
            Ok(())
        })
        .build()
}

#[cfg(target_os = "android")]
pub fn dispatch<R: Runtime>(app: &tauri::AppHandle<R>, payload: &serde_json::Value) -> Result<serde_json::Value, String> {
    app.state::<Browser<R>>().0.run_mobile_plugin("dispatch", payload)
        .map_err(|_| "Operazione nativa Android non riuscita".into())
}
