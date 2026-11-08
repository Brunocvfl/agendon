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
npx supabase migration new x  # nova migration (nunca editar o banco de produção pelo painel)
```

Portas locais em 443xx (API 44321, Postgres 44322, Studio 44323, Mailpit 44324), fora da faixa dinâmica do Windows (49152+), que causava conflito com as 543xx padrão.

## Estado atual

Migrations em `supabase/migrations/`:
1. `..._schema.sql`: tabelas, restrição de conflito de horário.
2. `..._rls.sql`: RLS, funções `app.*`, permissões por perfil.
3. `..._create_salon.sql`: função de onboarding `create_salon`.

Testes: `supabase/tests/database/01_isolation.test.sql` (12 testes).

## Fase 0: o que falta (nesta ordem)

- [x] `supabase init` (se `supabase/config.toml` ainda não existe) e `supabase start`.
- [x] Rodar `supabase db reset` e `supabase test db` e conferir que tudo passa (12/12, 2026-11-07).
- [x] Projeto Next.js + TypeScript na raiz, com `@supabase/supabase-js` e `@supabase/ssr`.
- [ ] Projetos Supabase de staging e produção; variáveis de ambiente (ver `.env.example`).
- [ ] CI no GitHub Actions: lint, testes de banco, varredura de segredos.
- [ ] Tela de login e cadastro do salão (chamando `create_salon`).
- [ ] Conta Meta Business aberta e verificação do negócio iniciada.

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
