/**
 * FrostERP — Middleware de Autenticação JWT + Multi-Tenant
 *
 * Cada requisição autenticada carrega:
 *   req.user     → dados do usuário (id, nome, email, nivel_acesso)
 *   req.empresaId → empresa_id do usuário (garante isolamento de dados)
 */

const jwt      = require('jsonwebtoken');
const prisma   = require('../config/database');

// ─── Verifica JWT e injeta req.user + req.empresaId ───────────────────────────
async function autenticar(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido.' });
  }

  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Confirma que o usuário ainda existe e está ativo
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.userId },
      select: { id: true, nome: true, email: true, nivel_acesso: true, ativo: true, empresa_id: true },
    });

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Usuário inativo ou não encontrado.' });
    }

    req.user      = usuario;
    req.empresaId = usuario.empresa_id;   // ← garante multi-tenancy
    next();
  } catch (e) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

// ─── Garante que o usuário é Admin ou Super Admin ─────────────────────────────
function apenasAdmin(req, res, next) {
  if (!['admin', 'super_admin'].includes(req.user?.nivel_acesso)) {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
  }
  next();
}

// ─── Garante que o usuário é Super Admin ──────────────────────────────────────
function apenasSuperAdmin(req, res, next) {
  if (req.user?.nivel_acesso !== 'super_admin') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas Super Admin.' });
  }
  next();
}

module.exports = { autenticar, apenasAdmin, apenasSuperAdmin };
