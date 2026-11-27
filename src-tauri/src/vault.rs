use crate::Request;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{fs, ptr, sync::Mutex};
use tauri::{AppHandle, Manager};
use windows_sys::Win32::{Foundation::LocalFree, Security::Cryptography::{CryptProtectData,CryptUnprotectData,CRYPT_INTEGER_BLOB,CRYPTPROTECT_UI_FORBIDDEN}};

static LOCK: Mutex<()> = Mutex::new(());

#[derive(Serialize,Deserialize)]
struct Entry { id:String, origin:String, user:String, secret:String }

fn crypt(data:&[u8], encrypt:bool)->Result<Vec<u8>,String> {
    let input=CRYPT_INTEGER_BLOB{cbData:data.len().try_into().map_err(|_|"Archivio troppo grande")?,pbData:data.as_ptr() as *mut u8};
    let mut output=CRYPT_INTEGER_BLOB{cbData:0,pbData:ptr::null_mut()};
    let ok=unsafe { if encrypt {
        CryptProtectData(&input,ptr::null(),ptr::null(),ptr::null(),ptr::null(),CRYPTPROTECT_UI_FORBIDDEN,&mut output)
    } else {
        CryptUnprotectData(&input,ptr::null_mut(),ptr::null(),ptr::null(),ptr::null(),CRYPTPROTECT_UI_FORBIDDEN,&mut output)
    }};
    if ok==0 { return Err("Archivio credenziali non accessibile per questo utente Windows".into()); }
    let result=unsafe { std::slice::from_raw_parts(output.pbData,output.cbData as usize).to_vec() };
    unsafe { LocalFree(output.pbData as _); }
    Ok(result)
}

fn read(app:&AppHandle)->Result<Vec<Entry>,String> {
    let file=crate::local_data_dir(app)?.join("credentials.dpapi");
    if !file.exists() { return Ok(vec![]); }
    if fs::metadata(&file).map_err(|_|"Archivio non disponibile")?.len()>16_000_000 { return Err("Archivio troppo grande".into()); }
    let encrypted=fs::read(file).map_err(|_|"Lettura archivio non riuscita")?;
    let mut plain=crypt(&encrypted,false)?;
    let entries=serde_json::from_slice(&plain).map_err(|_|"Archivio non valido".into());
    plain.fill(0);
    entries
}

fn write(app:&AppHandle,entries:&[Entry])->Result<(),String> {
    let dir=crate::local_data_dir(app)?;
    fs::create_dir_all(&dir).map_err(|_|"Archivio non disponibile")?;
    let mut plain=serde_json::to_vec(entries).map_err(|_|"Archivio non valido")?;
    let encrypted=crypt(&plain,true); plain.fill(0); let encrypted=encrypted?;
    let temporary=dir.join("credentials.dpapi.tmp");
    fs::write(&temporary,encrypted).map_err(|_|"Salvataggio archivio non riuscito")?;
    fs::rename(temporary,dir.join("credentials.dpapi")).map_err(|_|"Salvataggio archivio non riuscito".into())
}

pub fn dispatch(app:&AppHandle,request:&Request)->Result<Value,String> {
    let _guard=LOCK.lock().map_err(|_|"Archivio occupato")?;
    let mut entries=read(app)?;
    let view=app.get_webview(&request.label).ok_or("Scheda non trovata")?;
    let current=view.url().map_err(|_|"Indirizzo non disponibile")?;
    let origin=current.origin().ascii_serialization();
    if request.action=="vault_save" {
        if current.scheme()!="https" { return Err("Le credenziali si salvano solo per siti HTTPS".into()); }
        let user=request.data.get("user").and_then(Value::as_str).ok_or("Nome utente mancante")?;
        let secret=request.data.get("secret").and_then(Value::as_str).ok_or("Credenziale mancante")?;
        if user.len()>512 || secret.is_empty() || secret.len()>4096 || entries.len()>=500 { return Err("Credenziale non valida".into()); }
        entries.retain(|e|e.origin!=origin || e.user!=user);
        let id=format!("{}-{}",std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|_|"Orologio non disponibile")?.as_nanos(),entries.len());
        entries.push(Entry{id,origin:origin.clone(),user:user.into(),secret:secret.into()});
        write(app,&entries)?;
    }
    if request.action=="vault_delete" {
        let id=request.data.get("id").and_then(Value::as_str).ok_or("Elemento mancante")?;
        entries.retain(|e|e.id!=id); write(app,&entries)?;
    }
    if request.action=="vault_fill" {
        let id=request.data.get("id").and_then(Value::as_str).ok_or("Elemento mancante")?;
        let entry=entries.iter().find(|e|e.id==id && e.origin==origin).ok_or("Credenziale non associata a questo sito")?;
        if current.scheme()!="https" { return Err("Compilazione consentita solo su HTTPS".into()); }
        let data=serde_json::to_string(entry).map_err(|_|"Credenziale non disponibile")?;
        let script=format!("(()=>{{const e={data};if(location.origin!==e.origin||window!==top)return;const p=document.querySelector('input[type=password]');if(!p)return;const f=p.form||document;const u=f.querySelector('input[type=email],input[autocomplete=username],input[type=text]');if(u){{u.value=e.user;u.dispatchEvent(new Event('input',{{bubbles:true}}));}}p.value=e.secret;p.dispatchEvent(new Event('input',{{bubbles:true}}));}})()");
        view.eval(script).map_err(|_|"Compilazione non riuscita")?;
    }
    Ok(json!({"entries":entries.iter().map(|e|json!({"id":e.id,"origin":e.origin,"user":e.user})).collect::<Vec<_>>()}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn dpapi_roundtrip_and_no_plaintext() {
        let value=format!("{}",std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos());
        let encrypted=crypt(value.as_bytes(),true).unwrap();
        assert!(!encrypted.windows(value.len()).any(|w|w==value.as_bytes()));
        assert_eq!(crypt(&encrypted,false).unwrap(),value.as_bytes());
        let mut corrupt=encrypted; let last=corrupt.len()-1; corrupt[last]^=0xff;
        assert!(crypt(&corrupt,false).is_err());
    }
}
