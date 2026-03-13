/**
 * FrostERP — Rotas de Ordens de Serviço
 */

const router = require('express').Router();
const prisma = require('../config/database');
const { autenticar } = require('../middleware/auth');

router.use(autenticar);

// ─── GET /api/ordens ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, tecnico_id, cliente_id, page = '1', limit = '50' } = req.query;

  const take = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  const where = { empresa_id: req.empresaId };
  if (status)     where.status     = status;
  if (tecnico_id) where.tecnico_id = tecnico_id;
  if (cliente_id) where.cliente_id = cliente_id;

  try {
    const [ordens, total] = await prisma.$transaction([
      prisma.ordemServico.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take,
        skip,
        include: {
          cliente:    { select: { id: true, nome: true, telefone: true, whatsapp: true } },
          equipamento:{ select: { id: true, tipo: true, marca: true, modelo: true } },
          servico:    { select: { id: true, nome: true, valor: true } },
          tecnico:    { select: { id: true, nome: true } },
        },
      }),
      prisma.ordemServico.count({ where }),
    ]);

    res.json({
      data: ordens,
      meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao listar ordens de serviço.' });
  }
});

// ─── POST /api/ordens ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { cliente_id, equipamento_id, servico_id, tecnico_id, tipo,
          data_agendamento, valor, desconto, observacoes } = req.body;

  if (!cliente_id) return res.status(400).json({ erro: 'Cliente é obrigatório.' });

  const valorNum    = Number(valor   || 0);
  const descontoNum = Number(desconto || 0);

  if (isNaN(valorNum))    return res.status(400).json({ erro: 'Valor inválido.' });
  if (isNaN(descontoNum)) return res.status(400).json({ erro: 'Desconto inválido.' });

  let dataAgendamento = null;
  if (data_agendamento) {
    dataAgendamento = new Date(data_agendamento);
    if (isNaN(dataAgendamento.getTime())) {
      return res.status(400).json({ erro: 'data_agendamento inválida.' });
    }
  }

  try {
    // Gera número sequencial por empresa dentro de transação para evitar race condition
    const ordem = await prisma.$transaction(async (tx) => {
      const ultima = await tx.ordemServico.findFirst({
        where: { empresa_id: req.empresaId },
        orderBy: { numero_os: 'desc' },
        select: { numero_os: true },
      });
      const numero_os = (ultima?.numero_os || 0) + 1;

      return tx.ordemServico.create({
        data: {
          empresa_id:      req.empresaId,
          numero_os,
          cliente_id,
          equipamento_id:  equipamento_id  || null,
          servico_id:      servico_id      || null,
          tecnico_id:      tecnico_id      || null,
          usuario_id:      req.user.id,
          tipo:            tipo            || 'Manutenção Preventiva',
          data_agendamento: dataAgendamento,
          valor:           valorNum,
          desconto:        descontoNum,
          valor_total:     valorNum - descontoNum,
          observacoes,
          status:          'agendado',
        },
        include: {
          cliente: { select: { nome: true } },
          servico: { select: { nome: true } },
          tecnico: { select: { nome: true } },
        },
      });
    });

    res.status(201).json(ordem);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao criar ordem de serviço.' });
  }
});

// ─── GET /api/ordens/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const ordem = await prisma.ordemServico.findFirst({
      where: { id: req.params.id, empresa_id: req.empresaId },
      include: {
        cliente:    true,
        equipamento:true,
        servico:    true,
        tecnico:    true,
        itens:      { include: { produto: true } },
      },
    });
    if (!ordem) return res.status(404).json({ erro: 'Ordem não encontrada.' });
    res.json(ordem);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao buscar ordem.' });
  }
});

// ─── PUT /api/ordens/:id ──────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { status, tecnico_id, servico_id, data_agendamento, data_conclusao,
          valor, desconto, observacoes, laudo_tecnico, tipo } = req.body;

  const valorNum    = valor    !== undefined ? Number(valor)    : undefined;
  const descontoNum = desconto !== undefined ? Number(desconto) : undefined;

  if (valorNum    !== undefined && isNaN(valorNum))    return res.status(400).json({ erro: 'Valor inválido.' });
  if (descontoNum !== undefined && isNaN(descontoNum)) return res.status(400).json({ erro: 'Desconto inválido.' });

  let dataAgendamento, dataConclusao;
  if (data_agendamento) {
    dataAgendamento = new Date(data_agendamento);
    if (isNaN(dataAgendamento.getTime())) return res.status(400).json({ erro: 'data_agendamento inválida.' });
  }
  if (data_conclusao) {
    dataConclusao = new Date(data_conclusao);
    if (isNaN(dataConclusao.getTime())) return res.status(400).json({ erro: 'data_conclusao inválida.' });
  }

  try {
    // Atualização da OS + criação de ContaReceber em uma única transação
    const ordem = await prisma.$transaction(async (tx) => {
      const updateData = {
        status, tecnico_id, servico_id, tipo, observacoes, laudo_tecnico,
        data_agendamento: dataAgendamento,
        data_conclusao:   dataConclusao,
      };

      if (valorNum !== undefined) {
        updateData.valor       = valorNum;
        updateData.desconto    = descontoNum ?? 0;
        updateData.valor_total = valorNum - (descontoNum ?? 0);
      }

      const ordem = await tx.ordemServico.update({
        where: { id: req.params.id, empresa_id: req.empresaId },
        data:  updateData,
      });

      // Ao concluir: cria/atualiza ContaReceber automaticamente
      if (status === 'concluido' && ordem.valor_total > 0) {
        const contaId = `cr-${req.params.id}`;
        await tx.contaReceber.upsert({
          where: { id: contaId },
          create: {
            id:              contaId,
            empresa_id:      req.empresaId,
            cliente_id:      ordem.cliente_id,
            ordem_servico_id:req.params.id,
            descricao:       `OS #${String(ordem.numero_os).padStart(4, '0')} — ${tipo || 'Serviço'}`,
            valor:           ordem.valor_total,
            data_vencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status:          'pendente',
            categoria:       'Serviço',
          },
          update: { valor: ordem.valor_total },
        });
      }

      return ordem;
    });

    res.json(ordem);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ erro: 'Ordem não encontrada.' });
    console.error(e);
    res.status(500).json({ erro: 'Erro ao atualizar ordem.' });
  }
});

// ─── DELETE /api/ordens/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await prisma.ordemServico.delete({ where: { id: req.params.id, empresa_id: req.empresaId } });
    res.json({ mensagem: 'Ordem excluída.' });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ erro: 'Ordem não encontrada.' });
    console.error(e);
    res.status(500).json({ erro: 'Erro ao excluir ordem.' });
  }
});

module.exports = router;
