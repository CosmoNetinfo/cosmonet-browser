# Stato Impianto: Transizione a Vero Browser Nativo

## 🎯 Obiettivo
Trasformare Cosmonet Browser da un'app ibrida basata su iframe (che non carica Google/YouTube) a un **Browser Nativo** basato su WebView2 Child Windows (che carica tutto).

## ✅ Cosa è stato fatto (Backend Rust)
1.  Modificato `src-tauri/src/lib.rs` per includere nuovi comandi:
    -   `create_browser_window(url, ...)`: Crea una finestra figlia nativa senza decorazioni.
    -   `resize_browser_window(...)`: Ridimensiona la finestra figlia.
    -   `navigate_browser(url)`: Naviga la finestra figlia.
2.  Aggiunta dipendenza `tauri-plugin-webview` in `Cargo.toml` (ma stiamo usando `WebviewWindowBuilder` standard di Tauri v2, che è incluso).

## 🚧 Cosa MANCA (Da fare subito nella prossima sessione)

### 1. Modifica Frontend (`src-web/renderer.js`)
Bisogna riscrivere la funzione `createWebviewInstance` o la logica di `createTab` per NON usare più `iframe`.

**Nuova logica da implementare:**
Invece di:
```javascript
const webview = document.createElement('iframe');
```
Dobbiamo fare:
```javascript
// Chiamare Rust per creare la finestra nativa
window.electronAPI.invoke('create_browser_window', { 
    url: url, 
    yOffset: 100.0, 
    height: 800.0 
});
```

### 2. Sincronizzazione Layout
In `renderer.js`, bisogna aggiungere un listener per il resize della finestra principale:

```javascript
window.addEventListener('resize', () => {
    // Calcola area disponibile (sotto la toolbar)
    const contentRect = document.getElementById('webviews-container').getBoundingClientRect();
    
    // Comunica a Rust le nuove dimensioni
    window.electronAPI.invoke('resize_browser_window', {
        x: window.screenX + contentRect.x, // Attenzione alle coordinate schermo!
        y: window.screenY + contentRect.y,
        width: contentRect.width,
        height: contentRect.height
    });
});
```
*Nota: Le coordinate richiedono attenzione tra coordinate web e fisiche del monitor.*

### 3. Navigazione
Aggiornare `handleNavigate` (barra URL) per chiamare `invoke('navigate_browser', { url })` invece di settare `iframe.src`.

## Comandi per testare
1.  Termina processi vecchi: `taskkill /F /IM cargo.exe /T`
2.  Avvia dev: `npm run tauri:dev`

## Note Tecniche
L'approccio "Child Window" bypassa completamente `X-Frame-Options` e `CSP` di Google, rendendo il browser compatibile al 100% con il web moderno.
