/**
 * ═══════════════════════════════════════════════════════
 *  FrostERP — Servidor WhatsApp Web.js
 *
 *  INSTALAÇÃO:
 *    cd server
 *    npm install
 *    node index.js
 *
 *  VARIÁVEIS DE AMBIENTE (opcional — crie server/.env):
 *    PORT       → porta do servidor (padrão: 3001)
 *    CHROME_PATH→ caminho do Chrome (detectado automaticamente se omitido)
 *    WA_SECRET  → chave para proteger /send e /disconnect
 *
 *  Endpoints:
 *    GET  /health      → health check
 *    GET  /status      → { connected, qr, phone }
 *    POST /send        → { phone, message } — requer x-wa-secret se WA_SECRET definido
 *    POST /disconnect  → desconecta — requer x-wa-secret se WA_SECRET definido
 * ═══════════════════════════════════════════════════════
 */

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const qrcode    = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const PORT      = process.env.PORT || 3001;
const WA_SECRET = process.env.WA_SECRET || '';

const app = express();
app.use(cors());
app.use(express.json());

// ─── Detecta caminho do Chrome por SO (ou usa env var) ───────────────────────
function getChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  switch (process.platform) {
    case 'win32':
      return (
        process.env['PROGRAMFILES'] + '\\Google\\Chrome\\Application\\chrome.exe' ||
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      );
    case 'darwin':
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    default:
      // Linux: tenta caminhos comuns
      return (
        '/usr/bin/google-chrome' ||
        '/usr/bin/google-chrome-stable' ||
        '/usr/bin/chromium-browser'
      );
  }
}

// ─── Autenticação por secret nos endpoints de escrita ────────────────────────
function requireSecret(req, res, next) {
  if (!WA_SECRET) return next(); // sem secret configurado: acesso livre (dev)
  const key = req.headers['x-wa-secret'] || req.query.secret;
  if (key !== WA_SECRET) {
    return res.status(401).json({ error: 'Não autorizado. Forneça o header x-wa-secret.' });
  }
  next();
}

// ─── ESTADO DO CLIENTE ────────────────────────────────────────────────────────
let clientReady = false;
let qrDataUrl   = null;
let clientPhone = null;
let initError   = null;

// ─── INICIALIZA WHATSAPP WEB.JS ───────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './wa-session' }),
  puppeteer: {
    headless: true,
    executablePath: getChromePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--mute-audio',
      '--hide-scrollbars',
      '--window-size=1280,720',
    ],
  },
});

client.on('loading_screen', (percent, message) => {
  console.log(`[WA] Carregando: ${percent}% — ${message}`);
});

client.on('qr', async (qr) => {
  console.log('[WA] QR Code recebido — escaneie com o WhatsApp');
  clientReady = false;
  clientPhone = null;
  try {
    qrDataUrl = await qrcode.toDataURL(qr);
  } catch (e) {
    console.error('[WA] Erro ao gerar QR:', e.message);
  }
});

client.on('authenticated', () => {
  console.log('[WA] Autenticado!');
  qrDataUrl = null;
});

client.on('auth_failure', (msg) => {
  console.error('[WA] Falha na autenticação:', msg);
  clientReady = false;
  initError   = msg;
});

client.on('ready', () => {
  clientReady = true;
  qrDataUrl   = null;
  initError   = null;
  clientPhone = client.info?.wid?.user || null;
  console.log(`[WA] ✅ Pronto! Número: ${clientPhone || '—'}`);
});

client.on('disconnected', (reason) => {
  console.log('[WA] Desconectado:', reason);
  clientReady = false;
  clientPhone = null;
  qrDataUrl   = null;
  // Reinicializa automaticamente após 5s (exceto logout manual)
  if (reason !== 'LOGOUT') {
    console.log('[WA] Reconectando em 5s...');
    setTimeout(() => {
      client.initialize().catch(err => {
        initError = err.message;
        console.error('[WA] Erro ao reinicializar:', err.message);
      });
    }, 5000);
  }
});

console.log(`[WA] Chrome: ${getChromePath()}`);
console.log('[WA] Iniciando cliente WhatsApp Web.js...');
client.initialize().catch(err => {
  initError = err.message;
  console.error('[WA] Erro ao inicializar:', err.message);
});

// ─── ROTAS ────────────────────────────────────────────────────────────────────

/** GET /health — health check */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /status
 * { connected, qr, phone, error }
 */
app.get('/status', (_req, res) => {
  res.json({
    connected: clientReady,
    qr:        qrDataUrl,
    phone:     clientPhone,
    error:     initError,
  });
});

/**
 * POST /send  — requer x-wa-secret (se WA_SECRET configurado)
 * Body: { phone: "5531999990000", message: "Olá!" }
 */
app.post('/send', requireSecret, async (req, res) => {
  if (!clientReady) {
    return res.status(503).json({ error: 'WhatsApp não conectado. Escaneie o QR Code.' });
  }

  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone e message são obrigatórios.' });
  }
  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'message não pode ser vazio.' });
  }

  // Normaliza: remove não-dígitos, garante DDI 55
  let numero = String(phone).replace(/\D/g, '');
  if (!numero.startsWith('55')) numero = '55' + numero;

  // Valida comprimento mínimo (DDI 55 + DDD 2 + número 8-9 = 12-13 dígitos)
  if (numero.length < 12 || numero.length > 13) {
    return res.status(400).json({ error: `Número inválido: ${phone}. Use formato brasileiro com DDD.` });
  }

  const chatId = `${numero}@c.us`;
  try {
    const result = await client.sendMessage(chatId, message.trim());
    console.log(`[WA] ✉ Enviado para ${numero}`);
    res.json({ success: true, id: result?.id?._serialized });
  } catch (e) {
    console.error('[WA] Erro ao enviar:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /disconnect — requer x-wa-secret (se WA_SECRET configurado)
 */
app.post('/disconnect', requireSecret, async (_req, res) => {
  try {
    await client.logout();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── INICIA SERVIDOR ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║   FrostERP — Servidor WhatsApp Web.js    ║`);
  console.log(`║   http://localhost:${PORT}                   ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  if (WA_SECRET) {
    console.log(`\n🔒 Proteção ativa — use header: x-wa-secret: ${WA_SECRET.slice(0,4)}****`);
  } else {
    console.log(`\n⚠  WA_SECRET não configurado — defina em server/.env para proteger /send`);
  }
  console.log(`\nAguardando QR Code — acesse Configurações → WhatsApp Web.\n`);
});
