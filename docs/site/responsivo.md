# Responsivo do site do AgendOn

Etapa 7 de 9 (2026-11-20). Testado no Chrome (Playwright, servidor local, movimento reduzido para ver o estado final), página inicial inteira.

## Causas encontradas e corrigidas

| # | Onde | Largura | Causa | Correção | Arquivo |
|---|---|---|---|---|---|
| 1 | Cabeçalho | 768 e 844 (celular deitado) | O menu de seções aparecia a partir de 768 px (`md`) e, com o item novo "Teste grátis", empurrava "Entrar" e "Testar grátis" 150 px para fora; o celular reduzia a página inteira | Menu a partir de 1024 px (`lg`); abaixo disso, logo + Entrar + Testar grátis | `src/app/_site/secoes.tsx` |
| 2 | Cabeçalho | 320 | Logo + dois botões somavam 334 px | Logo um pouco menor abaixo de 360 px, espaços menores | `secoes.tsx` |
| 3 | "Seja o cliente" (e as outras grades de uma coluna) | 320 | Grade sem colunas definidas cresce até a largura mínima do celular da demo (`auto` em vez de `minmax(0,1fr)`), e o texto ao lado estourava 14 px | `grid-cols-1` nas grades que viram duas colunas no desktop | `src/app/versoes/2/page.tsx`, `secoes.tsx` |
| 4 | Tabela da Equipe | < 640 | Tabela com largura mínima de 36 rem dentro de rolagem lateral, sem sinal de que rola; a coluna "Profissional" ficava cortada | Abaixo de 640 px, lista por permissão com selos de quem pode (verde) e de quem não pode (riscado, com "não" para leitor de tela); a tabela continua a partir de 640 px | `secoes.tsx` |
| 5 | Aviso "Novo agendamento" (seção Celular) | < 640 | Ficava escondido no celular (não cabia por cima do aparelho), e é a mensagem principal da seção | No celular, aparece acima dos dois aparelhos; a partir de 640 px, por cima da agenda. Marcado como decorativo (o texto da seção já diz o mesmo) | `page.tsx`, `src/app/_site/telas.tsx` |
| 6 | Alvos de toque do cabeçalho | todas | "Entrar" com 36 px e "Testar grátis" com 40 px de altura; link do logo com 21 px em 320 | 44 px de altura nos dois botões; logo com área de toque maior | `secoes.tsx` |

Na etapa 4 a captura da Agenda já tinha ganhado um recorte próprio para o celular (canto superior esquerdo ampliado).

Não foi preciso reduzir a régua do topo para 4 horários (previsto na direção visual): o botão principal já fica dentro da primeira tela em 360 × 740, 390 × 844 e 1280 × 800.

## Matriz testada

| Tamanho | Rolagem horizontal | Botão principal na 1ª tela | Tab (12 primeiros) |
|---|---|---|---|
| 320 × 640 (celular pequeno; equivale a 400% de zoom em 1280) | não | sim (termina em 636 de 640) | foco visível, nada atrás do cabeçalho |
| 360 × 740 | não | sim (607) | ok |
| 390 × 844 | não | sim (561) | ok |
| 640 × 900 (200% de zoom em 1280) | não | sim (632) | ok |
| 768 × 1024 (tablet) | não | sim (632) | ok |
| 844 × 390 (celular deitado) | não | não (562 de 390): esperado, a tela é baixa | ok |
| 1280 × 800 | não | sim (775) | ok, passa pelo menu |

"Rolagem horizontal = não" é `scrollWidth` igual à largura da janela, mais a busca por elementos fora da tela que não estejam dentro de um contêiner com recorte próprio.

Alvos menores que 44 px que ficaram de propósito: os horários e dias dentro da demo de agendamento (36 px de altura; é uma ilustração que imita a página pública, acima dos 24 px do critério 2.5.8 da WCAG 2.2) e o link "Pular para o conteúdo", que só aparece com foco.

## Não testado

- Aparelho real (iPhone/Android), teclado virtual (a página não tem formulário), leitor de tela.
- Zoom de texto do navegador (só largura equivalente ao zoom de página).
- Desempenho em celular fraco: etapa 8.
