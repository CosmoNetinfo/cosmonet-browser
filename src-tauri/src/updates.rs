use serde_json::{json,Value};
use sha2::{Digest,Sha256};
use std::{fs,io::{Read,Write},sync::Mutex,time::Duration};
use tauri::{AppHandle,Manager};

const API:&str="https://api.github.com/repos/CosmoNetinfo/cosmonet-browser/releases?per_page=30";
fn hex(bytes:&[u8])->String { bytes.iter().map(|byte|format!("{byte:02x}")).collect() }
#[derive(Clone,PartialEq)]
struct Update { version:semver::Version,url:String,digest:String,size:u64 }
struct State { selected:Option<Update>, ready:Option<std::path::PathBuf> }
static STATE:Mutex<State>=Mutex::new(State{selected:None,ready:None});

fn select(releases:&Value,current:&semver::Version)->Option<Update> {
    releases.as_array()?.iter().filter_map(|r|{
        if r["draft"].as_bool()!=Some(false){return None;}
        let tag=r["tag_name"].as_str()?;
        let version=semver::Version::parse(tag.strip_prefix('v')?).ok()?;
        if &version<=current || !version.pre.is_empty() || !version.build.is_empty(){return None;}
        let name=format!("Cosmo-Browser-{version}-Windows-x64-Setup.exe");
        let asset=r["assets"].as_array()?.iter().find(|a|a["name"].as_str()==Some(&name))?;
        let digest=asset["digest"].as_str()?.strip_prefix("sha256:")?;
        if digest.len()!=64 || !digest.bytes().all(|b|b.is_ascii_hexdigit() && !b.is_ascii_uppercase()){return None;}
        let url=asset["browser_download_url"].as_str()?;
        if url!=format!("https://github.com/CosmoNetinfo/cosmonet-browser/releases/download/{tag}/{name}"){return None;}
        let size=asset["size"].as_u64()?;
        if !(1..=100_000_000).contains(&size){return None;}
        Some(Update{version,url:url.into(),digest:digest.into(),size})
    }).max_by(|a,b|a.version.cmp(&b.version))
}
fn client()->Result<reqwest::blocking::Client,String> {
    reqwest::blocking::Client::builder().user_agent("CosmoBrowser-Updater").timeout(Duration::from_secs(180))
        .connect_timeout(Duration::from_secs(15)).https_only(true)
        .redirect(reqwest::redirect::Policy::custom(|attempt|{
            if attempt.previous().len()>=6 {return attempt.error("Troppi reindirizzamenti");}
            if matches!(attempt.url().host_str(),Some("api.github.com"|"github.com"|"release-assets.githubusercontent.com"|"objects.githubusercontent.com")) {
                attempt.follow()
            }else{attempt.error("Destinazione aggiornamento non consentita")}
        })).build().map_err(|_|"Client aggiornamenti non disponibile".into())
}
pub fn dispatch(app:&AppHandle,action:&str)->Result<Value,String> {
    let mut state=STATE.try_lock().map_err(|_|"Aggiornamento già in corso")?;
    let error=||"Aggiornamento non riuscito. Controlla la connessione; sono accettati solo pacchetti ufficiali con checksum valido.".to_string();
    match action {
        "update_check"=>{
            let mut response=client()?.get(API).header("Accept","application/vnd.github+json").send().map_err(|_|error())?.error_for_status().map_err(|_|error())?;
            let mut bytes=vec![];response.by_ref().take(2_000_001).read_to_end(&mut bytes).map_err(|_|error())?;
            if bytes.len()>2_000_000 {return Err(error());}
            let releases:Value=serde_json::from_slice(&bytes).map_err(|_|error())?;
            let current=semver::Version::parse(env!("CARGO_PKG_VERSION")).map_err(|_|error())?;
            let update=select(&releases,&current);
            if state.selected!=update {state.ready=None;}
            state.selected=update;
            Ok(json!({"available":state.selected.is_some(),"version":state.selected.as_ref().map(|u|u.version.to_string()).unwrap_or(current.to_string()),"ready":state.ready.is_some()}))
        }
        "update_download"=>{
            let update=state.selected.clone().ok_or("Controlla prima gli aggiornamenti")?;
            state.ready=None;
            let dir=app.path().app_cache_dir().map_err(|_|error())?.join("updates");
            fs::create_dir_all(&dir).map_err(|_|error())?;
            let temporary=dir.join("browser-setup.exe.tmp");let file=dir.join("browser-setup.exe");
            let result=(||{
                let mut response=client()?.get(&update.url).send().map_err(|_|error())?.error_for_status().map_err(|_|error())?;
                let mut output=fs::File::create(&temporary).map_err(|_|error())?;
                let mut hash=Sha256::new();let mut length=0u64;let mut buffer=[0u8;65536];
                loop {let n=response.read(&mut buffer).map_err(|_|error())?;if n==0 {break;}length+=n as u64;if length>update.size {return Err(error());}hash.update(&buffer[..n]);output.write_all(&buffer[..n]).map_err(|_|error())?;}
                output.sync_all().map_err(|_|error())?;drop(output);
                if length!=update.size || hex(&hash.finalize())!=update.digest{return Err(error());}
                fs::rename(&temporary,&file).map_err(|_|error())?;
                Ok(())
            })();
            if result.is_err(){let _=fs::remove_file(&temporary);}result?;
            state.ready=Some(file);Ok(json!({"ready":true,"version":update.version.to_string()}))
        }
        "update_install"=>{
            let file=state.ready.as_ref().ok_or("Scarica prima l'aggiornamento")?;
            let expected=state.selected.as_ref().ok_or("Aggiornamento non disponibile")?;
            // Recheck the downloaded executable immediately before handing it to Windows.
            let bytes=fs::read(file).map_err(|_|error())?;
            if bytes.len() as u64!=expected.size || hex(&Sha256::digest(&bytes))!=expected.digest{return Err(error());}
            std::process::Command::new(file).spawn().map_err(|_|"Avvio installer non riuscito")?;
            app.exit(0);Ok(json!({"installerOpened":true}))
        }
        _=>Err("Operazione non supportata".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn release(version:&str)->Value {let name=format!("Cosmo-Browser-{version}-Windows-x64-Setup.exe");json!({"draft":false,"tag_name":format!("v{version}"),"assets":[{"name":name,"size":123,"digest":format!("sha256:{}","a".repeat(64)),"browser_download_url":format!("https://github.com/CosmoNetinfo/cosmonet-browser/releases/download/v{version}/{name}")}]})}
    #[test] fn rejects_downgrades_foreign_assets_and_missing_hashes(){
        let current=semver::Version::parse("0.3.1").unwrap();
        assert!(select(&json!([release("0.3.0")]),&current).is_none());
        assert!(select(&json!([release("0.3.1")]),&current).is_none());
        let mut bad=release("0.3.2");bad["assets"][0]["browser_download_url"]=json!("https://example.com/update.exe");
        assert!(select(&json!([bad]),&current).is_none());
        let mut bad=release("0.3.2");bad["assets"][0]["digest"]=Value::Null;
        assert!(select(&json!([bad]),&current).is_none());
        let mut draft=release("0.4.0");draft["draft"]=json!(true);
        assert_eq!(select(&json!([release("0.3.2"),draft,release("0.3.3")]),&current).unwrap().version.to_string(),"0.3.3");
    }
    #[test]
    #[ignore = "Explicit network integration check; not part of the offline suite"]
    fn live_official_release_feed(){
        let response=client().unwrap().get(API).header("Accept","application/vnd.github+json").send().unwrap().error_for_status().unwrap();
        let releases:Value=response.json().unwrap();
        let update=select(&releases,&semver::Version::parse("0.0.0").unwrap()).expect("An official release with a valid Windows asset must exist");
        assert!(update.url.starts_with("https://github.com/CosmoNetinfo/cosmonet-browser/releases/download/"));
    }
}
