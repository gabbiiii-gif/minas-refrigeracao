/**
 * FrostERP — Rotas Financeiras (Contas a Pagar/Receber + Dashboard)
 */

const router = require('express').Router();
const prisma = require('../config/database');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.use(autenticar);

// ─── GET /api/financeiro/dashboard ────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  const eId = req.empresaId;
  try {
    const [
      totalReceber, totalPagar, recebidoMes, pagoMes,
      osTotal, osConcluidas, totalClientes,
    ] = await Promise.all([
      prisma.contaReceber.aggregate({ where: { empresa_id: eId, status: 'pendente' }, _sum: { valor: true } }),
      prisma.contaPagar.aggregate({ where: { empresa_id: eId, status: 'pendente' }, _sum: { valor: true } }),
      prisma.contaReceber.aggregate({
        where: { empresa_id: eId, status: 'recebido',
                 data_recebimento: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        _sum: { valor: true },
      }),
      prisma.contaPagar.aggregate({
        where: { empresa_id: eId, status: 'pago',
                 data_pagamento: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        _sum: { valor: true },
      }),
      prisma.ordemServico.count({ where: { empresa_id: eId } }),
      prisma.ordemServico.count({ where: { empresa_id: eId, status: 'concluido' } }),
      prisma.cliente.count({ where: { empresa_id: eId, status: 'ativo' } }),
    ]);

    res.json({
      a_receber: Number(totalReceber._sum.valor || 0),
      a_pagar:   Number(totalPagar._sum.valor || 0),
      recebido_mes: Number(recebidoMes._sum.valor || 0),
      pago_mes:     Number(pagoMes._sum.valor || 0),
      saldo_mes: Number(recebidoMes._sum.valor || 0) - Number(pagoMes._sum.valor || 0),
      total_os: osTotal,
      os_concluidas: osConcluidas,
      total_clientes: totalClientes,
    });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao gerar dashboard financeiro.' });
  }
});

// ─── CONTAS A RECEBER ─────────────────────────────────────────────────────────
router.get('/receber', async (req, res) => {
  const { status } = req.query;
  const where = { empresa_id: req.empresaId };
  if (status) where.status = status;
  try {
    const contas = await prisma.contaReceber.findMany({
      where, orderBy: { data_vencimento: 'asc' },
      include: { cliente: { select: { nome: true } }, ordem_servico: { select: { numero_os: true } } },
    });
    res.json(contas);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao listar contas a receber.' });
  }
});

router.post('/receber', async (req, res) => {
  const { cliente_id, descricao, categoria, valor, data_vencimento, observacoes } = req.body;
  if (!descricao || !valor || !data_vencimento) {
    return res.status(400).json({ erro: 'Descrição, valor e data de vencimento são obrigatórios.' });
  }
  try {
    const conta = await prisma.contaReceber.create({
      data: { empresa_id: req.empresaId, cliente_id, descricao, categoria, valor: Number(valor),
              data_vencimento: new Date(data_vencimento), observacoes, status: 'pendente' },
    });
    res.status(201).json(conta);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao criar conta a receber.' });
  }
});

router.patch('/receber/:id/receber', async (req, res) => {
  const { data_recebimento } = req.body;
  try {
    const conta = await prisma.contaReceber.update({
      where: { id: req.params.id, empresa_id: req.empresaId },
      data: { status: 'recebido', data_recebimento: data_recebimento ? new Date(data_recebimento) : new Date() },
    });
    // Registra movimentação financeira
    await prisma.movimentacaoFinanceira.create({
      data: { empresa_id: req.empresaId, tipo: 'entrada', descricao: conta.descricao,
              categoria: conta.categoria || 'Serviço', valor: conta.valor, conta_receber_id: conta.id },
    });
    res.json(conta);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao registrar recebimento.' });
  }
});

// ─── CONTAS A PAGAR ───────────────────────────────────────────────────────────
router.get('/pagar', async (req, res) => {
  const { status } = req.query;
  const where = { empresa_id: req.empresaId };
  if (status) where.status = status;
  try {
    const contas = await prisma.contaPagar.findMany({
      where, orderBy: { data_vencimento: 'asc' },
      include: { fornecedor: { select: { nome: true } } },
    });
    res.json(contas);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao listar contas a pagar.' });
  }
});

router.post('/pagar', apenasAdmin, async (req, res) => {
  const { fornecedor_id, descricao, categoria, valor, data_vencimento, observacoes } = req.body;
  if (!descricao || !valor || !data_vencimento) {
    return res.status(400).json({ erro: 'Descrição, valor e data de vencimento são obrigatórios.' });
  }
  try {
    const conta = await prisma.contaPagar.create({
      data: { empresa_id: req.empresaId, fornecedor_id, descricao, categoria, valor: Number(valor),
              data_vencimento: new Date(data_vencimento), observacoes, status: 'pendente' },
    });
    res.status(201).json(conta);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao criar conta a pagar.' });
  }
});

router.patch('/pagar/:id/pagar', apenasAdmin, async (req, res) => {
  const { data_pagamento } = req.body;
  try {
    const conta = await prisma.contaPagar.update({
      where: { id: req.params.id, empresa_id: req.empresaId },
      data: { status: 'pago', data_pagamento: data_pagamento ? new Date(data_pagamento) : new Date() },
    });
    await prisma.movimentacaoFinanceira.create({
      data: { empresa_id: req.empresaId, tipo: 'saida', descricao: conta.descricao,
              categoria: conta.categoria || 'Despesa', valor: conta.valor, conta_pagar_id: conta.id },
    });
    res.json(conta);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao registrar pagamento.' });
  }
});

// ─── MOVIMENTAÇÕES FINANCEIRAS ────────────────────────────────────────────────
router.get('/movimentacoes', async (req, res) => {
  const { tipo, inicio, fim } = req.query;
  const where = { empresa_id: req.empresaId };
  if (tipo) where.tipo = tipo;
  if (inicio || fim) where.data = {};
  if (inicio) where.data.gte = new Date(inicio);
  if (fim)    where.data.lte = new Date(fim);
  try {
    const movs = await prisma.movimentacaoFinanceira.findMany({
      where, orderBy: { data: 'desc' }, take: 100,
    });
    res.json(movs);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao listar movimentações.' });
  }
});

module.exports = router;
