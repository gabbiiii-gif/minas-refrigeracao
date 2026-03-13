-- CreateEnum
CREATE TYPE "PlanoEmpresa" AS ENUM ('basico', 'profissional', 'enterprise');

-- CreateEnum
CREATE TYPE "StatusGeral" AS ENUM ('ativo', 'inativo', 'suspenso');

-- CreateEnum
CREATE TYPE "NivelAcesso" AS ENUM ('super_admin', 'admin', 'operador');

-- CreateEnum
CREATE TYPE "StatusOS" AS ENUM ('agendado', 'em_andamento', 'concluido', 'cancelado');

-- CreateEnum
CREATE TYPE "StatusFinanceiro" AS ENUM ('pendente', 'pago', 'vencido', 'cancelado', 'recebido');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('entrada', 'saida');

-- CreateEnum
CREATE TYPE "TipoMovEstoque" AS ENUM ('entrada', 'saida', 'ajuste');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "plano" "PlanoEmpresa" NOT NULL DEFAULT 'basico',
    "status" "StatusGeral" NOT NULL DEFAULT 'ativo',
    "codigo" TEXT NOT NULL,
    "limite_usuarios" INTEGER NOT NULL DEFAULT 5,
    "logo_url" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "nivel_acesso" "NivelAcesso" NOT NULL DEFAULT 'operador',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acesso" TIMESTAMP(3),
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tecnicos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tecnicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf_cnpj" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "observacoes" TEXT,
    "status" "StatusGeral" NOT NULL DEFAULT 'ativo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipamentos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "numero_serie" TEXT,
    "potencia" TEXT,
    "data_instalacao" TIMESTAMP(3),
    "ultima_manutencao" TIMESTAMP(3),
    "status" "StatusGeral" NOT NULL DEFAULT 'ativo',
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj_cpf" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "contato" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "preco_custo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "preco_venda" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estoque_minimo" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT,
    "valor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "duracao_estimada" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "numero_os" INTEGER NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "equipamento_id" TEXT,
    "servico_id" TEXT,
    "tecnico_id" TEXT,
    "usuario_id" TEXT,
    "status" "StatusOS" NOT NULL DEFAULT 'agendado',
    "tipo" TEXT NOT NULL DEFAULT 'Manutenção Preventiva',
    "data_agendamento" TIMESTAMP(3),
    "data_inicio" TIMESTAMP(3),
    "data_conclusao" TIMESTAMP(3),
    "valor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "laudo_tecnico" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_ordem_servico" (
    "id" TEXT NOT NULL,
    "ordem_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "preco_unit" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "itens_ordem_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estoque" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "local" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "tipo" "TipoMovEstoque" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "fornecedor_id" TEXT,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "data_pagamento" TIMESTAMP(3),
    "status" "StatusFinanceiro" NOT NULL DEFAULT 'pendente',
    "comprovante_url" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_receber" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "ordem_servico_id" TEXT,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "data_recebimento" TIMESTAMP(3),
    "status" "StatusFinanceiro" NOT NULL DEFAULT 'pendente',
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_financeiras" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "categoria" TEXT,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conta_pagar_id" TEXT,
    "conta_receber_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_financeiras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_email_key" ON "empresas"("email");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_codigo_key" ON "empresas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_empresa_id_email_key" ON "usuarios"("empresa_id", "email");

-- CreateIndex
CREATE INDEX "clientes_empresa_id_idx" ON "clientes"("empresa_id");

-- CreateIndex
CREATE INDEX "equipamentos_empresa_id_idx" ON "equipamentos"("empresa_id");

-- CreateIndex
CREATE INDEX "equipamentos_cliente_id_idx" ON "equipamentos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_empresa_id_codigo_key" ON "produtos"("empresa_id", "codigo");

-- CreateIndex
CREATE INDEX "ordens_servico_empresa_id_idx" ON "ordens_servico"("empresa_id");

-- CreateIndex
CREATE INDEX "ordens_servico_empresa_id_status_idx" ON "ordens_servico"("empresa_id", "status");

-- CreateIndex
CREATE INDEX "ordens_servico_cliente_id_idx" ON "ordens_servico"("cliente_id");

-- CreateIndex
CREATE INDEX "ordens_servico_tecnico_id_idx" ON "ordens_servico"("tecnico_id");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_empresa_id_numero_os_key" ON "ordens_servico"("empresa_id", "numero_os");

-- CreateIndex
CREATE UNIQUE INDEX "estoque_produto_id_key" ON "estoque"("produto_id");

-- CreateIndex
CREATE INDEX "contas_pagar_empresa_id_idx" ON "contas_pagar"("empresa_id");

-- CreateIndex
CREATE INDEX "contas_pagar_empresa_id_status_idx" ON "contas_pagar"("empresa_id", "status");

-- CreateIndex
CREATE INDEX "contas_pagar_data_vencimento_idx" ON "contas_pagar"("data_vencimento");

-- CreateIndex
CREATE INDEX "contas_receber_empresa_id_idx" ON "contas_receber"("empresa_id");

-- CreateIndex
CREATE INDEX "contas_receber_empresa_id_status_idx" ON "contas_receber"("empresa_id", "status");

-- CreateIndex
CREATE INDEX "contas_receber_data_vencimento_idx" ON "contas_receber"("data_vencimento");

-- CreateIndex
CREATE INDEX "movimentacoes_financeiras_empresa_id_idx" ON "movimentacoes_financeiras"("empresa_id");

-- CreateIndex
CREATE INDEX "movimentacoes_financeiras_empresa_id_tipo_idx" ON "movimentacoes_financeiras"("empresa_id", "tipo");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tecnicos" ADD CONSTRAINT "tecnicos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_ordem_servico" ADD CONSTRAINT "itens_ordem_servico_ordem_id_fkey" FOREIGN KEY ("ordem_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_ordem_servico" ADD CONSTRAINT "itens_ordem_servico_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque" ADD CONSTRAINT "estoque_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque" ADD CONSTRAINT "estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_financeiras" ADD CONSTRAINT "movimentacoes_financeiras_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_financeiras" ADD CONSTRAINT "movimentacoes_financeiras_conta_pagar_id_fkey" FOREIGN KEY ("conta_pagar_id") REFERENCES "contas_pagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_financeiras" ADD CONSTRAINT "movimentacoes_financeiras_conta_receber_id_fkey" FOREIGN KEY ("conta_receber_id") REFERENCES "contas_receber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
