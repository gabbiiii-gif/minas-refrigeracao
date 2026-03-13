/**
 * FrostERP — Exemplos de Queries Prisma (referência)
 * Este arquivo é apenas documentação/referência, não é executado.
 */

const prisma = require('../src/config/database');
const bcrypt = require('bcryptjs');

// ══════════════════════════════════════════════════════════════════════════════
//  1. CRIAR EMPRESA + USUÁRIO ADMIN (transação atômica)
// ══════════════════════════════════════════════════════════════════════════════
async function criarEmpresa() {
  const resultado = await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({
      data: {
        nome: 'Nova Refrigeração LTDA',
        cnpj: '00.111.222/0001-33',
        email: 'contato@novarefrig.com.br',
        telefone: '(31) 3000-0000',
        plano: 'profissional',
        codigo: 'NOVA01',
        limite_usuarios: 10,
        cidade: 'Belo Horizonte',
        estado: 'MG',
      },
    });

    const admin = await tx.usuario.create({
      data: {
        empresa_id: empresa.id,
        nome: 'Administrador',
        email: 'admin@novarefrig.com.br',
        senha_hash: await bcrypt.hash('senha123', 12),
        nivel_acesso: 'admin',
      },
    });

    return { empresa, admin };
  });

  console.log('Empresa criada:', resultado.empresa.nome);
  console.log('Admin criado:', resultado.admin.email);
}

// ══════════════════════════════════════════════════════════════════════════════
//  2. CADASTRAR USUÁRIO DENTRO DE UMA EMPRESA
// ══════════════════════════════════════════════════════════════════════════════
async function cadastrarUsuario(empresaId) {
  // Verifica limite antes de criar
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  const total   = await prisma.usuario.count({ where: { empresa_id: empresaId, ativo: true } });

  if (total >= empresa.limite_usuarios) {
    throw new Error(`Limite de ${empresa.limite_usuarios} usuários atingido.`);
  }

  const usuario = await prisma.usuario.create({
    data: {
      empresa_id: empresaId,
      nome: 'João Operador',
      email: 'joao@novarefrig.com.br',
      senha_hash: await bcrypt.hash('senha123', 12),
      nivel_acesso: 'operador',
    },
  });

  return usuario;
}

// ══════════════════════════════════════════════════════════════════════════════
//  3. CADASTRAR CLIENTE (isolado por empresa_id)
// ══════════════════════════════════════════════════════════════════════════════
async function cadastrarCliente(empresaId) {
  const cliente = await prisma.cliente.create({
    data: {
      empresa_id: empresaId,        // ← OBRIGATÓRIO: garante multi-tenancy
      nome: 'Mercado Central',
      telefone: '(31) 99000-1111',
      whatsapp: '(31) 99000-1111',
      email: 'mercado@central.com.br',
      cidade: 'Belo Horizonte',
      estado: 'MG',
    },
  });

  return cliente;
}

// ══════════════════════════════════════════════════════════════════════════════
//  4. BUSCAR DADOS POR EMPRESA_ID (isolamento multi-tenant)
// ══════════════════════════════════════════════════════════════════════════════
async function buscarDadosPorEmpresa(empresaId) {
  // Clientes da empresa
  const clientes = await prisma.cliente.findMany({
    where: { empresa_id: empresaId, status: 'ativo' },
    orderBy: { nome: 'asc' },
  });

  // Ordens de serviço abertas da empresa
  const ordensAbertas = await prisma.ordemServico.findMany({
    where: {
      empresa_id: empresaId,
      status: { in: ['agendado', 'em_andamento'] },
    },
    include: {
      cliente: { select: { nome: true, whatsapp: true } },
      tecnico: { select: { nome: true } },
    },
    orderBy: { data_agendamento: 'asc' },
  });

  // Resumo financeiro do mês
  const hoje      = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const faturamento = await prisma.contaReceber.aggregate({
    where: {
      empresa_id: empresaId,
      status: 'recebido',
      data_recebimento: { gte: inicioMes, lte: fimMes },
    },
    _sum: { valor: true },
  });

  // Dashboard completo
  const [totalClientes, totalOS, estoqueBaixo] = await Promise.all([
    prisma.cliente.count({ where: { empresa_id: empresaId, status: 'ativo' } }),
    prisma.ordemServico.count({ where: { empresa_id: empresaId, status: 'concluido' } }),
    prisma.estoque.findMany({
      where: { empresa_id: empresaId },
      include: { produto: { select: { nome: true, estoque_minimo: true } } },
    }).then(estoques => estoques.filter(e => e.quantidade <= e.produto.estoque_minimo)),
  ]);

  return {
    clientes,
    ordensAbertas,
    faturamentoMes: Number(faturamento._sum.valor || 0),
    totalClientes,
    totalOS,
    alertasEstoque: estoqueBaixo.length,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  5. CRIAR ORDEM DE SERVIÇO + CONTA A RECEBER (automaticamente)
// ══════════════════════════════════════════════════════════════════════════════
async function criarOSComContaReceber(empresaId, dados) {
  return prisma.$transaction(async (tx) => {
    // Número sequencial da OS
    const ultima = await tx.ordemServico.findFirst({
      where: { empresa_id: empresaId },
      orderBy: { numero_os: 'desc' },
    });
    const numero_os = (ultima?.numero_os || 0) + 1;

    const os = await tx.ordemServico.create({
      data: {
        empresa_id: empresaId,
        numero_os,
        cliente_id: dados.clienteId,
        servico_id: dados.servicoId,
        tecnico_id: dados.tecnicoId,
        tipo: dados.tipo,
        data_agendamento: new Date(dados.dataAgendamento),
        valor: dados.valor,
        valor_total: dados.valor,
        status: 'agendado',
      },
    });

    // Cria conta a receber automaticamente
    await tx.contaReceber.create({
      data: {
        empresa_id: empresaId,
        cliente_id: dados.clienteId,
        ordem_servico_id: os.id,
        descricao: `OS #${String(numero_os).padStart(4,'0')} — ${dados.tipo}`,
        valor: dados.valor,
        data_vencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
        status: 'pendente',
        categoria: 'Serviço',
      },
    });

    return os;
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  6. RELATÓRIO FINANCEIRO POR PERÍODO
// ══════════════════════════════════════════════════════════════════════════════
async function relatorioFinanceiro(empresaId, dataInicio, dataFim) {
  const [entradas, saidas, movimentacoes] = await Promise.all([
    prisma.contaReceber.aggregate({
      where: { empresa_id: empresaId, status: 'recebido',
               data_recebimento: { gte: new Date(dataInicio), lte: new Date(dataFim) } },
      _sum: { valor: true }, _count: true,
    }),
    prisma.contaPagar.aggregate({
      where: { empresa_id: empresaId, status: 'pago',
               data_pagamento: { gte: new Date(dataInicio), lte: new Date(dataFim) } },
      _sum: { valor: true }, _count: true,
    }),
    prisma.movimentacaoFinanceira.groupBy({
      by: ['tipo', 'categoria'],
      where: { empresa_id: empresaId,
               data: { gte: new Date(dataInicio), lte: new Date(dataFim) } },
      _sum: { valor: true },
    }),
  ]);

  const totalEntradas = Number(entradas._sum.valor || 0);
  const totalSaidas   = Number(saidas._sum.valor || 0);

  return {
    periodo: { inicio: dataInicio, fim: dataFim },
    entradas: totalEntradas,
    saidas: totalSaidas,
    lucro: totalEntradas - totalSaidas,
    por_categoria: movimentacoes,
  };
}

module.exports = {
  criarEmpresa,
  cadastrarUsuario,
  cadastrarCliente,
  buscarDadosPorEmpresa,
  criarOSComContaReceber,
  relatorioFinanceiro,
};
