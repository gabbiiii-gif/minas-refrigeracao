/**
 * FrostERP — Rotas de Serviços (tabela de preços)
 */

const router = require('express').Router();
const prisma = require('../config/database');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.use(autenticar);

router.get('/', async (req, res) => {
  try {
    const servicos = await prisma.servico.findMany({
      where: { empresa_id: req.empresaId, ativo: true },
      orderBy: { nome: 'asc' },
    });
    res.json(servicos);
  } catch (e) { res.status(500).json({ erro: 'Erro ao listar serviços.' }); }
});

router.post('/', apenasAdmin, async (req, res) => {
  const { nome, descricao, categoria, valor, duracao_estimada } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  try {
    const servico = await prisma.servico.create({
      data: { empresa_id: req.empresaId, nome, descricao, categoria, valor: Number(valor || 0), duracao_estimada: Number(duracao_estimada || 0) || null },
    });
    res.status(201).json(servico);
  } catch (e) { res.status(500).json({ erro: 'Erro ao criar serviço.' }); }
});

router.put('/:id', apenasAdmin, async (req, res) => {
  const { nome, descricao, categoria, valor, duracao_estimada } = req.body;
  try {
    const servico = await prisma.servico.update({
      where: { id: req.params.id, empresa_id: req.empresaId },
      data: { nome, descricao, categoria, valor: Number(valor || 0), duracao_estimada: Number(duracao_estimada || 0) || null },
    });
    res.json(servico);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ erro: 'Serviço não encontrado.' });
    res.status(500).json({ erro: 'Erro ao atualizar serviço.' });
  }
});

router.delete('/:id', apenasAdmin, async (req, res) => {
  try {
    await prisma.servico.update({ where: { id: req.params.id, empresa_id: req.empresaId }, data: { ativo: false } });
    res.json({ mensagem: 'Serviço desativado.' });
  } catch (e) { res.status(500).json({ erro: 'Erro ao desativar serviço.' }); }
});

module.exports = router;
