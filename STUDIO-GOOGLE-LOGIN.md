# 🩺 Analisi Tecnica: Il Problema del Login Google

Questo documento è stato creato per studiare e comprendere perché Google blocca l'accesso ("Browser non supportato") e quali misure sono state implementate nel Cosmonet Browser v1.2.1.

---

## 🚩 Perché Google blocca il login?

Google utilizza un sistema chiamato **"Identity Signals"** per determinare se un browser è sicuro. Quando usi Electron, Google rileva che non sei su un Chrome "standard" per diversi motivi:

1. **Header Identificativi**: Electron aggiunge automaticamente l'header `X-Requested-With` e altri parametri che segnalano un'applicazione "embedded" (incorporata).
2. **Fingerprinting del Motore JavaScript**: Google esegue script silenti per controllare se proprietà come `navigator.webdriver` sono attive (segno di automazione).
3. **Client Hints**: I moderni browser inviano "indizi" (`sec-ch-ua`) sul sistema operativo e sulla versione. Electron spesso dichiara se stesso in questi indizi.
4. **Inconsistenza dello User-Agent**: Se lo User-Agent dichiarato non corrisponde perfettamente al comportamento reale del browser, Google lo marca come sospetto.

---

## 🛠️ Soluzioni Implementate (v1.2.1)

Abbiamo applicato una **"Stealth Layer Strategy"** (Strategia a Strati Invisibili):

### 1. Mascheramento Header (Main Process)

Nel file `main.js`, intercettiamo ogni singola richiesta di rete:

- **Forzatura User-Agent**: Imponiamo `Chrome/121.0.0.0` a ogni pacchetto.
- **Rimozione Tracce**: Eliminiamo `X-Requested-With` e tutti gli header `sec-ch-ua` che potrebbero contenere la parola "Electron".

### 2. Iniezione Stealth (Webview Preload)

Il file `webview-preload.js` è l'arma segreta. Viene eseguito *prima* che la pagina di Google possa caricarsi:

- **`navigator.webdriver = false`**: Dice a Google "non sono un bot".
- **`navigator.plugins`**: Simula la presenza dei plugin reali di Chrome (PDF Viewer, etc).
- **Hardware Spoofing**: Simula 8 CPU core e 8GB di RAM per sembrare un PC reale.
- **Permissions Fix**: Falsifica le risposte alle richieste di permessi (notifiche) per emulare il comportamento di un browser utente.

### 3. Chromium Switches

All'avvio (`main.js`), passiamo al motore di Chromium dei comandi "hard":

- `--disable-blink-features=AutomationControlled`: Disabilita il flag interno che i siti usano per rilevare bot.
- `--remote-debugging-port=0`: Impedisce il controllo remoto del browser.
- `--lang=it-IT`: Forza la lingua italiana per coerenza geografica.

---

## 🔍 Perché potrebbe non funzionare ancora?

Nonostante queste misure, Google è estremamente sofisticato:

- **Rendering Profiling**: Google potrebbe misurare quanto tempo impiega il browser a disegnare un pixel. Se è leggermente diverso da Chrome, scatta il blocco.
- **OAuth Restricted**: Per la sicurezza, Google ha iniziato a bloccare quasi tutti i `webview` di Electron per il login sensibile, richiedendo l'uso di browser esterni o sistemi di autenticazione basati su token.

## 🎓 Cosa studiare ora

Se vuoi approfondire la ricerca, cerca questi termini:

- *Electron-fingerprint-protector*
- *Bypass Google OAuth non-supported browser Electron 2024*
- *Puppeteer-stealth implementation in Electron Webview*

---

*Documento tecnico per lo studio del team CosmoNet.*
