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
                invoke: invoke, // Espone invoke per chiamate dirette (es. create_browser_window)
                loadBookmarks: () => invoke('load_bookmarks').catch(e => { console.error(e); return []; }),
                saveBookmarks: (bookmarks) => invoke('save_bookmarks', { bookmarks }).catch(e => console.error(e)),
                loadHistory: () => invoke('load_history').catch(e => { console.error(e); return []; }),
                saveHistory: (history) => invoke('save_history', { history }).catch(e => console.error(e)),
                loadSettings: () => invoke('load_settings').catch(e => { console.error(e); return null; }),
                saveSettings: (settings) => invoke('save_settings', { settings }).catch(e => console.error(e)),
                loadPasswords: () => invoke('load_passwords').catch(e => { console.error(e); return []; }),
                savePasswords: (passwords) => invoke('save_passwords', { passwords }).catch(e => console.error(e)),
                fetchFeed: () => invoke('fetch_rss').catch(e => { console.error(e); return ''; }),
                getAppPath: () => invoke('get_app_path').catch(e => { console.error(e); return ""; }),
                
                // Webview Management for Browser Tabs (Nativa)
                createWebView: (label, url, y_offset, height) => invoke('create_browser_window', { label, url, y_offset, height }).catch(e => console.error(e)),
                resizeWebView: (label, x, y, width, height) => invoke('resize_browser_window', { label, x, y, width, height }).catch(e => console.error(e)),
                setWebViewVisibility: (label, visible) => invoke('set_browser_visibility', { label, visible }).catch(e => console.error(e)),
                navigateWebView: (label, url) => invoke('navigate_browser', { label, url }).catch(e => console.error(e)),
                closeWebView: (label) => invoke('close_browser_window', { label }).catch(e => console.error(e)),
                goBack: (label) => invoke('webview_go_back', { label }).catch(e => console.error(e)),
                goForward: (label) => invoke('webview_go_forward', { label }).catch(e => console.error(e)),
                reloadWebView: (label) => invoke('webview_reload', { label }).catch(e => console.error(e)),
                openDevTools: (label) => invoke('open_browser_devtools', { label }).catch(e => console.error(e)),
                
                // Event listeners from backend
                onNewTab: (callback) => listen('new-tab', (event) => callback(event.payload)).catch(e => console.error(e)),
                onCloseTab: (callback) => listen('close-tab', (event) => callback(event.payload)).catch(e => console.error(e)),
                onReloadTab: (callback) => listen('reload-tab', (event) => callback(event.payload)).catch(e => console.error(e)),
                onNavigateTo: (callback) => listen('navigate-to', (event) => callback(event.payload)).catch(e => console.error(e)),
                
                // Nuovi listener per loading bar
                listen: listen // Espone listen per listener dinamici (es. browser-loading-ID)
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
