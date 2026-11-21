# Auditoria do site do AgendOn

Etapa 8 de 9 (2026-11-20). Página inicial (versão 2 evoluída) num **build de produção local** (`next build` + `next start`, porta 3100), com o banco local. Não é a produção nem o staging.

## Resumo

**Sem bloqueadores para publicar.** O fluxo principal funciona: os 5 botões de teste grátis levam a `/cadastro`, que responde e diz "30 dias grátis". Os achados confirmados foram corrigidos e medidos de novo. Ficam duas pendências de limpeza (`/versoes`) e uma questão antiga das páginas de salão inexistentes.

| Verificação | Resultado |
|---|---|
| `npm run lint`, `npm run typecheck` | sem erros |
| `npm test` (Vitest) | 22 arquivos, 289 testes passaram |
| `npm run build` | passou (inclui `/robots.txt`, `/sitemap.xml` e `/opengraph-image.png`) |
| axe-core 4 (WCAG 2.0/2.1/2.2 A e AA + boas práticas), 1440 e 390 px, movimento reduzido | **0 violações** (antes: 3 tipos) |
| Lighthouse 12, celular simulado (Moto G Power, 4G lenta simulada) | Desempenho 90 · Acessibilidade 100 · Boas práticas 100 · SEO 100 (antes: 86 · 89 · 100 · 92) |
| Lighthouse 12, desktop | 100 · 100 · 100 · 100 (antes: 100 · 90 · 100 · 92) |

As notas do Lighthouse são de laboratório (simulação, uma execução, máquina local); não são medidas de usuários reais.

## Achados corrigidos nesta etapa

| # | Achado | Evidência | Impacto | Correção | Situação |
|---|---|---|---|---|---|
| A1 | Horas da régua (topo e chamada) com contraste 2,39:1 | axe `color-contrast`, 14 nós; `white/50` sobre `#2F5BFF` | Texto visível difícil de ler (estava em `aria-hidden`, mas continua sendo texto) | `white/75` = 3,60:1 (texto ≥ 25,6 px, critério de 3:1) | Corrigido e medido |
| A2 | Lista da seção Confiança com `<dl>` inválido (`div > span + div > dt/dd`) | axe `definition-list` e `dlitem` (9 nós). **Já existia antes** | Leitor de tela pode não associar título e descrição | `<div>` só com `<dt>` e `<dd>`; o ponto azul virou pseudo-elemento do `<dt>` | Corrigido e medido |
| A3 | Dia selecionado na demo ("qua") com contraste 3,59:1 | axe `color-contrast`, 1 nó (11 px, `opacity-75` sobre azul) | Rótulo pequeno pouco legível | Opacidade total quando selecionado (`group-has-checked`) | Corrigido e medido |
| A4 | `/robots.txt` e `/sitemap.xml` inexistentes: caíam na rota `[slug]` e respondiam **200 com HTML** | `curl`: `200 text/html`; Lighthouse SEO `robots-txt` "2 errors" | Buscadores recebem lixo no lugar do robots | `src/app/robots.ts` (bloqueia `/painel`, `/api/`, `/auth/`, `/convite`, `/criar-salao`, `/nova-senha`, `/versoes`) e `src/app/sitemap.ts` (início, cadastro, contato, termos, privacidade). Slugs não aceitam ponto, então não colidem com salões | Corrigido e medido (`text/plain` e `application/xml`) |
| A5 | Logo baixava a versão de 3840 px para aparecer com ~150 px | Lighthouse `uses-responsive-images`: 35 KB, 32 KB desperdiçados | Peso à toa no celular | `sizes="180px"` (cabeçalho) e `sizes="200px"` (rodapé) | Corrigido (economia estimada caiu de 53 KB para 22 KB) |
| A6 | `og:image` com `localhost` | Pendência I1 da etapa 4 | Prévia quebrada no WhatsApp | `metadataBase` (etapa 4); no build de produção sai `https://agendon.app.br/opengraph-image.png?...` | Confirmado |

## Achados abertos

| # | Achado | Evidência | Impacto | Prioridade | Sugestão |
|---|---|---|---|---|---|
| B1 | `/versoes/2` repete a página inicial **sem `noindex`** (as versões 1 e 3 e o índice têm) | `curl` sem `<meta name="robots">` | Conteúdo duplicado para buscadores. Mitigado: o `robots.txt` agora bloqueia `/versoes` | **Resolvido na etapa 9** | Fechado com a AGE-23: mover a versão 2 para `src/app/page.tsx`, apagar `/versoes` e `src/app/_site/agenda-ilustrada.tsx` (sem uso); conferir se `three` ainda é usado |
| B2 | Salão inexistente (`/qualquer-coisa`) responde **200** com o conteúdo de "não encontrado" e `noindex` (soft 404). **Já existia antes** | `curl /xyz-nao-existe-123` → 200; payload com `NEXT_HTTP_ERROR_FALLBACK;404` | Baixo: o `noindex` evita indexação. O status vem do streaming com `cacheComponents` (o 404 é decidido depois que a resposta começou) | Baixa | Fora do escopo do site; anotar no Linear (Infra/Produto) se quiser 404 de verdade |
| B3 | LCP simulado de 3,6 s no celular (elemento: o `<h1>`) | Lighthouse celular; no mesmo teste, a medição observada foi TTFB 9 ms + atraso de renderização 245 ms | **Hipótese:** a simulação soma CSS bloqueante (14 KB) e a fonte Sora; não há imagem no LCP | Baixa | Medir em aparelho real depois de publicar (Chrome UX Report ou Web Vitals no staging) antes de mexer |
| B4 | JavaScript não usado (28 KB) e polyfills antigos (13 KB) | Lighthouse | Pequeno | Baixa | Vem do runtime do Next/React; não mexer agora |
| B5 | 9–10 nós de contraste "para revisar" no axe | Texto sobre fundo que o axe não consegue calcular (imagens, sobreposições, translucidez) | Desconhecido | Baixa | Revisão visual feita nas etapas 4–7 sem problema aparente; não é uma medição |

## Cobertura

| Área | Testado | Como |
|---|---|---|
| Fluxo principal (CTA → cadastro) | Sim, até abrir `/cadastro` | `curl`: 4 "Começar teste grátis" + 1 "Testar grátis" → `/cadastro` (200, "30 dias grátis"). **Nenhuma conta foi criada** |
| Navegação por âncora | Sim | Os 6 `id` do menu existem uma vez cada |
| Páginas ligadas | Sim | `/entrar`, `/contato`, `/termos`, `/privacidade`: 200 |
| Acessibilidade automática | Sim | axe-core e Lighthouse (acima) |
| Teclado e foco | Sim (etapa 7) | 12 primeiros Tabs em 7 larguras; nada atrás do cabeçalho |
| Movimento reduzido e sem JavaScript | Sim (etapa 6) | Playwright |
| Responsivo | Sim (etapa 7) | 320 a 1280 px e celular deitado |
| Metadados e prévia do link | Sim | `<title>`, `description`, `og:*`, `twitter:*` com imagem absoluta; `lang="pt-BR"`; um `<h1>` e `<h2>` por seção |
| Leitor de tela real (NVDA, VoiceOver, TalkBack) | **Não** | — |
| Aparelho real e rede real | **Não** | — |
| Produção / staging | **Não** | Auditoria no build local; repetir os `curl` de `robots.txt`, `sitemap.xml` e `og:image` no staging depois do deploy |
| Prévia no WhatsApp de verdade | **Não** | Só depois de publicar (o WhatsApp precisa buscar a URL pública) |

## Arquivos alterados nesta etapa

`src/app/robots.ts` (novo), `src/app/sitemap.ts` (novo), `src/app/_site/secoes.tsx` (lista da Confiança, `sizes` do logo), `src/app/_site/dia-preenchendo.tsx` (contraste das horas), `src/app/_site/demo-agendamento.tsx` (dia selecionado), `docs/site/direcao-visual.md` (tabela de contraste).
