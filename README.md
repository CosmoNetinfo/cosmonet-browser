# 🌌 Cosmonet Browser

> La tua porta d'accesso personalizzata alla galassia digitale di **cosmonet.info**.

![Version](https://img.shields.io/badge/version-1.3.5-blue.svg)
![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202.1-ffc131.svg)
![Platform](https://img.shields.io/badge/platform-Windows-0078d4.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Cosmonet Browser** è un browser personalizzato costruito con **Tauri 2.1** e **Rust**, progettato specificamente per la community di [CosmoNet](https://www.cosmonet.info). Offre un'esperienza di navigazione veloce, sicura e leggera con funzionalità avanzate per la gestione di tab, segnalibri e password.

---

## 🚀 Caratteristiche Principali

- **Leggerissimo**: Eseguibile di soli **~14MB** (contro i ~500MB di browser basati su Chromium completo)
- **Memoria Efficiente**: Consumo di RAM ridotto grazie all'utilizzo di webview native del sistema
- **Avvio Istantaneo**: Tempo di caricamento inferiore a 1 secondo
- **Multi-Tab Nativo**: Ogni tab è ora una finestra webview nativa gestita da Rust
- **Bypass Totale**: Navigazione libera su Google, YouTube, Instagram e altri siti che bloccano gli iframe
- **Navigazione Robusta**: Utilizzo di API native Tauri per caricamenti veloci e affidabili
- **Debug Integrato**: Accesso ai DevTools e console Eruda integrata per il debugging rapido
- **Portable Edition**: Generazione di un singolo file eseguibile (`Cosmonet-Browser-Portable.exe`) che non richiede installazione
- **Core Rust**: Backend ottimizzato per la velocità e la sicurezza

---

## 🔥 Novità della v1.3.5

- 🛠️ **Fix Schede Sganciate**: Risolto il problema delle schede che si "staccavano" dalla finestra principale durante lo spostamento della finestra.
- 🔗 **Parenting Nativo**: Implementata l'appartenenza (parenting) a livello di sistema operativo per le finestre delle schede.
- 📐 **Sincronizzazione Layout**: Ottimizzato il sistema di coordinate per garantire un allineamento perfetto tra webview nativa e interfaccia utente.
- ✅ **Stabilità Migliorata**: Corretti vari bug di navigazione e gestione tab in ambiente Tauri 2.10.
- 📁 **Segnalibri Avanzati**: Organizzazione con cartelle, drag & drop e ricerca rapida
- 🔑 **Password Manager**: Gestore password integrato con salvataggio automatico
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

### 🚧 Roadmap & Stato Corrente

#### 🔄 In Corso (Priorità Alta)

- [x] **Migrazione a Browser Nativo (Multi-Window)**:
  - ✅ Backend Rust completo (multi-webview dinamica)
  - ✅ Frontend JS integrato (gestione label e visibilità)
  - ✅ Bypass `X-Frame-Options` (Google, YouTube, Netflix funzionanti)
  - ✅ Barra di caricamento sincronizzata con il backend
- [ ] **Android Porting**: Versione mobile basata su Capacitor

#### ✅ Completato

- [x] Migrazione Core da Electron a Tauri 2.1
- [x] Backend Rust performante
- [x] Navigazione Nativa Funzionante
- [x] Gestore segnalibri e password (locale)
- [x] Multi-Tab Nativo & Loading Bar
- [x] Dashboard Cosmonet personalizzata
- [ ] Sincronizzazione Cloud (Supabase) - *In arrivo*

---

## � Checklist Operativa: Verso il Browser Funzionante

Per completare la trasformazione in un "Vero Browser" funzionante con tutti i siti moderni:

1. **Backend (Fatto ✅)**:
   - [x] Architettura multi-webview con label dinamiche.
   - [x] Eventi di caricamento emessi da Rust a JS.

2. **Frontend (Fatto ✅)**:
   - [x] Integrazione `tauri-bridge.js` per gestione finestre native.
   - [x] Inserimento progress bar Cosmo-Style.
   - [x] Switch intelligente di focus e visibilità tra tab.

3. **Prossimi Step 🎯**:
   - [ ] Sincronizzazione Cloud dei dati.
   - [ ] Ottimizzazione performance su sistemi a basso consumo.
   - [ ] Porting dei fix nativi su Android.

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
