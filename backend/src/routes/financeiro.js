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
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [
      totalReceber, totalPagar, recebidoMes, pagoMes,
      osTotal, osConcluidas, totalClientes,
    ] = await Promise.all([
      prisma.contaReceber.aggregate({ where: { empresa_id: eId, status: 'pendente' }, _sum: { valor: true } }),
      prisma.contaPagar.aggregate(  { where: { empresa_id: eId, status: 'pendente' }, _sum: { valor: true } }),
      prisma.contaReceber.aggregate({
        where: { empresa_id: eId, status: 'recebido', data_recebimento: { gte: inicioMes } },
        _sum: { valor: true },
      }),
      prisma.contaPagar.aggregate({
        where: { empresa_id: eId, status: 'pago', data_pagamento: { gte: inicioMes } },
        _sum: { valor: true },
      }),
      prisma.ordemServico.count({ where: { empresa_id: eId } }),
      prisma.ordemServico.count({ where: { empresa_id: eId, status: 'concluido' } }),
      prisma.cliente.count(      { where: { empresa_id: eId, status: 'ativo' } }),
    ]);

    res.json({
      a_receber:      Number(totalReceber._sum.valor  || 0),
      a_pagar:        Number(totalPagar._sum.valor    || 0),
      recebido_mes:   Number(recebidoMes._sum.valor   || 0),
      pago_mes:       Number(pagoMes._sum.valor       || 0),
      saldo_mes:      Number(recebidoMes._sum.valor   || 0) - Number(pagoMes._sum.valor || 0),
      total_os:       osTotal,
      os_concluidas:  osConcluidas,
      total_clientes: totalClientes,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao gerar dashboard financeiro.' });
  }
});

// ─── CONTAS A RECEBER ─────────────────────────────────────────────────────────
router.get('/receber', async (req, res) => {
  const { status, page = '1', limit = '50' } = req.query;

  const take = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  const where = { empresa_id: req.empresaId };
  if (status) where.status = status;

  try {
    const [contas, total] = await prisma.$transaction([
      prisma.contaReceber.findMany({
        where,
        orderBy: { data_vencimento: 'asc' },
        take,
        skip,
        include: {
          cliente:      { select: { nome: true } },
          ordem_servico:{ select: { numero_os: true } },
        },
      }),
      prisma.contaReceber.count({ where }),
    ]);

    res.json({
      data: contas,
      meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao listar contas a receber.' });
  }
});

router.post('/receber', async (req, res) => {
  const { cliente_id, descricao, categoria, valor, data_vencimento, observacoes } = req.body;

  if (!descricao || !valor || !data_vencimento) {
    return res.status(400).json({ erro: 'Descrição, valor e data de vencimento são obrigatórios.' });
  }

  const valorNum = Number(valor);
  if (isNaN(valorNum) || valorNum <= 0) {
    return res.status(400).json({ erro: 'Valor inválido.' });
  }

  const dataVenc = new Date(data_vencimento);
  if (isNaN(dataVenc.getTime())) {
    return res.status(400).json({ erro: 'Data de vencimento inválida.' });
  }

  try {
    const conta = await prisma.contaReceber.create({
      data: {
        empresa_id:      req.empresaId,
        cliente_id,
        descricao:       descricao.trim(),
        categoria,
        valor:           valorNum,
        data_vencimento: dataVenc,
        observacoes,
        status:          'pendente',
      },
    });
    res.status(201).json(conta);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao criar conta a receber.' });
  }
});

router.patch('/receber/:id/receber', async (req, res) => {
  const { data_recebimento } = req.body;

  let dataReceb = data_recebimento ? new Date(data_recebimento) : new Date();
  if (isNaN(dataReceb.getTime())) dataReceb = new Date();

  try {
    // Recebimento + movimentação em transação atômica
    const conta = await prisma.$transaction(async (tx) => {
      const conta = await tx.contaReceber.update({
        where: { id: req.params.id, empresa_id: req.empresaId },
        data:  { status: 'recebido', data_recebimento: dataReceb },
      });

      await tx.movimentacaoFinanceira.create({
        data: {
          empresa_id: req.empresaId,
          tipo:       'entrada',
          descricao:  conta.descricao,
          categoria:  conta.categoria || 'Serviço',
          valor:      conta.valor,
          conta_receber_id: conta.id,
        },
      });

      return conta;
    });

    res.json(conta);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ erro: 'Conta não encontrada.' });
    console.error(e);
    res.status(500).json({ erro: 'Erro ao registrar recebimento.' });
  }
});

// ─── CONTAS A PAGAR ───────────────────────────────────────────────────────────
router.get('/pagar', async (req, res) => {
  const { status, page = '1', limit = '50' } = req.query;

  const take = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  const where = { empresa_id: req.empresaId };
  if (status) where.status = status;

  try {
    const [contas, total] = await prisma.$transaction([
      prisma.contaPagar.findMany({
        where,
        orderBy: { data_vencimento: 'asc' },
        take,
        skip,
        include: { fornecedor: { select: { nome: true } } },
      }),
      prisma.contaPagar.count({ where }),
    ]);

    res.json({
      data: contas,
      meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao listar contas a pagar.' });
  }
});

router.post('/pagar', apenasAdmin, async (req, res) => {
  const { fornecedor_id, descricao, categoria, valor, data_vencimento, observacoes } = req.body;

  if (!descricao || !valor || !data_vencimento) {
    return res.status(400).json({ erro: 'Descrição, valor e data de vencimento são obrigatórios.' });
  }

  const valorNum = Number(valor);
  if (isNaN(valorNum) || valorNum <= 0) {
    return res.status(400).json({ erro: 'Valor inválido.' });
  }

  const dataVenc = new Date(data_vencimento);
  if (isNaN(dataVenc.getTime())) {
    return res.status(400).json({ erro: 'Data de vencimento inválida.' });
  }

  try {
    const conta = await prisma.contaPagar.create({
      data: {
        empresa_id:      req.empresaId,
        fornecedor_id,
        descricao:       descricao.trim(),
        categoria,
        valor:           valorNum,
        data_vencimento: dataVenc,
        observacoes,
        status:          'pendente',
      },
    });
    res.status(201).json(conta);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao criar conta a pagar.' });
  }
});

router.patch('/pagar/:id/pagar', apenasAdmin, async (req, res) => {
  const { data_pagamento } = req.body;

  let dataPag = data_pagamento ? new Date(data_pagamento) : new Date();
  if (isNaN(dataPag.getTime())) dataPag = new Date();

  try {
    // Pagamento + movimentação em transação atômica
    const conta = await prisma.$transaction(async (tx) => {
      const conta = await tx.contaPagar.update({
        where: { id: req.params.id, empresa_id: req.empresaId },
        data:  { status: 'pago', data_pagamento: dataPag },
      });

      await tx.movimentacaoFinanceira.create({
        data: {
          empresa_id:    req.empresaId,
          tipo:          'saida',
          descricao:     conta.descricao,
          categoria:     conta.categoria || 'Despesa',
          valor:         conta.valor,
          conta_pagar_id:conta.id,
        },
      });

      return conta;
    });

    res.json(conta);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ erro: 'Conta não encontrada.' });
    console.error(e);
    res.status(500).json({ erro: 'Erro ao registrar pagamento.' });
  }
});

// ─── MOVIMENTAÇÕES FINANCEIRAS ────────────────────────────────────────────────
router.get('/movimentacoes', async (req, res) => {
  const { tipo, inicio, fim, page = '1', limit = '100' } = req.query;

  const take = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  const where = { empresa_id: req.empresaId };
  if (tipo) where.tipo = tipo;
  if (inicio || fim) {
    where.data = {};
    if (inicio) {
      const d = new Date(inicio);
      if (!isNaN(d.getTime())) where.data.gte = d;
    }
    if (fim) {
      const d = new Date(fim);
      if (!isNaN(d.getTime())) where.data.lte = d;
    }
  }

  try {
    const movs = await prisma.movimentacaoFinanceira.findMany({
      where,
      orderBy: { data: 'desc' },
      take,
      skip,
    });
    res.json(movs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao listar movimentações.' });
  }
});

module.exports = router;
