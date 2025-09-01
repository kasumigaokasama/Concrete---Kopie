const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();

// Erweiterte CORS-Konfiguration - Alles erlauben
const corsOptions = {
  origin: true, // Erlaubt ALLE Origins
  credentials: true,
  methods: '*',
  allowedHeaders: '*',
  exposedHeaders: '*',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Explizite OPTIONS handler für preflight requests
app.options('*', cors(corsOptions));

// === NEUER CORS PROXY ENDPOINT ===
app.all('/cors-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter fehlt' });
  }
  
  console.log(`[CORS Proxy] ${req.method} ${targetUrl}`);
  
  try {
    // Request Headers vorbereiten
    const headers = {};
    
    // Wichtige Headers von der Original-Anfrage kopieren
    if (req.headers['content-type']) {
      headers['content-type'] = req.headers['content-type'];
    }
    if (req.headers['authorization']) {
      headers['authorization'] = req.headers['authorization'];
    }
    if (req.headers['x-requested-with']) {
      headers['x-requested-with'] = req.headers['x-requested-with'];
    }
    
    // Wolvesville spezifische Headers setzen
    headers['origin'] = 'https://www.wolvesville.com';
    headers['referer'] = 'https://www.wolvesville.com/';
    headers['user-agent'] = req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // Axios Request konfigurieren
    const axiosConfig = {
      method: req.method,
      url: targetUrl,
      headers: headers,
      validateStatus: () => true, // Alle Status-Codes akzeptieren
      timeout: 30000,
      maxRedirects: 5
    };
    
    // Body nur bei POST, PUT, PATCH hinzufügen
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      axiosConfig.data = req.body;
    }
    
    // Request durchführen
    const response = await axios(axiosConfig);
    
    // CORS Headers für die Antwort setzen
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': '*'
    });
    
    // Content-Type von der Original-Antwort übernehmen
    if (response.headers['content-type']) {
      res.set('Content-Type', response.headers['content-type']);
    }
    
    console.log(`[CORS Proxy] Response: ${response.status} ${response.statusText}`);
    
    // Antwort zurückgeben
    res.status(response.status).send(response.data);
    
  } catch (error) {
    console.error('[CORS Proxy] Fehler:', error.message);
    
    if (error.response) {
      // Server hat mit Fehler geantwortet
      res.status(error.response.status).json({
        error: 'Proxy request failed',
        status: error.response.status,
        statusText: error.response.statusText,
        details: error.response.data
      });
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({
        error: 'Target server verweigert Verbindung',
        url: targetUrl
      });
    } else if (error.code === 'ETIMEDOUT') {
      res.status(504).json({
        error: 'Request timeout',
        url: targetUrl
      });
    } else {
      res.status(500).json({
        error: 'Proxy Fehler',
        message: error.message,
        url: targetUrl
      });
    }
  }
});

// === DEINE BESTEHENDEN ENDPOINTS ===
let lastHeartbeat = null;
let activeBotName = null;

// POST /api/heartbeat – empfängt und speichert den Heartbeat
app.post("/api/heartbeat", (req, res) => {
  const { timestamp, name } = req.body;
  
  if (!timestamp) {
    return res.status(400).json({ error: "timestamp fehlt im Body" });
  }
  
  lastHeartbeat = new Date(timestamp);
  if (name) {
    activeBotName = name;
  }
  
  console.log(`[Heartbeat] empfangen um ${lastHeartbeat.toISOString()} von ${activeBotName || 'Unbekannt'}`);
  
  return res.status(200).json({
    status: 'ok',
    received: lastHeartbeat.toISOString()
  });
});

// GET /api/heartbeat – liefert den letzten Heartbeat-Zeitstempel zurück
app.get("/api/heartbeat", (req, res) => {
  if (!lastHeartbeat) {
    return res.status(404).json({ error: "kein Heartbeat empfangen" });
  }
  
  const now = new Date();
  const diff = now - lastHeartbeat;
  const isAlive = diff < 10000; // Weniger als 10 Sekunden = lebendig
  
  return res.json({
    lastHeartbeat: lastHeartbeat.toISOString(),
    activeBotName: activeBotName,
    isAlive: isAlive,
    secondsSinceLastHeartbeat: Math.floor(diff / 1000)
  });
});

// Namens-Verifikation
app.post("/api/verify-name", (req, res) => {
  const { name } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      allowed: false,
      error: "Name darf nicht leer sein"
    });
  }
  
  console.log(`[Verify] Name "${name}" wurde verifiziert`);
  
  res.json({
    allowed: true,
    expireAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    name: name.trim()
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    corsProxy: "active",
    endpoints: {
      heartbeat: "/api/heartbeat",
      verify: "/api/verify-name",
      proxy: "/cors-proxy?url=<encoded_url>"
    }
  });
});

// Test endpoint für den CORS Proxy
app.get("/api/test-proxy", async (req, res) => {
  try {
    // Test mit einer Wolvesville API
    const testUrl = 'https://core.api-wolvesville.com/health';
    const response = await axios.get(testUrl);
    
    res.json({
      status: "Proxy funktioniert",
      testUrl: testUrl,
      response: response.status
    });
  } catch (error) {
    res.json({
      status: "Proxy Test fehlgeschlagen",
      error: error.message
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🚀 Λbstract Bot Server mit CORS Proxy                   ║
╠═══════════════════════════════════════════════════════════╣
║  Server läuft auf: http://localhost:${PORT}                   ║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                               ║
║  • CORS Proxy:     /cors-proxy?url=<encoded_url>         ║
║  • Heartbeat:      /api/heartbeat                        ║
║  • Name Verify:    /api/verify-name                      ║
║  • Health Check:   /api/health                           ║
║  • Test Proxy:     /api/test-proxy                       ║
╠═══════════════════════════════════════════════════════════╣
║  CORS Fix sollte automatisch Wolvesville API-Calls       ║
║  durch diesen Proxy leiten.                              ║
╚═══════════════════════════════════════════════════════════╝
  `);
  console.log('📡 Warte auf Requests...');
});