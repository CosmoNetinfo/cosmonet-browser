// Ultimate Stealth Preload Script for Google Login
(function() {
    // 1. Definiamo proprietà del navigatore per simulare un Chrome reale
    const maskNavigator = {
        webdriver: false,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        appVersion: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc.',
        product: 'Gecko',
        deviceMemory: 8,
        hardwareConcurrency: 8,
        languages: ['it-IT', 'it', 'en-US', 'en'],
        plugins: [
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
        ]
    };

    // Applichiamo il mascheramento
    for (const [prop, value] of Object.entries(maskNavigator)) {
        try {
            Object.defineProperty(navigator, prop, {
                get: () => value,
                configurable: true
            });
        } catch (e) {}
    }

    // 2. Fix per le Permissions API (usate da Google per rilevare automazione)
    if (window.navigator.permissions) {
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
    }

    // 3. Mascheramento Chrome Runtime
    window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
    };

    // 4. Rimuoviamo tracce di automazione comuni
    const automationProps = ['__webdriver_evaluate', '__webdriver_unwrapped', '__webdriver_script_function', '__webdriver_script_func'];
    automationProps.forEach(prop => {
        delete window[prop];
        delete document[prop];
    });

    // 5. Sovrascrittura UserAgentData (Client Hints)
    if (navigator.userAgentData) {
        Object.defineProperty(navigator, 'userAgentData', {
            get: () => undefined,
            configurable: true
        });
    }

    // 6. Mascheramento della risoluzione e dello schermo (per sembrare più naturale)
    Object.defineProperty(screen, 'width', { get: () => 1920 });
    Object.defineProperty(screen, 'height', { get: () => 1080 });

    console.log("CosmoNet Stealth Core Active.");
})();
