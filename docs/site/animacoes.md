# Animações do site do AgendOn

Etapa 6 de 9 (2026-11-20). Linguagem definida em `direcao-visual.md`: as coisas chegam e se encaixam, como um horário entrando na agenda. Só CSS e um script pequeno; nenhuma biblioteca nova, sem scroll-jacking, sem vídeo e sem `three` na página inicial.

| Onde | Gatilho | O que acontece | Movimento reduzido / sem JS |
|---|---|---|---|
| Topo (`DiaPreenchendo`, `variante="manha"`) | Abrir a página | Cinco agendamentos encaixam um a um (0,5 s + 0,75 s cada), o selo "WhatsApp" chega 0,45 s depois; aos 4,6 s a **linha de agora** (verde, na coluna dos cartões) desce por 9 s até o 11:00 e para. Uma vez só. | Tudo no estado final; a linha já fica no 11:00. |
| Demo, captura da Agenda, Lembretes, celulares, cartão do teste (`data-revelar`) | Entrar na tela (IntersectionObserver, 15% visível, margem inferior de 12%) | Opacidade 0 → 1 e 12 px para cima em 0,7 s. Uma vez; voltar a rolar não repete. | Visível desde o início. |
| Aviso "Novo agendamento" (seção Celular) | Revelar dos celulares | Chega 0,8 s depois dos celulares (`animate-chegar`). | Visível, parado. |
| Chamada final (`DiaPreenchendo`, `variante="cheio"`) | Revelar | Cinco horários da tarde já preenchidos; os checks "WhatsApp" acendem em sequência (0,35 s entre eles). | Todos acesos. |

Mecanismo: `src/app/_site/revelar.tsx` (componente cliente, sem dependência) marca como revelado o que já está na tela, liga `revelar-pronto` no `<html>` e observa o resto. O CSS em `globals.css` só esconde com `revelar-pronto` e pausa as animações internas (`animation-play-state`) até o bloco aparecer. Títulos e textos nunca são escondidos: só as mídias.

## Conferido (Chrome via Playwright, servidor local, 2026-11-20)

- Abrir no desktop: blocos abaixo da dobra começam ocultos; a linha de agora termina em `translateY(325,8 px)` (11:00).
- Rolar devagar até o fim: os 6 blocos revelados, opacidade 1; voltar ao topo (tecla Home): continuam revelados.
- Celular 390 px, tecla End logo ao abrir: blocos do fim revelados; os pulados aparecem quando a pessoa rola até eles.
- `prefers-reduced-motion: reduce`: sem `revelar-pronto`, tudo com opacidade 1, linha parada no fim (`translate 0 58%`).
- JavaScript desligado: tudo com opacidade 1.
- Sem erros no console.

Não medido: taxa de quadros e desempenho em aparelho fraco (fica para a auditoria, etapa 8).
