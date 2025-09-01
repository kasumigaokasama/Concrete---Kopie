// cors-fix.js - NEUE DATEI - Speichere im "Concrete - Kopie" Ordner
// Diese Datei fixt die CORS-Probleme von Wolvesville

console.log('[CORS Fix] Initializing Wolvesville CORS bypass...');

// Script in die Seite injizieren (wichtig für den Page Context)
const script = document.createElement('script');
script.textContent = `
(function() {
    'use strict';
    
    console.log('[CORS Fix] Injecting into page context...');
    
    // Proxy Server URL
    const PROXY_URL = 'http://localhost:3000';
    
    // Problematische Wolvesville API Endpoints
    const PROBLEMATIC_APIS = [
        'game-asia.api-wolvesville.com',
        'game.api-wolvesville.com',
        'core.api-wolvesville.com',
        'api-wolvesville.com'  // Basis-API auch abfangen
    ];
    
    // Original fetch speichern
    const originalFetch = window.fetch;
    const fetchIntercepted = new WeakSet();
    
    // Fetch überschreiben
    window.fetch = async function(url, options = {}) {
        const urlString = typeof url === 'string' ? url : url.toString();
        
        // Prüfen ob es ein problematischer API-Call ist
        const needsProxy = PROBLEMATIC_APIS.some(api => urlString.includes(api));
        
        if (needsProxy && !fetchIntercepted.has(arguments)) {
            console.log('[CORS Fix] Intercepting:', urlString);
            fetchIntercepted.add(arguments);
            
            // URL durch Proxy umleiten
            const proxiedUrl = PROXY_URL + '/cors-proxy?url=' + encodeURIComponent(urlString);
            
            // Neue Options mit angepassten Headers
            const proxiedOptions = {
                ...options,
                mode: 'cors',
                credentials: 'include',
                headers: {
                    ...options.headers,
                    'X-Original-URL': urlString
                }
            };
            
            try {
                const response = await originalFetch(proxiedUrl, proxiedOptions);
                
                if (response.ok) {
                    console.log('[CORS Fix] Success:', urlString, response.status);
                } else {
                    console.warn('[CORS Fix] Response not OK:', urlString, response.status);
                }
                
                return response;
                
            } catch (error) {
                console.error('[CORS Fix] Proxy failed, falling back:', error.message);
                // Fallback zum Original bei Fehler
                return originalFetch(url, options);
            }
        }
        
        // Normale Requests unverändert lassen
        return originalFetch(url, options);
    };
    
    // XMLHttpRequest auch überschreiben
    const XHR = XMLHttpRequest.prototype;
    const originalOpen = XHR.open;
    const originalSend = XHR.send;
    
    XHR.open = function(method, url) {
        this._url = url;
        this._method = method;
        
        const urlString = url.toString();
        const needsProxy = PROBLEMATIC_APIS.some(api => urlString.includes(api));
        
        if (needsProxy) {
            console.log('[CORS Fix XHR] Intercepting:', urlString);
            const proxiedUrl = PROXY_URL + '/cors-proxy?url=' + encodeURIComponent(urlString);
            return originalOpen.apply(this, [method, proxiedUrl, ...Array.prototype.slice.call(arguments, 2)]);
        }
        
        return originalOpen.apply(this, arguments);
    };
    
    console.log('[CORS Fix] Successfully patched fetch() and XMLHttpRequest');
    console.log('[CORS Fix] Proxy server expected at:', PROXY_URL);
    
    // Debug: Log alle fetch calls
    let fetchCount = 0;
    const debugFetch = window.fetch;
    window.fetch = function() {
        fetchCount++;
        console.log('[CORS Fix Debug] Fetch #' + fetchCount + ':', arguments[0]);
        return debugFetch.apply(this, arguments);
    };
})();
`;

// Script sofort in die Seite injizieren
if (document.documentElement) {
    document.documentElement.appendChild(script);
    script.remove();
    console.log('[CORS Fix] Script injected into page');
} else {
    // Falls documentElement noch nicht ready ist
    const observer = new MutationObserver((mutations, obs) => {
        if (document.documentElement) {
            document.documentElement.appendChild(script);
            script.remove();
            console.log('[CORS Fix] Script injected into page (delayed)');
            obs.disconnect();
        }
    });
    observer.observe(document, { childList: true, subtree: true });
}

// Zusätzlich: Event Listener für CORS-Fehler
window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('CORS')) {
        console.error('[CORS Fix] CORS Error detected:', e.message);
    }
}, true);

console.log('[CORS Fix] Initialization complete');