// ========== Cosmonet Browser Renderer ==========
console.log("📄 renderer.js initialized");

// Variabili ambiente (var per evitare conflitti di ridichiarazione)
var isTauri = typeof window.__TAURI__ !== 'undefined';
var isElectron = !isTauri && typeof window.electronAPI !== 'undefined' && window.electronAPI.onNewTab !== undefined;

function pathJoin(part1, part2) {
    if (!part1) return part2;
    const sep = part1.includes('\\') || part2.includes('\\') ? '\\' : '/';
    return part1.endsWith(sep) ? part1 + part2 : part1 + sep + part2;
}

// Configurazione di default
let config = {
    startupUrls: ['https://www.cosmonet.info/'],
    searchEngine: 'https://www.google.com/search?q=',
    darkMode: false
};

// Stato del browser
let tabs = [];
let activeTabId = null;
let bookmarks = [];
let history = [];
let savedPasswords = [];
let appPath = '';

// Stato Drag & Drop
let draggedBookmark = null;

// Elementi DOM
let urlBar, backBtn, forwardBtn, reloadBtn, homeBtn, bookmarkBtn, newTabBtn, menuBtn, mainMenu, bookmarksBtn, historyBtn, tabsBar, webviewsContainer, bookmarksPanel, historyPanel, settingsPage, bookmarksList, bookmarksItemsContainer, addFolderBtn, historyList, favoritesBar;
let cosmoFeedBtn, cosmoFeedPanel, cosmoFeedList, refreshFeedBtn, readingModeOverlay, readingContent, closeReadingModeBtn, saveForLaterBtn;
let passwordsBtnMenu, passwordsPanel, passwordsList;
let settingHomeUrlPage, settingSearchEnginePage, settingDarkModePage, saveAllSettingsBtn, closeSettingsPageBtn;
let loadingBarContainer, loadingBar;

function initializeElements() {
    urlBar = document.getElementById('url-bar');
    backBtn = document.getElementById('back-btn');
    forwardBtn = document.getElementById('forward-btn');
    reloadBtn = document.getElementById('reload-btn');
    homeBtn = document.getElementById('home-btn');
    bookmarkBtn = document.getElementById('bookmark-btn');
    newTabBtn = document.getElementById('new-tab-btn');
    menuBtn = document.getElementById('menu-btn');
    mainMenu = document.getElementById('main-menu');
    bookmarksBtn = document.getElementById('bookmarks-btn');
    historyBtn = document.getElementById('history-btn');
    tabsBar = document.getElementById('tabs-bar');
    webviewsContainer = document.getElementById('webviews-container');
    bookmarksPanel = document.getElementById('bookmarks-panel');
    historyPanel = document.getElementById('history-panel');
    settingsPage = document.getElementById('settings-page');
    bookmarksList = document.getElementById('bookmarks-list');
    bookmarksItemsContainer = document.getElementById('bookmarks-items-container');
    addFolderBtn = document.getElementById('add-folder-btn');
    historyList = document.getElementById('history-list');
    passwordsBtnMenu = document.getElementById('menu-passwords');
    passwordsPanel = document.getElementById('passwords-panel');
    passwordsList = document.getElementById('passwords-list');
    favoritesBar = document.getElementById('favorites-bar');
    cosmoFeedBtn = document.getElementById('cosmo-feed-btn');
    cosmoFeedPanel = document.getElementById('cosmo-feed-panel');
    cosmoFeedList = document.getElementById('cosmo-feed-list');
    refreshFeedBtn = document.getElementById('refresh-feed-btn');
    readingModeOverlay = document.getElementById('reading-mode-overlay');
    readingContent = document.getElementById('reading-content');
    closeReadingModeBtn = document.getElementById('close-reading-mode');
    saveForLaterBtn = document.getElementById('save-for-later-btn');
    settingHomeUrlPage = document.getElementById('setting-home-url-page');
    settingSearchEnginePage = document.getElementById('setting-search-engine-page');
    settingDarkModePage = document.getElementById('setting-dark-mode-page');
    saveAllSettingsBtn = document.getElementById('save-all-settings-btn');
    closeSettingsPageBtn = document.getElementById('close-settings-page-btn');
    loadingBarContainer = document.getElementById('loading-bar-container');
    loadingBar = document.getElementById('loading-bar');
}

// Inizializzazione
async function init() {
    try {
        initializeElements();
        
        // Carica impostazioni
        try {
            const savedSettings = await window.electronAPI.loadSettings();
            if (savedSettings) {
                config = { ...config, ...savedSettings };
            }
        } catch (e) { 
            console.warn('Error loading settings:', e);
        }
        
        if (isElectron) {
            try {
                appPath = await window.electronAPI.getAppPath();
            } catch (e) { 
                console.warn('Error getting app path:', e);
            }
        }
        
        // Carica dati
        try {
            bookmarks = await window.electronAPI.loadBookmarks();
        } catch (e) { 
            console.warn('Error loading bookmarks:', e);
            bookmarks = []; 
        }
        
        // Migrazione segnalibri (Aggiunge type e previene errori)
        bookmarks = (bookmarks || []).map(b => {
            if (!b.type) b.type = 'bookmark';
            if (b.type === 'folder' && !b.children) b.children = [];
            return b;
        });

        try {
            history = await window.electronAPI.loadHistory();
        } catch (e) { 
            console.warn('Error loading history:', e);
            history = []; 
        }
        
        // Applica impostazioni iniziali
        applySettings();
        
        // Event listeners
        setupEventListeners();
        
        // Crea pagine all'avvio
        if (config.startupUrls && config.startupUrls.length > 0) {
            config.startupUrls.forEach(url => createTab(url || 'home.html'));
        } else {
            createTab('home.html');
        }
        
        // Aggiorna UI
        renderBookmarks();
        renderFavoritesBar();
        renderHistory();
        updateSettingsUI();
        
        // Listener ridimensionamento per Tauri
        if (isTauri) {
            window.addEventListener('resize', () => {
                if (activeTabId) syncTauriWebview(activeTabId);
            });
        }
        
        console.log("✅ Initialization Complete!");
    } catch (criticalErr) {
        console.error("CRITICAL INITIALIZATION ERROR:", criticalErr);
        alert("Errore critico durante l'inizializzazione: " + criticalErr.message);
    }
}

// Funzione per creare iframe/webview (Centralizzata)
// Funzione per gestire la Browser View Nativa
// Non restituisce un elemento DOM reale ma gestisce la comunicazione con Rust
function createWebviewInstance(id, url) {
    console.log(`Richiesta creazione Browser View per: ${url} (ID: ${id})`);
    
    // Calcola layout iniziale
    const container = document.getElementById('webviews-container');
    const rect = container.getBoundingClientRect();
    
    // Invoca backend per creare la finestra nativa specifica (label = id)
    if (isTauri && window.electronAPI && window.electronAPI.createWebView) {
        window.electronAPI.createWebView(id, url, rect.y, rect.height)
            .catch(err => console.error("Errore creazione browser window:", err));
        
        // Listener per caricamento
        if (window.electronAPI.listen) {
            window.electronAPI.listen(`browser-loading-${id}`, (event) => {
                const { url, loading } = event.payload;
                if (loading) {
                    showLoadingBar();
                    if (id === activeTabId) updateUrlBar(url);
                    updateTabLoading(id, true);
                }
            });
            window.electronAPI.listen(`browser-loaded-${id}`, (event) => {
                hideLoadingBar();
                updateTabLoading(id, false);
                // Sincronizza titolo (approssimativo via Rust in futuro, per ora placeholder)
                if (id === activeTabId) updateNavigationButtons();
            });
        }

        // Aggiorna layout dopo un breve delay per assicurarci che la finestra esista
        setTimeout(() => syncTauriWebview(id), 100);
    }
    
    const webviewElement = document.createElement('div');
    webviewElement.id = `webview-placeholder-${id}`;
    webviewElement.className = 'webview-placeholder';
    webviewElement.style.display = 'none';
    webviewsContainer.appendChild(webviewElement);

    let currentUrl = url;
    
    return {
        id: id,
        classList: webviewElement.classList,
        remove: () => webviewElement.remove(),
        get src() { return currentUrl; },
        set src(newUrl) {
            currentUrl = newUrl;
            if (isTauri) window.electronAPI.navigateWebView(id, newUrl);
        },
        reload: () => isTauri ? window.electronAPI.reloadWebView(id) : null,
        goBack: () => isTauri ? window.electronAPI.goBack(id) : null,
        goForward: () => isTauri ? window.electronAPI.goForward(id) : null,
        getURL: () => currentUrl,
        getTitle: () => "Browser Tab",
        openDevTools: () => isTauri ? window.electronAPI.openDevTools(id) : null
    };
}

function showLoadingBar() {
    if (loadingBarContainer) {
        loadingBarContainer.classList.add('active');
        loadingBar.style.width = '30%';
        setTimeout(() => { if (loadingBar.style.width === '30%') loadingBar.style.width = '60%'; }, 500);
    }
}

function hideLoadingBar() {
    if (loadingBarContainer) {
        loadingBar.style.width = '100%';
        setTimeout(() => {
            loadingBarContainer.classList.remove('active');
            loadingBar.style.width = '0%';
        }, 300);
    }
}

// Sincronizzazione Layout Finestra Nativa
function updateBrowserLayout() {
    if (!isTauri) return;
    if (activeTabId) syncTauriWebview(activeTabId);
}

function syncTauriWebview(tabId) {
    if (!isTauri) return;
    
    const container = document.getElementById('webviews-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const winX = window.screenX;
    const winY = window.screenY;
    
    const x = winX + rect.x;
    const y = winY + rect.y;
    const width = rect.width;
    const height = rect.height;

    if (window.electronAPI && window.electronAPI.resizeWebView) {
        window.electronAPI.resizeWebView(tabId, x, y, width, height);
    }
}

// Listener per movimento e ridimensionamento
window.addEventListener('resize', updateBrowserLayout);
window.addEventListener('move', updateBrowserLayout); // Evento move non è standard DOM, ma Tauri potrebbe emetterlo
setInterval(updateBrowserLayout, 1000); // Polling di sicurezza per il layout


function setupEventListeners() {
    // Navigazione URL
    urlBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            navigateToUrl(urlBar.value);
        }
    });

    // Debugging: F12 apre i devtools della webview attiva
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F12') {
            getActiveWebview()?.openDevTools();
        }
    });

    // Pulsanti navigazione
    backBtn.addEventListener('click', () => getActiveWebview()?.goBack());
    forwardBtn.addEventListener('click', () => getActiveWebview()?.goForward());
    reloadBtn.addEventListener('click', () => getActiveWebview()?.reload());
    homeBtn.addEventListener('click', () => {
        const homeUrl = config.startupUrls && config.startupUrls.length > 0 ? config.startupUrls[0] : 'https://www.cosmonet.info/';
        navigateToUrl(homeUrl);
    });
    
    // Segnalibri e cronologia (Accesso rapido)
    bookmarkBtn.addEventListener('click', toggleBookmark);
    bookmarksBtn.addEventListener('click', () => togglePanel(bookmarksPanel));
    cosmoFeedBtn.addEventListener('click', () => {
        togglePanel(cosmoFeedPanel);
        fetchCosmoFeed();
    });
    historyBtn.addEventListener('click', () => togglePanel(historyPanel));
    
    if (addFolderBtn) {
        console.log("Attacco listener a addFolderBtn");
        addFolderBtn.addEventListener('click', (e) => {
            console.log("Click rilevato su addFolderBtn");
            createFolder();
        });
    } else {
        console.error("ERRORE: addFolderBtn non trovato nel DOM durante setupEventListeners");
    }
    
    // Menu a comparsa
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mainMenu.classList.toggle('visible');
    });

    document.addEventListener('click', (e) => {
        if (!mainMenu.contains(e.target) && e.target !== menuBtn) {
            mainMenu.classList.remove('visible');
        }
    });

    // Azioni Menu
    document.getElementById('menu-add-bookmark').addEventListener('click', () => {
        toggleBookmark();
        mainMenu.classList.remove('visible');
    });

    document.getElementById('menu-new-tab').addEventListener('click', () => {
        createTab('home.html');
        mainMenu.classList.remove('visible');
    });

    document.getElementById('menu-new-window').addEventListener('click', () => {
        // Opzionale: implementare nuova finestra reale se necessario
        createTab(config.homeUrl);
        mainMenu.classList.remove('visible');
    });

    document.getElementById('menu-history').addEventListener('click', () => {
        togglePanel(historyPanel);
        mainMenu.classList.remove('visible');
    });

    document.getElementById('menu-bookmarks').addEventListener('click', () => {
        togglePanel(bookmarksPanel);
        mainMenu.classList.remove('visible');
    });

    passwordsBtnMenu.addEventListener('click', () => {
        renderPasswords();
        togglePanel(passwordsPanel);
        mainMenu.classList.remove('visible');
    });

    document.getElementById('menu-settings').addEventListener('click', () => {
        settingsPage.classList.add('open');
        mainMenu.classList.remove('visible');
    });

    document.getElementById('menu-exit').addEventListener('click', () => {
        window.close();
    });

    // Gestione Pagina Impostazioni
    closeSettingsPageBtn.addEventListener('click', () => {
        settingsPage.classList.remove('open');
    });

    saveAllSettingsBtn.addEventListener('click', saveSettings);

    document.querySelectorAll('.settings-sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.dataset.section;
            
            // Update active sidebar item
            document.querySelectorAll('.settings-sidebar-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Update visible section
            document.querySelectorAll('.settings-section-container').forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${sectionId}`).classList.add('active');
        });
    });
    
    // Nuova tab
    newTabBtn.addEventListener('click', () => createTab('home.html'));
    
    // Chiusura pannelli laterali
    document.querySelectorAll('.close-panel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.side-panel').classList.remove('open');
        });
    });
    
    // Cancella cronologia
    document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
    // Gestione Pagine all'avvio
    document.getElementById('add-startup-url-btn').addEventListener('click', () => {
        config.startupUrls.push('https://');
        renderStartupUrlsList();
    });

    // Cosmo Feed Events
    if (refreshFeedBtn) {
        refreshFeedBtn.addEventListener('click', fetchCosmoFeed);
    }
    if (closeReadingModeBtn) {
        closeReadingModeBtn.addEventListener('click', () => readingModeOverlay.classList.remove('active'));
    }
    if (saveForLaterBtn) {
        saveForLaterBtn.addEventListener('click', saveArticleForLater);
    }
    
    // Importazione preferiti
    const importBookmarksBtn = document.getElementById('import-bookmarks-btn');
    const importBookmarksFile = document.getElementById('import-bookmarks-file');
    
    if (importBookmarksBtn && importBookmarksFile) {
        importBookmarksBtn.addEventListener('click', () => importBookmarksFile.click());
        importBookmarksFile.addEventListener('change', handleImportBookmarks);
    }
    
    // IPC da menu di sistema
    window.electronAPI.onNewTab(() => createTab('https://www.google.com'));
    window.electronAPI.onCloseTab(() => closeTab(activeTabId));
    window.electronAPI.onReloadTab(() => getActiveWebview()?.reload());
    window.electronAPI.onNavigateTo((url) => navigateToUrl(url));

    // Ricevitore per Android Nativo (WebViewClient)
    window.updateAndroidUrl = (url) => {
        const decodedUrl = decodeURI(url);
        updateUrlBar(decodedUrl);
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab) tab.url = decodedUrl;
    };
}

// Gestione tabs
function createTab(url = 'home.html') {
    const tabId = Date.now().toString();
    const webviewId = `webview-${tabId}`;
    
    // Inseriamo un placeholder nel container se serve debuggare, altrimenti nulla
    // La vera finestra è gestita da Rust.
    
    // Per Native Browser: Creiamo l'astrazione webview
    const webview = createWebviewInstance(webviewId, url);
    
    // Non facciamo appendChild(webview) perché webview non è più un nodo DOM reale
    // webviewsContainer.appendChild(webview); <--- RIMOSSO
    
    // Crea tab UI
    const tab = {
        id: tabId,
        title: url.includes('home') ? 'Home' : 'Caricamento...',
        url: url,
        favicon: null,
        webview: webview
    };
    
    tabs.push(tab);
    renderTab(tab);
    
    // Passa subito a questa tab (che attiva la navigazione Rust)
    switchToTab(tabId);
}


// Sincronizzazione per Tauri (stub)
// Sincronizzazione per Tauri (Gestita sopra)

function renderTab(tab) {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.tabId = tab.id;
    
    const defaultFavicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
    
    // Icona
    const faviconImg = document.createElement('img');
    faviconImg.className = 'tab-favicon';
    faviconImg.src = tab.favicon || defaultFavicon;
    faviconImg.onerror = () => { faviconImg.src = defaultFavicon; };
    
    // Titolo
    const titleSpan = document.createElement('span');
    titleSpan.className = 'tab-title';
    titleSpan.textContent = tab.title || 'Nuova Tab';
    
    // Bottone chiusura
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
    `;
    
    tabElement.appendChild(faviconImg);
    tabElement.appendChild(titleSpan);
    tabElement.appendChild(closeBtn);
    
    tabElement.addEventListener('click', (e) => {
        if (!e.target.closest('.tab-close')) {
            switchToTab(tab.id);
        }
    });
    
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.id);
    });
    
    tabsBar.appendChild(tabElement);
}

function switchToTab(tabId) {
    const oldTabId = activeTabId;
    
    // Deseleziona tutte le tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.webview-placeholder, webview, iframe').forEach(w => w.classList.remove('active'));
    
    // Attiva tab selezionata nell'UI
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.webview.classList.add('active');
        activeTabId = tabId;
        
        // Gestione visibilità finestre native Tauri
        if (isTauri && window.electronAPI && window.electronAPI.setWebViewVisibility) {
            // Nascondi vecchia se diversa
            if (oldTabId && oldTabId !== tabId) {
                window.electronAPI.setWebViewVisibility(oldTabId, false);
            }
            // Mostra nuova
            window.electronAPI.setWebViewVisibility(tabId, true);
            // Sincronizza posizione
            syncTauriWebview(tabId);
        }

        // Gestione URL per la barra degli indirizzi
        let currentUrl = tab.url;
        if (isElectron) {
            try { currentUrl = tab.webview.getURL(); } catch (e) {}
        }
        
        updateUrlBar(currentUrl);
        updateNavigationButtons();
        updateBookmarkButton();
    }
}

function closeTab(tabId) {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    const tab = tabs[tabIndex];
    if (isTauri && window.electronAPI && window.electronAPI.closeWebView) {
        window.electronAPI.closeWebView(tab.id);
    }
    tab.webview.remove();
    document.querySelector(`[data-tab-id="${tabId}"]`)?.remove();
    
    tabs.splice(tabIndex, 1);
    
    if (tabs.length === 0) {
        if (isElectron) window.close();
        else createTab(config.homeUrl);
        return;
    }
    
    if (tabId === activeTabId) {
        const newActiveTab = tabs[Math.min(tabIndex, tabs.length - 1)];
        switchToTab(newActiveTab.id);
    }
}

function updateTabTitle(tabId, title) {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.title = title || 'Senza titolo';
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            const titleElement = tabElement.querySelector('.tab-title');
            if (titleElement) titleElement.textContent = tab.title;
        }
    }
}

function updateTabFavicon(tabId, favicon) {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.favicon = favicon;
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            const faviconElement = tabElement.querySelector('.tab-favicon');
            if (faviconElement) faviconElement.src = favicon;
        }
    }
}

function updateTabLoading(tabId, isLoading) {
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
        tabElement.style.opacity = isLoading ? '0.7' : '1';
    }
}

function updateTabInfo(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && isElectron) {
        updateTabTitle(tabId, tab.webview.getTitle());
        tab.url = tab.webview.getURL();
    }
}

function updateUrlBar(url) {
    if (url && !url.startsWith('about:')) {
        urlBar.value = url;
    }
}

function updateNavigationButtons() {
    const webview = getActiveWebview();
    if (webview) {
        if (isElectron) {
            try {
                backBtn.disabled = !webview.canGoBack();
                forwardBtn.disabled = !webview.canGoForward();
            } catch (e) {
                backBtn.disabled = true;
                forwardBtn.disabled = true;
            }
        } else {
            // Su mobile (iframe) non possiamo sapere se si può tornare indietro
            backBtn.disabled = false;
            forwardBtn.disabled = false;
        }
    }
}

// Navigazione
function navigateToUrl(input) {
    if (!input) return;
    
    let url = input.trim();
    
    // Se non è un URL valido, usa il motore di ricerca scelto
    if (!url.match(/^https?:\/\//)) {
        if (url.includes('.') && !url.includes(' ')) {
            url = 'https://' + url;
        } else {
            url = config.searchEngine + encodeURIComponent(url);
        }
    }
    
    const contentElement = getActiveWebview();
    if (contentElement) {
        contentElement.src = url;
        // Salva l'URL nella tab per Android
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab) tab.url = url;
        
        if (!isElectron) {
            updateUrlBar(url);
            addToHistory(url, "Navigazione Android");
        }
    }
}

function getActiveWebview() {
    const tab = tabs.find(t => t.id === activeTabId);
    return tab ? tab.webview : null;
}

// Segnalibri (Preferiti)
async function toggleBookmark() {
    const webview = getActiveWebview();
    if (!webview) return;
    
    let url = '';
    let title = '';
    
    if (isElectron) {
        try {
            url = webview.getURL();
            title = webview.getTitle() || url;
        } catch (e) {
            const tab = tabs.find(t => t.id === activeTabId);
            url = tab ? tab.url : '';
            title = tab ? tab.title : url;
        }
    } else {
        const tab = tabs.find(t => t.id === activeTabId);
        url = tab ? tab.url : '';
        title = tab ? tab.title : url;
    }
    
    if (!url || url === 'about:blank') return;
    
    const existingIndex = bookmarks.findIndex(b => b.url === url);
    
    if (existingIndex >= 0) {
        // Rimuovi segnalibro
        // Cerca in tutto l'albero se è presente
        const removeFromTree = (list, u) => {
            const idx = list.findIndex(b => b.url === u);
            if (idx >= 0) { list.splice(idx, 1); return true; }
            for (const item of list) {
                if (item.type === 'folder' && removeFromTree(item.children, u)) return true;
            }
            return false;
        };
        removeFromTree(bookmarks, url);
    } else {
        // Aggiungi segnalibro
        bookmarks.unshift({
            type: 'bookmark',
            title: title,
            url: url,
            favicon: tabs.find(t => t.id === activeTabId)?.favicon,
            timestamp: Date.now()
        });
    }
    
    await window.electronAPI.saveBookmarks(bookmarks);
    renderBookmarks();
    renderFavoritesBar();
    updateBookmarkButton();
}

function updateBookmarkButton() {
    const webview = getActiveWebview();
    if (!webview) return;
    
    let url = '';
    try {
        url = webview.getURL();
    } catch (e) {
        const tab = tabs.find(t => t.id === activeTabId);
        url = tab ? tab.url : '';
    }
    
    if (!url) return;
    const isBookmarked = bookmarks.some(b => b.url === url) || 
                        bookmarks.some(b => b.type === 'folder' && b.children.some(c => c.url === url));
    
    bookmarkBtn.classList.toggle('bookmarked', isBookmarked);
}

function renderBookmarks() {
    if (!bookmarksItemsContainer) return;
    
    if (!Array.isArray(bookmarks)) {
        bookmarks = [];
    }
    
    if (bookmarks.length === 0) {
        bookmarksItemsContainer.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                <p>Nessun preferito ancora.<br>Clicca l'icona stella per aggiungerne uno!</p>
            </div>
        `;
        return;
    }
    
    bookmarksItemsContainer.innerHTML = '';
    renderBookmarkList(bookmarks, bookmarksItemsContainer);
}

function renderBookmarkList(list, container) {
    list.forEach((bookmark, index) => {
        const item = document.createElement('div');
        item.className = `bookmark-item ${bookmark.type === 'folder' ? 'is-folder' : ''}`;
        item.draggable = true;
        
        // Data per il drag & drop
        item.dataset.index = index;
        item.dataset.type = bookmark.type;
        if (bookmark.type === 'folder') {
            item.innerHTML = `
                <div class="bookmark-item-content folder-toggle">
                    <div class="bookmark-title">
                        <span class="folder-arrow">▶</span>
                        <span class="folder-icon">📁</span>
                        <span>${escapeHtml(bookmark.title)}</span>
                    </div>
                </div>
                <div class="folder-actions">
                    <button class="delete-bookmark">Elimina</button>
                </div>
            `;
            
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'bookmark-folder-children';
            childrenContainer.style.display = 'none'; // Chiusa di default
            renderBookmarkList(bookmark.children, childrenContainer);
            
            // Toggle della cartella (Usa mousedown per evitare conflitti con onclick di navigazione se presenti)
            const toggle = item.querySelector('.folder-toggle');
            toggle.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isVisible = childrenContainer.style.display === 'block';
                childrenContainer.style.display = isVisible ? 'none' : 'block';
                toggle.querySelector('.folder-arrow').style.transform = isVisible ? 'rotate(0deg)' : 'rotate(90deg)';
                item.classList.toggle('folder-open', !isVisible);
            };

            container.appendChild(item);
            container.appendChild(childrenContainer);
        } else {
            // Genera opzioni solo per le cartelle di primo livello per semplicità e stabilità
            const folderOptions = bookmarks
                .map((b, i) => b.type === 'folder' ? `<option value="${i}">${escapeHtml(b.title)}</option>` : '')
                .join('');
            
            item.innerHTML = `
                <div class="bookmark-item-content">
                    <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
                    <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
                </div>
                <div class="folder-actions">
                    <select class="move-to-folder-select">
                        <option value="-1">Sposta in...</option>
                        <option value="root">Radice</option>
                        ${folderOptions}
                    </select>
                    <button class="delete-bookmark">Elimina</button>
                </div>
            `;
            container.appendChild(item);
        }

        // Click sul contenuto (Navigazione)
        const content = item.querySelector('.bookmark-item-content');
        if (content) {
            content.onclick = () => {
                const b = list[index];
                if (b.type !== 'folder') {
                    navigateToUrl(b.url);
                    bookmarksPanel.classList.remove('open');
                }
            };
        }

        // Pulsante Elimina
        const delBtn = item.querySelector('.delete-bookmark');
        if (delBtn) {
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Sei sicuro di voler eliminare ${bookmark.type === 'folder' ? 'la cartella e tutto il suo contenuto' : 'questo segnalibro'}?`)) {
                    list.splice(index, 1);
                    await window.electronAPI.saveBookmarks(bookmarks);
                    renderBookmarks();
                    renderFavoritesBar();
                    updateBookmarkButton();
                }
            };
        }

        // Menu "Sposta in..."
        const moveSelect = item.querySelector('.move-to-folder-select');
        if (moveSelect) {
            moveSelect.onchange = async () => {
                const targetIdx = moveSelect.value;
                if (targetIdx === "-1") return;
                
                // Rimuovi dall'array attuale
                const itemToMove = list.splice(index, 1)[0];

                if (targetIdx === 'root') {
                    bookmarks.push(itemToMove);
                } else {
                    const idx = parseInt(targetIdx);
                    if (bookmarks[idx] && bookmarks[idx].type === 'folder') {
                        bookmarks[idx].children.push(itemToMove);
                    } else {
                        bookmarks.push(itemToMove); // Fallback
                    }
                }

                await window.electronAPI.saveBookmarks(bookmarks);
                renderBookmarks();
                renderFavoritesBar();
            };
        }

        // --- GESTIONE DRAG & DROP ---
        item.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            item.classList.add('dragging');
            draggedBookmark = bookmark; // Archivia l'oggetto reale
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            document.querySelectorAll('.bookmark-item').forEach(i => i.classList.remove('drag-over'));
            draggedBookmark = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (bookmark.type === 'folder' && draggedBookmark !== bookmark) {
                item.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            item.classList.remove('drag-over');

            if (draggedBookmark && bookmark.type === 'folder' && draggedBookmark !== bookmark && !isBookmarkDescendant(draggedBookmark, bookmark)) {
                // Spostamento logico robusto
                if (removeBookmarkFromTree(bookmarks, draggedBookmark)) {
                    if (!bookmark.children) bookmark.children = [];
                    bookmark.children.push(draggedBookmark);
                    await window.electronAPI.saveBookmarks(bookmarks);
                    renderBookmarks();
                    renderFavoritesBar();
                }
            }
        });
    });
}

function createFolder() {
    console.log("createFolder chiamata");
    
    // Rimuovi input temporanei già presenti
    const existing = document.getElementById('temp-folder-container');
    if (existing) {
        existing.querySelector('input').focus();
        return;
    }

    if (!bookmarksItemsContainer) return;

    const tempDiv = document.createElement('div');
    tempDiv.id = 'temp-folder-container';
    tempDiv.className = 'bookmark-item';
    tempDiv.style.border = '1px solid #2563eb';
    tempDiv.style.padding = '10px';
    tempDiv.style.borderRadius = '8px';
    tempDiv.style.margin = '5px 0';
    tempDiv.style.display = 'flex';
    tempDiv.style.flexDirection = 'column';
    tempDiv.style.gap = '8px';

    tempDiv.innerHTML = `
        <input type="text" id="temp-folder-input" placeholder="Nome cartella..." 
               style="width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; outline: none; font-size: 14px; background: white; color: #111827;">
        <div style="display: flex; gap: 5px;">
            <button id="confirm-folder-btn" style="flex:1; padding: 6px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600;">Crea</button>
            <button id="cancel-folder-btn" style="flex:1; padding: 6px; background: #9ca3af; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600;">Annulla</button>
        </div>
    `;

    // Se la lista è vuota, puliamo l'empty-state
    if (bookmarks.length === 0) {
        bookmarksItemsContainer.innerHTML = '';
    }

    bookmarksItemsContainer.prepend(tempDiv);
    const input = document.getElementById('temp-folder-input');
    input.focus();

    document.getElementById('confirm-folder-btn').onclick = async () => {
        const name = input.value.trim();
        if (name) {
            if (!Array.isArray(bookmarks)) bookmarks = [];
            bookmarks.push({
                type: 'folder',
                title: name,
                children: [],
                timestamp: Date.now()
            });
            console.log("Cartella creata:", name);
            await window.electronAPI.saveBookmarks(bookmarks);
            renderBookmarks();
            renderFavoritesBar();
        } else {
            renderBookmarks(); // Ripristina l'interfaccia
        }
    };

    document.getElementById('cancel-folder-btn').onclick = () => {
        renderBookmarks();
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') document.getElementById('confirm-folder-btn').click();
        if (e.key === 'Escape') renderBookmarks();
    };
}

function renderFavoritesBar() {
    if (!favoritesBar) return;
    
    if (bookmarks.length === 0) {
        favoritesBar.innerHTML = `<span style="color: #9ca3af; font-size: 11px; margin-left: 5px;">I tuoi preferiti appariranno qui</span>`;
        return;
    }

    favoritesBar.innerHTML = bookmarks.slice(0, 15).map((bookmark, index) => {
        let itemHtml = '';
        if (bookmark.type === 'folder') {
            const childrenHtml = (bookmark.children || []).map(child => {
                try {
                    const domain = new URL(child.url).hostname;
                    const fav = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                    return `
                        <div class="folder-dropdown-item" onclick="navigateToUrl('${child.url}')">
                            <img src="${child.favicon || fav}" 
                                 onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23fbbf24%22 stroke-width=%222%22><path d=%22M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z%22/></svg>';"
                                 loading="lazy">
                            <span>${escapeHtml(child.title)}</span>
                        </div>
                    `;
                } catch(e) { return ''; }
            }).join('');

            itemHtml = `
                <div class="favorite-item favorite-folder" data-index="${index}" title="${escapeHtml(bookmark.title)}">
                    <span class="folder-icon">📁</span>
                    <span class="fav-title">${escapeHtml(bookmark.title)}</span>
                    <div class="folder-dropdown">${childrenHtml || '<div class="folder-dropdown-item">Vuota</div>'}</div>
                </div>
            `;
        } else {
            const domain = new URL(bookmark.url).hostname;
            const defaultFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            
            itemHtml = `
                <div class="favorite-item" data-index="${index}" title="${escapeHtml(bookmark.url)}" onclick="navigateToUrl('${bookmark.url}')">
                    <img src="${bookmark.favicon || defaultFavicon}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
                    <span class="fav-title">${escapeHtml(bookmark.title)}</span>
                </div>
            `;
        }
        return itemHtml;
    }).join('');

    // Aggiungi event listeners per il drag & drop sulla barra dei preferiti
    document.querySelectorAll('.favorite-item').forEach(item => {
        item.draggable = true;
        
        item.addEventListener('dragstart', (e) => {
            const idx = item.dataset.index;
            draggedBookmark = bookmarks[idx];
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedBookmark = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (item.classList.contains('favorite-folder')) {
                item.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            
            if (draggedBookmark && item.classList.contains('favorite-folder')) {
                const targetIdx = item.dataset.index;
                const targetFolder = bookmarks[targetIdx];
                
                if (draggedBookmark === targetFolder || isBookmarkDescendant(draggedBookmark, targetFolder)) return;

                if (removeBookmarkFromTree(bookmarks, draggedBookmark)) {
                    if (!targetFolder.children) targetFolder.children = [];
                    targetFolder.children.push(draggedBookmark);
                    await window.electronAPI.saveBookmarks(bookmarks);
                    renderBookmarks();
                    renderFavoritesBar();
                }
            }
        });

        // Toggle cartelle su mousedown per evitare conflitti con navigazione webview
        if (item.classList.contains('favorite-folder')) {
            item.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isActive = item.classList.contains('active');
                // Chiudi tutte le altre cartelle aperte
                document.querySelectorAll('.favorite-folder').forEach(f => {
                    if (f !== item) f.classList.remove('active');
                });
                item.classList.toggle('active');
            };
            // Disabilita click standard
            item.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };
        }
    });
}

// Chiudi cartelle favorites bar cliccando altrove (Aggiunto globalmente una sola volta)
document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.favorite-folder')) {
        document.querySelectorAll('.favorite-folder').forEach(f => f.classList.remove('active'));
    }
});

// Verifica se un segnalibro è un discendente (figlio, nipote, ecc.) di un altro
function isBookmarkDescendant(parent, potentialChild) {
    if (!parent || parent.type !== 'folder' || !parent.children) return false;
    for (const child of parent.children) {
        if (child === potentialChild) return true;
        if (child.type === 'folder' && isBookmarkDescendant(child, potentialChild)) return true;
    }
    return false;
}

// Funzione helper ricorsiva per rimuovere un segnalibro dall'albero
function removeBookmarkFromTree(list, itemToFind) {
    if (!Array.isArray(list)) return false;
    for (let i = 0; i < list.length; i++) {
        if (list[i] === itemToFind) {
            list.splice(i, 1);
            return true;
        }
        if (list[i].type === 'folder' && list[i].children) {
            if (removeBookmarkFromTree(list[i].children, itemToFind)) {
                return true;
            }
        }
    }
    return false;
}

// Cronologia
async function addToHistory(url, title) {
    if (!url || url.startsWith('about:')) return;
    
    // Rimuovi duplicati recenti (stessa URL negli ultimi 5 minuti)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    history = history.filter(h => !(h.url === url && h.timestamp > fiveMinutesAgo));
    
    history.unshift({
        title: title || url,
        url: url,
        timestamp: Date.now()
    });
    
    // Mantieni solo ultimi 500 elementi
    if (history.length > 500) {
        history = history.slice(0, 500);
    }
    
    await window.electronAPI.saveHistory(history);
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                <p>Nessuna cronologia ancora.<br>Inizia a navigare!</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = history.map((item, index) => `
        <div class="history-item" data-index="${index}">
            <div class="history-item-content">
                <div class="history-title">${escapeHtml(item.title)}</div>
                <div class="history-url">${escapeHtml(item.url)}</div>
                <div class="history-time">${formatTime(item.timestamp)}</div>
            </div>
        </div>
    `).join('');
    
    historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            navigateToUrl(history[index].url);
            historyPanel.classList.remove('open');
        });
    });
}

async function clearHistory() {
    if (confirm('Sei sicuro di voler cancellare tutta la cronologia?')) {
        history = [];
        await window.electronAPI.saveHistory(history);
        renderHistory();
    }
}

// Utility
function togglePanel(panel) {
    const isOpen = panel.classList.contains('open');
    
    // Chiudi tutti i pannelli
    document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('open'));
    
    // Apri pannello selezionato se era chiuso
    if (!isOpen) {
        panel.classList.add('open');
    }
}

function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Adesso';
    if (minutes < 60) return `${minutes} minuti fa`;
    if (hours < 24) return `${hours} ore fa`;
    if (days < 7) return `${days} giorni fa`;
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('it-IT');
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Funzioni di importazione
async function handleImportBookmarks(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target.result;
        const imported = parseBookmarksHTML(content);
        
        if (imported.length > 0) {
            if (confirm(`Trovati ${imported.length} preferiti. Vuoi importarli?`)) {
                // Aggiungi solo quelli non esistenti
                let addedCount = 0;
                imported.forEach(item => {
                    if (!bookmarks.some(b => b.url === item.url)) {
                        bookmarks.push({
                            title: item.title,
                            url: item.url,
                            timestamp: Date.now()
                        });
                        addedCount++;
                    }
                });
                
                await window.electronAPI.saveBookmarks(bookmarks);
                renderBookmarks();
                renderFavoritesBar();
                alert(`Importazione completata! Aggiunti ${addedCount} nuovi preferiti.`);
            }
        } else {
            alert("Non ho trovato preferiti validi in questo file. Assicurati che sia un file HTML esportato dal tuo browser.");
        }
        
        // Reset input
        event.target.value = '';
    };
    reader.readAsText(file);
}

function parseBookmarksHTML(html) {
    const results = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // I preferiti nei file esportati sono solitamente in tag <a> all'interno di <dt>
    const links = doc.querySelectorAll('a');
    
    links.forEach(link => {
        const url = link.getAttribute('href');
        const title = link.textContent.trim();
        
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            results.push({
                url: url,
                title: title || url
            });
        }
    });
    
    return results;
}

// Gestione Impostazioni
async function saveSettings() {
    // Raccoglie startup URLs
    const urlInputs = document.querySelectorAll('.startup-url-input');
    config.startupUrls = Array.from(urlInputs).map(input => input.value).filter(url => url.trim() !== '');
    
    config.searchEngine = settingSearchEnginePage.value;
    config.darkMode = settingDarkModePage.checked;
    
    await window.electronAPI.saveSettings(config);
    applySettings();
    alert('Impostazioni salvate correttamente!');
    settingsPage.classList.remove('open');
}

function renderStartupUrlsList() {
    const listContainer = document.getElementById('startup-urls-list');
    listContainer.innerHTML = '';
    
    config.startupUrls.forEach((url, index) => {
        const item = document.createElement('div');
        item.className = 'startup-url-item';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cosmo-input startup-url-input';
        input.value = url;
        input.placeholder = 'https://...';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-url-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = 'Rimuovi questa pagina';
        removeBtn.onclick = () => {
            config.startupUrls.splice(index, 1);
            renderStartupUrlsList();
        };
        
        item.appendChild(input);
        item.appendChild(removeBtn);
        listContainer.appendChild(item);
    });
}

function applySettings() {
    // Applica Dark Mode
    if (config.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function updateSettingsUI() {
    renderStartupUrlsList();
    settingSearchEnginePage.value = config.searchEngine;
    settingDarkModePage.checked = config.darkMode;
}

// Cosmo Feed & Reading Mode
let currentFeedArticles = [];

async function fetchCosmoFeed() {
    if (!cosmoFeedList) return;
    cosmoFeedList.innerHTML = '<div class="feed-loading">Aggiornamento in corso...</div>';
    
    try {
        // Usa il bridge Tauri/Rust per bypassare CORS
        const text = await window.electronAPI.fetchFeed();
        
        if (!text) throw new Error("Feed vuoto o non raggiungibile");

        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');
        
        currentFeedArticles = Array.from(items).map(item => {
            const title = item.querySelector('title')?.textContent || 'Senza titolo';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const creator = item.querySelector('dc\\:creator, creator')?.textContent || 'CosmoNet';
            const content = item.querySelector('content\\:encoded, description')?.textContent || '';
            
            // Estrai prima immagine se presente
            let thumbnail = '';
            const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) thumbnail = imgMatch[1];

            return { title, link, pubDate, creator, content, thumbnail };
        }).slice(0, 20); // Limita a 20 articoli
        
        renderCosmoFeed();
    } catch (e) {
        console.error('Errore caricamento feed:', e);
        cosmoFeedList.innerHTML = '<div class="feed-loading">Errore nel caricamento del feed.<br>Verifica la connessione o riprova più tardi.</div>';
    }
}

function renderCosmoFeed() {
    if (currentFeedArticles.length === 0) {
        cosmoFeedList.innerHTML = '<div class="feed-loading">Nessun articolo trovato.</div>';
        return;
    }
    
    cosmoFeedList.innerHTML = currentFeedArticles.map((article, index) => `
        <div class="feed-item" onclick="openReadingMode(${index})">
            ${article.thumbnail ? `<img src="${article.thumbnail}" class="feed-item-image">` : ''}
            <div class="feed-item-title">${escapeHtml(article.title)}</div>
            <div class="feed-item-meta">${article.creator} • ${formatTime(new Date(article.pubDate).getTime())}</div>
            <div class="feed-item-summary">${stripHtml(article.content).substring(0, 150)}...</div>
        </div>
    `).join('');
}

function openReadingMode(index) {
    const article = currentFeedArticles[index];
    if (!article) return;
    
    readingContent.innerHTML = `
        <h1>${escapeHtml(article.title)}</h1>
        <div class="feed-item-meta" style="font-size: 16px; margin-bottom: 30px;">
            Scritto da <b>${article.creator}</b> il ${new Date(article.pubDate).toLocaleDateString('it-IT')}
        </div>
        <div class="article-body">
            ${article.content}
        </div>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
        <div style="text-align: center;">
            <p>Vuoi partecipare alla discussione?</p>
            <button class="cosmo-btn-secondary" onclick="navigateToUrl('${article.link}'); document.getElementById('reading-mode-overlay').classList.remove('active');">
                Apri articolo originale e commenta
            </button>
        </div>
    `;
    
    readingModeOverlay.dataset.currentUrl = article.link;
    readingModeOverlay.dataset.currentTitle = article.title;
    readingModeOverlay.classList.add('active');
}

function saveArticleForLater() {
    const url = readingModeOverlay.dataset.currentUrl;
    const title = readingModeOverlay.dataset.currentTitle;
    
    if (!url) return;
    
    // Cerca o crea la cartella "Da leggere"
    let readingListFolder = bookmarks.find(b => b.type === 'folder' && b.title === 'Da leggere');
    if (!readingListFolder) {
        readingListFolder = {
            type: 'folder',
            title: 'Da leggere',
            children: []
        };
        bookmarks.push(readingListFolder);
    }
    
    if (!readingListFolder.children.some(b => b.url === url)) {
        readingListFolder.children.unshift({
            type: 'bookmark',
            title: title,
            url: url,
            timestamp: Date.now()
        });
        window.electronAPI.saveBookmarks(bookmarks);
        renderBookmarks();
        renderFavoritesBar();
        alert('Articolo salvato nella cartella "Da leggere"!');
    } else {
        alert('Articolo già presente nei preferiti.');
    }
}

function stripHtml(html) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

// --- GESTIONE PASSWORD ---
async function renderPasswords() {
    if (!passwordsList) return;
    
    try {
        savedPasswords = await window.electronAPI.loadPasswords();
        if (!Array.isArray(savedPasswords)) savedPasswords = [];
    } catch (err) {
        console.error("Errore caricamento password:", err);
        savedPasswords = [];
    }
    
    if (savedPasswords.length === 0) {
        passwordsList.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <p>Nessuna password salvata ancora.</p>
            </div>
        `;
        return;
    }

    passwordsList.innerHTML = savedPasswords.map((p, index) => `
        <div class="password-item">
            <div class="bookmark-item-content">
                <div class="password-site">${escapeHtml(new URL(p.url).hostname)}</div>
                <div class="password-user">${escapeHtml(p.username)}</div>
            </div>
            <div class="password-actions">
                <button class="toggle-pass-btn" data-index="${index}" onclick="togglePasswordVisibility(this)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
                <button class="delete-bookmark" onclick="deletePassword(${index})">Elimina</button>
            </div>
        </div>
    `).join('');
}

window.togglePasswordVisibility = function(btn) {
    const index = btn.dataset.index;
    const p = savedPasswords[index];
    const isShowing = btn.dataset.showing === 'true';
    const userDiv = btn.closest('.password-item').querySelector('.password-user');
    
    if (isShowing) {
        btn.dataset.showing = 'false';
        userDiv.textContent = p.username;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    } else {
        btn.dataset.showing = 'true';
        userDiv.textContent = p.password;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    }
}

window.deletePassword = async function(index) {
    if (confirm('Vuoi davvero eliminare questa password?')) {
        savedPasswords.splice(index, 1);
        await window.electronAPI.savePasswords(savedPasswords);
        renderPasswords();
    }
}

function checkLoginForm(webview) {
    if (!isElectron) return;
    
    const script = `
        (function() {
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                if (form.dataset.cosmoTracked) return;
                form.dataset.cosmoTracked = 'true';
                form.addEventListener('submit', () => {
                    try {
                        const userField = form.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"]');
                        const passField = form.querySelector('input[type="password"]');
                        if (userField && passField && userField.value && passField.value) {
                            console.log('PASSWORD_MANAGER_SAVE:' + JSON.stringify({
                                u: userField.value,
                                p: passField.value,
                                url: window.location.href
                            }));
                        }
                    } catch(e) {}
                });
            });
        })();
    `;
    
    webview.executeJavaScript(script);
    
    webview.addEventListener('console-message', async (e) => {
        if (e.message.startsWith('PASSWORD_MANAGER_SAVE:')) {
            try {
                const data = JSON.parse(e.message.split('PASSWORD_MANAGER_SAVE:')[1]);
                if (confirm(`Vuoi salvare la password per ${new URL(data.url).hostname}?`)) {
                    savedPasswords = await window.electronAPI.loadPasswords() || [];
                    const exists = savedPasswords.find(p => p.url === data.url && p.username === data.u);
                    if (!exists) {
                        savedPasswords.push({
                            url: data.url,
                            username: data.u,
                            password: data.p,
                            timestamp: Date.now()
                        });
                        await window.electronAPI.savePasswords(savedPasswords);
                        renderPasswords();
                    }
                }
            } catch(err) {
                console.error("Errore salvataggio password:", err);
            }
        }
    });
}

// Avvia applicazione
console.log("🎬 Calling init() directly (no DOMContentLoaded)...");
try {
    init();
    console.log("✅ init() call completed");
} catch (e) {
    console.error("❌ FATAL: init() threw an error:", e);
    alert("FATAL ERROR: " + e.message);
}
