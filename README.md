# 🌌 Cosmonet Browser
> La tua porta d'accesso personalizzata alla galassia digitale di **cosmonet.info**.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Electron](https://img.shields.io/badge/built%20with-Electron-9feaf9.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Cosmonet Browser** è un browser web moderno, leggero e altamente personalizzabile basato sul motore Chromium (via Electron). Progettato specificamente per la community di [CosmoNet](https://www.cosmonet.info), offre un'esperienza di navigazione fluida con un design futuristico e funzionalità avanzate integrate.

---

## ✨ Caratteristiche Principali

### 🎨 Design & Esperienza Utente
- **OLED UI Architecture**: Interfaccia pulita, moderna e ottimizzata, con supporto completo alla **Dark Mode** (Neutral Black).
- **Branding Ufficiale**: Logo Cosmonet ad alta risoluzione e palette colori coerente con l'identità del brand.
- **Micro-Animazioni**: Transizioni fluide tra tab e attivazioni dei pannelli laterali.

### ⚙️ Funzionalità Avanzate
- 📑 **Incredibile Gestione Tab**: Sistema multi-tab dinamico con rendering sicuro e protezione da titoli corrotti.
- 🌑 **Dark Mode Persistente**: Attivabile con un click, riduce l'affaticamento visivo e viene memorizzata al riavvio.
- ⚙️ **Pannello Impostazioni**: Personalizza la tua Homepage, scegli il tuo motore di ricerca predefinito (Google, Bing, DuckDuckGo) e gestisci il tema.
- 📑 **Segnalibri & Cronologia**: Gestione completa e persistente su disco per non perdere mai le tue pagine preferite.
- 🛠️ **Dev Tools integrati**: Scorciatoia `F12` per il debug istantaneo delle pagine web caricate.

### 📱 Cross-Platform
- **Desktop**: Versioni native per Windows (Installer NSIS), macOS e Linux.
- **Mobile**: Predisposto per **Android** tramite integrazione con Capacitor.

---

## 🚀 Guida Rapida

### Requisiti
- **Node.js** v18 o superiore
- **npm** v9 o superiore

### Installazione
```bash
# Clona il repository
git clone https://github.com/CosmoNetinfo/cosmonet-browser.git

# Entra nella cartella
cd cosmonet-browser

# Installa le dipendenze
npm install
```

### Sviluppo
Per avviare il browser in modalità live:
```bash
npm start
```

---

## 📦 Distribuzione (Build)

### 🖥️ Desktop (Windows/Mac/Linux)
Per generare l'installer definitivo per la tua piattaforma:
```bash
npm run build
```
L'installer verrà generato nella cartella `dist/`. Per Windows, troverai il file `Cosmonet Browser Setup 1.0.0.exe`.

### 📱 Android
Il progetto è già configurato con **Capacitor**. Per generare l'APK:
1. Sincronizza i file web: `npx cap sync android`
2. Apri il progetto in Android Studio: `npx cap open android`
3. Genera il Signed APK da Android Studio.

---

## 🔧 Architettura Tecnica

- **Engine**: Chromium (via Electron 28+)
- **Logic**: Vanilla JavaScript (ES6+), Node.js per il salvataggio dati.
- **Styling**: Modern CSS3 con Flexbox e CSS Variables per il sistema di temi.
- **Mobile bridge**: Ionic Capacitor.

---

## 💾 Gestione Dati
I tuoi dati sono salvati localmente nella directory utente del sistema operativo:
- **Windows**: `%AppData%/cosmonet-browser/`
- **macOS**: `~/Library/Application Support/cosmonet-browser/`
- **Linux**: `~/.config/cosmonet-browser/`

File creati: `bookmarks.json`, `history.json`, `settings.json`.

---

## 📜 Licenza
Questo progetto è rilasciato sotto la licenza **MIT**. Sei libero di usarlo, modificarlo e distribuirlo.

---

## 🌐 Link Utili
- **Sito Ufficiale**: [www.cosmonet.info](https://www.cosmonet.info)
- **Supporto**: [Visita il Forum](https://www.cosmonet.info/forum)

---
*Sviluppato con ❤️ per la Galassia Digitale di Cosmonet.*
