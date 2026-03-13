/**
 * FrostERP — Rotas de Ordens de Serviço
 */

const router = require('express').Router();
const prisma = require('../config/database');
const { autenticar } = require('../middleware/auth');

router.use(autenticar);

// ─── GET /api/ordens ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, tecnico_id, cliente_id } = req.query;
  const where = { empresa_id: req.empresaId };
  if (status) where.status = status;
  if (tecnico_id) where.tecnico_id = tecnico_id;
  if (cliente_id) where.cliente_id = cliente_id;
  try {
    const ordens = await prisma.ordemServico.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true, whatsapp: true } },
        equipamento: { select: { id: true, tipo: true, marca: true, modelo: true } },
        servico: { select: { id: true, nome: true, valor: true } },
        tecnico: { select: { id: true, nome: true } },
      },
    });
    res.json(ordens);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao listar ordens de serviço.' });
  }
});

// ─── POST /api/ordens ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { cliente_id, equipamento_id, servico_id, tecnico_id, tipo,
          data_agendamento, valor, desconto, observacoes } = req.body;

  if (!cliente_id) return res.status(400).json({ erro: 'Cliente é obrigatório.' });

  try {
    // Gera número sequencial por empresa
    const ultima = await prisma.ordemServico.findFirst({
      where: { empresa_id: req.empresaId },
      orderBy: { numero_os: 'desc' },
    });
    const numero_os = (ultima?.numero_os || 0) + 1;

    const valorNum   = Number(valor || 0);
    const descontoNum = Number(desconto || 0);

    const ordem = await prisma.ordemServico.create({
      data: {
        empresa_id: req.empresaId,
        numero_os,
        cliente_id,
        equipamento_id: equipamento_id || null,
        servico_id: servico_id || null,
        tecnico_id: tecnico_id || null,
        usuario_id: req.user.id,
        tipo: tipo || 'Manutenção Preventiva',
        data_agendamento: data_agendamento ? new Date(data_agendamento) : null,
        valor: valorNum,
        desconto: descontoNum,
        valor_total: valorNum - descontoNum,
        observacoes,
        status: 'agendado',
      },
      include: {
        cliente: { select: { nome: true } },
        servico: { select: { nome: true } },
        tecnico: { select: { nome: true } },
      },
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
        cliente: true,
        equipamento: true,
        servico: true,
        tecnico: true,
        itens: { include: { produto: true } },
      },
    });
    if (!ordem) return res.status(404).json({ erro: 'Ordem não encontrada.' });
    res.json(ordem);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar ordem.' });
  }
});

// ─── PUT /api/ordens/:id ──────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { status, tecnico_id, servico_id, data_agendamento, data_conclusao,
          valor, desconto, observacoes, laudo_tecnico, tipo } = req.body;
  try {
    const valorNum    = valor !== undefined ? Number(valor) : undefined;
    const descontoNum = desconto !== undefined ? Number(desconto) : undefined;
    const data = {
      status, tecnico_id, servico_id, tipo, observacoes, laudo_tecnico,
      data_agendamento: data_agendamento ? new Date(data_agendamento) : undefined,
      data_conclusao: data_conclusao ? new Date(data_conclusao) : undefined,
    };
    if (valorNum !== undefined) {
      data.valor      = valorNum;
      data.desconto   = descontoNum || 0;
      data.valor_total = valorNum - (descontoNum || 0);
    }

    const ordem = await prisma.ordemServico.update({
      where: { id: req.params.id, empresa_id: req.empresaId },
      data,
    });

    // Se concluída, cria automaticamente conta a receber
    if (status === 'concluido' && ordem.valor_total > 0) {
      await prisma.contaReceber.upsert({
        where: { id: `cr-${req.params.id}` },
        create: {
          id: `cr-${req.params.id}`,
          empresa_id: req.empresaId,
          cliente_id: ordem.cliente_id,
          ordem_servico_id: req.params.id,
          descricao: `OS #${String(ordem.numero_os).padStart(4,'0')} — ${tipo || 'Serviço'}`,
          valor: ordem.valor_total,
          data_vencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pendente',
          categoria: 'Serviço',
        },
        update: { valor: ordem.valor_total },
      });
    }

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
    res.status(500).json({ erro: 'Erro ao excluir ordem.' });
  }
});

module.exports = router;
