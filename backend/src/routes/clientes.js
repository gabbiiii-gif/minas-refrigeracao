/**
 * FrostERP — Rotas de Clientes (isolamento por empresa_id)
 */

const router = require('express').Router();
const prisma = require('../config/database');
const { autenticar } = require('../middleware/auth');

router.use(autenticar);

// ─── GET /api/clientes ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { busca, status, page = '1', limit = '50' } = req.query;

  const take = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  const where = { empresa_id: req.empresaId };
  if (status) where.status = status;
  if (busca) where.OR = [
    { nome:     { contains: busca, mode: 'insensitive' } },
    { email:    { contains: busca, mode: 'insensitive' } },
    { telefone: { contains: busca } },
    { cpf_cnpj: { contains: busca } },
  ];

  try {
    const [clientes, total] = await prisma.$transaction([
      prisma.cliente.findMany({
        where,
        orderBy: { nome: 'asc' },
        take,
        skip,
        include: { _count: { select: { ordens_servico: true, equipamentos: true } } },
      }),
      prisma.cliente.count({ where }),
    ]);

    res.json({
      data: clientes,
      meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao listar clientes.' });
  }
});

// ─── POST /api/clientes ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { nome, cpf_cnpj, email, telefone, whatsapp, endereco, numero,
          complemento, bairro, cidade, estado, cep, observacoes } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'Nome é obrigatório.' });
  }

  try {
    const cliente = await prisma.cliente.create({
      data: {
        empresa_id: req.empresaId,
        nome: nome.trim(),
        cpf_cnpj, email: email?.toLowerCase().trim(), telefone, whatsapp,
        endereco, numero, complemento, bairro, cidade, estado, cep, observacoes,
        status: 'ativo',
      },
    });
    res.status(201).json(cliente);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao cadastrar cliente.' });
  }
});

// ─── GET /api/clientes/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id: req.params.id, empresa_id: req.empresaId },
      include: {
        equipamentos: true,
        ordens_servico: {
          include: { servico: true, tecnico: true },
          orderBy: { created_at: 'desc' },
          take: 20,
        },
      },
    });
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });
    res.json(cliente);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao buscar cliente.' });
  }
});

// ─── PUT /api/clientes/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { nome, cpf_cnpj, email, telefone, whatsapp, endereco, numero,
          complemento, bairro, cidade, estado, cep, observacoes, status } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'Nome é obrigatório.' });
  }

  try {
    const cliente = await prisma.cliente.update({
      where: { id: req.params.id, empresa_id: req.empresaId },
      data: {
        nome: nome.trim(), cpf_cnpj, email: email?.toLowerCase().trim(),
        telefone, whatsapp, endereco, numero, complemento, bairro,
        cidade, estado, cep, observacoes, status,
      },
    });
    res.json(cliente);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ erro: 'Cliente não encontrado.' });
    console.error(e);
    res.status(500).json({ erro: 'Erro ao atualizar cliente.' });
  }
});

// ─── DELETE /api/clientes/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await prisma.cliente.delete({ where: { id: req.params.id, empresa_id: req.empresaId } });
    res.json({ mensagem: 'Cliente excluído.' });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ erro: 'Cliente não encontrado.' });
    console.error(e);
    res.status(500).json({ erro: 'Erro ao excluir cliente.' });
  }
});

module.exports = router;
