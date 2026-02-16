const { app, BrowserWindow, ipcMain, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const userDataPath = app.getPath('userData');
const bookmarksFile = path.join(userDataPath, 'bookmarks.json');
const historyFile = path.join(userDataPath, 'history.json');
const settingsFile = path.join(userDataPath, 'settings.json');
const passwordsFile = path.join(userDataPath, 'passwords.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    },
    titleBarStyle: 'default',
    frame: true
  });

  mainWindow.loadFile('index.html');

  // Menu personalizzato
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Nuova Tab', accelerator: 'CmdOrCtrl+T', click: () => mainWindow.webContents.send('new-tab') },
        { label: 'Chiudi Tab', accelerator: 'CmdOrCtrl+W', click: () => mainWindow.webContents.send('close-tab') },
        { type: 'separator' },
        { label: 'Esci', role: 'quit' }
      ]
    },
    {
      label: 'Modifica',
      submenu: [
        { label: 'Annulla', role: 'undo' },
        { label: 'Ripeti', role: 'redo' },
        { type: 'separator' },
        { label: 'Taglia', role: 'cut' },
        { label: 'Copia', role: 'copy' },
        { label: 'Incolla', role: 'paste' }
      ]
    },
    {
      label: 'Visualizza',
      submenu: [
        { label: 'Ricarica', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.webContents.send('reload-tab') },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Zoom Reset', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Schermo intero', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Strumenti',
      submenu: [
        { label: 'Console sviluppatore', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    },
    {
      label: 'Aiuto',
      submenu: [
        { 
          label: 'Visita cosmonet.info', 
          click: () => mainWindow.webContents.send('navigate-to', 'https://www.cosmonet.info/')
        },
        { label: 'Informazioni', click: () => showAbout() }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function showAbout() {
  const { dialog } = require('electron');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Cosmonet Browser',
    message: 'Cosmonet Browser v1.0.0',
    detail: 'Browser personalizzato per cosmonet.info\n\nSviluppato con Electron\n© 2026 Cosmonet.info',
    buttons: ['OK']
  });
}

// Gestione segnalibri
ipcMain.handle('load-bookmarks', async () => {
  try {
    if (fs.existsSync(bookmarksFile)) {
      const data = fs.readFileSync(bookmarksFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Errore caricamento segnalibri:', err);
  }
  return [];
});

ipcMain.handle('save-bookmarks', async (event, bookmarks) => {
  try {
    fs.writeFileSync(bookmarksFile, JSON.stringify(bookmarks, null, 2));
    return true;
  } catch (err) {
    console.error('Errore salvataggio segnalibri:', err);
    return false;
  }
});

// Gestione impostazioni
ipcMain.handle('load-settings', async () => {
  try {
    if (fs.existsSync(settingsFile)) {
      const data = fs.readFileSync(settingsFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Errore caricamento impostazioni:', err);
  }
  return null;
});

ipcMain.handle('get-app-path', () => __dirname);

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    return true;
  } catch (err) {
    console.error('Errore salvataggio impostazioni:', err);
    return false;
  }
});

// Gestione cronologia
ipcMain.handle('load-history', async () => {
  try {
    if (fs.existsSync(historyFile)) {
      const data = fs.readFileSync(historyFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Errore caricamento cronologia:', err);
  }
  return [];
});

ipcMain.handle('save-history', async (event, history) => {
  try {
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    return true;
  } catch (err) {
    console.error('Errore salvataggio cronologia:', err);
    return false;
  }
});

// Gestione Password
ipcMain.handle('load-passwords', async () => {
  try {
    if (fs.existsSync(passwordsFile)) {
      const data = fs.readFileSync(passwordsFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Errore caricamento password:', err);
  }
  return [];
});

ipcMain.handle('save-passwords', async (event, passwords) => {
  try {
    fs.writeFileSync(passwordsFile, JSON.stringify(passwords, null, 2));
    return true;
  } catch (err) {
    console.error('Errore salvataggio password:', err);
    return false;
  }
});

// Disabilitiamo il rilevamento di automazione e forziamo JavaScript
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-features', 'UserAgentClientHint');
app.commandLine.appendSwitch('enable-javascript', 'true');
app.commandLine.appendSwitch('no-sandbox'); 
app.commandLine.appendSwitch('disable-infobars');
app.commandLine.appendSwitch('lang', 'it-IT');
app.commandLine.appendSwitch('remote-debugging-port', '0'); 

app.whenReady().then(() => {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
  
  // Applichiamo UA globale
  session.defaultSession.setUserAgent(userAgent);
  
  // Sessione per il webview
  const cosmoSession = session.fromPartition('persist:cosmonet_session');
  cosmoSession.setUserAgent(userAgent);
  
  // Mascheramento headers per tutto il traffico
  const filter = { urls: ['*://*/*'] };
  
  cosmoSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    details.requestHeaders['User-Agent'] = userAgent;
    
    // Rimuoviamo ogni traccia di Electron/Automazione (Google bypass)
    delete details.requestHeaders['X-Requested-With'];
    delete details.requestHeaders['X-DevTools-Request-Id'];
    
    // Rimuoviamo Client Hints che rivelano Electron
    for (let header in details.requestHeaders) {
      if (header.toLowerCase().startsWith('sec-ch-ua')) {
        delete details.requestHeaders[header];
      }
    }
    
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // Anche per la sessione di default per massima sicurezza
  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    details.requestHeaders['User-Agent'] = userAgent;
    delete details.requestHeaders['X-Requested-With'];
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
