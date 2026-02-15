# 🚀 GUIDA RAPIDA - Cosmonet Browser

## Avvio Veloce

### 1️⃣ Installa Node.js
Scarica da: https://nodejs.org/
Scegli la versione LTS (consigliata)

### 2️⃣ Apri il Terminale/Prompt
- **Windows**: Premi `Win+R`, digita `cmd`, premi Invio
- **macOS**: Apri Terminal da Applicazioni > Utility
- **Linux**: Apri il tuo terminale preferito

### 3️⃣ Vai nella Cartella del Browser
```bash
cd percorso/alla/cartella/cosmonet-browser
```

### 4️⃣ Installa (solo la prima volta)
```bash
npm install
```
Attendi il completamento (può richiedere qualche minuto)

### 5️⃣ Avvia il Browser
```bash
npm start
```

## 🎯 Funzionalità Principali

### Tab
- **Nuova tab**: Clicca il pulsante `+` o premi `Ctrl+T`
- **Chiudi tab**: Clicca la `X` sulla tab o premi `Ctrl+W`
- **Cambia tab**: Clicca sulla tab desiderata

### Navigazione
- **Home**: Clicca l'icona casa per tornare a cosmonet.info
- **Indietro/Avanti**: Usa le frecce nella toolbar
- **Ricarica**: Clicca l'icona circolare
- **URL**: Digita l'indirizzo nella barra centrale e premi Invio
- **Ricerca**: Digita parole nella barra URL per cercare su Google

### Segnalibri
- **Aggiungi**: Clicca l'icona stella nella barra URL
- **Visualizza**: Clicca l'icona segnalibro nella toolbar
- **Elimina**: Apri il pannello segnalibri, clicca "Elimina" sul segnalibro

### Cronologia
- **Visualizza**: Clicca l'icona orologio nella toolbar
- **Naviga**: Clicca su una voce della cronologia
- **Cancella**: Clicca "Cancella tutto" nel pannello cronologia

## ⚙️ Personalizzazione Veloce

### Cambiare la Homepage
1. Apri `renderer.js`
2. Trova la riga: `const HOME_URL = 'https://www.cosmonet.info/';`
3. Cambia l'URL con quello desiderato
4. Salva e riavvia il browser

### Cambiare i Colori
1. Apri `styles.css`
2. Cerca: `.header { background: linear-gradient(...)`
3. Modifica i colori hex (#1e40af, #2563eb)
4. Salva e riavvia il browser

### Codici Colore Comuni
- Blu: `#2563eb`
- Rosso: `#ef4444`
- Verde: `#10b981`
- Viola: `#8b5cf6`
- Arancione: `#f59e0b`

## 📦 Creare l'Eseguibile

Per distribuire il browser senza bisogno di Node.js:

```bash
npm run build
```

Troverai il file installabile in:
- **Windows**: `dist/Cosmonet Browser Setup.exe`
- **macOS**: `dist/Cosmonet Browser.dmg`
- **Linux**: `dist/Cosmonet Browser.AppImage`

## ❓ Problemi Comuni

### "npm non riconosciuto come comando"
→ Node.js non è installato o non è nel PATH. Reinstalla Node.js.

### "Cannot find module 'electron'"
→ Esegui `npm install` nella cartella del browser.

### Le pagine non si caricano
→ Controlla la connessione internet. Prova a disattivare l'antivirus temporaneamente.

### Il browser si chiude immediatamente
→ Apri la console sviluppatore (F12) per vedere gli errori.

## 💡 Suggerimenti

- Usa `F12` per aprire la console sviluppatore
- I dati vengono salvati automaticamente
- Puoi avere tutte le tab che vuoi (ma usa con moderazione!)
- Il browser è basato su Chromium, quindi supporta gli stessi siti di Chrome

## 🌟 Prossimi Passi

1. ✅ Avvia il browser con `npm start`
2. ✅ Naviga su cosmonet.info
3. ✅ Aggiungi alcuni segnalibri
4. ✅ Personalizza i colori a tuo piacimento
5. ✅ Crea l'eseguibile con `npm run build`

---

Divertiti con il tuo browser personalizzato! 🎉
