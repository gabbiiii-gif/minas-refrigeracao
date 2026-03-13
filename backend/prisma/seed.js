/**
 * ═══════════════════════════════════════════════════════
 *  FrostERP — Seed inicial do banco de dados
 *  Executa: cd backend && npm run db:seed
 * ═══════════════════════════════════════════════════════
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados FrostERP...\n');

  // ─── Limpa banco na ordem correta (respeitando FKs) ───────────────────────
  await prisma.movimentacaoFinanceira.deleteMany();
  await prisma.contaReceber.deleteMany();
  await prisma.contaPagar.deleteMany();
  await prisma.movimentacaoEstoque.deleteMany();
  await prisma.estoque.deleteMany();
  await prisma.itemOrdemServico.deleteMany();
  await prisma.ordemServico.deleteMany();
  await prisma.equipamento.deleteMany();
  await prisma.servico.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.fornecedor.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.tecnico.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.empresa.deleteMany();

  // ═══════════════════════════════════════════════════════════════════════════
  //  EMPRESA 1 — Minas Refrigeração (empresa principal de demo)
  // ═══════════════════════════════════════════════════════════════════════════
  const minas = await prisma.empresa.create({
    data: {
      nome: 'Minas Refrigeração',
      cnpj: '12.345.678/0001-90',
      email: 'contato@minasrefrig.com.br',
      telefone: '(31) 3333-4444',
      plano: 'profissional',
      status: 'ativo',
      codigo: 'MINAS01',
      limite_usuarios: 10,
      cidade: 'Belo Horizonte',
      estado: 'MG',
      cep: '30130-010',
    },
  });
  console.log(`✅ Empresa criada: ${minas.nome} [${minas.codigo}]`);

  // ─── Usuários da Minas Refrigeração ───────────────────────────────────────
  const senhaHash = await bcrypt.hash('123456', 12);

  const adminMinas = await prisma.usuario.create({
    data: {
      empresa_id: minas.id,
      nome: 'Administrador',
      email: 'admin@minasrefrig.com.br',
      senha_hash: senhaHash,
      nivel_acesso: 'admin',
      ativo: true,
    },
  });

  const operadorMinas = await prisma.usuario.create({
    data: {
      empresa_id: minas.id,
      nome: 'Carlos Silva',
      email: 'carlos@minasrefrig.com.br',
      senha_hash: senhaHash,
      nivel_acesso: 'operador',
      ativo: true,
    },
  });
  console.log(`   👤 Admin: ${adminMinas.email} / Operador: ${operadorMinas.email}`);

  // ─── Técnicos ─────────────────────────────────────────────────────────────
  const [tec1, tec2, tec3] = await Promise.all([
    prisma.tecnico.create({ data: { empresa_id: minas.id, nome: 'Carlos Silva', telefone: '(31) 99901-1111' } }),
    prisma.tecnico.create({ data: { empresa_id: minas.id, nome: 'André Souza', telefone: '(31) 99902-2222' } }),
    prisma.tecnico.create({ data: { empresa_id: minas.id, nome: 'Pedro Lima', telefone: '(31) 99903-3333' } }),
  ]);
  console.log(`   🔧 Técnicos: ${[tec1, tec2, tec3].map(t => t.nome).join(', ')}`);

  // ─── Clientes ─────────────────────────────────────────────────────────────
  const clientesMinas = await Promise.all([
    prisma.cliente.create({
      data: {
        empresa_id: minas.id,
        nome: 'Supermercado Belo Horizonte',
        cpf_cnpj: '11.222.333/0001-44',
        email: 'contato@superbh.com.br',
        telefone: '(31) 99201-3344',
        whatsapp: '(31) 99201-3344',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        status: 'ativo',
      },
    }),
    prisma.cliente.create({
      data: {
        empresa_id: minas.id,
        nome: 'Restaurante Sabor Mineiro',
        telefone: '(31) 98877-5566',
        whatsapp: '(31) 98877-5566',
        cidade: 'Contagem',
        estado: 'MG',
        status: 'ativo',
      },
    }),
    prisma.cliente.create({
      data: {
        empresa_id: minas.id,
        nome: 'Hotel Montanha',
        cpf_cnpj: '44.555.666/0001-77',
        email: 'manut@hotelmontanha.com.br',
        telefone: '(31) 3456-7890',
        whatsapp: '(31) 99345-6789',
        cidade: 'Nova Lima',
        estado: 'MG',
        status: 'ativo',
      },
    }),
    prisma.cliente.create({
      data: {
        empresa_id: minas.id,
        nome: 'Padaria Central',
        telefone: '(31) 97788-1122',
        whatsapp: '(31) 97788-1122',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        status: 'ativo',
      },
    }),
    prisma.cliente.create({
      data: {
        empresa_id: minas.id,
        nome: 'Clínica Santa Saúde',
        cpf_cnpj: '77.888.999/0001-00',
        email: 'infra@clinicasaude.com.br',
        telefone: '(31) 3201-5678',
        whatsapp: '(31) 99001-5678',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        status: 'ativo',
      },
    }),
  ]);
  console.log(`   👥 ${clientesMinas.length} clientes criados`);

  // ─── Fornecedores ─────────────────────────────────────────────────────────
  const [forn1, forn2] = await Promise.all([
    prisma.fornecedor.create({
      data: {
        empresa_id: minas.id,
        nome: 'Distribuidora Frio Total',
        cnpj_cpf: '55.666.777/0001-88',
        email: 'vendas@friototal.com.br',
        telefone: '(31) 3333-5555',
        cidade: 'Belo Horizonte',
        estado: 'MG',
      },
    }),
    prisma.fornecedor.create({
      data: {
        empresa_id: minas.id,
        nome: 'Peças & Refrigeração LTDA',
        cnpj_cpf: '99.000.111/0001-22',
        email: 'contato@pecasrefrig.com.br',
        telefone: '(31) 3444-6666',
        cidade: 'Contagem',
        estado: 'MG',
      },
    }),
  ]);
  console.log(`   🏭 ${2} fornecedores criados`);

  // ─── Produtos ─────────────────────────────────────────────────────────────
  const produtosMinas = await Promise.all([
    prisma.produto.create({ data: { empresa_id: minas.id, codigo: 'GAS-R22', nome: 'Gás Refrigerante R22', categoria: 'Gás', unidade: 'kg', preco_custo: 85.00, preco_venda: 160.00, estoque_minimo: 5 } }),
    prisma.produto.create({ data: { empresa_id: minas.id, codigo: 'GAS-R410', nome: 'Gás Refrigerante R410A', categoria: 'Gás', unidade: 'kg', preco_custo: 75.00, preco_venda: 140.00, estoque_minimo: 5 } }),
    prisma.produto.create({ data: { empresa_id: minas.id, codigo: 'FILTRO-AR', nome: 'Filtro de Ar Split', categoria: 'Filtro', unidade: 'un', preco_custo: 12.00, preco_venda: 25.00, estoque_minimo: 10 } }),
    prisma.produto.create({ data: { empresa_id: minas.id, codigo: 'COND-CAP', nome: 'Capacitor de Condensador', categoria: 'Elétrico', unidade: 'un', preco_custo: 18.00, preco_venda: 45.00, estoque_minimo: 5 } }),
    prisma.produto.create({ data: { empresa_id: minas.id, codigo: 'COMP-1HP', nome: 'Compressor 1HP', categoria: 'Compressor', unidade: 'un', preco_custo: 380.00, preco_venda: 750.00, estoque_minimo: 2 } }),
  ]);
  console.log(`   📦 ${produtosMinas.length} produtos criados`);

  // ─── Estoques iniciais ────────────────────────────────────────────────────
  await Promise.all(
    produtosMinas.map((p, i) =>
      prisma.estoque.create({
        data: { empresa_id: minas.id, produto_id: p.id, quantidade: [20, 15, 50, 12, 4][i] },
      })
    )
  );
  console.log(`   📊 Estoque inicial configurado`);

  // ─── Serviços (tabela de preços) ──────────────────────────────────────────
  const servicosMinas = await Promise.all([
    prisma.servico.create({ data: { empresa_id: minas.id, nome: 'Limpeza e Higienização', descricao: 'Limpeza completa interna e externa do aparelho', categoria: 'Manutenção', valor: 180.00, duracao_estimada: 90 } }),
    prisma.servico.create({ data: { empresa_id: minas.id, nome: 'Manutenção Preventiva', descricao: 'Revisão completa de todos os componentes', categoria: 'Manutenção', valor: 280.00, duracao_estimada: 120 } }),
    prisma.servico.create({ data: { empresa_id: minas.id, nome: 'Recarga de Gás R22', descricao: 'Por kg de gás refrigerante', categoria: 'Gás', valor: 160.00, duracao_estimada: 60 } }),
    prisma.servico.create({ data: { empresa_id: minas.id, nome: 'Recarga de Gás R410A', descricao: 'Por kg de gás refrigerante', categoria: 'Gás', valor: 140.00, duracao_estimada: 60 } }),
    prisma.servico.create({ data: { empresa_id: minas.id, nome: 'Instalação Split até 24k BTU', descricao: 'Suporte, tubulação até 4m e ramal elétrico', categoria: 'Instalação', valor: 350.00, duracao_estimada: 180 } }),
    prisma.servico.create({ data: { empresa_id: minas.id, nome: 'Manutenção Câmara Fria', descricao: 'Revisão completa do sistema de refrigeração', categoria: 'Câmara Fria', valor: 450.00, duracao_estimada: 240 } }),
    prisma.servico.create({ data: { empresa_id: minas.id, nome: 'Manutenção Corretiva', descricao: 'Diagnóstico + reparo (peças à parte)', categoria: 'Manutenção', valor: 220.00, duracao_estimada: 90 } }),
    prisma.servico.create({ data: { empresa_id: minas.id, nome: 'Visita Técnica', descricao: 'Diagnóstico sem conserto incluso', categoria: 'Visita', valor: 80.00, duracao_estimada: 30 } }),
  ]);
  console.log(`   🛠  ${servicosMinas.length} serviços criados`);

  // ─── Equipamentos dos clientes ────────────────────────────────────────────
  const equip1 = await prisma.equipamento.create({
    data: {
      empresa_id: minas.id,
      cliente_id: clientesMinas[0].id,
      tipo: 'Split',
      marca: 'LG',
      modelo: 'Dual Inverter 18k BTU',
      numero_serie: 'LG202401001',
      potencia: '18000 BTU',
      data_instalacao: new Date('2023-01-15'),
      ultima_manutencao: new Date('2024-01-10'),
      status: 'ativo',
    },
  });
  const equip2 = await prisma.equipamento.create({
    data: {
      empresa_id: minas.id,
      cliente_id: clientesMinas[2].id,
      tipo: 'Câmara Fria',
      marca: 'Refrimate',
      potencia: '5 HP',
      data_instalacao: new Date('2022-06-01'),
      ultima_manutencao: new Date('2024-03-01'),
      status: 'ativo',
    },
  });
  console.log(`   🌡  2 equipamentos criados`);

  // ─── Ordens de Serviço ────────────────────────────────────────────────────
  const os1 = await prisma.ordemServico.create({
    data: {
      empresa_id: minas.id,
      numero_os: 1,
      cliente_id: clientesMinas[0].id,
      equipamento_id: equip1.id,
      servico_id: servicosMinas[1].id,
      tecnico_id: tec1.id,
      status: 'concluido',
      tipo: 'Manutenção Preventiva',
      data_agendamento: new Date('2024-01-10'),
      data_conclusao: new Date('2024-01-10'),
      valor: 280.00,
      valor_total: 280.00,
      observacoes: 'Serviço realizado sem intercorrências.',
    },
  });
  const os2 = await prisma.ordemServico.create({
    data: {
      empresa_id: minas.id,
      numero_os: 2,
      cliente_id: clientesMinas[1].id,
      servico_id: servicosMinas[0].id,
      tecnico_id: tec2.id,
      status: 'concluido',
      tipo: 'Limpeza e Higienização',
      data_agendamento: new Date('2024-02-15'),
      data_conclusao: new Date('2024-02-15'),
      valor: 180.00,
      valor_total: 180.00,
    },
  });
  const os3 = await prisma.ordemServico.create({
    data: {
      empresa_id: minas.id,
      numero_os: 3,
      cliente_id: clientesMinas[2].id,
      equipamento_id: equip2.id,
      servico_id: servicosMinas[5].id,
      tecnico_id: tec1.id,
      status: 'agendado',
      tipo: 'Manutenção Câmara Fria',
      data_agendamento: new Date('2024-03-20'),
      valor: 450.00,
      valor_total: 450.00,
    },
  });
  const os4 = await prisma.ordemServico.create({
    data: {
      empresa_id: minas.id,
      numero_os: 4,
      cliente_id: clientesMinas[3].id,
      servico_id: servicosMinas[6].id,
      tecnico_id: tec3.id,
      status: 'em_andamento',
      tipo: 'Manutenção Corretiva',
      data_agendamento: new Date('2024-03-18'),
      valor: 220.00,
      valor_total: 220.00,
    },
  });
  console.log(`   📋 4 ordens de serviço criadas`);

  // ─── Contas a Receber (geradas automaticamente das OS concluídas) ──────────
  await prisma.contaReceber.create({
    data: {
      empresa_id: minas.id,
      cliente_id: clientesMinas[0].id,
      ordem_servico_id: os1.id,
      descricao: `OS #001 — Manutenção Preventiva`,
      valor: 280.00,
      data_vencimento: new Date('2024-01-17'),
      data_recebimento: new Date('2024-01-17'),
      status: 'recebido',
      categoria: 'Serviço',
    },
  });
  await prisma.contaReceber.create({
    data: {
      empresa_id: minas.id,
      cliente_id: clientesMinas[1].id,
      ordem_servico_id: os2.id,
      descricao: `OS #002 — Limpeza e Higienização`,
      valor: 180.00,
      data_vencimento: new Date('2024-02-22'),
      data_recebimento: new Date('2024-02-20'),
      status: 'recebido',
      categoria: 'Serviço',
    },
  });
  await prisma.contaReceber.create({
    data: {
      empresa_id: minas.id,
      cliente_id: clientesMinas[2].id,
      ordem_servico_id: os3.id,
      descricao: `OS #003 — Manutenção Câmara Fria`,
      valor: 450.00,
      data_vencimento: new Date('2024-03-30'),
      status: 'pendente',
      categoria: 'Serviço',
    },
  });
  await prisma.contaReceber.create({
    data: {
      empresa_id: minas.id,
      cliente_id: clientesMinas[3].id,
      ordem_servico_id: os4.id,
      descricao: `OS #004 — Manutenção Corretiva`,
      valor: 220.00,
      data_vencimento: new Date('2024-03-25'),
      status: 'pendente',
      categoria: 'Serviço',
    },
  });
  console.log(`   💰 Contas a receber geradas`);

  // ─── Contas a Pagar ───────────────────────────────────────────────────────
  await Promise.all([
    prisma.contaPagar.create({
      data: {
        empresa_id: minas.id,
        fornecedor_id: forn1.id,
        descricao: 'Compra de gás refrigerante R410A — 10kg',
        categoria: 'Estoque',
        valor: 750.00,
        data_vencimento: new Date('2024-03-30'),
        status: 'pendente',
      },
    }),
    prisma.contaPagar.create({
      data: {
        empresa_id: minas.id,
        descricao: 'Aluguel do galpão — março/2024',
        categoria: 'Aluguel',
        valor: 2500.00,
        data_vencimento: new Date('2024-03-10'),
        data_pagamento: new Date('2024-03-08'),
        status: 'pago',
      },
    }),
    prisma.contaPagar.create({
      data: {
        empresa_id: minas.id,
        fornecedor_id: forn2.id,
        descricao: 'Peças diversas — capacitores e filtros',
        categoria: 'Estoque',
        valor: 380.00,
        data_vencimento: new Date('2024-04-05'),
        status: 'pendente',
      },
    }),
  ]);
  console.log(`   📄 Contas a pagar criadas`);

  // ─── Movimentações financeiras ────────────────────────────────────────────
  await Promise.all([
    prisma.movimentacaoFinanceira.create({
      data: {
        empresa_id: minas.id,
        tipo: 'entrada',
        categoria: 'Serviço',
        descricao: 'Recebimento OS #001',
        valor: 280.00,
        data: new Date('2024-01-17'),
      },
    }),
    prisma.movimentacaoFinanceira.create({
      data: {
        empresa_id: minas.id,
        tipo: 'entrada',
        categoria: 'Serviço',
        descricao: 'Recebimento OS #002',
        valor: 180.00,
        data: new Date('2024-02-20'),
      },
    }),
    prisma.movimentacaoFinanceira.create({
      data: {
        empresa_id: minas.id,
        tipo: 'saida',
        categoria: 'Aluguel',
        descricao: 'Aluguel do galpão — março/2024',
        valor: 2500.00,
        data: new Date('2024-03-08'),
      },
    }),
  ]);
  console.log(`   📈 Movimentações financeiras registradas`);

  // ═══════════════════════════════════════════════════════════════════════════
  //  EMPRESA 2 — Gelo & Frio LTDA (segunda empresa de demo)
  // ═══════════════════════════════════════════════════════════════════════════
  const gelo = await prisma.empresa.create({
    data: {
      nome: 'Gelo & Frio LTDA',
      cnpj: '98.765.432/0001-10',
      email: 'contato@gelofrio.com.br',
      telefone: '(11) 4444-5555',
      plano: 'basico',
      status: 'ativo',
      codigo: 'GELO02',
      limite_usuarios: 5,
      cidade: 'São Paulo',
      estado: 'SP',
    },
  });
  console.log(`\n✅ Empresa criada: ${gelo.nome} [${gelo.codigo}]`);

  await prisma.usuario.create({
    data: {
      empresa_id: gelo.id,
      nome: 'Admin Gelo & Frio',
      email: 'admin@gelofrio.com.br',
      senha_hash: senhaHash,
      nivel_acesso: 'admin',
      ativo: true,
    },
  });
  console.log(`   👤 Admin: admin@gelofrio.com.br`);

  // ─── Super Admin (acesso global — não pertence a uma empresa específica) ───
  // Nota: o super_admin tem empresa_id de uma empresa "sistema"
  const sistema = await prisma.empresa.create({
    data: {
      nome: 'FrostERP Sistema',
      cnpj: '00.000.000/0001-00',
      email: 'sistema@frostera.com.br',
      codigo: 'FROST00',
      plano: 'enterprise',
      status: 'ativo',
    },
  });

  await prisma.usuario.create({
    data: {
      empresa_id: sistema.id,
      nome: 'Super Administrador',
      email: 'super@frostera.com.br',
      senha_hash: await bcrypt.hash('FrostERP@2024', 12),
      nivel_acesso: 'super_admin',
      ativo: true,
    },
  });
  console.log(`\n✅ Super Admin criado: super@frostera.com.br / FrostERP@2024`);

  // ─── Resumo final ─────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ Seed concluído com sucesso!\n');
  console.log('📋 Credenciais de acesso:');
  console.log('   Super Admin → super@frostera.com.br / FrostERP@2024 [FROST00]');
  console.log('   Admin Minas → admin@minasrefrig.com.br / 123456 [MINAS01]');
  console.log('   Operador    → carlos@minasrefrig.com.br / 123456 [MINAS01]');
  console.log('   Admin Gelo  → admin@gelofrio.com.br / 123456 [GELO02]');
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('❌ Erro no seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
