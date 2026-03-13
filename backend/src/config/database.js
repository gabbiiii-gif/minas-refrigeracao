/**
 * FrostERP — Configuração Prisma Client (singleton)
 * Reutiliza a mesma instância em todo o app (evita sobrecarga de conexões)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Garante desconexão limpa ao encerrar o processo
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
