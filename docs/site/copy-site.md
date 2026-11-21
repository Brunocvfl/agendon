# Textos do site do AgendOn

Etapa 3 de 9. Fontes: `briefing-site.md`, `direcao-visual.md` e o produto (CLAUDE.md, `src/lib/whatsapp/template.ts`, `src/lib/push/aviso.ts`, migration 28). Versão de 2026-11-20.

**Ação principal da página:** começar o teste grátis → `/cadastro`.
**Tom:** direto, de dono(a) de salão para dono(a) de salão. Frases curtas, verbos concretos, nada de "revolucionar", "solução completa" ou "potencializar".

Legenda: ✅ aplicado no código nesta etapa · 🆕 seção nova, texto pronto, entra com o layout (etapas 4 a 6).

---

## Metadados ✅

- **Título:** AgendOn: agenda online para salões de beleza
- **Descrição:** Seus clientes marcam pelo link do salão e recebem a confirmação no WhatsApp. Agenda por profissional, clientes com histórico e acesso para a equipe. Teste grátis por 30 dias.
- **Open Graph (descrição curta):** Seus clientes marcam pelo link do salão e recebem a confirmação no WhatsApp. Teste grátis por 30 dias.

## Cabeçalho ✅

- Navegação: Como funciona · Agenda · Lembretes · Dúvidas · Sobre
- Entrar
- Botão: **Testar grátis** (curto para caber no celular) → `/cadastro`

## 1. Topo ✅

- **H1:** A agenda do seu salão aberta enquanto você atende.
  - Alternativa: *Seu cliente marca sozinho. Você só atende.* (mais curta; perde a imagem de "agenda aberta")
- **Texto:** O cliente marca pelo link do salão, recebe a confirmação no WhatsApp e o horário já aparece na sua agenda. Sem largar a tesoura para responder mensagem.
- **Botão principal:** Começar teste grátis → `/cadastro`
- **Botão secundário:** Ver como o cliente marca → `#experimente`
- **Linha de apoio:** 30 dias grátis, com até 15 profissionais.
- Evidência: plano `teste` (30 dias, `max_agendas` 15), migration 28.

## 2. Como funciona + demo ✅

- **H2:** Seja o cliente por um minuto.
- **Texto:** É assim que seu cliente marca: sem baixar aplicativo, sem criar senha, sem esperar resposta.
- **Passos:**
  1. **Cadastre serviços e equipe.** Duração e preço de cada serviço; horário, intervalo e folgas de cada profissional.
  2. **Divulgue o seu link.** Na bio do Instagram, no status do WhatsApp, no cartão de visita. A página mostra seu logo, o endereço e o botão "Como chegar".
  3. **O cliente marca sozinho.** Vê só os horários livres, escolhe o profissional ou "qualquer um" e informa nome e WhatsApp.
- **Legenda da demo:** Escolha um horário e confirme para ver a mensagem que o cliente recebe.
- Nota: a demo roda só no navegador e não grava nada; a mensagem mostrada é o texto aprovado pela Meta.

## 3. Agenda ✅

- **H2:** O dia do salão inteiro numa tela só.
- **Itens:**
  - **Dia e semana.** Uma coluna por profissional no dia, ou a semana inteira de uma pessoa, com expediente, intervalo e folgas.
  - **Encaixe com aviso.** Agende pelo painel até fora do expediente, com confirmação. Dois clientes no mesmo horário, nunca.
  - **Status de cada atendimento.** Agendado, confirmado, concluído ou faltou. Falta e cancelamento liberam o horário na hora.
  - **Valores do dia.** Só o dono vê o previsto, o confirmado e quanto se perdeu com faltas.
- 🆕 **Legendas da captura real** (etapa 4): "Uma coluna por profissional" · "A linha vermelha é agora" · "Cor de cada status".

## 4. Lembretes ✅

- **H2:** Confirmação e lembrete no WhatsApp, sem você digitar nada.
  - Antes: "Menos falta, sem você digitar nada." Trocado: promete um resultado que o AgendOn ainda não mediu.
- **Texto:** A confirmação sai assim que o cliente marca. O lembrete chega antes do horário, na antecedência que você escolher. Tudo pela plataforma oficial do WhatsApp e só para quem autorizou; quem responde SAIR deixa de receber.
- **Nota abaixo do seletor:** No teste grátis, o WhatsApp envia só a confirmação, até 10 mensagens. O lembrete entra nos planos pagos.
- Evidência: `TEXTOS` em `src/lib/whatsapp/template.ts`; franquia do teste na migration 28.

## 5. Celular 🆕

- **H2:** Agendamento novo avisa no seu celular.
- **Texto:** Instale o painel na tela inicial do celular, direto pelo navegador, sem loja de aplicativos. Quando um cliente marca pelo link, chega um aviso com o nome e o serviço.
- **Nota:** No iPhone, o aviso funciona com o AgendOn adicionado à tela de início.
- **Texto do aviso na imagem:** "Novo agendamento" / "Marina · Corte feminino" (`avisoDeAgendamento`).

## 6. Equipe ✅ (sem mudança)

- **H2:** Cada pessoa da equipe vê o que precisa.
- **Texto:** Convide por e-mail quem trabalha com você. O profissional vê a própria agenda com o nome do cliente, mas não o telefone.
- Tabela conferida com `src/lib/permissoes.ts` e a matriz do CLAUDE.md.

## 7. Confiança ✅ (sem mudança)

- **H2:** Os dados dos seus clientes, bem cuidados.
- Itens mantidos: Dados guardados no Brasil · De acordo com a LGPD · Nada de CPF nem foto do cliente · Sem horário duplicado.
- Nota: "24 meses sem agendar → identificação apagada" é verdade hoje (job `lgpd-retencao-clientes`), mas o prazo está em revisão com o jurídico (AGE-27). Se mudar, mudar aqui.

## 8. Teste grátis 🆕

- **H2:** Teste por 30 dias com o seu salão de verdade.
- **Lista "O teste inclui":**
  - Página de agendamento com o seu link
  - Agenda, clientes e equipe completos
  - Até 15 profissionais com agenda
  - Até 10 confirmações no WhatsApp
- **Quando o teste acaba:** Se você não escolher um plano, a página de agendamento deixa de aceitar horários e as mensagens param. O painel continua funcionando e seus dados ficam lá.
- **Botão:** Começar teste grátis → `/cadastro`
- Evidência: migration 28 (`aceita_agendamento = false`, gatilho `appointments_publico_no_plano`, painel continua).

## 9. Dúvidas ✅

1. **O cliente precisa baixar algum aplicativo?** Não. Ele abre o link do salão no navegador do celular, escolhe e confirma. Não precisa criar conta nem senha.
2. **Preciso ter WhatsApp Business ou configurar alguma coisa?** Não. A confirmação e o lembrete saem pelo número oficial do AgendOn, com o nome do seu salão no texto. Você só escolhe a antecedência do lembrete. No teste grátis, sai só a confirmação.
3. **Quanto custa?** Nada durante os 30 dias de teste. Depois, os planos são mensais, de acordo com o número de profissionais com agenda, e já incluem as mensagens do WhatsApp. *(sem valores até a cobrança estar pronta: P2)*
4. **Serve para quem trabalha sozinho?** Sim. Cadastre você mesmo como profissional (opção "Sou eu") e a sua agenda fica pronta. Se a equipe crescer, é só convidar.
5. **O cliente pode marcar com um profissional específico?** Pode escolher o profissional ou "qualquer um". Nesse caso, o AgendOn escolhe quem tem menos agendamentos no dia.
6. **Consigo agendar quem liga ou chega no balcão?** Sim. Pelo painel você busca o cliente pelo nome ou cadastra um novo e escolhe um horário livre. Se ele já autorizou as mensagens, também recebe a confirmação.
7. **O cliente consegue cancelar ou remarcar sozinho?** Ainda não pelo link. Por enquanto ele fala com o salão, e você remarca ou cancela pelo painel.
8. **Dá para usar no celular?** Sim. O painel funciona no celular e pode ser instalado como aplicativo na tela inicial, direto pelo navegador. Você recebe um aviso a cada agendamento novo pelo link.
9. **E se eu quiser levar meus clientes para outro lugar?** O dono do salão baixa a lista de clientes em planilha (CSV) quando quiser, com histórico de visitas.

## 10. Chamada final ✅

- **H2:** Seu link de agendamento no ar ainda hoje.
- **Botão:** Começar teste grátis → `/cadastro`
- **Apoio:** Cadastre o salão, os serviços e a equipe, e divulgue o link.

## Rodapé ✅

- Frase: Agenda online e lembretes no WhatsApp para salões de beleza.
- Link "Cadastrar salão" → **Começar teste grátis**.
- Linha legal (razão social, CNPJ, cidade, e-mail, número de envio): sem mudança.

## Página de cadastro (`/cadastro`) ✅

O botão diz "teste grátis"; o destino precisa confirmar.
- **H1:** Crie sua conta
- **Texto:** 30 dias grátis. Primeiro a conta de acesso; depois você cadastra o salão.

## Formulários

O site não tem formulário próprio. O único é o cadastro (já existe, com seus estados). A demo não envia nada: o "Agendamento confirmado" dela é simulado e está dentro de um celular ilustrado, com a legenda deixando claro que é um exemplo.

---

## Dados a confirmar

| # | O quê | Por que importa |
|---|---|---|
| P1 | Escrever "sem cartão de crédito"? Hoje é verdade (o cadastro não pede cartão), mas pode mudar com o Mercado Pago. | Reforça o topo e a seção Teste grátis. **Ficou de fora.** |
| P2 | Mostrar "a partir de R$ 39,90" em "Quanto custa?" | **Ficou sem valores.** |
| P7 | **Conflito de prazo:** o site oferece 30 dias de teste, mas a cobrança (Mercado Pago, AGE-32) ainda não existe. Quem se cadastrar hoje chega ao fim do teste sem ter como assinar, e a página de agendamento para. | Decidir antes de divulgar o site: estender o teste à mão (virar `cortesia`), adiar a divulgação ou garantir a cobrança em menos de 30 dias. |
| P8 | "Com o nome do seu salão no texto": verdade (variável do template). O **nome de exibição** do remetente ainda não foi aprovado (AGE-7); o cliente vê só o número. | Não prometer "aparece como AgendOn". |
