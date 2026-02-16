/**
 * Tauri Bridge for Cosmonet Browser
 * This file emulates the Electron IPC API using Tauri's invoke system.
 */

if (window.__TAURI__) {
    const { invoke } = window.__TAURI__.core;
    const { listen } = window.__TAURI__.event;

    window.electronAPI = {
        loadBookmarks: () => invoke('load_bookmarks'),
        saveBookmarks: (bookmarks) => invoke('save_bookmarks', { bookmarks }),
        loadHistory: () => invoke('load_history'),
        saveHistory: (history) => invoke('save_history', { history }),
        loadSettings: () => invoke('load_settings'),
        saveSettings: (settings) => invoke('save_settings', { settings }),
        loadPasswords: () => invoke('load_passwords'),
        savePasswords: (passwords) => invoke('save_passwords', { passwords }),
        getAppPath: () => invoke('get_app_path'),
        
        // Webview Management for Browser Tabs
        createWebView: (id, url, x, y, width, height) => invoke('create_webview', { id, url, x, y, width, height }),
        updateWebViewBounds: (id, x, y, width, height) => invoke('update_webview_bounds', { id, x, y, width, height }),
        setWebViewVisibility: (id, visible) => invoke('set_webview_visibility', { id, visible }),
        navigateWebView: (id, url) => invoke('navigate_webview', { id, url }),
        goBack: (id) => invoke('webview_go_back', { id }),
        goForward: (id) => invoke('webview_go_forward', { id }),
        reloadWebView: (id) => invoke('webview_reload', { id }),
        
        // Event listeners from backend
        onNewTab: (callback) => listen('new-tab', (event) => callback(event.payload)),
        onCloseTab: (callback) => listen('close-tab', (event) => callback(event.payload)),
        onReloadTab: (callback) => listen('reload-tab', (event) => callback(event.payload)),
        onNavigateTo: (callback) => listen('navigate-to', (event) => callback(event.payload))
    };

    console.log("Tauri Bridge Loaded");
} else {
    console.warn("Tauri API not found. If you are in Electron, this is normal.");
}
