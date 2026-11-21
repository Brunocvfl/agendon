# Inventário de imagens do site do AgendOn

Etapa 4 de 9 (2026-11-20). Decisão do briefing: **telas reais + ilustração em código**, sem imagem gerada por IA (nenhum custo de OpenRouter).

## Origem das capturas

- Salão de vitrine **"Studio Bela Vida"** criado só no banco **local** (fora do repositório e do seed; some no próximo `npm run db:reset`): 3 profissionais, 6 serviços, 14 clientes **fictícios** com telefones fictícios, 17 agendamentos no dia com todos os status. Login local `vitrine@agendon.test` (senha do seed local).
- Capturadas do servidor local (`localhost:3000`) com Chrome via `playwright-core`, fuso America/Sao_Paulo, sem o indicador de desenvolvimento do Next.
- Nenhum dado de cliente real, nenhum telefone visível nas imagens usadas. O e-mail de teste aparece só na captura original da barra lateral, que foi cortada.
- Scripts e originais (PNG) ficaram na pasta temporária da sessão; para refazer: recriar o salão de vitrine, repetir as capturas e converter com `sharp` (WebP, qualidade 82).

## Arquivos

| Arquivo | Uso | Tipo | Dimensões | Peso | Alt |
|---|---|---|---|---|---|
| `public/site/agenda-dia.webp` | Seção Agenda (desktop inteira; no celular, recorte do canto superior esquerdo ampliado) | Informativa | 2000 × 1520 (captura 2880 × 1800 a 2×, barra lateral cortada) | 90 KB | Agenda do dia no painel do AgendOn: resumo com 17 agendamentos e os valores do dia, e uma coluna para cada profissional (Ana Lima, Bruno Costa e Carla Souza) com os horários coloridos pelo status. |
| `public/site/pagina-publica-celular.webp` | Seção Celular, "O que o cliente vê" | Informativa | 900 × 1948 (captura 390 px a 3×) | 54 KB | Página de agendamento do Studio Bela Vida no celular: endereço, "Como chegar" e a lista de serviços com duração e preço. |
| `public/site/agenda-celular.webp` | Seção Celular, "O que você vê" | Informativa | 900 × 1948 (390 px a 3×, filtro Ana Lima) | 41 KB | Agenda do dia da profissional Ana Lima no painel, aberta no celular, com os horários de Marina, Juliana, Fernanda e Patrícia. |
| `src/app/opengraph-image.png` | Prévia do link (WhatsApp, redes): convenção de arquivo do Next, vale para todas as páginas | Informativa | 1200 × 630 | 38 KB | `opengraph-image.alt.txt`: "AgendOn: a agenda do salão aberta enquanto você atende. Teste grátis por 30 dias." |

Aviso "Novo agendamento" na seção Celular: **HTML** (`AvisoNovoAgendamento`, `src/app/_site/telas.tsx`), não imagem. Texto igual ao de `avisoDeAgendamento`, com o ícone do app (`public/app/icone-192.png`). Fica escondido abaixo de 640 px.

Ilustrações em código mantidas: `DiaPreenchendo` (topo), `DemoAgendamento` (como funciona), `AntecedenciaLembrete` (lembretes). `AgendaIlustrada` saiu da seção Agenda (substituída pela captura) e fica sem uso até a limpeza de `/versoes`.

## Prévia do link (Open Graph)

Composição: fundo azul noite (o logo claro tem "On" em azul e some sobre o azul On), logo no alto, título do topo à esquerda, régua de horas com cinco agendamentos confirmados à direita, rodapé "agendon.app.br · Teste grátis por 30 dias". Feita em HTML com Sora e fotografada a 1200 × 630. Nomes fictícios.

`metadataBase` (`https://agendon.app.br`) entrou em `src/app/layout.tsx` para o endereço da imagem ser absoluto atrás do proxy. **Pendente de conferir:** no servidor de desenvolvimento a tag ainda saiu com `localhost`; checar no build de produção na etapa de auditoria.

## Molduras (`src/app/_site/telas.tsx`)

- `MolduraNavegador`: barra com 3 pontos e a URL, `rounded-2xl`, sombra azulada. No celular (< 640 px), recorte 5:6 com a imagem a 230% e ancorada no canto superior esquerdo.
- `MolduraCelular`: mesma moldura da demo (borda azul noite de 9 px, `rounded-[2.6rem]`), proporção 390:760, imagem `object-cover object-top`.
- Todas com `next/image` e `sizes` definidos (sem salto de layout: largura/altura ou `fill` com proporção fixa).

## Conferido nesta etapa

- Desktop 1440 px e celular 390 px das seções Agenda, Celular e Teste grátis (capturas com Playwright, movimento reduzido): sem rolagem horizontal (`scrollWidth` = largura da janela nos dois).
- `npx tsc --noEmit` e ESLint das pastas do site sem erros.

## Pendências

| # | O quê | Quando |
|---|---|---|
| I1 | Conferir `og:image` absoluto (`https://agendon.app.br/...`) no build de produção | Etapa 8 |
| I2 | Se o painel mudar de visual, refazer as capturas (os scripts estão descritos acima) | Quando acontecer |
| I3 | Apagar `src/app/_site/agenda-ilustrada.tsx` junto com `/versoes` | Fim do trabalho do site |
