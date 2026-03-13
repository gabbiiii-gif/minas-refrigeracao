/**
 * FrostERP — Rotas de Produtos + Estoque
 */

const router = require('express').Router();
const prisma = require('../config/database');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.use(autenticar);

// ─── GET /api/produtos ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { empresa_id: req.empresaId, ativo: true },
      include: { estoque: { select: { quantidade: true, local: true } } },
      orderBy: { nome: 'asc' },
    });
    // Alerta de estoque mínimo
    const alertas = produtos.filter(p => p.estoque?.quantidade <= p.estoque_minimo);
    res.json({ produtos, alertas_estoque: alertas.length });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao listar produtos.' });
  }
});

// ─── POST /api/produtos ───────────────────────────────────────────────────────
router.post('/', apenasAdmin, async (req, res) => {
  const { codigo, nome, descricao, categoria, unidade, preco_custo, preco_venda,
          estoque_minimo, quantidade_inicial } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  try {
    const produto = await prisma.$transaction(async (tx) => {
      const p = await tx.produto.create({
        data: {
          empresa_id: req.empresaId, codigo, nome, descricao, categoria,
          unidade: unidade || 'un',
          preco_custo: Number(preco_custo || 0),
          preco_venda: Number(preco_venda || 0),
          estoque_minimo: Number(estoque_minimo || 0),
        },
      });
      // Cria registro de estoque
      await tx.estoque.create({
        data: { empresa_id: req.empresaId, produto_id: p.id, quantidade: Number(quantidade_inicial || 0) },
      });
      return p;
    });
    res.status(201).json(produto);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ erro: 'Código de produto já cadastrado.' });
    res.status(500).json({ erro: 'Erro ao criar produto.' });
  }
});

// ─── PATCH /api/produtos/:id/estoque — Movimentação manual de estoque ─────────
router.patch('/:id/estoque', async (req, res) => {
  const { tipo, quantidade, motivo } = req.body;
  if (!tipo || !quantidade) return res.status(400).json({ erro: 'Tipo e quantidade são obrigatórios.' });
  const qtd = Number(quantidade);
  try {
    const estoque = await prisma.estoque.findFirst({ where: { produto_id: req.params.id, empresa_id: req.empresaId } });
    if (!estoque) return res.status(404).json({ erro: 'Produto sem registro de estoque.' });

    const novaQtd = tipo === 'entrada' ? estoque.quantidade + qtd
                  : tipo === 'saida'   ? estoque.quantidade - qtd
                  : qtd; // ajuste

    if (novaQtd < 0) return res.status(400).json({ erro: 'Estoque não pode ser negativo.' });

    const [estoqueAtual] = await prisma.$transaction([
      prisma.estoque.update({ where: { id: estoque.id }, data: { quantidade: novaQtd } }),
      prisma.movimentacaoEstoque.create({
        data: { empresa_id: req.empresaId, produto_id: req.params.id, tipo, quantidade: qtd, motivo },
      }),
    ]);
    res.json(estoqueAtual);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao movimentar estoque.' });
  }
});

module.exports = router;
