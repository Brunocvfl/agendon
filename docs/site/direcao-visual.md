# Direção visual do site do AgendOn

Etapa 2 de 9. Base: `docs/site/briefing-site.md` (2026-11-20). Refinamento da **versão 2**: a marca (cores, Sora, logo) está aprovada e não muda; o que muda é hierarquia, ritmo, mídia e um motivo visual único.

## O que a versão 2 já acerta (manter)

Vista em 1440 px em 2026-11-20.

- Títulos grandes em Sora bold com tracking negativo: personalidade firme e direta, sem cara de template.
- Topo azul On com a agenda "se preenchendo": comunica o produto em um olhar.
- Demo interativa do agendamento dentro de um celular: prova sem precisar de depoimento.
- Alternância clara/escura (fundo → noite → fundo → branco) dá respiro.

## O que melhorar

1. **Ritmo repetido.** Quase toda seção é "H2 enorme à esquerda + parágrafo à direita + caixa arredondada". Sete seções iguais cansam e achatam a hierarquia: nada parece mais importante.
2. **Sem a tela real do produto.** Só ilustrações; quem decide quer ver o painel de verdade.
3. **Verde subutilizado.** O verde "confirmado" é a emoção do produto (o horário confirmado) e aparece só em selos pequenos.
4. **Topo chapado.** Azul uniforme de ponta a ponta; o selo "WhatsApp" é o único sinal de resultado.
5. **Contraste no limite:** texto `white/90` sobre o azul On dá 4,50:1, exatamente o mínimo (ver tabela).

## Conceito

**"O horário que se confirma sozinho."** A página conta um único dia de salão: de manhã a agenda está vazia, os clientes marcam pelo link, a confirmação chega no WhatsApp e o dia fecha cheio. O motivo visual que costura tudo é a **linha do horário** (a régua de horas do topo) e o **check verde** de confirmado.

Personalidade: prática, confiante, calorosa sem ser fofa. Fala como dono(a) de salão fala. Nada de "revolucione", gradiente arco-íris, ilustração 3D genérica ou foto de banco de imagens de mulher sorrindo com celular.

## Cores e papéis

Tokens já existentes em `src/app/globals.css` (`@theme inline`). Nenhuma cor nova de marca; dois tons de apoio já usados na v2 viram token.

| Token | Hex | Papel | Onde |
|---|---|---|---|
| `on` | #2F5BFF | Ação e marca | Botão principal, links, topo, chamada final |
| `noite` | #0F1B4D | Texto e superfície de contraste | Títulos, corpo (com opacidade), seção Agenda |
| `fundo` | #F7F8FC | Fundo padrão | Maioria das seções |
| branco | #FFFFFF | Superfície elevada | Cartões, Equipe, Dúvidas, rodapé |
| `confirmado` | #19C37D | **Só sobre escuro**, decoração e ícone grande | Check grande na seção Lembretes, linha do horário sobre `noite` |
| `confirmado-escuro` | #0E7A4D | Verde para texto sobre claro | Selos "Confirmado", "WhatsApp" |
| **novo** `on-claro` | #E4E9FF | Fundo de palco de demo | Caixa da demo (hoje `bg-[#E4E9FF]` solto) |
| **novo** `confirmado-claro` | #E3F8EF | Fundo de selo verde | Selos (hoje `bg-[#E3F8EF]` solto) |
| **novo** `on-escuro` | #2249E0 | Hover do botão principal | Hoje `hover:bg-[#2249e0]` solto |

Regra de proporção por tela: ~70% neutro (fundo/branco), ~20% noite, ~10% azul On; o verde só aparece onde há um horário confirmado.

### Contraste medido (WCAG 2.x, cálculo de luminância; 2026-11-20)

| Texto | Fundo | Razão | Uso permitido |
|---|---|---|---|
| branco | on | 5,17 | Texto normal |
| branco/90 | on | 4,50 | **No limite: trocar por branco/95 ou branco** no topo |
| branco/50 | on | 2,40 | Não usar: o axe cobra contraste mesmo em `aria-hidden`. As horas da régua (texto grande) usam **branco/75 = 3,60** (etapa 8) |
| branco | on-escuro | 6,78 | Botão em hover |
| noite/75 | fundo | 7,15 | Corpo |
| noite/65 | fundo / branco | 5,15 / 5,24 | Mínimo para texto secundário (regra já no `globals.css`) |
| branco/75 | noite | 9,61 | Corpo sobre noite |
| branco/60 | noite | 6,60 | Mínimo para texto secundário sobre noite |
| confirmado | noite | 7,12 | Verde vivo pode ser texto **sobre noite** |
| confirmado | branco | 2,30 | **Nunca** texto ou ícone sozinho sobre claro |
| confirmado-escuro | confirmado-claro | 4,84 | Selos |
| on | fundo / branco | 4,87 / 5,17 | Links |
| on | on-claro | 4,28 | Só texto grande (≥ 24 px ou 18,66 px bold) ou ícone |
| on | noite | 3,16 | Só texto grande ou ícone |

Os estados de foco já usam contorno de 2 px em `on` (ou branco sobre escuro), via `FOCO` em `secoes.tsx`. Estes números são medidos pelo cálculo de cor; não substituem a auditoria (etapa 8).

## Tipografia

Sora (Google Fonts, licença SIL Open Font License; já carregada por `next/font` em `src/app/layout.tsx`, fallback `ui-sans-serif, system-ui, sans-serif`). Uma família só; a variação vem de peso e escala.

| Papel | Tamanho (celular → desktop) | Peso / tracking | Hoje |
|---|---|---|---|
| H1 (topo) | 2,9 rem → 4,6 rem | 700, -0,045em, `leading-[0.98]` | Manter |
| H2 de seção principal | 2,25 rem → 3,6 rem | 700, -0,04em | `H2` em `secoes.tsx`; manter |
| **novo** H2 de seção de apoio | 1,875 rem → 2,5 rem | 700, -0,03em | Para Equipe, Confiança, Dúvidas: baixar um degrau e criar hierarquia |
| Números de destaque (horas, passos) | 1,6 → 3,1 rem | 200 (extralight), -0,04em, `tabular-nums` | Manter: é a assinatura visual |
| Corpo grande | 1,125 rem | 400, `leading-relaxed` | Manter |
| Corpo | 1 rem | 400 | Manter |
| Rótulo / selo | 0,75–0,875 rem | 600 | Manter |

Medida de linha: 30–60 caracteres no corpo (`max-w-[30rem]` a `max-w-[60ch]`).

## Composição e ritmo

Container `max-w-6xl`, margens `px-4 sm:px-6` (manter). Espaço vertical: seções principais `py-20 lg:py-32`, seções de apoio `py-16 lg:py-24` (diferença de peso que hoje não existe).

Cada seção ganha um **papel** e um layout próprio, para quebrar a repetição:

| Seção | Papel | Layout proposto | Mídia |
|---|---|---|---|
| Topo | Herói | Mantém 2 colunas. A régua de horas ganha a **linha de agora** (fina, verde vivo sobre o azul) que desce devagar; o último agendamento chega com o check. Selo curto sob os botões: "30 dias grátis". | `DiaPreenchendo` evoluído |
| Como funciona + demo | Prova interativa | Mantém. Palco `on-claro` com o celular; os 3 passos alinhados à linha do horário (os números finos viram marcas na régua). | `DemoAgendamento` |
| Agenda | Prova do painel | Fundo `noite`. Inverter: **captura real grande** do painel (dia, colunas por profissional) ocupando ~60%, com 3 legendas curtas apontando partes da tela. | Captura do `studio-demo` em moldura de navegador |
| Lembretes | Emoção | Seção mais limpa da página: um **check verde grande** sobre `noite` ou a conversa do WhatsApp centralizada, sem caixa em volta; seletor de antecedência abaixo. Texto deixa claro que o lembrete é dos planos pagos. | `AntecedenciaLembrete` + mensagem real |
| Celular (nova) | Prova de mobilidade | Faixa estreita: celular com o painel + notificação "Novo agendamento" saindo da tela. Duas linhas de texto. | Capturas do painel no celular e da notificação |
| Equipe | Apoio | H2 de apoio; a tabela continua (é clara e honesta). Fundo branco. | Tabela |
| Confiança | Apoio | 4 itens em grade 2×2 com ícones de linha (pino de localização, escudo, documento, calendário), H2 de apoio. | Ícones SVG simples |
| Teste grátis (nova) | Conversão | Cartão único centralizado, borda `on`, com o que o teste inclui (30 dias · até 15 agendas · 10 confirmações no WhatsApp) e o que acontece no fim. Botão principal. | Nenhuma |
| Dúvidas | Apoio | Mantém o acordeão. | – |
| Chamada final | Fechamento | Fundo `on`; a régua de horas do topo volta, agora **cheia e toda confirmada**: o dia terminou. | Reaproveita `DiaPreenchendo` estático |
| Rodapé | Legal | Mantém (obrigatório pela Meta). | – |

## Tratamento de imagem (capturas reais)

- Sempre do `studio-demo` com clientes fictícios; nenhum telefone visível.
- Desktop: moldura mínima de navegador (barra com 3 pontos, URL `agendon.app.br/painel/agenda`), cantos `rounded-2xl`, sombra azulada `0 30px 60px -30px rgb(15 27 77 / .45)` (mesma família da sombra dos cartões do topo).
- Celular: moldura de celular igual à da demo (borda `noite`, `rounded-[2.5rem]`), para as três peças conversarem.
- Exportar em WebP 2×, largura máxima 2400 px; `next/image` com `sizes` corretos; `alt` descreve o que a tela mostra.
- Texto importante nunca só dentro da imagem: as legendas ficam em HTML.

## Ícones e formas

Traço de 2–2,5 px, pontas redondas (como o `Check` atual). Raios: botões `rounded-xl`, cartões `rounded-2xl`, palcos `rounded-[2.5rem]`. Sem emojis.

## Movimento

Linguagem: **as coisas chegam e se encaixam**, como um horário entrando na agenda. Curvas já definidas: `encaixar` (0,6 s, leve passada do ponto) e `chegar` (0,45 s).

- Topo: agendamentos entram um a um (já existe) + linha de agora.
- Seções: entrada única ao aparecer (opacidade + 12 px), uma vez, sem repetir ao rolar de volta.
- Chamada final: a régua aparece já cheia, com os checks acendendo em sequência.
- Nada de parallax, vídeo de fundo, scroll travado ou `three.js` na página inicial.
- `prefers-reduced-motion: reduce`: tudo aparece no estado final, sem animação (padrão `motion-safe:` já usado).

Detalhamento técnico na etapa 6 (`site-animacoes`).

## Celular (até 390 px)

- Topo: título primeiro, depois a régua com **4 horários** (não 8) para não empurrar os botões para baixo da dobra; botões em coluna, largura total.
- Capturas do painel: no celular, trocar a captura de desktop pela do painel no celular (não encolher a tela grande).
- Tabela da Equipe: rolagem horizontal com dica visual de que rola (sombra na borda), ou virar lista por perfil.
- Alvos de toque ≥ 44 px; cabeçalho com "Entrar" e o botão principal visíveis.
- A conferência real em 360/390 px fica para a etapa 7 (`site-responsivo`): nesta etapa a janela do navegador não encolheu e a vista no celular **não foi verificada**.

## Aplicação nos tokens (quando a implementação começar)

Em `src/app/globals.css`, dentro de `@theme inline`:

```css
--color-on-claro: #e4e9ff;
--color-on-escuro: #2249e0;
--color-confirmado-claro: #e3f8ef;
```

Em `src/app/_site/secoes.tsx`: nova constante `H2_APOIO` e troca dos hex soltos pelos tokens. Nenhuma mudança fora do site (`/painel` e a página pública continuam como estão).

## Fora desta direção

Vídeo gerado por IA, fotos de banco de imagens, nova paleta, modo escuro do site, ilustração de pessoas.
