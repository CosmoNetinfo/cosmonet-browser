# 🌌 Cosmonet Browser (Ultra 2.0)

> La tua porta d'accesso personalizzata alla galassia digitale di **cosmonet.info**.

![Version](https://img.shields.io/badge/version-1.5.0-blue.svg)
![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202.0-ffc131.svg)
![Electron Legacy](https://img.shields.io/badge/legacy-Electron-9feaf9.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Cosmonet Browser** si evolve. Nato su Electron, il progetto è ora in fase di migrazione verso **Tauri 2.0**, offrendo un'esperienza di navigazione incredibilmente più veloce, sicura e leggera. Progettato specificamente per la community di [CosmoNet](https://www.cosmonet.info), unisce un design futuristico a prestazioni di livello enterprise.

---

## 🚀 Evoluzione Tauri 2.0

Abbiamo riscritto il core del browser in **Rust** utilizzando Tauri per superare i limiti di Electron:

- **Piuma Leggero**: L'eseguibile è passato da ~80MB a meno di **10MB**.
- **Memoria Ultra-Efficiente**: Consumo di RAM ridotto del 70% (meno di 50MB all'avvio).
- **Sicurezza Nativa**: Logica di sistema scritta in Rust per la massima protezione.
- **Webview Native**: Utilizzo di Microsoft Edge WebView2 (Windows) per la massima compatibilità e velocità.

---

## 🩺 Analisi Tecnica: Google Login & Stealth Mode

Il problema del blocco "Browser non supportato" di Google è affrontato con una **Stealth Layer Strategy** avanzata integrata direttamente nel backend Rust:

### 🛠️ Soluzioni Implementate

1. **Iniezione Stealth Nativa**: Tramite Rust, iniettiamo script di mascheramento *prima* di ogni caricamento di pagina, nascondendo `navigator.webdriver` e simulando hardware reale.
2. **Mascheramento User-Agent**: Forziamo un'identità Chrome standard (v121+) a livello di webview nativa.
3. **Rust Bridge**: Un sistema di messaggistica IPC ultra-veloce tra Rust e JavaScript che sostituisce il vecchio `preload.js` di Electron.
4. **Header Clean-up**: Rimozione aggressiva di header identificativi (`X-Requested-With`) che segnalano browser embedded.

---

## ✨ Caratteristiche Principali

### 🎨 Design & Esperienza Utente

- **OLED UI Architecture**: Interfaccia pulita, moderna e neutra (Neutral Black).
- **Branding Ufficiale**: Logo Cosmonet ad alta risoluzione e palette colori coerente.
- **Micro-Animazioni**: Transizioni fluide tra tab e pannelli laterali.

### ⚙️ Funzionalità Avanzate

- 📑 **Incredibile Gestione Tab**: Sistema multi-webview dinamico bridgato tra Rust e JS.
- 🌑 **Dark Mode Persistente**: Attivabile con un click, memorizzata nel profilo utente.
- 🚀 **Cosmo Dashboard**: Homepage personalizzata (`home.html`) con ricerca intelligente.
- 📁 **Gestione Preferiti**: Cartelle nidificate con supporto **Drag & Drop** nativo.
- 📡 **Cosmo Feed RSS**: Ultime notizie di CosmoNet direttamente nel browser.
- 📖 **Modalità Lettura**: Vista ottimizzata per articoli senza distrazioni.
- 🔑 **Gestore Password**: Salvataggio sicuro delle credenziali con crittografia locale.

---

## 🛠️ Requisiti & Sviluppo

### Installazione Dipendenze

Per compilare la versione Tauri, assicurati di avere:

- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/)

### Comandi Rapidi

| Comando | Descrizione |
| :--- | :--- |
| `npm install` | Installa le dipendenze JS |
| `npm run tauri:dev` | Avvia il browser in modalità sviluppo |
| `npm run tauri:build` | Genera l'installer per Windows |
| `npm start` | Avvia la versione legacy (Electron) |

---

## 📜 Licenza

Questo progetto è rilasciato sotto la licenza **MIT**.

---

## 🌐 Link Utili

- **Sito Ufficiale**: [www.cosmonet.info](https://www.cosmonet.info)
- **Supporto & Forum**: [Community Cosmonet](https://www.cosmonet.info/community/)

---
*Sviluppato con ❤️ per la Galassia Digitale di Cosmonet.*
