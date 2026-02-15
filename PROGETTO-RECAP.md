# 🚀 Recap Sviluppo: Cosmonet Browser

Questo documento riassume tutte le modifiche, le soluzioni e le nuove funzionalità implementate per il **Cosmonet Browser** (Windows & Android).

---

## 💻 Versione Windows (Completata & Ottimizzata)

### 🛠️ Soluzioni ai Problemi di Installazione
- **Versione Portable**: Risolto il problema dell'installer (`Setup.exe`) che non si avviava. Ora viene generato un file unico **`Cosmonet Browser 1.0.0.exe`** che si apre istantaneamente senza installazione.
- **Ottimizzazione Peso**: Ridotto drasticamente il peso dell'eseguibile (da >500MB a circa **78MB**) escludendo i file di Android e le dipendenze Capacitor dalla build di Windows.

### ✨ Nuove Funzionalità
- **Pagine multiple all'avvio**: Aggiunta una sezione nelle Impostazioni per definire una lista di URL (es. Cosmonet, Google, YouTube) che si aprono automaticamente all'apertura del browser.
- **Nuova Tab su Google**: Cliccando il tasto **"+"**, il browser apre ora automaticamente **Google**, fornendo una pagina pronta per la ricerca.
- **Tasto Home Intelligente**: Il tasto Home riporta ora alla prima pagina della lista "All'avvio".

---

## 📱 Versione Android (In Corso)

### 🛠️ Cambiamenti Strutturali
- **Bypass Restrizioni di Sicurezza**: Modificato `MainActivity.java` per permettere il caricamento di siti esterni come Google e YouTube, che prima venivano bloccati per motivi di sicurezza.
- **Aggiornamento Java**: Passaggio a **Java 17 LTS** (Microsoft Build) per piena compatibilità con i moderni strumenti di sviluppo Android.

### ⚠️ Note Tecniche Importanti
- **Conflitto Bridge/URL**: È stata identificata una sensibilità tra il sistema di tracciamento URL nativo e il caricamento dei file tramite `localhost`. 
- **Stato Attuale**: L'app si compila correttamente, ma richiede un "Clean Project" e una reinstallazione pulita dopo ogni modifica ai file Java per evitare l'errore `ERR_CONNECTION_REFUSED`.

---

## 📂 Struttura Cartelle e Build

- **Cartella `dist/`**: Contiene gli eseguibili Windows.
    - `Cosmonet Browser 1.0.0.exe` -> **DA USARE (Portable)**.
    - `win-unpacked/Cosmonet Browser.exe` -> App scompattata per test veloci.
- **Cartella `android/`**: Progetto nativo per Android Studio.
- **Cartella `www/`**: Sorgenti web compilati per Capacitor.

---

## 🚀 Prossimi Passi Consigliati
1. **Lancio Definitivo**: Utilizzare la versione Portable su Windows per la distribuzione.
2. **Setup Android**: Quando riprenderemo Android, effettuare un `Build > Clean Project` in Android Studio per resettare la cache del bridge.

---
**Data Ultimo Aggiornamento**: 15 Febbraio 2026
**Stato**: 🟢 Windows Stabile | 🟡 Android in Refinement
