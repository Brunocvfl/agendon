# Briefing do site institucional do AgendOn

Página inicial de https://agendon.app.br. Versão de 2026-11-20. Etapa 1 de 9 (briefing → direção de arte → copy → imagens → vídeo → animações → responsivo → auditoria → publicação).

## Decisões desta rodada (2026-11-20)

| Decisão | Escolha | Consequência |
|---|---|---|
| Ponto de partida | **Evoluir a versão 2** (hoje na página inicial) | Fecha a AGE-23. No fim: a versão final vira `src/app/page.tsx`, `/versoes` sai e a dependência `three` sai se a versão 3 não for usada. |
| Preços | **Só o teste grátis** | Sem seção de planos até o Mercado Pago e os Termos novos (AGE-32) ficarem prontos. Os preços decididos em 20/11 não aparecem. |
| Mídia | **Telas reais + ilustração em código** | Capturas do `studio-demo` (produção) e os componentes de `src/app/_site/`. Sem custo de OpenRouter. Sem vídeo gerado por IA. |
| Provas | **Ainda não há** | Sem depoimentos, números de salões, logos de clientes ou notas. A prova vem da demo e das garantias técnicas. |

## Objetivo

Levar dono(a) de salão ou profissional autônomo(a) a **criar a conta e começar o teste grátis** em `/cadastro`.

Medida observável (sem meta prometida): cadastros iniciados a partir da página inicial. Hoje não existe medição: ver pendência P5.

## Público

- **Principal:** dono(a) de salão de beleza pequeno ou médio (2 a 15 profissionais), no Brasil, que hoje marca horário pelo WhatsApp pessoal, caderno ou agenda de papel. Decide sozinho(a) e lê pelo celular, muitas vezes entre um atendimento e outro.
- **Secundário:** profissional autônomo(a) (cabeleireiro(a), manicure, barbeiro(a), esteticista) com a própria agenda.
- **Quem também passa pela página:** a análise da Meta (confere razão social, CNPJ e número no rodapé) e clientes finais que digitam o domínio por engano.

## Oferta (fatos confirmados no produto)

Só entra no site o que já funciona em produção (CLAUDE.md, "Estado atual"):

- Página pública por salão (`agendon.app.br/nome-do-salao`), sem login e sem aplicativo: serviço, profissional ou "qualquer um", horário livre, nome e WhatsApp, CAPTCHA.
- Confirmação na hora e lembrete antes do horário (2, 4, 12, 24 ou 48 h) pela plataforma oficial do WhatsApp, só para quem autorizou; SAIR para.
- Agenda de dia (coluna por profissional) e de semana (um profissional), encaixe com aviso, nunca dois clientes no mesmo horário, status, valores do dia só para o Dono(a).
- Clientes com histórico, busca, exportação em CSV, LGPD (baixar dados, anonimizar, retenção de 24 meses).
- Equipe com três perfis fixos (Dono(a), Recepção, Profissional), convite por e-mail.
- Avisos no celular de agendamento novo pela página pública (Web Push); painel instalável na tela inicial.
- Dados no Brasil (Supabase em São Paulo), isolamento por salão.
- **Teste grátis:** 30 dias, até 15 agendas, **10 mensagens de WhatsApp, só de confirmação** (o lembrete não entra no teste). Terminado o teste sem assinatura, a página pública para de aceitar agendamentos e o painel continua.

Fora do site (não existe ou não foi decidido para divulgação): pagamento online, comissões, cancelar/remarcar pelo link (AGE-9), número de WhatsApp próprio de cada salão (AGE-11), preços, aplicativo nas lojas.

## Ação principal e secundárias

| Ação | Destino | Sucesso observável |
|---|---|---|
| **Principal:** "Começar teste grátis" (texto final na etapa de copy) | `/cadastro` | A página de cadastro abre; depois do cadastro, o e-mail de confirmação chega e `/criar-salao` cria o salão. |
| Experimentar como cliente | âncora `#experimente` (demo em código, sem gravar nada) | A demo percorre os passos sem chamar o servidor. |
| Entrar | `/entrar` | Login abre. |
| Falar com o AgendOn | `/contato` (e-mail `legal@agendon.app.br`) | Link `mailto:` abre o e-mail. |

**Sem botão flutuante de WhatsApp.** O número +55 11 95713-1962 é de envio pela Cloud API, sem atendimento humano; anunciá-lo como canal de conversa geraria mensagens sem resposta. Ver P3.

**Sem formulário de contato** nesta entrega (FormSubmit/Web3Forms do pacote cinematográfico não se aplicam: o contato é por e-mail na página `/contato`).

## Mapa da página e seções

Base: `src/app/versoes/2/page.tsx` + `src/app/_site/secoes.tsx`. "Manter", "Refazer" e "Novo" indicam o que muda.

| # | Seção | Propósito | Mensagem | Evidência | Ação | Situação |
|---|---|---|---|---|---|---|
| 0 | Cabeçalho | Navegar e entrar | – | Logo oficial | Entrar / Começar teste | Manter; trocar o texto do botão para o teste grátis |
| 1 | Topo (`Topo`) | Dizer o que é em 5 segundos | A agenda fica aberta enquanto você atende; o cliente marca sozinho e recebe a confirmação no WhatsApp | `DiaPreenchendo` (agenda se preenchendo) ou captura real da agenda | Começar teste grátis / Experimentar como cliente | Refazer visual e copy; destacar "30 dias grátis, sem cartão" (ver P1) |
| 2 | Como funciona + demo (`Experimente`) | Mostrar que é simples para o cliente | Três passos; sem app, sem senha | `DemoAgendamento` interativa | Rolar / cadastrar | Manter a demo; revisar copy |
| 3 | Agenda (`Agenda`) | Mostrar o painel do dia | O dia inteiro numa tela; sem horário duplicado | `AgendaIlustrada` → avaliar troca por captura real | – | Refazer mídia |
| 4 | Lembretes (`Lembretes`) | Reduzir faltas sem trabalho manual | Confirmação na hora, lembrete antes, só para quem autorizou | `AntecedenciaLembrete` + exemplo da mensagem real | – | Manter; deixar claro que o lembrete é dos planos pagos (o teste só confirma) |
| 5 | Equipe (`Equipe`) | Mostrar controle de acesso | Cada pessoa vê o que precisa | Matriz de permissões (`src/lib/permissoes.ts`) | – | Manter; conferir que a tabela bate com a matriz |
| 6 | **Novo:** Celular | Mostrar que funciona no bolso | Painel instalável e aviso de agendamento novo | Captura do painel no celular e de uma notificação | – | Novo (curto) |
| 7 | Confiança (`Confianca`) | Tirar o medo de dados | Dados no Brasil, LGPD, sem CPF | Política de Privacidade | Links legais | Manter |
| 8 | **Novo:** Teste grátis | Explicar o que o teste inclui | 30 dias, até 15 agendas, 10 confirmações; o que acontece no fim | `subscriptions` (migration 28) | Começar teste grátis | Novo; sem preços |
| 9 | Dúvidas (`Duvidas`) | Responder objeções | – | Produto | – | Revisar: a resposta do WhatsApp promete lembrete, que não entra no teste; incluir "Quanto custa?" com resposta honesta (ver P1) |
| 10 | Chamada final (`Chamada`) | Fechar | Comece hoje | – | Começar teste grátis | Revisar copy |
| 11 | Rodapé (`Rodape`) | Identificação legal | – | Razão social, CNPJ, cidade, número de envio | Termos, Privacidade, Contato | **Manter obrigatoriamente** (a Meta confere, AGE-7) |

Seções que **não** entram: depoimentos, logos de clientes, números de uso, planos e preços, comparação com concorrentes, blog.

## Inventário de conteúdo

| Item | Situação | Origem |
|---|---|---|
| Logo (claro, site, símbolo) | Pronto | `public/logo-agendon-*.png`, `public/simbolo-agendon.png` |
| Cores e fonte | Prontas | Azul On `#2F5BFF`, Azul noite `#0F1B4D`, Verde `#19C37D`, fundo `#F7F8FC`, Sora (CLAUDE.md, Marca) |
| Textos atuais | Prontos para revisão | Versão 2 e `secoes.tsx` |
| Ilustrações em código | Prontas | `src/app/_site/*` |
| Capturas reais (agenda dia, página pública, celular, notificação, mensagem no WhatsApp) | **Faltam** | `studio-demo` em produção; tirar na etapa de imagens, sem dado pessoal real |
| Wireframes | Existem | `wireframes/` |
| Dados legais do rodapé | Prontos | `src/lib/legal.ts` |
| Imagem de compartilhamento (Open Graph) | **Falta** | Criar na etapa de imagens |

## Integrações

| Integração | Definição de sucesso |
|---|---|
| Cadastro (`/cadastro`, Supabase Auth) | Botões levam ao cadastro; nada muda no fluxo de conta. |
| Demo de agendamento | Roda só no navegador, sem gravar e sem chamar API. |
| Metadados / Open Graph | Link colado no WhatsApp mostra título, descrição e imagem. |
| Medição de cadastros | **Pendente** (P5). Nada de ferramenta que use cookie de terceiros ou dado pessoal sem decisão e aviso na Política. |

## Restrições

- Stack existente: Next.js 16 (App Router, `cacheComponents`), Tailwind 4, Sora; a página continua no projeto e é publicada pelo fluxo normal (PR → staging → `main`).
- Rodapé com razão social, CNPJ, cidade e número de envio é obrigatório.
- Só afirmar o que existe. Nada de depoimento, número, prêmio ou garantia inventados.
- Nenhum dado pessoal real nas capturas (usar o `studio-demo` com clientes fictícios).
- Acessibilidade: um `h1`, contraste AA, foco visível, `prefers-reduced-motion` respeitado nas animações.
- Desempenho no celular: a página inicial não pode ficar pesada (sem vídeo de fundo; `three` só se justificar).
- Rotas novas do site precisam entrar em `app.slug_reservado` e em `SLUGS_RESERVADOS`.

## Prioridades

1. **Primeira entrega:** copy revisada com o teste grátis, CTA único, seção "Teste grátis", Dúvidas corrigidas, capturas reais no lugar de pelo menos uma ilustração, Open Graph, `/versoes` removida.
2. **Depois:** seção Celular, refinamento de animações, medição de cadastros.
3. **Fases futuras (não são requisito agora):** planos e preços (depois de AGE-31/AGE-32 e Mercado Pago), depoimentos do piloto, página por nicho (barbearia, manicure), cancelar/remarcar pelo link quando a AGE-9 sair.

## Critérios de aceite

- Todos os botões principais levam a `/cadastro`; o texto menciona o teste grátis.
- Nenhuma frase promete recurso que não existe (lembrete no teste, cancelar pelo link, número próprio, preço).
- Nenhum depoimento, número de clientes ou selo sem origem.
- Rodapé com razão social, CNPJ, cidade, e-mail e número de envio.
- Página funciona e não estoura a largura em 360, 390, 768, 1280 e 1440 px.
- Com `prefers-reduced-motion`, nada se move além do essencial.
- Exatamente um `h1`; seções com `h2`; navegação por teclado com foco visível.
- Link colado no WhatsApp mostra a prévia com imagem.
- `npm run lint`, `typecheck` e `build` passam; `/versoes` removida e fora do build.

## Pendências

| # | Pendência | Responsável | Impacto |
|---|---|---|---|
| P1 | Confirmar a frase "sem cartão de crédito" no teste: hoje o cadastro não pede cartão, mas isso muda com o Mercado Pago? | Bruno | Texto do topo e da seção Teste grátis |
| P2 | "Quanto custa?" nas Dúvidas: responder "planos a partir de…" ou "os preços saem antes do fim do seu teste"? | Bruno | Uma pergunta da seção Dúvidas |
| P3 | Canal de contato comercial: só e-mail ou um WhatsApp de atendimento (outro número)? | Bruno | Botão flutuante e `/contato` |
| P4 | Autorização para usar capturas do `studio-demo` (nomes fictícios) no site | Bruno | Etapa de imagens |
| P5 | Medir cadastros vindos da página: sem ferramenta, Vercel/Cloudflare Web Analytics (sem cookie) ou outra | Bruno | Objetivo mensurável; possível ajuste na Política de Privacidade |
| P6 | Termos atualizados para cobrança (AGE-32) | Bruno + advogada | Libera a seção de planos (fase futura) |
