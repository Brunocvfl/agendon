# AgendOn

Web app de agendamento para salões de beleza (salões com vários profissionais e autônomos), na categoria de agendaai.com.br. Desenvolvido por uma pessoa só, junto com o Claude Code. Responda sempre em português do Brasil, de forma objetiva.

Plano completo (arquitetura, segurança, LGPD, cronograma): https://claude.ai/artifact/UfqNi8onN65NibBPPScj2j

## Produto (MVP)

- **Cliente final** (página pública `agendon.com.br/nome-do-salao`, sem login, mobile first): escolhe serviço, profissional (ou "qualquer um"), horário livre, informa nome e WhatsApp e confirma. Recebe confirmação e lembrete no WhatsApp e pode cancelar ou remarcar pelo link.
- **Salão** (painel, com login): cadastro do salão, serviços (nome, duração, preço), profissionais (serviços, horários, folgas), agenda do dia/semana com agendamento manual, status (agendado, confirmado, concluído, faltou, cancelado), clientes com histórico, lembretes por WhatsApp, equipe e acessos.
- **Perfis fixos no MVP:** Dono(a), Recepção, Profissional.
- **Fora do MVP:** pagamento online, comissões, estoque, fidelidade, app nativo, multi-unidade, relatórios financeiros, SMS/e-mail como canais, pós-atendimento, permissões personalizadas.

Matriz de permissões:

| Permissão | Dono(a) | Recepção | Profissional |
|---|---|---|---|
| Ver a agenda de todos | sim | sim | não (só a própria) |
| Criar e remarcar agendamentos | sim | sim | sim (só na própria agenda) |
| Ver clientes, histórico e telefone | sim | sim | não |
| Editar serviços e preços | sim | não | não |
| Editar horários e folgas | sim | sim | não |
| Editar lembretes e link público | sim | não | não |
| Plano, cobrança e usuários | sim | não | não |

## Stack

- Front: Next.js 16 (App Router, `src/`) + TypeScript + Tailwind 4, hospedado na Vercel. Ler `AGENTS.md` e a documentação em `node_modules/next/dist/docs/` antes de usar APIs do Next: o antigo `middleware` agora é `src/proxy.ts`, e com `cacheComponents` ligado toda leitura de sessão/cookies fica dentro de `<Suspense>`.
- Módulos do front-end (termos em `GLOSSARY.md`), use-os em vez de repetir o padrão:
  - **Permissões** `src/lib/permissoes.ts`: a matriz abaixo em código. `pode(perfil, permissão)`; no servidor, `exigirPermissao(permissão, senão)` (`src/lib/auth.ts`). Mudou a matriz? Mude aqui e no teste.
  - **Regras de cadastro** `src/lib/regras/*`: leitura e validação puras (`lerServico`, `lerNomeProfissional`, `lerFolga`, `lerSalao`) e os `LIMITES_*` usados pelos formulários. Espelham as restrições do banco.
  - **Ação do painel** `src/lib/acao.ts`: toda Server Action do painel é `acaoDoPainel({ permissao, ler, executar, mensagens, depois })` ou `comandoDoPainel(...)`. Tradução dos erros do Postgres num lugar só.
  - **Página protegida** `src/components/pagina-protegida.tsx`: toda página do painel usa `<PaginaProtegida exige=... params=...>{({ vinculo, id }) => ...}</PaginaProtegida>`.
  - Testes de unidade (Vitest) ao lado do módulo: `npm test`. Testar pela interface do módulo.
- Supabase no app: `src/lib/supabase/` (`client.ts` para o navegador, `server.ts` para o servidor, `proxy.ts` renova a sessão). Para validar o usuário no servidor, usar `auth.getClaims()`, nunca `getSession()`.
- Back-end: Supabase (Postgres, Auth, Edge Functions, Storage, pg_cron + fila), região **sa-east-1 (São Paulo)**.
- WhatsApp: API oficial da Meta (WhatsApp Business Platform), templates aprovados.
- Erros: Sentry (sem dados pessoais). E-mail de autenticação: SMTP próprio.
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

Testes: `01_isolation` (12), `02_onboarding` (11), `03_services` (14), `04_professionals` (20), `05_clients` (21). Os testes não podem depender do banco vazio (use slugs/nomes que não colidem com dados criados à mão nem com o seed).

Seed local (`supabase/seed.sql`, roda no `db:reset`; o `db push` não envia): salão "Studio Teste" com logins `dono@`, `recepcao@` e `profissional@agendon.test` (senha no arquivo), serviços, profissionais com horário, clientes e histórico.

App (`src/app`): `/entrar`, `/cadastro`, `/auth/callback`, `/criar-salao`, `/painel`, `/painel/servicos` (lista, `novo`, `[id]`; só Dono(a) edita), `/painel/profissionais` (lista, `novo` com "sou eu", `[id]` com dados, serviços, horário semanal com intervalo e folgas; horários e folgas: Dono(a) e Recepção). `/painel/clientes` (lista com busca e paginação, `novo`, `[id]` com dados, histórico e "Chamar no WhatsApp"; só Dono(a) e Recepção; o item do menu some para quem não tem `ver-clientes`). Telefone: `lerTelefone` (`src/lib/regras/cliente.ts`) normaliza para E.164 (sem "+", número brasileiro); `formatarTelefone` exibe. Horário: `src/lib/horarios.ts` converte faixas do banco ↔ "início, fim e intervalo". Folgas: "Dia inteiro" (de/até, fim exclusivo às 00:00 do dia seguinte) ou "Horário" (um dia, seletor de 15 min); são digitadas no horário do salão e o banco converte para UTC com `salons.fuso`. Acesso em `src/lib/auth.ts` (`getUsuario`, `getVinculo`, `exigirUsuario`, `exigirVinculo`); o proxy só faz o redirecionamento otimista. O `createClient` do servidor chama `connection()` (exigência do Cache Components para o `Date.now()` do Supabase). Rotas novas do app precisam entrar na lista de `app.slug_reservado`.

## Fase 0: o que falta (nesta ordem)

- [x] `supabase init` (se `supabase/config.toml` ainda não existe) e `supabase start`.
- [x] Rodar `supabase db reset` e `supabase test db` e conferir que tudo passa (12/12, 2026-11-07).
- [x] Projeto Next.js + TypeScript na raiz, com `@supabase/supabase-js` e `@supabase/ssr`.
- [x] Projetos Supabase de staging e produção; variáveis de ambiente (ver `.env.example`). Vercel: produção em https://agendon.vercel.app.
- [x] CI no GitHub Actions: lint, testes de banco, varredura de segredos (`.github/workflows/ci.yml`, repo privado github.com/Brunocvfl/agendon).
- [x] Tela de login e cadastro do salão (chamando `create_salon`). Falta: "esqueci a senha" e página de termos/privacidade.
- [ ] Conta Meta Business aberta e verificação do negócio iniciada.

## Ambientes na nuvem

| | Staging | Produção |
|---|---|---|
| Supabase (org Code House, Free, sa-east-1) | `agendon-staging` · `lxhdfndnzubjephohhbh` | `agendon-prod` · `sbpndxarmcobcsgllizc` |
| Vercel (time Code House, projeto `agendon`, Hobby) | Preview (PRs/branches): `agendon-*-code-house4.vercel.app` | Production (`main`): https://agendon.vercel.app |

- **Fluxo de entrega:** a `main` vai direto para produção. Mudança com migration: branch + PR (preview usa o staging) → `db push` no staging → testar o preview → `db push` na produção (com confirmação) → merge.
- O projeto local está ligado (`supabase link`) ao **staging**. Comandos remotos: `npx supabase db push --remote --yes` (staging) ou `--remote=sbpndxarmcobcsgllizc` (produção). Produção sempre com confirmação explícita.
- Auth na nuvem vem do `config.toml` (seções `[remotes.staging]` e `[remotes.production]`): `npx supabase config diff --remote=<ref>` para conferir, `config push --remote=<ref> --yes` para aplicar. A base do arquivo foi alinhada aos padrões da nuvem para o diff mostrar só o que é nosso.
- Variáveis na Vercel: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production = prod, Preview = staging). `NEXT_PUBLIC_SITE_URL` não é usada na nuvem: o link de confirmação usa a origem da requisição, validada pela lista de retorno do Supabase.
- `supabase test db --remote` não funciona no CLI 3.0 (não acha o `plan()` do pgTAP). Os testes rodam local e no CI; na nuvem, verificar com consultas de leitura (`db query --remote`: RLS em todas as tabelas, zero grants para `anon`) e `db advisors --remote`.
- Antes do piloto: Supabase produção → Pro (backup diário, sem pausa, e ligar a proteção contra senhas vazadas — aviso `auth_leaked_password_protection` do advisor); Vercel → Pro (Hobby não permite uso comercial); registrar `agendon.com.br` e configurar SMTP no Resend.

## Pendências técnicas

- `message_log.appointment_id` com FK composta `(id, salon_id)`.

## Decisões tomadas

- WhatsApp do cliente é obrigatório também no cadastro pelo painel (2026-11-08).
- Agendamento manual pelo painel pode ser feito fora do expediente ou numa folga (encaixe), com aviso e confirmação; sobreposição com outro agendamento continua proibida. A página pública só oferece horários livres (2026-11-08).

## Decisões em aberto

- Profissional vê o **nome** do cliente na própria agenda (wireframe mostra), mas não o telefone. Hoje a policy de `clients` bloqueia tudo para Profissional. Resolver com uma view ou função que devolva só o nome.
- Número de WhatsApp: um por salão ou um compartilhado do AgendOn no piloto.
- Preço da mensagem de utilidade da Meta (fontes divergem): confirmar antes de fechar os planos.
- Prazo de retenção de clientes inativos (sugestão: 24 meses).
- Limite de plano a testar primeiro: agendamentos/mês ou agendas.

## Marca

Azul On `#2F5BFF`, Azul noite `#0F1B4D`, Verde confirmado `#19C37D`, branco, fundo claro `#F7F8FC`. Fonte Sora. Wireframes em `wireframes/` (PNG).

## Como trabalhar aqui

- Uma fatia pequena por vez, funcionando de ponta a ponta antes de seguir.
- Perguntar quando houver dúvida; decisões irreversíveis só com confirmação.
- Atualizar este arquivo quando uma decisão mudar.
