/**
 * Tauri Bridge for Cosmonet Browser
 * This file emulates the Electron IPC API using Tauri's invoke system.
 */

(function() {
    console.log("Initializing Tauri Bridge...");
    
    // Inizializzazione sicura di electronAPI
    window.electronAPI = window.electronAPI || {};

    if (window.__TAURI__) {
        try {
            const { invoke } = window.__TAURI__.core;
            const { listen } = window.__TAURI__.event;

            window.electronAPI = {
                loadBookmarks: () => invoke('load_bookmarks').catch(e => { console.error(e); return []; }),
                saveBookmarks: (bookmarks) => invoke('save_bookmarks', { bookmarks }).catch(e => console.error(e)),
                loadHistory: () => invoke('load_history').catch(e => { console.error(e); return []; }),
                saveHistory: (history) => invoke('save_history', { history }).catch(e => console.error(e)),
                loadSettings: () => invoke('load_settings').catch(e => { console.error(e); return null; }),
                saveSettings: (settings) => invoke('save_settings', { settings }).catch(e => console.error(e)),
                loadPasswords: () => invoke('load_passwords').catch(e => { console.error(e); return []; }),
                savePasswords: (passwords) => invoke('save_passwords', { passwords }).catch(e => console.error(e)),
                getAppPath: () => invoke('get_app_path').catch(e => { console.error(e); return ""; }),
                
                // Webview Management for Browser Tabs
                createWebView: (id, url, x, y, width, height) => invoke('create_webview', { id, url, x, y, width, height }).catch(e => console.error(e)),
                updateWebViewBounds: (id, x, y, width, height) => invoke('update_webview_bounds', { id, x, y, width, height }).catch(e => console.error(e)),
                setWebViewVisibility: (id, visible) => invoke('set_webview_visibility', { id, visible }).catch(e => console.error(e)),
                navigateWebView: (id, url) => invoke('navigate_webview', { id, url }).catch(e => console.error(e)),
                goBack: (id) => invoke('webview_go_back', { id }).catch(e => console.error(e)),
                goForward: (id) => invoke('webview_go_forward', { id }).catch(e => console.error(e)),
                reloadWebView: (id) => invoke('webview_reload', { id }).catch(e => console.error(e)),
                
                // Event listeners from backend
                onNewTab: (callback) => listen('new-tab', (event) => callback(event.payload)).catch(e => console.error(e)),
                onCloseTab: (callback) => listen('close-tab', (event) => callback(event.payload)).catch(e => console.error(e)),
                onReloadTab: (callback) => listen('reload-tab', (event) => callback(event.payload)).catch(e => console.error(e)),
                onNavigateTo: (callback) => listen('navigate-to', (event) => callback(event.payload)).catch(e => console.error(e))
            };
            console.log("Tauri Bridge Loaded Successfully");
        } catch (err) {
            console.error("Critical error in Tauri Bridge:", err);
            // Fallback mock per evitare crash totali
            setupFallbackAPI();
        }
    } else {
        console.warn("Tauri API not found. If you are in Electron, this is normal.");
        setupFallbackAPI();
    }

    function setupFallbackAPI() {
        if (!window.electronAPI.loadSettings) {
            window.electronAPI = {
                loadSettings: async () => JSON.parse(localStorage.getItem('cosmo_settings') || 'null'),
                saveSettings: async (s) => localStorage.setItem('cosmo_settings', JSON.stringify(s)),
                loadBookmarks: async () => JSON.parse(localStorage.getItem('cosmo_bookmarks') || '[]'),
                saveBookmarks: async (b) => localStorage.setItem('cosmo_bookmarks', JSON.stringify(b)),
                loadHistory: async () => JSON.parse(localStorage.getItem('cosmo_history') || '[]'),
                saveHistory: async (h) => localStorage.setItem('cosmo_history', JSON.stringify(h)),
                loadPasswords: async () => [],
                savePasswords: async () => {},
                getAppPath: async () => "",
                onNewTab: () => {},
                onCloseTab: () => {},
                onReloadTab: () => {},
                onNavigateTo: () => {}
            };
        }
    }
})();
