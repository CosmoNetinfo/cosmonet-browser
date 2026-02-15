# Cosmonet Browser

Browser personalizzato brandizzato per **cosmonet.info**, sviluppato con Electron.

## 🎨 Caratteristiche

- ✅ **Logo Ufficiale**: Logo reale di Cosmonet integrato (960x960px)
- ✅ **Multi-tab**: Gestione completa di tab multipli
- ✅ **Segnalibri**: Sistema di segnalibri persistente
- ✅ **Cronologia**: Cronologia di navigazione con timestamp
- ✅ **Multi-piattaforma**: Funziona su Windows, macOS e Linux
- ✅ **Design personalizzato**: Interfaccia brandizzata per cosmonet.info
- ✅ **Navigazione completa**: Avanti, indietro, ricarica, home
- ✅ **Ricerca integrata**: Barra URL con ricerca Google automatica

## 📋 Requisiti

- **Node.js** (versione 16 o superiore)
- **npm** (incluso con Node.js)

## 🛠️ Installazione

1. **Scarica Node.js** da [nodejs.org](https://nodejs.org/) se non lo hai già installato

2. **Installa le dipendenze**:
   ```bash
   cd cosmonet-browser
   npm install
   ```

## ▶️ Avvio

Per avviare il browser in modalità sviluppo:

```bash
npm start
```

## 📦 Build per Distribuzione

Per creare un file eseguibile distribuibile:

### Windows
```bash
npm run build
```
Genererà un installer in `dist/Cosmonet Browser Setup.exe`

### macOS
```bash
npm run build
```
Genererà un file DMG in `dist/Cosmonet Browser.dmg`

### Linux
```bash
npm run build
```
Genererà un file AppImage e DEB in `dist/`

## 🎨 Personalizzazione

### Modificare il colore del tema

Modifica il file `styles.css`, cerca questa sezione:

```css
.header {
    background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
    /* Cambia questi colori per personalizzare */
}
```

### Modificare la homepage

Modifica il file `renderer.js`, cerca:

```javascript
const HOME_URL = 'https://www.cosmonet.info/';
```

### Modificare il logo

Sostituisci l'SVG nella sezione `.logo` del file `index.html`

## 🔧 Struttura del Progetto

```
cosmonet-browser/
├── main.js           # Processo principale Electron
├── preload.js        # Script preload per context bridge
├── index.html        # Interfaccia principale
├── renderer.js       # Logica frontend
├── styles.css        # Stili CSS
├── package.json      # Configurazione npm
└── README.md         # Questa documentazione
```

## 💾 Dati Persistenti

Il browser salva automaticamente:
- **Segnalibri** in `%AppData%/cosmonet-browser/bookmarks.json` (Windows)
- **Cronologia** in `%AppData%/cosmonet-browser/history.json` (Windows)

Su macOS/Linux i file sono in `~/.config/cosmonet-browser/`

## ⌨️ Scorciatoie da Tastiera

- `Ctrl+T` / `Cmd+T` - Nuova tab
- `Ctrl+W` / `Cmd+W` - Chiudi tab
- `Ctrl+R` / `Cmd+R` - Ricarica pagina
- `Ctrl++` / `Cmd++` - Zoom in
- `Ctrl+-` / `Cmd+-` - Zoom out
- `Ctrl+0` / `Cmd+0` - Reset zoom
- `F12` - Console sviluppatore

## 🐛 Troubleshooting

### Il browser non si avvia
- Verifica di aver installato tutte le dipendenze con `npm install`
- Controlla la versione di Node.js con `node --version` (deve essere >= 16)

### Le webview non caricano le pagine
- Electron potrebbe avere restrizioni di sicurezza. Controlla la console con F12

### I segnalibri non si salvano
- Verifica i permessi della cartella userData
- Controlla la console per errori di filesystem

## 📝 Licenza

MIT License - Libero per uso personale e commerciale

## 🌐 Credits

Sviluppato per **cosmonet.info**

Basato su [Electron](https://www.electronjs.org/)

---

Per supporto o domande, visita [www.cosmonet.info](https://www.cosmonet.info/)
