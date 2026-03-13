/**
 * FrostERP — Rotas de Autenticação
 * POST /api/auth/login
 * GET  /api/auth/me
 */

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const prisma  = require('../config/database');
const { autenticar } = require('../middleware/auth');

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { codigo, email, senha } = req.body;

  if (!codigo || !email || !senha) {
    return res.status(400).json({ erro: 'Código da empresa, e-mail e senha são obrigatórios.' });
  }

  try {
    // 1. Busca a empresa pelo código
    const empresa = await prisma.empresa.findUnique({
      where: { codigo: codigo.toUpperCase().trim() },
      select: { id: true, nome: true, codigo: true, status: true, plano: true },
    });

    if (!empresa) {
      return res.status(401).json({ erro: 'Empresa não encontrada. Verifique o código.' });
    }
    if (empresa.status !== 'ativo') {
      return res.status(403).json({ erro: 'Empresa suspensa. Entre em contato com o suporte.' });
    }

    // 2. Busca o usuário dentro da empresa
    const usuario = await prisma.usuario.findUnique({
      where: { empresa_id_email: { empresa_id: empresa.id, email: email.toLowerCase().trim() } },
    });

    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário não encontrado nesta empresa.' });
    }
    if (!usuario.ativo) {
      return res.status(403).json({ erro: 'Usuário desativado. Contate o administrador.' });
    }

    // 3. Verifica senha
    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaOk) {
      return res.status(401).json({ erro: 'Senha incorreta.' });
    }

    // 4. Gera JWT
    const token = jwt.sign(
      { userId: usuario.id, empresaId: empresa.id, nivel: usuario.nivel_acesso },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 5. Atualiza último acesso
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimo_acesso: new Date() },
    });

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel_acesso: usuario.nivel_acesso,
      },
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        codigo: empresa.codigo,
        plano: empresa.plano,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro interno ao autenticar.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', autenticar, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, nome: true, email: true, nivel_acesso: true,
        created_at: true, ultimo_acesso: true,
        empresa: { select: { id: true, nome: true, codigo: true, plano: true } },
      },
    });
    res.json(usuario);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar dados do usuário.' });
  }
});

module.exports = router;
