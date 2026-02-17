# Stato Impianto: Transizione a Vero Browser Nativo (Diario Operativo)

## 🎯 Obiettivo
Trasformare Cosmonet Browser da app ibrida a **Browser Nativo Multi-Window** per supportare Google, YouTube e navigazione completa.

## ✅ Fasi Completate

### 1. Backend Rust (`lib.rs`)
- [x] Implementati comandi: `create_browser_window`, `resize_browser_window`, `navigate_browser`, `open_browser_devtools`.
- [x] Aggiunta dipendenza `tauri-plugin-webview` e configurazione Child Window.
- [x] **FIX CRITICO**: Corretto errore di sintassi (parentesi mancanti) nel codice Rust.

### 2. Frontend (`renderer.js`)
- [x] Rimosso `document.createElement('iframe')`.
- [x] Implementato `createWebviewInstance` che agisce da Proxy verso Rust.
- [x] Implementato `switchToTab` per navigare la finestra fisica (Single Window Mode).
- [x] Implementato `updateBrowserLayout` per sincronizzare la posizione della finestra.

## 🚧 In Corso (Testing)
- [ ] Compilazione ed Esecuzione Verificata.
- [ ] Verifica caricamento Google nella finestra nativa.

## 📅 Prossimi Passi (Dopo il Test)

### 1. Gestione Eventi (Rust -> JS)
Attualmente la barra URL non si aggiorna se l'utente naviga *dentro* la pagina web (es. clicca su un link).
Bisogna implementare l'evento `request_navigate` o simile da Rust a JS:
```rust
// In lib.rs, dentro child.on_window_event
app_handle.emit("browser-navigate", new_url);
```
E in `renderer.js`:
```javascript
window.electronAPI.on('browser-navigate', (url) => {
    updateUrlBar(url);
});
```

### 2. Rifiniture UI
- [ ] Nascondere finestra browser quando si aprono Impostazioni/Segnalibri (per evitare sovrapposizione).
- [ ] Aggiungere tasto destro (Menu Contestuale) personalizzato.

## Comandi per testare
1.  Termina processi: `taskkill /F /IM cargo.exe /T`
2.  Avvia dev: `npm run tauri:dev`
