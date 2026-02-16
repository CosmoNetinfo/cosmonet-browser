# 🌌 Cosmonet Browser

> La tua porta d'accesso personalizzata alla galassia digitale di **cosmonet.info**.

![Version](https://img.shields.io/badge/version-1.2.1-blue.svg)
![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202.0-ffc131.svg)
![Platform](https://img.shields.io/badge/platform-Windows-0078d4.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Cosmonet Browser** è un browser personalizzato costruito con **Tauri 2.0** e **Rust**, progettato specificamente per la community di [CosmoNet](https://www.cosmonet.info). Offre un'esperienza di navigazione veloce, sicura e leggera con funzionalità avanzate per la gestione di tab, segnalibri e password.

---

## 🚀 Caratteristiche Principali

### ⚡ Prestazioni Eccezionali

- **Leggerissimo**: Eseguibile di soli **~14MB** (contro i ~500MB di browser basati su Chromium completo)
- **Memoria Efficiente**: Consumo di RAM ridotto grazie all'utilizzo di webview native del sistema
- **Avvio Istantaneo**: Tempo di caricamento inferiore a 1 secondo
- **Backend Rust**: Logica di sistema scritta in Rust per massime prestazioni e sicurezza

### 🎨 Interfaccia Moderna

- **OLED Dark UI**: Interfaccia scura ottimizzata con palette Neutral Black
- **Dashboard Personalizzata**: Homepage Cosmonet con ricerca rapida e link veloci
- **Animazioni Fluide**: Transizioni smooth tra tab e pannelli
- **Branding Cosmonet**: Logo e identità visiva ufficiale integrata

### 🛠️ Funzionalità Avanzate

- 📑 **Gestione Tab Dinamica**: Sistema multi-tab con supporto completo per la navigazione
- 📁 **Segnalibri Avanzati**: Organizzazione con cartelle, drag & drop e ricerca rapida
- 🔑 **Password Manager**: Gestore password integrato con salvataggio automatico
- 📡 **Feed RSS Cosmonet**: Ultime notizie dal sito direttamente nel browser
- 📖 **Modalità Lettura**: Vista ottimizzata per articoli senza distrazioni
- 🌐 **Google Login Bypass**: Stealth mode avanzato per accedere ai servizi Google senza blocchi

---

## 🔒 Google Login & Stealth Mode

Il browser implementa una **strategia stealth avanzata** per superare i blocchi "Browser non supportato" di Google:

### Tecnologie Implementate

1. **User-Agent Spoofing**: Mascheramento come Chrome 121 standard
2. **Script Injection**: Rimozione di identificatori di automazione (`navigator.webdriver`)
3. **Header Cleaning**: Eliminazione di header sospetti (`X-Requested-With`)
4. **Session Isolation**: Gestione separata delle sessioni per evitare tracking

Documentazione completa disponibile in [`STUDIO-GOOGLE-LOGIN.md`](./STUDIO-GOOGLE-LOGIN.md).

---

## 📦 Download & Installazione

### Installer Ufficiali (Windows)

Scarica l'ultima versione dalla sezione [Releases](https://github.com/YOUR_USERNAME/cosmonet-browser/releases):

- **Setup NSIS** (consigliato): `cosmonet-browser_1.2.1_x64-setup.exe` (~3.3 MB)
- **MSI Installer**: `cosmonet-browser_1.2.1_x64_en-US.msi` (~4.7 MB)
- **Portable**: `app.exe` (~14 MB) - Nessuna installazione richiesta

### Requisiti di Sistema

- **OS**: Windows 10/11 (64-bit)
- **WebView2**: Installato automaticamente se non presente
- **RAM**: Minimo 2GB (consigliato 4GB+)

---

## 🛠️ Sviluppo

### Prerequisiti

Per compilare il progetto da sorgente:

- [Rust](https://www.rust-lang.org/tools/install) (1.77.2+)
- [Node.js](https://nodejs.org/) (18+)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) con "Desktop development with C++"

### Setup Ambiente

```bash
# Clona il repository
git clone https://github.com/YOUR_USERNAME/cosmonet-browser.git
cd cosmonet-browser

# Installa dipendenze JavaScript
npm install

# Verifica installazione Rust
cargo --version
```

### Comandi Disponibili

| Comando | Descrizione |
| :--- | :--- |
| `npm run tauri:dev` | Avvia il browser in modalità sviluppo (hot-reload) |
| `npm run tauri:build` | Compila e genera gli installer per Windows |
| `cargo check` | Verifica la correttezza del codice Rust |
| `cargo build --release` | Compila solo il backend Rust (ottimizzato) |

### Struttura del Progetto

```text
cosmonet-browser/
├── src-tauri/              # Backend Rust (Tauri)
│   ├── src/
│   │   ├── lib.rs          # Logica principale e comandi Tauri
│   │   └── main.rs         # Entry point
│   ├── Cargo.toml          # Dipendenze Rust
│   └── tauri.conf.json     # Configurazione Tauri
├── src-web/                # Frontend (HTML/CSS/JS)
│   ├── renderer.js         # Logica UI principale
│   ├── tauri-bridge.js     # Bridge di compatibilità Tauri
│   ├── home.html           # Dashboard Cosmonet
│   └── styles.css          # Stili globali
├── assets/                 # Icone e risorse
└── package.json            # Dipendenze Node.js
```

---

## 🚧 Roadmap

### ✅ Completato

- [x] Migrazione completa da Electron a Tauri 2.0
- [x] Sistema di gestione tab nativo
- [x] Google Login bypass (Stealth Mode v2)
- [x] Gestore segnalibri con drag & drop
- [x] Password manager integrato
- [x] Build Windows (NSIS + MSI)
- [x] Dashboard Cosmonet personalizzata

### 🔄 In Sviluppo

- [ ] Versione Android (Capacitor)
- [ ] Sincronizzazione cloud (Supabase)
- [ ] Estensioni personalizzate
- [ ] Supporto Linux/macOS

---

## 📚 Documentazione Aggiuntiva

- [`PROGETTO-RECAP.md`](./PROGETTO-RECAP.md) - Cronologia completa dello sviluppo
- [`STATO-PROGETTO.md`](./STATO-PROGETTO.md) - Stato attuale del progetto
- [`tauri-migration.md`](./tauri-migration.md) - Dettagli tecnici della migrazione Tauri
- [`STUDIO-GOOGLE-LOGIN.md`](./STUDIO-GOOGLE-LOGIN.md) - Analisi tecnica del bypass Google

---

## 🤝 Contribuire

I contributi sono benvenuti! Per favore:

1. Fai un fork del progetto
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Committa le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Pusha sul branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

---

## 📜 Licenza

Questo progetto è rilasciato sotto la licenza **MIT**. Vedi il file [LICENSE](./LICENSE) per i dettagli.

---

## 🌐 Link Utili

- **Sito Ufficiale**: [www.cosmonet.info](https://www.cosmonet.info)
- **Community**: [Forum Cosmonet](https://www.cosmonet.info/community/)
- **Supporto**: [Apri un Issue](https://github.com/YOUR_USERNAME/cosmonet-browser/issues)

---

## 🙏 Ringraziamenti

- **Tauri Team** per il fantastico framework
- **Community Cosmonet** per il supporto e il feedback
- Tutti i contributori che hanno reso possibile questo progetto

---

*Sviluppato con ❤️ per la Galassia Digitale di Cosmonet.*
