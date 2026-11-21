# Entrega do site do AgendOn

Etapa 9 de 9 (2026-11-20).

| | |
|---|---|
| Repositório | github.com/CodeHouseDevs/agendon |
| Branch | `brunocvfl/age-23-site-institucional` (a partir da `main` em `ae3d277`) |
| Commit do site | `6c5efe8` (mais este documento) |
| PR | #70, "AGE-23: site institucional com a versão 2, teste grátis e telas reais" |
| Staging | https://staging.agendon.app.br (VPS, senha do Caddy), deploy do PR concluído pelo GitHub Actions ("Imagem e deploy (staging)": ok) |
| Produção | https://agendon.app.br, **só depois do merge na `main`** (deploy automático pelo GitHub Actions) |
| Banco | sem migration |
| Variáveis novas | nenhuma (`metadataBase` é fixo em `https://agendon.app.br` no código) |

## Verificado

- No PR: os 6 checks passaram (App: lint, tipos e build; Banco; Varredura de segredos; Imagem e deploy do staging; Vercel; comentários da Vercel).
- Local (worktree da branch): `npm ci`, lint, typecheck, 289 testes, build com as variáveis fictícias do CI, `npm audit --omit=dev --audit-level=high` sem vulnerabilidades.
- Staging: `/api/saude` responde 200 (público); o resto pede a senha do Caddy (401), então **o conteúdo do staging não foi conferido por automação**. O preview da Vercel exige login da Vercel (302).

## Conferir antes do merge (no navegador, com a senha do staging)

1. https://staging.agendon.app.br: a página nova abre (topo azul, "Começar teste grátis", régua de horas com a linha verde).
2. Rolar até o fim: a captura da agenda, os dois celulares e o cartão "Teste por 30 dias" aparecem; a chamada final mostra a tarde cheia.
3. "Começar teste grátis" abre o cadastro com "30 dias grátis".
4. `/robots.txt` em texto e `/sitemap.xml` em XML.
5. `/versoes` cai na página de salão inexistente.
6. No celular: menu com logo, "Entrar" e "Testar grátis"; a tabela da Equipe vira lista.

## Depois do merge (produção)

- Abrir https://agendon.app.br e repetir 1, 3 e 4.
- Colar `https://agendon.app.br` numa conversa do WhatsApp e ver a prévia com a imagem (o WhatsApp guarda prévias antigas por um tempo; se vier a antiga, testar com `https://agendon.app.br/?v=1`).
- UptimeRobot continua verde (`/api/saude`).

## Voltar para a versão anterior

- **Rápido (VPS):** o `deploy.sh` guarda as 3 últimas imagens; reverter o commit de merge na `main` (`git revert -m 1 <merge>`, PR e merge) gera uma imagem nova com o site antigo. Ver `infra/README.md`.
- O site não mexe em banco, variáveis nem DNS: voltar o código basta.

## Manutenção

- Textos e seções: `src/app/page.tsx` e `src/app/_site/`. Ao mudar o produto (fim do teste, franquia, cancelar pelo link, preços), revisar os textos e as Dúvidas (`docs/site/copy-site.md` lista a origem de cada afirmação).
- Capturas: `public/site/`; como refazer em `docs/site/inventario-imagens.md`.
- Prévia do link: `src/app/opengraph-image.png` (+ `.alt.txt`).
- Rota nova no site: incluir em `app.slug_reservado` e em `SLUGS_RESERVADOS`; se for pública, no `src/app/sitemap.ts`.

## Pendências fora desta entrega

- Planos e preços no site: depois do Mercado Pago e dos Termos novos (AGE-32).
- Depoimentos de salões do piloto, quando houver autorização.
- Medição de cadastros vindos do site (P5 do briefing).
- Salão inexistente responde 200 em vez de 404 (já era assim; `noindex` mitiga). Ver `auditoria-site.md`, B2.
- Desempenho em aparelho real (LCP simulado de 3,6 s no celular; hipótese, ver B3).
