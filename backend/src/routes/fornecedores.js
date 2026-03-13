/**
 * FrostERP — Rotas de Fornecedores
 */

const router = require('express').Router();
const prisma = require('../config/database');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.use(autenticar);

router.get('/', async (req, res) => {
  try {
    const fornecedores = await prisma.fornecedor.findMany({
      where: { empresa_id: req.empresaId, ativo: true },
      orderBy: { nome: 'asc' },
    });
    res.json(fornecedores);
  } catch (e) { res.status(500).json({ erro: 'Erro ao listar fornecedores.' }); }
});

router.post('/', apenasAdmin, async (req, res) => {
  const { nome, cnpj_cpf, email, telefone, contato, endereco, cidade, estado, cep, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  try {
    const fornecedor = await prisma.fornecedor.create({
      data: { empresa_id: req.empresaId, nome, cnpj_cpf, email, telefone, contato, endereco, cidade, estado, cep, observacoes },
    });
    res.status(201).json(fornecedor);
  } catch (e) { res.status(500).json({ erro: 'Erro ao criar fornecedor.' }); }
});

router.put('/:id', apenasAdmin, async (req, res) => {
  try {
    const fornecedor = await prisma.fornecedor.update({
      where: { id: req.params.id, empresa_id: req.empresaId },
      data: req.body,
    });
    res.json(fornecedor);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ erro: 'Fornecedor não encontrado.' });
    res.status(500).json({ erro: 'Erro ao atualizar fornecedor.' });
  }
});

router.delete('/:id', apenasAdmin, async (req, res) => {
  try {
    await prisma.fornecedor.update({ where: { id: req.params.id, empresa_id: req.empresaId }, data: { ativo: false } });
    res.json({ mensagem: 'Fornecedor desativado.' });
  } catch (e) { res.status(500).json({ erro: 'Erro ao desativar fornecedor.' }); }
});

module.exports = router;
