# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Regra obrigatória — Commit e Push automático

**Após TODA edição de código neste projeto**, você deve obrigatoriamente:

1. Fazer `git add` nos arquivos modificados
2. Criar um commit com mensagem descritiva seguindo o padrão:
   - `feat:` para novas funcionalidades
   - `fix:` para correções de bugs
   - `style:` para mudanças visuais/CSS
   - `refactor:` para refatorações sem mudança de comportamento
3. Fazer `git push origin main`

O repositório remoto é: **https://github.com/gabbiiii-gif/minas-refrigeracao**
O deploy no Vercel é automático a cada push na branch `main`.

Nunca deixe mudanças sem commitar e pushar ao final de uma sessão de edição.

## Repositório de referência — anime.js

O código-fonte do **anime.js** está disponível localmente em `referencias/anime/src/` para uso como inspiração de animações.

Estrutura relevante do anime.js:
- `src/easings/` — curvas de easing (spring, cubic-bezier, steps, irregular, linear)
- `src/timeline/` — encadeamento e sincronização de animações
- `src/core/` — motor de renderização, helpers, cores, transforms
- `src/draggable/` — animações com arraste
- `src/svg/` — animações SVG, morphing e motion path
- `src/text/split.js` — animações de texto por letras/palavras
- `src/utils/stagger.js` — lógica de stagger entre elementos
- `dist/` — build final (anime.esm.js, anime.iife.js)

Ao implementar animações no projeto, consulte os padrões do anime.js antes de escrever código. O projeto usa **GSAP** — o anime.js é referência de padrões de API e lógica, não uma dependência adicional.

## Commands

```bash
npm install        # instala dependências
npm run dev        # inicia o servidor de desenvolvimento (HMR)
npm run build      # build de produção em /dist
npm run preview    # serve o build de produção localmente
npm run lint       # ESLint em todos os arquivos .js/.jsx
```

Não há testes automatizados configurados neste projeto.

## Arquitetura

### Estrutura atual

Todo o código da aplicação vive em um único arquivo: **`src/App.jsx`** (~1560 linhas). Não há rotas, não há contexto global — o estado é gerenciado no componente raiz `App` e passado via props para os componentes filhos.

```
src/
  App.jsx          ← TODA a lógica: estado, componentes, CSS, serviços
  main.jsx         ← Ponto de entrada React
  services/
    relatorioService.js   ← Arquivo vazio (implementação está inlinada em App.jsx)
    whatsappService.js    ← Arquivo vazio (implementação está inlinada em App.jsx)
```

### Persistência de dados

Não há backend nem banco de dados. **Todos os dados são salvos em `localStorage`** via o hook `useStorage` (definido em App.jsx). As chaves usadas são:

| Chave               | Dados                        |
|---------------------|------------------------------|
| `minas_clientes`    | Array de clientes            |
| `minas_equipamentos`| Array de equipamentos        |
| `minas_servicos`    | Array de ordens de serviço   |
| `minas_precos`      | Tabela de preços             |
| `minas_empresa`     | Dados da empresa             |
| `minas_api`         | Credenciais Z-API WhatsApp   |
| `minas_tecnicos`    | Lista de técnicos            |
| `minas_autos`       | Estado das automações        |

Se o `localStorage` estiver vazio, os dados são inicializados com as constantes `INIT_CLIENTES`, `INIT_EQUIPS`, `INIT_SERVICOS` e `INIT_PRECOS` definidas no topo do `App.jsx`.

### IDs

IDs são gerados com `newId()` = `Date.now() + Math.random()`, resultando em números float. Ao comparar IDs, use conversão numérica (`Number(id)`) — o código já faz isso em vários pontos ao salvar formulários.

### Roteamento

Não há `react-router`. A navegação é controlada pelo estado `page` (string) no componente `App`. A função `renderPage()` faz o switch entre os 9 módulos. Para adicionar uma nova página: criar o componente, adicionar uma entrada em `NAV` e um `case` em `renderPage`.

### CSS

Todo o CSS da aplicação está definido como template string na constante `css` dentro de `App.jsx` e injetado via `<style>{css}</style>`. Não há CSS Modules nem arquivos `.css` ativos. O design usa variáveis CSS (`--bg`, `--blue`, `--card`, etc.) definidas em `:root`.

### Integração WhatsApp (Z-API)

`sendWhatsAppMessage` e `checkInstanceStatus` estão inlinadas em `App.jsx` (não nos arquivos de serviço). As credenciais (Instance ID, Token, Client-Token) ficam no `localStorage` sob `minas_api`. O número de telefone é normalizado para o formato `55XXXXXXXXXXX` antes do envio.

### Geração de relatórios

`gerarRelatorioPDF` e `gerarRelatorioExcel` usam **imports dinâmicos** (`await import("jspdf")`, `await import("xlsx")`) para não quebrar se as libs não estiverem instaladas. As dependências `jspdf`, `jspdf-autotable` e `xlsx` estão listadas no `package.json` e devem estar instaladas.

### Animações

GSAP é usado para:
- Transição de entrada de páginas (`usePageTransition` hook — anima `.stat-card`, `.card`, `.wa-send-card`, `.price-item`)
- Animação de abertura da sidebar no mobile
- Animação do card de login

### ESLint

A regra `no-unused-vars` ignora variáveis que começam com letra maiúscula ou underscore (`varsIgnorePattern: '^[A-Z_]'`). Constantes como `INIT_CLIENTES` e componentes não usados diretamente não geram erro.
