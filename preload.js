const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadBookmarks: () => ipcRenderer.invoke('load-bookmarks'),
  saveBookmarks: (bookmarks) => ipcRenderer.invoke('save-bookmarks', bookmarks),
  loadHistory: () => ipcRenderer.invoke('load-history'),
  saveHistory: (history) => ipcRenderer.invoke('save-history', history),
  onNewTab: (callback) => ipcRenderer.on('new-tab', callback),
  onCloseTab: (callback) => ipcRenderer.on('close-tab', callback),
  onReloadTab: (callback) => ipcRenderer.on('reload-tab', callback),
  onNavigateTo: (callback) => ipcRenderer.on('navigate-to', (event, url) => callback(url))
});
