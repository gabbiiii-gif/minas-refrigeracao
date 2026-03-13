/**
 * FrostERP — Rotas de Usuários (escopo por empresa)
 * GET    /api/usuarios
 * POST   /api/usuarios
 * PUT    /api/usuarios/:id
 * PATCH  /api/usuarios/:id/status
 * DELETE /api/usuarios/:id
 */

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.use(autenticar);

// ─── GET /api/usuarios ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { empresa_id: req.empresaId },
      select: { id: true, nome: true, email: true, nivel_acesso: true, ativo: true, ultimo_acesso: true, created_at: true },
      orderBy: { created_at: 'asc' },
    });
    res.json(usuarios);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao listar usuários.' });
  }
});

// ─── POST /api/usuarios ───────────────────────────────────────────────────────
router.post('/', apenasAdmin, async (req, res) => {
  const { nome, email, senha, nivel_acesso } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    // Verifica limite de usuários da empresa
    const empresa = await prisma.empresa.findUnique({ where: { id: req.empresaId } });
    const totalUsuarios = await prisma.usuario.count({ where: { empresa_id: req.empresaId, ativo: true } });

    if (totalUsuarios >= empresa.limite_usuarios) {
      return res.status(403).json({ erro: `Limite de ${empresa.limite_usuarios} usuários atingido para este plano.` });
    }

    const usuario = await prisma.usuario.create({
      data: {
        empresa_id: req.empresaId,
        nome,
        email: email.toLowerCase().trim(),
        senha_hash: await bcrypt.hash(senha, 12),
        nivel_acesso: nivel_acesso || 'operador',
        ativo: true,
      },
      select: { id: true, nome: true, email: true, nivel_acesso: true, ativo: true, created_at: true },
    });
    res.status(201).json(usuario);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ erro: 'E-mail já cadastrado nesta empresa.' });
    res.status(500).json({ erro: 'Erro ao criar usuário.' });
  }
});

// ─── PUT /api/usuarios/:id ────────────────────────────────────────────────────
router.put('/:id', apenasAdmin, async (req, res) => {
  const { nome, nivel_acesso, senha } = req.body;
  try {
    const data = { nome, nivel_acesso };
    if (senha && senha.length >= 6) {
      data.senha_hash = await bcrypt.hash(senha, 12);
    }
    const usuario = await prisma.usuario.update({
      where: { id: req.params.id, empresa_id: req.empresaId },
      data,
      select: { id: true, nome: true, email: true, nivel_acesso: true, ativo: true },
    });
    res.json(usuario);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
  }
});

// ─── PATCH /api/usuarios/:id/status ───────────────────────────────────────────
router.patch('/:id/status', apenasAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ erro: 'Você não pode desativar a si mesmo.' });
  }
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id, empresa_id: req.empresaId } });
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    const atualizado = await prisma.usuario.update({
      where: { id: req.params.id },
      data: { ativo: !usuario.ativo },
      select: { id: true, nome: true, ativo: true },
    });
    res.json(atualizado);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao alterar status.' });
  }
});

// ─── DELETE /api/usuarios/:id ─────────────────────────────────────────────────
router.delete('/:id', apenasAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ erro: 'Você não pode excluir a si mesmo.' });
  }
  try {
    await prisma.usuario.delete({ where: { id: req.params.id, empresa_id: req.empresaId } });
    res.json({ mensagem: 'Usuário excluído.' });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.status(500).json({ erro: 'Erro ao excluir usuário.' });
  }
});

module.exports = router;
