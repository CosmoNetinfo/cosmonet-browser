# Cosmo Browser

![Logo Cosmo Browser](branding/icons/cosmo-browser-128.png)

Browser gratuito in sviluppo per **Windows, Linux e Android**, con identità CosmoNet, personalizzazioni locali ed estensioni proprie. La nuova direzione tecnica è un derivato di **Chromium**.

**Stato attuale: preparazione della base Chromium, non una release del browser.** Il repository contiene strumenti di compilazione, modifiche native verificabili, un'estensione desktop collaudata in Chromium di test, un nuovo logo con favicon e temi. Non sono ancora disponibili nuovi installer Windows/Linux o APK Cosmo Browser verificati. Il vecchio eseguibile nella radice e le vecchie release appartengono al prototipo Tauri/Electron e non rappresentano questo nuovo percorso.

## Obiettivi

- Navigazione quotidiana compatibile con i siti moderni.
- Versioni Windows x64, Linux x64 e Android ARM64.
- Password conservate sul dispositivo, senza sincronizzazione con account cloud.
- Temi, colori, pagina iniziale e strumenti CosmoNet personalizzabili.
- Estensioni CosmoNet sviluppate nel progetto, con permessi minimi.
- Consumi contenuti da verificare con misure ripetibili, senza indebolire sandbox e isolamento dei siti.
- Distribuzione iniziale gratuita per uso personale, senza acquisti, abbonamenti o funzioni di vendita.

Nessun browser può garantire sicurezza al 100%. L'obiettivo è ridurre i rischi con aggiornamenti tempestivi, protezioni del motore, gestione corretta delle credenziali e test. Le funzioni desiderate devono superare verifiche concrete prima di essere dichiarate disponibili.

## Cosa funziona e cosa manca

| Componente | Stato | Limiti attuali |
| --- | --- | --- |
| Versione Chromium e depot_tools fissati | Implementato | La versione va aggiornata seguendo le patch di sicurezza upstream |
| Download di una baseline ridotta dei sorgenti | Implementato | Serve ai test; non è il checkout completo |
| Controllo prerequisiti Windows/Linux/Android | Implementato | I pacchetti Linux devono essere installati e verificati sul builder |
| Applicazione delle modifiche native | Verificabile con test sui sorgenti reali | Compilazione C++ e test runtime ancora da eseguire |
| Branding e separazione profili desktop | Modifiche preparate | Icone native, traduzioni e identità installer da completare |
| Sincronizzazione browser e archivio password account disabilitati | Modifiche preparate | Da verificare nelle build native prima della distribuzione |
| Cosmo Home per desktop | Implementato | Installazione di sviluppo manuale; non ancora integrato nel browser |
| Aspetto chiaro, scuro, sabbia e sistema nella nuova scheda | Implementato | L'aspetto della nuova scheda è separato dal tema della barra del browser |
| Temi browser Foresta e Notte | Manifest e pacchetti disponibili | Da collaudare nelle build Cosmo Browser |
| Password desktop | Backend nativo conservato | Cifratura, portachiavi Linux e assenza di fallback debole da validare |
| Password Android solo sul dispositivo | Non disponibile | Backend GMS disabilitato nelle modifiche; serve un archivio locale verificato |
| Estensioni Android | Non disponibile | Non equivalgono automaticamente alle estensioni desktop |
| Installer, pacchetti Linux e APK aggiornabili | Da realizzare e collaudare | Nessun nuovo download finale disponibile |
| Aggiornamenti browser | Da realizzare | Non usare la futura prima build come browser principale prima di questa fase |

Schede, download, PDF, cronologia, segnalibri, navigazione privata e permessi dei siti saranno ereditati dalla base Chromium e collaudati nelle build del prodotto. La loro presenza upstream non certifica ancora il funzionamento in Cosmo Browser.

## Perché Chromium

Chromium fornisce il motore e gran parte dell'infrastruttura di un browser completo. Il progetto mantiene le personalizzazioni in un livello separato, invece di riscrivere motore HTML, JavaScript, TLS o sandbox.

Tauri usa webview di sistema e resta utile per applicazioni leggere, ma il suo eseguibile ridotto non misura la memoria complessiva impiegata dal runtime. Electron permette di costruire rapidamente un'interfaccia desktop, ma non supporta tutte le API delle estensioni Chrome. Per gli obiettivi di Cosmo Browser è stato scelto un derivato diretto di Chromium.

La scelta non garantisce automaticamente meno RAM di Chrome o Brave. Gli obiettivi di prestazione sono misurare avvio, memoria con 1/10/30 schede, CPU inattiva, sospensione delle schede, riproduzione video e consumi su Android. La base non include modifiche che disabilitano la sandbox o la sicurezza web.

Riferimenti: [Chromium](https://www.chromium.org/), [estensioni Electron](https://www.electronjs.org/docs/latest/api/extensions), [webview Tauri](https://tauri.app/reference/webview-versions/).

## Struttura

```text
branding/                    Logo originale, prompt e icone esportate
favicon.ico, favicon.png     Favicon multirisoluzione e PNG 32 pixel
chromium/
  product.json                Identità, piattaforme e requisiti del prodotto
  upstream.lock.json          Commit Chromium, depot_tools e hash della baseline
  args/                       Configurazioni GN dei tre target
  patches/series.json         Modifiche con contesti e hash di risultato
  patches/cosmo-browser.patch Diff leggibile delle modifiche native
extensions/cosmo-home/        Nuova scheda desktop, senza accesso ai siti visitati
themes/                      Manifest dei temi browser
tools/chromium.py            doctor, sync, apply, configure, build
tools/fetch-upstream.py       Baseline ridotta dei sorgenti ufficiali
tools/make-patches.py         Rigenera le modifiche contro la baseline verificata
tools/package-extensions.py   Pacchetti ZIP deterministici per estensioni e temi
tests/                       Test JavaScript, Python e browser reale
legacy/                      Manifest e workflow del vecchio prototipo
src-tauri/, src-web/, www/    Sorgenti storici, ancora conservati per riferimento
.work/                       Baseline e dati temporanei locali, esclusi da Git
dist/extensions/             Pacchetti di sviluppo generati, esclusi da Git
```

I vecchi documenti di stato descrivono il prototipo storico. Questo README e i file `chromium/` descrivono il nuovo percorso. I vecchi workflow che pubblicavano build Tauri sono stati archiviati; la CI corrente verifica il nuovo codice senza pubblicare un browser.

## Avvio per sviluppatori

Per testare il modulo Cosmo Home non è necessario compilare Chromium.

Requisiti: Git, Node.js 22 o successivo, npm e Python 3.9 o successivo. Per i test locali recenti è consigliato Python 3.12+. Lo script Node usa `py` su Windows e `python3` su Linux.

```sh
git clone https://github.com/CosmoNetinfo/cosmonet-browser.git
cd cosmonet-browser
npm ci --ignore-scripts
npm test
node tools/python.cjs tools/fetch-upstream.py
npm run test:upstream
npm run extensions:pack
```

Il download della baseline legge file dal commit ufficiale indicato nel lock. Gli hash vengono controllati; non si applicano modifiche a sorgenti diversi. I test usano copie temporanee e non alterano un checkout di sviluppo.

Per i test dell'estensione in Chromium reale:

```sh
npm exec playwright install chromium
npm run test:browser
```

Su Linux, se mancano le librerie per il browser di test, usare `npm exec playwright install --with-deps chromium`. Questo comando può installare pacchetti di sistema e richiedere privilegi amministrativi. Per usare un Chromium di test già installato, impostare `COSMO_TEST_BROWSER` al percorso del suo eseguibile.

Il test verifica caricamento dell'estensione, preferenze locali dopo ricaricamento, cambio tema e motore, validazione dei collegamenti, nomi trattati come testo, layout stretto, assenza di richieste web dalla nuova scheda inattiva e ricerca. Gli screenshot vengono salvati in `test-results/`. Queste verifiche non sono un test delle build native Windows/Linux/Android.

## Logo e favicon

Il simbolo di Cosmo Browser è una **C orbitale** che riprende blu, ciano e viola del brand CosmoNet. Il master trasparente è in `branding/cosmo-browser-master.png`; è stato generato con ImageGen e il prompt completo è conservato in `branding/logo-prompt.txt`.

`branding/icons/` contiene PNG da 16 a 1024 pixel e un ICO multirisoluzione. Nella radice sono disponibili `favicon.ico` e `favicon.png`. Cosmo Home usa il nuovo simbolo sia come logo sia come favicon e icona dell'estensione; anche le pagine storiche hanno il riferimento alla nuova favicon. Le risorse Chromium desktop corrispondenti sono incluse nella serie di modifiche, con controllo degli hash. L'integrazione delle icone native Android resta da completare con la build mobile.

Per rigenerare le dimensioni dal master, installare Pillow nell'ambiente di sviluppo e usare `node tools/python.cjs tools/build-brand-icons.py`, poi `node tools/python.cjs tools/make-patches.py`. Il generatore preserva la trasparenza e il disegno originale; non serve alle normali compilazioni perché i file esportati sono già nel repository. Non è ancora disponibile un master vettoriale.

## Provare Cosmo Home ed estensioni proprie

In un browser desktop Chromium compatibile:

1. Aprire la gestione estensioni, normalmente `chrome://extensions`.
2. Attivare la modalità sviluppatore.
3. Scegliere **Carica estensione non pacchettizzata** e selezionare `extensions/cosmo-home`.
4. Aprire una nuova scheda.

L'estensione usa Manifest V3 e richiede solo il permesso `storage`. Non ha script nei siti visitati, accesso alla cronologia, lettura delle password o worker in background. Temi della pagina, motore di ricerca e collegamenti usano `chrome.storage.local`, non `chrome.storage.sync`. Non sono cifrati perché contengono solo preferenze e collegamenti: **non inserirvi credenziali o altri segreti**.

La nuova scheda non carica font remoti, favicon da servizi esterni, analytics o codice remoto. Una ricerca invia il testo al motore scelto; aprire un collegamento contatta il sito corrispondente. Questo non è una promessa di assenza di traffico di rete dell'intero browser.

`npm run extensions:pack` genera:

- `dist/extensions/cosmo-home.zip`;
- `dist/extensions/cosmo-theme-forest.zip`;
- `dist/extensions/cosmo-theme-midnight.zip`;
- cartelle `dist/extensions/forest` e `dist/extensions/midnight`, ciascuna con il proprio `manifest.json`.

I ZIP sono archivi di sviluppo, non pacchetti CRX firmati. Per provare un tema si carica la cartella del tema dalla gestione estensioni, se il browser usato lo consente. I colori della barra del browser sono nei manifest in `themes/`; i colori della nuova scheda sono in `extensions/cosmo-home/newtab.css`.

Per aggiungere strumenti CosmoNet, creare un modulo in `extensions/` con permessi limitati alla sua funzione. Le funzioni che necessitano API interne al browser richiedono invece modifiche native, controlli di accesso e test specifici. Le estensioni di terzi devono essere provate singolarmente: servizi Google, DRM e ogni API del Chrome Web Store non sono garantiti dalla sola compilazione di Chromium.

## Compilare il browser

### Versione fissata e spazio

La baseline iniziale è **Chromium 159.0.8154.34**, commit `4deb883708d3d25100c5aac2148aafc95dae95ac`. Il commit di `depot_tools` è fissato separatamente nel lock. Questa è una fotografia riproducibile, non una promessa di essere sempre la versione più recente.

Il checkout completo e i suoi strumenti richiedono decine di GB di download. La documentazione Chromium indica almeno 100 GB liberi; lo script richiede prudenzialmente 120 GiB prima di iniziare, ma build multiple, simboli e cache possono richiederne molti di più. Sono raccomandati SSD, almeno 16 GB di RAM e spazio aggiuntivo. Non viene avviato un checkout completo dai normali test.

Usare una cartella dedicata **esterna al repository e senza spazi**, per esempio `V:/cb` su Windows o `/srv/cosmo-build` su Linux. Ogni piattaforma richiede un workspace separato. Gli script non eseguono reset forzati, non adottano cartelle esistenti non riconosciute e non modificano la configurazione Git globale.

### Windows x64

Requisiti del ramo scelto:

- Windows 10/11 x64 e volume NTFS;
- Visual Studio 2026, strumenti C++ x64, workload Desktop C++ e componenti ATL/MFC;
- Windows SDK 10.0.28000 e Debugging Tools compatibili;
- Git, Python e spazio sufficiente.

Verificare prima di scaricare i sorgenti:

```powershell
npm run doctor -- --target windows-x64 --workspace V:/cb
```

Il comando restituisce codice `2` se mancano prerequisiti. Per un report strutturato aggiungere `--json`. Sul computer iniziale sono presenti Visual Studio 2026 e il vecchio SDK 26100, ma il controllo segnala componenti C++/ATL-MFC, SDK 28000 e Debugging Tools mancanti. Finché non vengono installati la compilazione completa non è verificabile.

```powershell
py tools/chromium.py sync --target windows-x64 --workspace V:/cb
py tools/chromium.py configure --target windows-x64 --workspace V:/cb
py tools/chromium.py build --target windows-x64 --workspace V:/cb
```

L'output di sviluppo si trova in `V:/cb/src/out/Cosmo-windows-x64/`. Non distribuire il solo `chrome.exe`: il browser dipende da librerie, risorse, file di dati e processi ausiliari. Packaging e installer Cosmo Browser richiedono una fase ulteriore.

### Linux x64

Usare una macchina Linux x64, preferibilmente Ubuntu, con Git, Python e i requisiti indicati da Chromium:

```sh
python3 tools/chromium.py doctor --target linux-x64 --workspace /srv/cosmo-linux
python3 tools/chromium.py sync --target linux-x64 --workspace /srv/cosmo-linux
sudo /srv/cosmo-linux/src/build/install-build-deps.sh
python3 tools/chromium.py configure --target linux-x64 --workspace /srv/cosmo-linux
python3 tools/chromium.py build --target linux-x64 --workspace /srv/cosmo-linux
```

La cartella `/srv/cosmo-linux` deve essere scrivibile dall'utente di compilazione. L'installazione delle dipendenze è un'operazione esplicita di sistema; il driver non usa `sudo` automaticamente. L'output è `src/out/Cosmo-linux-x64/`. Packaging, integrazione desktop, portachiavi e distribuzioni supportate devono essere collaudati.

### Android ARM64

**La compilazione Chromium per Android richiede un host Linux x64.** Android Studio e l'SDK Android su Windows non sostituiscono questo requisito. Il target iniziale è un APK ARM64 per dispositivi compatibili con il livello Android richiesto da Chromium; il livello minimo va verificato nel manifest finale.

```sh
python3 tools/chromium.py doctor --target android-arm64 --workspace /srv/cosmo-android
python3 tools/chromium.py sync --target android-arm64 --workspace /srv/cosmo-android
sudo /srv/cosmo-android/src/build/install-build-deps.sh
python3 tools/chromium.py configure --target android-arm64 --workspace /srv/cosmo-android
python3 tools/chromium.py build --target android-arm64 --workspace /srv/cosmo-android
```

Il package configurato è `info.cosmonet.browser`; il target GN è `chrome_public_apk`. L'output atteso è sotto `src/out/Cosmo-android-arm64/apks/`. Non è ancora stato compilato o installato su dispositivo in questo percorso.

Android richiede comunque una firma crittografica per installare un APK. Per uso personale non serve acquistare un certificato: si può usare una chiave locale di sviluppo. Per conservare gli aggiornamenti sullo stesso dispositivo sarà necessario mantenere la stessa identità di firma. Il repository non contiene chiavi private e non richiede firma commerciale Windows.

Riferimenti upstream: [Windows](https://chromium.googlesource.com/chromium/src/+/main/docs/windows_build_instructions.md), [Linux](https://chromium.googlesource.com/chromium/src/+/main/docs/linux/build_instructions.md), [Android](https://chromium.googlesource.com/chromium/src/+/main/docs/android_build_instructions.md).

## Password e dati locali

Il nuovo percorso non usa né importa automaticamente il file `passwords.json` del prototipo. Non inserire password reali nel vecchio gestore.

Le modifiche native iniziali:

- fanno restituire `false` al controllo di abilitazione della sincronizzazione;
- impediscono la costruzione dell'archivio password associato a un account;
- mantengono il backend desktop nativo;
- sostituiscono il backend Android dipendente dai servizi Google con il backend vuoto già previsto da Chromium;
- disabilitano il backup dell'app nel manifest Android;
- separano i percorsi profilo desktop da Chromium.

**Queste sono modifiche ai sorgenti, non ancora garanzie runtime della build finale.** Prima di abilitare password reali occorre verificare cifratura, chiavi e comportamento dopo riavvio. Su Linux è necessario collaudare Secret Service/KWallet e rifiutare eventuali fallback deboli. Su Android va implementato un vault sul dispositivo con chiavi protette da Android Keystore: il salvataggio è attualmente non disponibile, anziché essere delegato a un servizio Google.

L'assenza di sincronizzazione non protegge automaticamente da malware sul dispositivo, account di sistema compromessi, estensioni dannose o backup del sistema operativo. I test di accettazione dovranno comprendere l'ispezione delle richieste di rete relative alle credenziali e l'assenza di password in log o file di testo.

## Modifiche native e aggiornamenti

`chromium/patches/cosmo-browser.patch` rende leggibili le modifiche. `series.json` ne contiene i contesti e gli hash. Il driver controlla il commit del checkout e tutti i file coinvolti prima di scrivere: se un file differisce, interrompe l'operazione senza iniziare l'applicazione. Applicare nuovamente la stessa serie è consentito e non duplica le modifiche.

Per rigenerare la serie dopo una modifica intenzionale:

```sh
node tools/python.cjs tools/fetch-upstream.py
node tools/python.cjs tools/make-patches.py
npm run test:upstream
git diff -- chromium/
```

Un aggiornamento di versione richiede la scelta e verifica di un nuovo commit ufficiale, aggiornamento del lock, revisione di ogni modifica, nuove build native e test sui tre sistemi. Non aggiornare silenziosamente il motore su un ramo diverso e non ignorare errori di contesto. L'updater del prodotto è ancora da implementare: le prime build sono strumenti di sviluppo.

## CI

`Verify Cosmo Browser` esegue i test JavaScript e i controlli delle modifiche upstream su Windows e Linux. Su Linux esegue anche il test dell'estensione in Chromium reale e conserva i pacchetti di sviluppo e gli screenshot. Non compila l'intero motore e non pubblica installer.

`Chromium development build (self-hosted)` è un workflow manuale per un builder dedicato con etichetta `cosmo-chromium` e sistema operativo coerente con il target. Richiede Node, Python, prerequisiti nativi e un workspace persistente. Non si avvia dalle pull request e non pubblica release. Prima di riusare un workspace già personalizzato, le modifiche devono essere revisionate e gestite esplicitamente: `sync` rifiuta un checkout sporco.

## Prossime tappe e criteri di accettazione

1. Installare i prerequisiti mancanti e compilare la prima build Windows; verificare che le modifiche native siano accettate dal compilatore.
2. Collaudare navigazione, schede, popup, download, PDF, permessi, video e ripristino sessioni.
3. Validare salvataggio password desktop locale, cifratura e assenza di trasmissione account.
4. Completare branding, icone, identità installer e integrazione del modulo Cosmo Home. Gli identificatori dei servizi Windows richiedono revisione prima di un installer installabile accanto a Chromium.
5. Compilare e collaudare Linux, compresi sandbox, dipendenze e portachiavi.
6. Compilare Android; realizzare e verificare password locali, temi e strumenti CosmoNet per mobile. Non dichiarare supportate le estensioni desktop senza un'implementazione dedicata.
7. Aggiungere packaging, aggiornamenti verificabili e misurazioni delle prestazioni su hardware reale.

L'obiettivo "le funzioni migliori dei browser" sarà tradotto in interventi verificabili: gestione schede e sospensione, lettura, blocco dei contenuti, strumenti di privacy, ricerca, accessibilità e personalizzazione. L'elenco non costituisce una promessa di funzioni già presenti.

## Contributi, licenza e uso personale

Per contribuire, aprire una issue o una pull request con il problema concreto, la modifica proposta e i test eseguiti. Evitare segreti, profili personali, archivi password, chiavi di firma e binari nel repository.

Il manifest storico dichiara MIT, ma manca ancora un file `LICENSE` del progetto: la licenza va formalizzata prima della distribuzione. Questa fase non introduce una nuova licenza o restrizioni commerciali sul codice. L'intenzione di prodotto è distribuirlo gratuitamente per uso personale, senza monetizzazione. Chromium e le dipendenze mantengono le proprie licenze e attribuzioni, da includere nei pacchetti finali.

Repository: [CosmoNetinfo/cosmonet-browser](https://github.com/CosmoNetinfo/cosmonet-browser). Sito: [cosmonet.info](https://www.cosmonet.info/).
