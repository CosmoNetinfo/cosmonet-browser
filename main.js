const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const userDataPath = app.getPath('userData');
const bookmarksFile = path.join(userDataPath, 'bookmarks.json');
const historyFile = path.join(userDataPath, 'history.json');

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
      webviewTag: true
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

app.whenReady().then(createWindow);

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
