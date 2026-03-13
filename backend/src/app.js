/**
 * ═══════════════════════════════════════════════════════
 *  FrostERP — Backend API
 *  Node.js + Express + Prisma + PostgreSQL
 *
 *  INÍCIO RÁPIDO:
 *    1. cp .env.example .env  (e preencha DATABASE_URL)
 *    2. npm install
 *    3. npm run db:generate
 *    4. npm run db:migrate
 *    5. npm run db:seed
 *    6. npm run dev
 * ═══════════════════════════════════════════════════════
 */

require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const compression = require('compression');

const app = express();

// ─── Segurança: headers HTTP ──────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── Performance: compressão gzip ────────────────────────────────────────────
app.use(compression());

// ─── Rate limiting geral: 200 req / 15 min por IP ────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Tente novamente em 15 minutos.' },
}));

// ─── Rate limiting estrito para autenticação: 15 tentativas / 15 min ─────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { erro: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// ─── Middlewares globais ──────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── Log de requests em desenvolvimento ──────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        authLimiter, require('./routes/auth'));
app.use('/api/empresas',    require('./routes/empresas'));
app.use('/api/usuarios',    require('./routes/usuarios'));
app.use('/api/clientes',    require('./routes/clientes'));
app.use('/api/fornecedores',require('./routes/fornecedores'));
app.use('/api/produtos',    require('./routes/produtos'));
app.use('/api/servicos',    require('./routes/servicos'));
app.use('/api/ordens',      require('./routes/ordensServico'));
app.use('/api/financeiro',  require('./routes/financeiro'));
app.use('/api/tecnicos',    require('./routes/tecnicos'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', versao: '1.0.0', timestamp: new Date().toISOString() });
});

// ─── Rota não encontrada ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// ─── Erro global ──────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// ─── Inicia servidor ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║       FrostERP — API Backend             ║`);
  console.log(`║       http://localhost:${PORT}                ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`\nEndpoints disponíveis:`);
  console.log(`  POST   /api/auth/login`);
  console.log(`  GET    /api/auth/me`);
  console.log(`  GET    /api/clientes`);
  console.log(`  GET    /api/ordens`);
  console.log(`  GET    /api/financeiro/dashboard`);
  console.log(`  GET    /api/health\n`);
});

module.exports = app;
