// Configurazione
const HOME_URL = 'https://www.cosmonet.info/';
const SEARCH_ENGINE = 'https://www.google.com/search?q=';

// Stato del browser
let tabs = [];
let activeTabId = null;
let bookmarks = [];
let history = [];

// Elementi DOM
const urlBar = document.getElementById('url-bar');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const homeBtn = document.getElementById('home-btn');
const bookmarkBtn = document.getElementById('bookmark-btn');
const newTabBtn = document.getElementById('new-tab-btn');
const bookmarksBtn = document.getElementById('bookmarks-btn');
const historyBtn = document.getElementById('history-btn');
const tabsBar = document.getElementById('tabs-bar');
const webviewsContainer = document.getElementById('webviews-container');
const bookmarksPanel = document.getElementById('bookmarks-panel');
const historyPanel = document.getElementById('history-panel');
const bookmarksList = document.getElementById('bookmarks-list');
const historyList = document.getElementById('history-list');

// Inizializzazione
async function init() {
    // Carica segnalibri e cronologia
    bookmarks = await window.electronAPI.loadBookmarks();
    history = await window.electronAPI.loadHistory();
    
    // Event listeners
    setupEventListeners();
    
    // Crea prima tab (dopo gli indicatori)
    createTab(HOME_URL);
    
    // Aggiorna UI
    renderBookmarks();
    renderHistory();
}

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
    homeBtn.addEventListener('click', () => navigateToUrl(HOME_URL));
    
    // Segnalibri e cronologia
    bookmarkBtn.addEventListener('click', toggleBookmark);
    bookmarksBtn.addEventListener('click', () => togglePanel(bookmarksPanel));
    historyBtn.addEventListener('click', () => togglePanel(historyPanel));
    
    // Nuova tab
    newTabBtn.addEventListener('click', () => createTab(HOME_URL));
    
    // Chiusura pannelli
    document.querySelectorAll('.close-panel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.side-panel').classList.remove('open');
        });
    });
    
    // Cancella cronologia
    document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
    
    // IPC da menu
    window.electronAPI.onNewTab(() => createTab(HOME_URL));
    window.electronAPI.onCloseTab(() => closeTab(activeTabId));
    window.electronAPI.onReloadTab(() => getActiveWebview()?.reload());
    window.electronAPI.onNavigateTo((url) => navigateToUrl(url));
}

// Gestione tabs
function createTab(url = HOME_URL) {
    const tabId = Date.now().toString();
    
    // Crea webview
    const webview = document.createElement('webview');
    webview.id = `webview-${tabId}`;
    webview.src = url;
    webview.setAttribute('allowpopups', '');
    // User Agent più completo per evitare blocchi
    webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Event listeners webview
    webview.addEventListener('did-start-loading', () => {
        updateTabLoading(tabId, true);
    });
    
    webview.addEventListener('did-stop-loading', () => {
        updateTabLoading(tabId, false);
        updateTabInfo(tabId);
    });

    webview.addEventListener('did-fail-load', (e) => {
        console.error('Fallimento caricamento:', e);
        if (e.errorCode !== -3) { // Escludi annullamenti manuali
            webview.executeJavaScript(`
                document.body.innerHTML = \`
                    <div style="font-family: sans-serif; text-align: center; padding-top: 50px; color: #374151;">
                        <h1 style="font-size: 48px; margin-bottom: 10px;">😕 Ops!</h1>
                        <p style="font-size: 18px;">Impossibile caricare la pagina: <b>${e.validatedURL}</b></p>
                        <p style="color: #6b7280;">Errore: ${e.errorDescription} (${e.errorCode})</p>
                        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">Riprova</button>
                    </div>
                \`;
            `);
        }
    });
    
    webview.addEventListener('page-title-updated', (e) => {
        updateTabTitle(tabId, e.title);
    });
    
    webview.addEventListener('page-favicon-updated', (e) => {
        if (e.favicons && e.favicons.length > 0) {
            updateTabFavicon(tabId, e.favicons[0]);
        }
    });

    webview.addEventListener('context-menu', (e) => {
        // Opzionale: potresti implementare un menu personalizzato qui
        // Per ora lasciamo che Electron gestisca il default se configurato
    });
    
    webview.addEventListener('did-navigate', (e) => {
        updateUrlBar(e.url);
        addToHistory(e.url, webview.getTitle());
        updateNavigationButtons();
    });
    
    webview.addEventListener('did-navigate-in-page', (e) => {
        updateUrlBar(e.url);
        updateNavigationButtons();
    });
    
    webview.addEventListener('new-window', (e) => {
        createTab(e.url);
    });
    
    webviewsContainer.appendChild(webview);
    
    // Crea tab UI
    const tab = {
        id: tabId,
        title: 'Nuova Tab',
        url: url,
        favicon: null,
        webview: webview
    };
    
    tabs.push(tab);
    renderTab(tab);
    switchToTab(tabId);
}

function renderTab(tab) {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.tabId = tab.id;
    
    tabElement.innerHTML = `
        <img class="tab-favicon" src="${tab.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'}" />
        <span class="tab-title">${escapeHtml(tab.title)}</span>
        <button class="tab-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;
    
    tabElement.addEventListener('click', (e) => {
        if (!e.target.closest('.tab-close')) {
            switchToTab(tab.id);
        }
    });
    
    tabElement.querySelector('.tab-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.id);
    });
    
    tabsBar.appendChild(tabElement);
}

function switchToTab(tabId) {
    // Deseleziona tutte le tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('webview').forEach(w => w.classList.remove('active'));
    
    // Attiva tab selezionata
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.webview.classList.add('active');
        activeTabId = tabId;
        updateUrlBar(tab.webview.getURL());
        updateNavigationButtons();
        updateBookmarkButton();
    }
}

function closeTab(tabId) {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    // Rimuovi webview e tab element
    const tab = tabs[tabIndex];
    tab.webview.remove();
    document.querySelector(`[data-tab-id="${tabId}"]`)?.remove();
    
    // Rimuovi da array
    tabs.splice(tabIndex, 1);
    
    // Se era l'ultima tab, chiudi il browser
    if (tabs.length === 0) {
        window.close();
        return;
    }
    
    // Switch a tab adiacente
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
            if (titleElement) {
                titleElement.textContent = tab.title;
            }
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
            if (faviconElement) {
                faviconElement.src = favicon;
            }
        }
    }
}

function updateTabLoading(tabId, isLoading) {
    // Potresti aggiungere un indicatore di caricamento qui
}

function updateTabInfo(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.webview) {
        updateTabTitle(tabId, tab.webview.getTitle());
        tab.url = tab.webview.getURL();
    }
}

// Navigazione
function navigateToUrl(input) {
    if (!input) return;
    
    let url = input.trim();
    
    // Se non è un URL valido, cerca su Google
    if (!url.match(/^https?:\/\//)) {
        if (url.includes('.') && !url.includes(' ')) {
            url = 'https://' + url;
        } else {
            url = SEARCH_ENGINE + encodeURIComponent(url);
        }
    }
    
    const webview = getActiveWebview();
    if (webview) {
        webview.src = url;
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
        backBtn.disabled = !webview.canGoBack();
        forwardBtn.disabled = !webview.canGoForward();
    }
}

function getActiveWebview() {
    const tab = tabs.find(t => t.id === activeTabId);
    return tab ? tab.webview : null;
}

// Segnalibri
async function toggleBookmark() {
    const webview = getActiveWebview();
    if (!webview) return;
    
    const url = webview.getURL();
    const title = webview.getTitle() || url;
    
    const existingIndex = bookmarks.findIndex(b => b.url === url);
    
    if (existingIndex >= 0) {
        // Rimuovi segnalibro
        bookmarks.splice(existingIndex, 1);
    } else {
        // Aggiungi segnalibro
        bookmarks.unshift({
            title: title,
            url: url,
            timestamp: Date.now()
        });
    }
    
    await window.electronAPI.saveBookmarks(bookmarks);
    renderBookmarks();
    updateBookmarkButton();
}

function updateBookmarkButton() {
    const webview = getActiveWebview();
    if (!webview) return;
    
    const url = webview.getURL();
    const isBookmarked = bookmarks.some(b => b.url === url);
    
    bookmarkBtn.classList.toggle('bookmarked', isBookmarked);
}

function renderBookmarks() {
    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                <p>Nessun segnalibro ancora.<br>Clicca l'icona stella per aggiungerne uno!</p>
            </div>
        `;
        return;
    }
    
    bookmarksList.innerHTML = bookmarks.map((bookmark, index) => `
        <div class="bookmark-item" data-index="${index}">
            <div class="bookmark-item-content">
                <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
                <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
            </div>
            <button class="delete-bookmark" data-index="${index}">Elimina</button>
        </div>
    `).join('');
    
    // Event listeners
    bookmarksList.querySelectorAll('.bookmark-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-bookmark')) {
                const index = parseInt(item.dataset.index);
                navigateToUrl(bookmarks[index].url);
                bookmarksPanel.classList.remove('open');
            }
        });
    });
    
    bookmarksList.querySelectorAll('.delete-bookmark').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            bookmarks.splice(index, 1);
            await window.electronAPI.saveBookmarks(bookmarks);
            renderBookmarks();
            updateBookmarkButton();
        });
    });
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Avvia applicazione
init();
