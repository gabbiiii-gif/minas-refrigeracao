/**
 * FrostERP — Rotas de Empresas (apenas Super Admin)
 * GET    /api/empresas
 * POST   /api/empresas
 * GET    /api/empresas/:id
 * PUT    /api/empresas/:id
 * PATCH  /api/empresas/:id/status
 * DELETE /api/empresas/:id
 */

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { autenticar, apenasSuperAdmin } = require('../middleware/auth');

// Todas as rotas de empresa exigem Super Admin
router.use(autenticar, apenasSuperAdmin);

// ─── GET /api/empresas ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const empresas = await prisma.empresa.findMany({
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { usuarios: true, clientes: true, ordens_servico: true } } },
    });
    res.json(empresas);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao listar empresas.' });
  }
});

// ─── POST /api/empresas — Cadastrar empresa + admin inicial ───────────────────
router.post('/', async (req, res) => {
  const { nome, cnpj, email, telefone, plano, limite_usuarios, codigo,
          admin_nome, admin_email, admin_senha } = req.body;

  if (!nome || !cnpj || !email || !codigo || !admin_nome || !admin_email || !admin_senha) {
    return res.status(400).json({ erro: 'Dados obrigatórios: nome, cnpj, email, codigo, admin_nome, admin_email, admin_senha.' });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Cria a empresa
      const empresa = await tx.empresa.create({
        data: {
          nome, cnpj, email, telefone,
          plano: plano || 'basico',
          status: 'ativo',
          codigo: codigo.toUpperCase(),
          limite_usuarios: Number(limite_usuarios) || 5,
        },
      });

      // Cria o primeiro usuário admin da empresa
      const admin = await tx.usuario.create({
        data: {
          empresa_id: empresa.id,
          nome: admin_nome,
          email: admin_email.toLowerCase(),
          senha_hash: await bcrypt.hash(admin_senha, 12),
          nivel_acesso: 'admin',
          ativo: true,
        },
      });

      return { empresa, admin };
    });

    res.status(201).json({
      mensagem: 'Empresa cadastrada com sucesso!',
      empresa: resultado.empresa,
      admin: { id: resultado.admin.id, nome: resultado.admin.nome, email: resultado.admin.email },
    });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ erro: 'CNPJ, e-mail ou código já cadastrado.' });
    console.error(e);
    res.status(500).json({ erro: 'Erro ao cadastrar empresa.' });
  }
});

// ─── GET /api/empresas/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.params.id },
      include: {
        usuarios: { select: { id: true, nome: true, email: true, nivel_acesso: true, ativo: true } },
        _count: { select: { clientes: true, ordens_servico: true } },
      },
    });
    if (!empresa) return res.status(404).json({ erro: 'Empresa não encontrada.' });
    res.json(empresa);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar empresa.' });
  }
});

// ─── PUT /api/empresas/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { nome, cnpj, email, telefone, plano, limite_usuarios } = req.body;
  try {
    const empresa = await prisma.empresa.update({
      where: { id: req.params.id },
      data: { nome, cnpj, email, telefone, plano, limite_usuarios: Number(limite_usuarios) },
    });
    res.json(empresa);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ erro: 'Empresa não encontrada.' });
    res.status(500).json({ erro: 'Erro ao atualizar empresa.' });
  }
});

// ─── PATCH /api/empresas/:id/status ───────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['ativo', 'inativo', 'suspenso'].includes(status)) {
    return res.status(400).json({ erro: 'Status inválido.' });
  }
  try {
    const empresa = await prisma.empresa.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ mensagem: `Empresa ${status} com sucesso.`, empresa });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao atualizar status.' });
  }
});

// ─── DELETE /api/empresas/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await prisma.empresa.delete({ where: { id: req.params.id } });
    res.json({ mensagem: 'Empresa excluída.' });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ erro: 'Empresa não encontrada.' });
    res.status(500).json({ erro: 'Erro ao excluir empresa.' });
  }
});

module.exports = router;
