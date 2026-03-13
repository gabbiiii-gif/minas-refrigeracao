/**
 * ═══════════════════════════════════════════════════════
 *  FrostERP — Servidor WhatsApp Web.js
 *  Substitui a Z-API por conexão direta via WhatsApp Web
 *
 *  INSTALAÇÃO:
 *    cd server
 *    npm install
 *    node index.js
 *
 *  Endpoints:
 *    GET  /status        → { connected, qr, phone }
 *    POST /send          → { phone, message } → envia mensagem
 *    POST /disconnect    → desconecta o cliente
 * ═══════════════════════════════════════════════════════
 */

const express   = require('express');
const cors      = require('cors');
const qrcode    = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const PORT = process.env.PORT || 3001;
const app  = express();

app.use(cors());
app.use(express.json());

// ─── ESTADO DO CLIENTE ────────────────────────────────────────────────────────
let clientReady  = false;
let qrDataUrl    = null;   // QR Code como Data URL (base64)
let clientPhone  = null;   // número conectado
let initError    = null;

// ─── INICIALIZA WHATSAPP WEB.JS ───────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './wa-session' }),
  puppeteer: {
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-translate',
      '--disable-background-networking',
      '--disable-sync',
      '--metrics-recording-only',
      '--mute-audio',
      '--safebrowsing-disable-auto-update',
      '--hide-scrollbars',
      '--disable-features=VizDisplayCompositor',
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
    console.error('[WA] Erro ao gerar QR Data URL:', e.message);
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
  console.log(`[WA] ✅ Pronto! Número conectado: ${clientPhone || '—'}`);
});

client.on('disconnected', (reason) => {
  console.log('[WA] Desconectado:', reason);
  clientReady = false;
  clientPhone = null;
  qrDataUrl   = null;
});

console.log('[WA] Iniciando cliente WhatsApp Web.js...');
client.initialize().catch(err => {
  initError = err.message;
  console.error('[WA] Erro ao inicializar:', err.message);
});

// ─── ROTAS ────────────────────────────────────────────────────────────────────

/**
 * GET /status
 * Retorna o estado atual da conexão WhatsApp.
 * Resposta: { connected: bool, qr: string|null, phone: string|null, error: string|null }
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
 * POST /send
 * Envia mensagem WhatsApp.
 * Body: { phone: "5531999990000", message: "Olá!" }
 */
app.post('/send', async (req, res) => {
  if (!clientReady) {
    return res.status(503).json({ error: 'WhatsApp não conectado. Escaneie o QR Code.' });
  }

  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone e message são obrigatórios.' });
  }

  // Normaliza número: remove não-dígitos, garante prefixo 55
  let numero = String(phone).replace(/\D/g, '');
  if (!numero.startsWith('55')) numero = '55' + numero;
  const chatId = `${numero}@c.us`;

  try {
    const result = await client.sendMessage(chatId, message);
    console.log(`[WA] ✉ Mensagem enviada para ${numero}`);
    res.json({ success: true, id: result?.id?._serialized });
  } catch (e) {
    console.error('[WA] Erro ao enviar:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /disconnect
 * Desconecta o cliente (logout do WhatsApp Web).
 */
app.post('/disconnect', async (_req, res) => {
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
  console.log(`\nAguardando QR Code — abra o FrostERP e vá em`);
  console.log(`Configurações → WhatsApp Web para escanear.\n`);
});
