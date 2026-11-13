# AgendOn

Web app de agendamento para salões de beleza (salões com vários profissionais e autônomos), na categoria de agendaai.com.br. Desenvolvido por uma pessoa só, junto com o Claude Code. Responda sempre em português do Brasil, de forma objetiva.

Plano completo (arquitetura, segurança, LGPD, cronograma): https://claude.ai/artifact/UfqNi8onN65NibBPPScj2j

## Produto (MVP)

- **Cliente final** (página pública `agendon.app.br/nome-do-salao`, sem login, mobile first): escolhe serviço, profissional (ou "qualquer um"), horário livre, informa nome e WhatsApp e confirma. Recebe confirmação e lembrete no WhatsApp e pode cancelar ou remarcar pelo link.
- **Salão** (painel, com login): cadastro do salão, serviços (nome, duração, preço), profissionais (serviços, horários, folgas), agenda do dia/semana com agendamento manual, status (agendado, confirmado, concluído, faltou, cancelado), clientes com histórico, lembretes por WhatsApp, equipe e acessos.
- **Perfis fixos no MVP:** Dono(a), Recepção, Profissional.
- **Fora do MVP:** pagamento online, comissões, estoque, fidelidade, app nativo, multi-unidade, relatórios financeiros, SMS/e-mail como canais, pós-atendimento, permissões personalizadas.

Matriz de permissões:

| Permissão | Dono(a) | Recepção | Profissional |
|---|---|---|---|
| Ver a agenda de todos | sim | sim | não (só a própria) |
| Criar e remarcar agendamentos | sim | sim | sim (só na própria agenda) |
| Mudar status (confirmar, concluir, faltou, cancelar) | sim | sim | sim (só na própria agenda) |
| Ver clientes, histórico e telefone | sim | sim | não |
| Exportar e anonimizar cliente (LGPD) | sim | não | não |
| Editar serviços e preços | sim | não | não |
| Editar horários e folgas | sim | sim | não |
| Editar lembretes e link público | sim | não | não |
| Plano, cobrança e usuários | sim | não | não |

## Stack

- Front: Next.js 16 (App Router, `src/`) + TypeScript + Tailwind 4, hospedado na Vercel. Ler `AGENTS.md` e a documentação em `node_modules/next/dist/docs/` antes de usar APIs do Next: o antigo `middleware` agora é `src/proxy.ts`, e com `cacheComponents` ligado toda leitura de sessão/cookies fica dentro de `<Suspense>`.
- Módulos do front-end (termos em `GLOSSARY.md`), use-os em vez de repetir o padrão:
  - **Permissões** `src/lib/permissoes.ts`: a matriz abaixo em código. `pode(perfil, permissão)`; no servidor, `exigirPermissao(permissão, senão)` (`src/lib/auth.ts`). Mudou a matriz? Mude aqui e no teste.
  - **Regras de cadastro** `src/lib/regras/*`: leitura e validação puras (`lerServico`, `lerNomeProfissional`, `lerFolga`, `lerSalao`, `erroDaSenha`) e os `LIMITES_*` usados pelos formulários. Espelham as restrições do banco.
  - **Ação do painel** `src/lib/acao.ts`: toda Server Action do painel é `acaoDoPainel({ permissao, ler, executar, mensagens, depois })` ou `comandoDoPainel(...)`. Tradução dos erros do Postgres num lugar só.
  - **Página protegida** `src/components/pagina-protegida.tsx`: toda página do painel usa `<PaginaProtegida exige=... params=...>{({ vinculo, id }) => ...}</PaginaProtegida>`.
  - Testes de unidade (Vitest) ao lado do módulo: `npm test`. Testar pela interface do módulo.
- Supabase no app: `src/lib/supabase/` (`client.ts` para o navegador, `server.ts` para o servidor, `proxy.ts` renova a sessão). Para validar o usuário no servidor, usar `auth.getClaims()`, nunca `getSession()`.
- Back-end: Supabase (Postgres, Auth, Edge Functions, Storage, pg_cron + fila), região **sa-east-1 (São Paulo)**.
- WhatsApp: API oficial da Meta (WhatsApp Business Platform), templates aprovados.
- Erros: Sentry (sem dados pessoais). E-mail de autenticação: SMTP do Resend (domínio `agendon.app.br`, sa-east-1, plano grátis: 100/dia).
- Ambientes: local (Supabase CLI), staging e produção, cada um com projeto Supabase próprio.

## Regras que não se negociam

**Multi-tenant e RLS**
- Toda tabela de negócio tem `salon_id` e **RLS ativada**. Nenhuma tabela sem RLS.
- O `salon_id` e o perfil do usuário vêm de `public.members` (via `app.my_salon_ids()` e `app.has_role()`), nunca de dado que o navegador possa alterar.
- Integridade entre salões: chaves estrangeiras compostas `(id, salon_id)`.
- Toda migration nova que mexe em tabela ou policy precisa de teste de isolamento em `supabase/tests/database/`.

**Segredos e acesso**
- A chave secreta do Supabase (`SUPABASE_SECRET_KEY`, `sb_secret_...`, sucessora da `service_role`) e os tokens da Meta ficam só em variáveis de ambiente do servidor/Edge Functions. Nunca no front, nunca no Git.
- A página pública nunca acessa tabelas direto. Ela usa funções RPC específicas (listar serviços, listar horários, criar agendamento) com `security definer`, `set search_path = ''` e validação de entrada.
- A tabela `anon` não tem permissão em nada. Limite de taxa e CAPTCHA na criação pública de agendamento.
- Webhooks da Meta: validar a assinatura, gravar o evento e responder rápido; processar de forma assíncrona e idempotente.

**Agendamento sem conflito**
- A restrição `appointments_no_overlap` (exclusão com `tstzrange`) é a garantia final. O app trata o erro `23P01` oferecendo outro horário.
- Faltou e cancelado liberam o horário. Agendamento nunca é apagado, só muda de status.
- Datas em `timestamptz` (UTC). Exibir no fuso do salão (padrão America/Sao_Paulo). Telefone em E.164.

**LGPD**
- Salão = controlador; AgendOn = operador dos dados dos clientes finais.
- Não coletar CPF, saúde ou fotos no MVP. Dados pessoais não vão para logs nem para o Sentry.
- Opt-in do WhatsApp na página pública (data e origem em `clients`); opt-out por resposta SAIR.
- Exportação e anonimização de cliente; retenção agendada com pg_cron (ver o plano).
- Incidente de segurança: avisar o salão rapidamente; seguir o runbook (Resolução CD/ANPD 15/2024, confirmar prazos no texto).

## Comandos

CLI do Supabase é dependência de dev: use `npx supabase ...` ou os scripts npm.

```bash
npm run db:start              # sobe o Supabase local (precisa do Docker Desktop aberto)
npm run db:reset              # recria o banco local a partir das migrations
npm run db:test               # roda os testes pgTAP em supabase/tests/database
npm run db:stop               # para os containers
npm test                      # testes de unidade (Vitest) dos módulos do front-end
npm run db:types              # regenera src/lib/supabase/database.types.ts (rodar após cada migration)
npx supabase migration new x  # nova migration (nunca editar o banco de produção pelo painel)
```

Depois de criar uma migration, rode `npm run db:reset`: o `db:start` restaura o backup do banco e **não** aplica migrations novas.

Auth local: confirmação de e-mail ligada (como em produção); os e-mails chegam no Mailpit (`http://127.0.0.1:44324`). Abra o link no mesmo navegador do cadastro (fluxo PKCE).

Portas locais em 443xx (API 44321, Postgres 44322, Studio 44323, Mailpit 44324), fora da faixa dinâmica do Windows (49152+), que causava conflito com as 543xx padrão.

CI (a cada push na `main` e em todo PR): lint, `typecheck`, build, `npm audit --omit=dev --audit-level=high`, `supabase db start` + `test db` e gitleaks em todo o histórico. As vulnerabilidades moderadas do `npm audit` completo vêm do `eslint-config-next` (só dev); não rodar `npm audit fix --force`, que rebaixa o Next.

## Estado atual

Migrations em `supabase/migrations/`:
1. `..._schema.sql`: tabelas, restrição de conflito de horário.
2. `..._rls.sql`: RLS, funções `app.*`, permissões por perfil.
3. `..._create_salon.sql`: função de onboarding `create_salon`.
4. `20261108000001_onboarding.sql`: slugs reservados (`app.slug_reservado`), tamanho de slug/nome e um salão por usuário no MVP. `create_salon` devolve mensagens estáveis (`ja_tem_salao`, `slug_reservado`, `slug_invalido`, `nome_invalido`; slug em uso = `23505`).

5. `20261108000002_services.sql`: regras de serviço (nome único por salão, duração 5–720 min), policies de escrita separadas por ação (sem delete em serviços e profissionais: só desativar) e `btree_gist` em `extensions`.

6. `20261108000003_professionals.sql`: nome único por salão, vínculo profissional↔login com FK composta (um profissional por login), horários sem sobreposição (exclusão) e funções `salvar_horarios`, `salvar_servicos_profissional` e `adicionar_folga` (SECURITY INVOKER: a RLS vale; checam o perfil e respondem 42501).

7. `20261108000004_clients.sql`: WhatsApp obrigatório (E.164, único por salão; nulo só em cliente anonimizado), limites de nome (2–80) e observações (500), policies por ação sem delete (eliminação será por anonimização) e `listar_clientes(salão, busca, limite, offset)` com busca por nome ou dígitos do WhatsApp, visitas, faltas, último atendimento e total (SECURITY INVOKER).

8. `20261108000005_appointments.sql`: `appointments.preco` (preço no momento do agendamento), `app.dentro_do_expediente`, `criar_agendamento` (horário local do salão; duração e preço do serviço ou do ajuste do profissional; cliente existente ou novo por nome + WhatsApp, reaproveitando o WhatsApp já cadastrado; fora do expediente/folga só com `p_encaixe`; Profissional só na própria agenda desde a migration 10), `horarios_livres` (de 15 em 15 min, a partir de agora) e `agenda(salão, de, até)` (SECURITY DEFINER: Profissional vê só a própria agenda, com o nome do cliente e sem telefone/id).

9. `20261108000006_status.sql`: UPDATE direto em `appointments` revogado (sem policy de update): status e horário só mudam por `mudar_status` e `remarcar_agendamento` (SECURITY DEFINER, checam `app.pode_mexer_no_agendamento`). Transições: agendado→confirmado; agendado/confirmado→cancelado; concluído/faltou só depois do início; cancelado/faltou→agendado (23P01 se o horário foi ocupado); concluído é final. Remarcar: só agendado/confirmado, troca dia/hora/profissional (mantém serviço, cliente e preço; outro profissional = duração dele), volta para agendado, encaixe como na criação; Profissional só dentro da própria agenda. `horarios_livres(..., p_ignorar)` e `agendamento(id)` (mesmas regras de leitura de `agenda()`).

10. `20261108000007_profissional_agenda.sql`: `buscar_clientes_por_nome(salão, busca, limite)` (SECURITY DEFINER, qualquer membro: só nome, id e último atendimento concluído; não busca por telefone) e `criar_agendamento` como SECURITY DEFINER com `app.pode_mexer_no_agendamento` (Profissional agenda e cadastra cliente novo só na própria agenda; cliente por id precisa ser do salão e não anonimizado: `cliente_nao_encontrado`).


11. `20261109001416_reservar_rotas_senha.sql`: `esqueci-senha`, `nova-senha` e `senha` entram em `app.slug_reservado`.

12. `20261109014451_pagina_publica.sql`: `pagina_publica(slug)` (salão ativo, serviços com quem atenda, profissionais com horário e preço/duração próprios), `horarios_publicos(slug, serviço, profissional|null, dia)` e `agendar_publico(...)` (SECURITY DEFINER, **só `service_role`**: o servidor do app confere o CAPTCHA antes). Dias de hoje até hoje + 60, início a partir de agora + 30 min; "qualquer profissional" = quem tem menos agendamentos no dia; cliente pelo WhatsApp (existente não troca o nome); opt-in grava `consentimento_whatsapp_em`/`consentimento_origem = 'pagina_publica'`. Limites: 5 agendamentos/hora por origem (hash do IP em `app.agendamentos_publicos_por_origem`) e 3 futuros ativos por WhatsApp no salão (`muitos_agendamentos`, P0001).

13. `20261109174159_equipe.sql`: `members.nome`, gatilho `members_guarda` (para usuários logados: convite só vira ativo pelo próprio convidado, ninguém muda o próprio perfil/status, sempre um Dono(a) ativo, só convite pendente é apagado; 22023 com o nome da regra), `equipe(salão)` (só Dono(a): e-mail, convite, último acesso e agenda ligada), `meu_acesso()` (vínculo em qualquer status), `aceitar_convite()` e `email_em_uso(email)` (só Dono(a)). `convite`, `convites` e `equipe` reservados.

14. `20261109211141_dados_salao.sql`: `salons` ganha `whatsapp` (E.164), `email`, `instagram` (sem @), endereço em partes (`cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`; o antigo `endereco` virou `logradouro` e saiu) e `logo_path`; `fuso` só fusos do Brasil. Dono(a) só faz UPDATE nas colunas de cadastro (grant por coluna: `status`, `plano` e `slug` ficam de fora). `pagina_publica` devolve contatos, endereço (objeto) e logo. Storage: bucket público `logos` (1 MB, PNG/JPEG/WebP), pasta = id do salão, gravação só pelo Dono(a) (`app.salao_da_pasta`).

15. `20261109231254_lgpd_clientes.sql`: no painel, `clients` só aceita INSERT/UPDATE de `nome`, `telefone`, `observacoes` (+ `salon_id` no insert): consentimento, opt-out e anonimização só por função. `exportar_cliente(id)` (JSON: controlador, cliente, consentimento, agendamentos) e `anonimizar_cliente(id)` (cancela os agendados/confirmados futuros, apaga os dados pessoais, nome vira "Cliente anonimizado"; devolve quantos cancelou), ambas SECURITY DEFINER e só Dono(a) (42501; P0002 se não existe ou já anonimizado). Núcleo em `app.anonimizar_cliente`; retenção `app.anonimizar_inativos(meses)` (sem agendamento de qualquer status nem cadastro nos últimos 24 meses) no pg_cron `lgpd-retencao-clientes` (06:00 UTC). Tudo vai para `audit_log` (`exportar`, `anonimizar`, `anonimizar_retencao` com `user_id` nulo).

16. `20261109234523_message_log_fk.sql`: `appointments` ganha `unique (id, salon_id)` e `message_log.appointment_id` vira FK composta `(appointment_id, salon_id)` (`on delete set null (appointment_id)`).

17. `20261109235503_clientes_anonimizados_imutaveis.sql`: a policy de UPDATE de `clients` só vale para quem não foi anonimizado (a anonimização é definitiva; achado do Strix).

18. `20261112000001_whatsapp_fila.sql`: `message_log` vira a fila de saída (colunas `client_id`, `template`, `erro`, `tentativas`, `enviada_em`, `atualizada_em`; status `na_fila`, `enviando`, `enviada`, `entregue`, `lida`, `falhou`; índice único `(appointment_id, tipo)`; sem dado pessoal). Gatilho `appointments_enfileirar_confirmacao` (`app.enfileirar_confirmacao`): ao criar o agendamento, enfileira `confirmacao` (template `confirmacao_agendamento`) se o cliente tem opt-in, não saiu e não foi anonimizado, seja a origem a página pública ou o painel. Funções **só `service_role`**: `whatsapp_reservar(limite)` (descarta o que perdeu o sentido com `cancelada_antes_do_envio`, reserva até 50 com `for update skip locked`, no máximo 3 tentativas, e devolve telefone, nome, salão, serviço, profissional, início e fuso), `whatsapp_resultado(id, status, wamid, erro)` (enviada, falhou ou volta à fila; sem tentativas sobrando vira falha), `whatsapp_status_meta(wamid, status, erro)` (status do webhook, nunca volta para trás; devolve quantas mudaram) e `whatsapp_optout(telefones[])` (SAIR: todo cliente com esse WhatsApp, até 4 formas do número; vai para `audit_log` como `optout_whatsapp`). Dono(a) e Recepção só leem.

Testes: `01_isolation` (12), `02_onboarding` (13), `03_services` (14), `04_professionals` (20), `05_clients` (21), `06_appointments` (23, datas fixas em 2030 para não depender do dia), `07_status` (30), `08_profissional_agenda` (17), `09_pagina_publica` (25, datas relativas a hoje por causa do horizonte de 60 dias), `10_equipe` (27), `11_dados_salao` (19), `12_lgpd` (28), `13_message_log` (4), `14_whatsapp_fila` (43: gatilho, permissões, reservar, resultado, status do webhook, tentativas, SAIR e o caminho `agendar_publico` com opt-in). Os testes não podem depender do banco vazio (use slugs/nomes que não colidem com dados criados à mão nem com o seed).

Seed local (`supabase/seed.sql`, roda no `db:reset`; o `db push` não envia): salão "Studio Teste" com logins `dono@`, `recepcao@` e `profissional@agendon.test` (senha no arquivo), serviços, profissionais com horário, clientes e histórico.

App (`src/app`): `/entrar` (com "Esqueci a senha" e reenvio da confirmação se o e-mail não foi confirmado), `/cadastro` (sucesso com reenvio da confirmação), `/esqueci-senha` (link por e-mail; mesma resposta exista a conta ou não), `/nova-senha` (o link passa pelo `/auth/callback` e chega logado), `/auth/callback`, `/criar-salao`, `/painel`, `/painel/servicos` (lista, `novo`, `[id]`; só Dono(a) edita), `/painel/profissionais` (lista, `novo` com "sou eu", `[id]` com dados, serviços, horário semanal com intervalo e folgas; horários e folgas: Dono(a) e Recepção). `/painel/agenda` (dia com colunas por profissional, expediente, intervalo, folgas, linha de agora, resumo e atalhos de 30 em 30 min para agendar; Profissional vê só a própria coluna; `?vista=semana` mostra um profissional por vez, segunda a domingo, uma coluna por dia; `?profissional=` filtra o dia e escolhe o da semana; `carregarAgenda(vínculo, dias)` monta as colunas profissional × dia), `/painel/agenda/novo` (profissional, serviço, dia/hora com horários livres, cliente buscado ou novo, encaixe com confirmação, 23P01 oferece os livres). Clicar num agendamento abre `/painel/agenda/[id]` (detalhes e botões de status, de `proximosStatus`) e `/painel/agenda/[id]/remarcar`; dia/hora/livres/encaixe ficam em `escolha-horario.tsx`, usado pelos dois formulários. Grade: `src/lib/agenda.ts`; datas no fuso: `src/lib/datas.ts`; regra: `lerAgendamento`. `/painel/clientes` (lista com busca e paginação, `novo`, `[id]` com dados, histórico e "Chamar no WhatsApp"; só Dono(a) e Recepção; o item do menu some para quem não tem `ver-clientes`; cartão "Dados pessoais (LGPD)" só para `dados-do-titular`: "Baixar dados (JSON)" pela rota `/painel/clientes/[id]/exportar` (nome do arquivo em `arquivoDaExportacao`) e "Anonimizar cliente" com confirmação que diz quantos agendamentos futuros serão cancelados). Telefone: `lerTelefone` (`src/lib/regras/cliente.ts`) normaliza para E.164 (sem "+", número brasileiro); `formatarTelefone` exibe. Horário: `src/lib/horarios.ts` converte faixas do banco ↔ "início, fim e intervalo". Folgas: "Dia inteiro" (de/até, fim exclusivo às 00:00 do dia seguinte) ou "Horário" (um dia, seletor de 15 min); são digitadas no horário do salão e o banco converte para UTC com `salons.fuso`. Acesso em `src/lib/auth.ts` (`getUsuario`, `getVinculo`, `exigirUsuario`, `exigirVinculo`); o proxy só faz o redirecionamento otimista. O `createClient` do servidor chama `connection()` (exigência do Cache Components para o `Date.now()` do Supabase). Rotas novas do app precisam entrar na lista de `app.slug_reservado` (e em `SLUGS_RESERVADOS`). Página pública `/[slug]` (`src/app/[slug]`): serviço → profissional (ou qualquer um) → dia/horário → nome, WhatsApp, opt-in (desmarcado) e CAPTCHA (Cloudflare Turnstile, `src/lib/captcha.ts`); usa `clientePublico()` (`src/lib/supabase/publico.ts`, chave secreta, só para as 3 funções públicas) e `lerAgendamentoPublico`. Slug inexistente ou salão inativo = 404. WhatsApp: `src/lib/whatsapp/` (`template.ts` monta o corpo da Cloud API e documenta o texto do template; `graph.ts` classifica a resposta da Meta em enviada, falha definitiva ou tentar depois; `enviar.ts` `processarFila()` reserva, envia e grava o resultado; `eventos.ts` lê status e SAIR do webhook, incluindo o número brasileiro com e sem o 9; `assinatura.ts` confere o `X-Hub-Signature-256`) e `clienteWhatsApp()` (`src/lib/supabase/whatsapp.ts`, chave secreta, só para as funções `whatsapp_*`). `processarFila()` roda em `after()` depois de criar agendamento, na página pública (`agendar`) e no painel (`criarAgendamento`). Webhook em `/api/whatsapp/webhook` (GET devolve o desafio da Meta; POST valida a assinatura sobre o corpo bruto, aplica status e SAIR, 500 para a Meta tentar de novo). `/painel/agenda/[id]` mostra "Mensagens no WhatsApp" com o status (só Dono(a) e Recepção, pela RLS; `carregarMensagens`). Sem `META_ACCESS_TOKEN`/`META_PHONE_NUMBER_ID` a fila não é processada (aviso no log). Configurações: `/painel/configuracoes` abre em `dados` (Dados do salão, só Dono(a): logo, nome, WhatsApp, e-mail, Instagram, fuso e endereço com busca do CEP no ViaCEP pelo navegador; regras `lerDadosSalao`/`formatarEndereco` em `src/lib/regras/salao.ts`; logo enviada do navegador direto ao Storage e ligada por `salvarLogo`, que apaga a anterior; `src/lib/logo.ts`). Equipe: aba `equipe` (só Dono(a); lista, matriz de permissões, `convidar`, `[id]` com perfil, agenda, reenviar/cancelar convite e desativar/reativar). Convite: `auth.admin.inviteUserByEmail` (`authAdmin()`, `src/lib/supabase/admin.ts`, chave secreta, só para o Auth) cria o login; o vínculo entra como `convidado` pelo cliente do Dono(a) (RLS); o e-mail (`supabase/templates/convite.html`, link `{{ .RedirectTo }}?token_hash=...`) passa por `/auth/confirmar` (`verifyOtp`, sem PKCE) e chega em `/convite` (senha, aceite dos Termos, `aceitar_convite`). Convidado que entra por login vai para `/convite`; desativado vê "Acesso desativado" em `/criar-salao`. Regras: `lerConvite`/`lerMembro` (`src/lib/regras/equipe.ts`; Profissional exige agenda, existente ou nova).

## Fase 0: o que falta (nesta ordem)

- [x] `supabase init` (se `supabase/config.toml` ainda não existe) e `supabase start`.
- [x] Rodar `supabase db reset` e `supabase test db` e conferir que tudo passa (12/12, 2026-11-07).
- [x] Projeto Next.js + TypeScript na raiz, com `@supabase/supabase-js` e `@supabase/ssr`.
- [x] Projetos Supabase de staging e produção; variáveis de ambiente (ver `.env.example`). Vercel: produção em https://agendon.app.br (também https://agendon.vercel.app).
- [x] CI no GitHub Actions: lint, testes de banco, varredura de segredos (`.github/workflows/ci.yml`, repo privado github.com/Brunocvfl/agendon).
- [x] Tela de login e cadastro do salão (chamando `create_salon`) e "esqueci a senha".
- [x] Termos de Uso (`/termos`) e Política de Privacidade (`/privacidade`), grupo `src/app/(legal)`; dados da empresa, versão e e-mail do encarregado (`legal@agendon.app.br`, ImprovMX → Gmail) em `src/lib/legal.ts`. O cadastro exige o aceite e grava `termos_versao` e `termos_aceitos_em` no `user_metadata`. Revisão com a advogada (versão `2026-11-11.1`): resumo em linguagem simples e cláusulas limitativas em destaque (`src/app/(legal)/destaque.tsx`), papel de controlador/operador com obrigações (Termos, seção 3), transferência internacional (Política, seção 5), segurança (seção 9) e passo a passo para apagar dados (seção 8). Mudou `VERSAO_DOCUMENTOS`? O painel pede novo aceite (`AvisoNovosTermos`, ação `aceitarNovosTermos`).
- [x] Conta Meta Business aberta e verificação do negócio aprovada (2026-11-12). App "AgendOn" criado na Meta, com conta do WhatsApp Business (WABA) e número de teste.
- [ ] Envio de mensagens pelo WhatsApp (fatia 1: confirmação; fatia 2: lembrete, cancelamento e remarcação) e screencast para a análise do app na Meta (permissão `whatsapp_business_messaging`).

## Ambientes na nuvem

| | Staging | Produção |
|---|---|---|
| Supabase (org Code House, Free, sa-east-1) | `agendon-staging` · `lxhdfndnzubjephohhbh` | `agendon-prod` · `sbpndxarmcobcsgllizc` |
| Vercel (time Code House, projeto `agendon`, Hobby) | Preview (PRs/branches): `agendon-*-code-house4.vercel.app` | Production (`main`): https://agendon.app.br (`www` redireciona; `agendon.vercel.app` continua no ar) |

- **Fluxo de entrega:** a `main` vai direto para produção. Mudança com migration: branch + PR (preview usa o staging) → `db push` no staging → testar o preview → `db push` na produção (com confirmação) → merge.
- O projeto local está ligado (`supabase link`) ao **staging**. Comandos remotos: `npx supabase db push --remote --yes` (staging) ou `--remote=sbpndxarmcobcsgllizc` (produção). Produção sempre com confirmação explícita.
- Auth na nuvem vem do `config.toml` (seções `[remotes.staging]` e `[remotes.production]`): `npx supabase config diff --remote=<ref>` para conferir, `config push --remote=<ref> --yes` para aplicar. A base do arquivo foi alinhada aos padrões da nuvem para o diff mostrar só o que é nosso. O SMTP (Resend, `smtp.resend.com`, remetente `nao-responda@agendon.app.br`) lê `RESEND_API_KEY_STAGING`/`RESEND_API_KEY_PROD` (chaves "Sending access", em `.env.local`); antes do `config diff|push`, carregue-as no shell: `set -a; . <(grep -E '^RESEND_API_KEY_' .env.local | tr -d '
'); set +a`. Modelos de e-mail em português em `supabase/templates/` (o plano Free só aceita modelos com SMTP próprio).
- Variáveis na Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` (Production = prod, Preview = staging); `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY` (Production = chaves reais do widget `agendon.app.br`, Preview = chaves de teste da Cloudflare). WhatsApp (só servidor; ver `.env.example`): `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID` e, opcional, `META_GRAPH_VERSION` (padrão `v23.0`); na análise do app valem o número e o token de teste da Meta, em Production e Preview. `NEXT_PUBLIC_SITE_URL` não é usada na nuvem: o link de confirmação usa a origem da requisição, validada pela lista de retorno do Supabase.
- Webhook do WhatsApp cadastrado na Meta (2026-11-12) pela API do app (`POST /{META_APP_ID}/subscriptions`, token do app `id|segredo`): objeto `whatsapp_business_account`, URL `https://agendon.app.br/api/whatsapp/webhook`, campo `messages`, ativo. Uma só URL por app: os previews ficam sem webhook. Na Vercel já estão `META_APP_SECRET` e `META_WEBHOOK_VERIFY_TOKEN` (Production e Preview; o token foi gerado aqui e está no `.env.local`). Testado em produção: GET com token certo devolve o desafio (errado = 403), POST assinado = 200, assinatura falsa = 401. `META_ACCESS_TOKEN` e `META_PHONE_NUMBER_ID` também estão na Vercel (Production e Preview); o token é **permanente**, do usuário do sistema `agendon-servidor` (Funcionário; controle total só do app AgendOn e da WABA; sem expiração), e a WABA já estava assinada no app. Trocar o valor de uma variável: `vercel env update NOME production|preview --yes` (o `env rm` pede aprovação humana) e depois `vercel redeploy https://agendon.app.br --target production`. Migrations 17 e 18 aplicadas no staging e na produção em 2026-11-12.
- CLI da Vercel instalada e logada; a pasta está ligada ao projeto (`vercel link`, escopo `code-house4`). O `vercel link` acrescenta `.vercel` e `.env*` ao `.gitignore`: desfazer, o arquivo já cobre os dois e mantém o `.env.example`.
- `supabase test db --remote` não funciona no CLI 3.0 (não acha o `plan()` do pgTAP). Os testes rodam local e no CI; na nuvem, verificar com consultas de leitura (`db query --remote`: RLS em todas as tabelas, zero grants para `anon`) e `db advisors --remote`.
- Antes do piloto: Supabase produção → Pro (backup diário, sem pausa, e ligar a proteção contra senhas vazadas — aviso `auth_leaked_password_protection` do advisor); Vercel → Pro (Hobby não permite uso comercial).

## Pendências técnicas

- Login com Google e Microsoft (adiado em 2026-11-09): aprovado, fica para depois. Plano: `signInWithOAuth` pelo `/auth/callback` nos dois provedores (Microsoft = provider `azure`, contas pessoais e de trabalho, claim opcional `email`); um app por provedor com as URIs de callback dos três ambientes; segredos em `.env.local` lidos pelo `config.toml`. A tela de consentimento mostra `...supabase.co` até termos domínio próprio no Supabase (Pro + adicional).

## Decisões tomadas

- Domínio: `agendon.app.br` (comprado em 2026-11-08), no lugar de `agendon.com.br`.
- Senha: mínimo de 10 caracteres, com maiúscula, minúscula e número (`password_requirements = "lower_upper_letters_digits"` no Auth; `src/lib/regras/senha.ts` espelha e `CampoSenhaNova` mostra os requisitos). Bloqueio de senha vazada quando a produção for Pro (2026-11-09).
- WhatsApp do cliente é obrigatório também no cadastro pelo painel (2026-11-08).
- Agendamento manual pelo painel pode ser feito fora do expediente ou numa folga (encaixe), com aviso e confirmação; sobreposição com outro agendamento continua proibida. A página pública só oferece horários livres (2026-11-08).
- Profissional vê o nome do cliente na própria agenda, nunca o telefone: resolvido pela função `agenda()` (2026-11-08).
- Status: regras simples (ver migration 9); Profissional muda status e remarca só na própria agenda; remarcar troca dia, hora e profissional, nunca serviço ou cliente (2026-11-08).
- Página pública: opt-in do WhatsApp é uma caixa desmarcada (consentimento livre); cancelar/remarcar pelo link fica para quando houver mensagens (2026-11-09).
- Dados do salão (2026-11-09): identificação, endereço e logo agora; horário do salão, feriados e desativar o link público ficam para depois; CNPJ/CPF só em Plano e cobrança (não coletar antes de precisar).
- Equipe e acessos (2026-11-09): convite por e-mail (link de 1 hora; dá para reenviar, ou a pessoa usa "Esqueci a senha"), tela em Configurações → Equipe, Dono(a) edita perfil e agenda, reenvia/cancela convite e desativa (nunca apaga quem já entrou). E-mail que já tem conta no AgendOn não pode ser convidado no MVP (um salão por login). Pode haver mais de um Dono(a).
- LGPD do cliente (2026-11-09): exportar e anonimizar só pelo Dono(a); exportação em JSON; anonimizar cancela os agendamentos futuros e mantém os passados sem identificação; retenção automática de 24 meses sem agendamento (pg_cron diário).
- Visão de semana da agenda: um profissional por vez (filtro), semana de segunda a domingo (2026-11-09).
- Profissional agenda na própria agenda: busca de cliente só pelo nome, mostrando a última visita (nenhuma parte do telefone); pode cadastrar cliente novo com nome + WhatsApp (WhatsApp já cadastrado vai para o cliente existente) (2026-11-08).
- Análise do app na Meta (2026-11-12): o screencast da permissão `whatsapp_business_messaging` usa o **número de teste da Meta** (+1 555-143-7737; só envia para destinatários cadastrados no painel da Meta). O vídeo mostra só o que existe: confirmação e lembrete antes do horário (a descrição de uso enviada à Meta não cita cancelamento nem remarcação até eles existirem). Fluxo gravado: cliente agenda na página pública com o opt-in marcado → a mensagem chega no WhatsApp → o painel mostra o status da mensagem.
- Envio do WhatsApp (2026-11-12): a fila é a tabela `message_log` (já existia; ganhou colunas e índice único `(appointment_id, tipo)`). Um gatilho em `appointments` enfileira a confirmação só se o cliente tem opt-in e não saiu. O envio e o webhook da Meta ficam em **rotas do Next** (não em Edge Functions, para ter um só código, com teste de unidade): `src/lib/whatsapp/*` e `/api/whatsapp/webhook`. O servidor só fala com a fila por funções RPC próprias (`clienteWhatsApp()`), nunca lendo tabelas. A mensagem não guarda dado pessoal: telefone e nome são lidos do cliente na hora do envio. Reenvio automático e agendador (pg_cron + pg_net) entram na fatia 2, junto com o lembrete.

## Decisões em aberto

- Número de WhatsApp definitivo: um por salão ou um compartilhado do AgendOn no piloto. Para a análise do app na Meta vale o número de teste (ver Decisões tomadas, 2026-11-12).
- Preço da mensagem de utilidade da Meta (fontes divergem): confirmar antes de fechar os planos.
- Prazo de retenção de clientes inativos: 24 meses no ar desde 2026-11-09 (Política de Privacidade versão `2026-11-09.2`); confirmar com o jurídico.
- Limite de plano a testar primeiro: agendamentos/mês ou agendas.

## Marca

Azul On `#2F5BFF`, Azul noite `#0F1B4D`, Verde confirmado `#19C37D`, branco, fundo claro `#F7F8FC`. Fonte Sora. Wireframes em `wireframes/` (PNG).

## Como trabalhar aqui

- Uma fatia pequena por vez, funcionando de ponta a ponta antes de seguir.
- Perguntar quando houver dúvida; decisões irreversíveis só com confirmação.
- Atualizar este arquivo quando uma decisão mudar.
