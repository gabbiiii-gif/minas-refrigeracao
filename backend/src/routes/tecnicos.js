/**
 * FrostERP — Rotas de Técnicos
 */

const router = require('express').Router();
const prisma = require('../config/database');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.use(autenticar);

router.get('/', async (req, res) => {
  try {
    const tecnicos = await prisma.tecnico.findMany({
      where: { empresa_id: req.empresaId, ativo: true },
      orderBy: { nome: 'asc' },
    });
    res.json(tecnicos);
  } catch (e) { res.status(500).json({ erro: 'Erro ao listar técnicos.' }); }
});

router.post('/', apenasAdmin, async (req, res) => {
  const { nome, telefone, email } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  try {
    const tecnico = await prisma.tecnico.create({
      data: { empresa_id: req.empresaId, nome, telefone, email },
    });
    res.status(201).json(tecnico);
  } catch (e) { res.status(500).json({ erro: 'Erro ao criar técnico.' }); }
});

router.delete('/:id', apenasAdmin, async (req, res) => {
  try {
    await prisma.tecnico.update({ where: { id: req.params.id, empresa_id: req.empresaId }, data: { ativo: false } });
    res.json({ mensagem: 'Técnico removido.' });
  } catch (e) { res.status(500).json({ erro: 'Erro ao remover técnico.' }); }
});

module.exports = router;
