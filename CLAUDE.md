# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ REGRA ABSOLUTA — Deploy automático após TODA mudança

**Após QUALQUER edição de código neste projeto**, sem exceção, você deve:

1. `git add` nos arquivos modificados
2. `git commit` com mensagem descritiva seguindo o padrão:
   - `feat:` para novas funcionalidades
   - `fix:` para correções de bugs
   - `style:` para mudanças visuais/CSS
   - `refactor:` para refatorações sem mudança de comportamento
3. `git push origin main`

**Repositório:** https://github.com/gabbiiii-gif/minas-refrigeracao
**Branch:** `main` (sempre — nunca usar master)
**Deploy:** Vercel — automático a cada push na branch `main`

> Nunca deixe mudanças sem commitar e pushar. Cada edição = 1 commit + 1 push.

## Commands

```bash
# Frontend
npm install        # instala dependências
npm run dev        # inicia o servidor de desenvolvimento (HMR) → porta 5173
npm run build      # build de produção em /dist
npm run preview    # serve o build de produção localmente
npm run lint       # ESLint em todos os arquivos .js/.jsx

# WhatsApp Server (local)
cd server && node index.js   # porta 3001

# Backend API + PostgreSQL
cd backend && npm run dev    # porta 4000
cd backend && npm run db:migrate   # cria/atualiza tabelas
cd backend && npm run db:seed      # popula dados iniciais
cd backend && npm run db:studio    # Prisma Studio (GUI do banco)
```

## Estrutura do projeto

```
minas-refrigeracao/
├── src/
│   └── App.jsx          ← Frontend React — TODA a lógica do frontend
├── server/
│   └── index.js         ← Servidor WhatsApp Web.js (porta 3001)
├── backend/
│   ├── src/app.js       ← API REST Express (porta 4000)
│   ├── prisma/
│   │   ├── schema.prisma  ← Schema PostgreSQL (13 tabelas)
│   │   └── seed.js        ← Dados iniciais
│   └── .env             ← DATABASE_URL, JWT_SECRET (não commitar)
└── referencias/         ← Repos clonados para referência
```

## Arquitetura Frontend (App.jsx)

Todo o código da aplicação vive em **`src/App.jsx`**. Não há rotas, não há contexto global — o estado é gerenciado no componente raiz `App` e passado via props.

### Persistência de dados (localStorage)

| Chave               | Dados                                    |
|---------------------|------------------------------------------|
| `frost_empresas`    | Array de empresas (INIT_EMPRESAS)        |
| `frost_usuarios`    | Array de usuários (INIT_USUARIOS)        |
| `minas_clientes`    | Array de clientes                        |
| `minas_equipamentos`| Array de equipamentos                    |
| `minas_servicos`    | Array de ordens de serviço               |
| `minas_precos`      | Tabela de preços                         |
| `minas_empresa`     | Dados da empresa                         |
| `minas_api`         | Config WhatsApp Web.js (serverUrl)       |
| `minas_tecnicos`    | Lista de técnicos                        |
| `minas_autos`       | Estado das automações                    |

### IDs

IDs gerados com `newId()` = `Date.now() + Math.random()` → números float.
**SEMPRE usar `Number(id)` ao comparar IDs** (nunca `===` direto sem conversão).

### Roteamento

Sem `react-router`. Navegação controlada pelo estado `page` (string).
`renderPage()` faz o switch entre os módulos.

### CSS

Todo CSS está na constante `css` dentro de `App.jsx` como template string,
injetado via `<style>{css}</style>`. Variáveis CSS: `--bg`, `--blue`, `--card`, etc.

### WhatsApp (substituiu Z-API)

`sendWhatsAppMessage(phone, message, serverUrl)` e `checkInstanceStatus(serverUrl)`
chamam o servidor local `http://localhost:3001` (whatsapp-web.js).
Config salva em `minas_api.serverUrl`.

## Arquitetura Backend (PostgreSQL + Prisma)

### Tabelas principais

`empresas` → `usuarios`, `clientes`, `fornecedores`, `produtos`, `servicos`,
`ordens_servico`, `estoque`, `contas_pagar`, `contas_receber`, `movimentacoes_financeiras`

### Multi-tenant

**Toda query DEVE incluir `where: { empresa_id: req.empresaId }`**.
`req.empresaId` é injetado pelo middleware `autenticar` via JWT.

### Níveis de acesso

`super_admin` → pode tudo + gerenciar empresas
`admin`       → gerencia usuários e dados da própria empresa
`operador`    → cria OS, consulta clientes, registra atendimentos

### Credenciais de teste (seed)

| Usuário      | Email                       | Senha         | Código  |
|--------------|-----------------------------|---------------|---------|
| Super Admin  | super@frostera.com.br       | FrostERP@2024 | FROST00 |
| Admin        | admin@minasrefrig.com.br    | 123456        | MINAS01 |
| Operador     | carlos@minasrefrig.com.br   | 123456        | MINAS01 |
| Admin Gelo   | admin@gelofrio.com.br       | 123456        | GELO02  |

## Geração de relatórios

`gerarRelatorioPDF` e `gerarRelatorioExcel` usam imports dinâmicos.
Dependências: `jspdf`, `jspdf-autotable`, `xlsx`.

## Animações

GSAP para: transições de página, abertura sidebar mobile, card de login.

## ESLint

`no-unused-vars` ignora variáveis começando com maiúscula ou underscore.
