# Glossário do AgendOn

Termos do domínio e dos módulos. Use estes nomes no código, nos commits e nas conversas.

## Domínio

- **Salão**: o cliente do AgendOn (tenant). Tudo pertence a um salão (`salon_id`). Inclui autônomos (salão de uma pessoa).
- **Vínculo**: a ligação de um login com um salão e o seu **perfil** (`public.members`). No MVP, um login tem um vínculo.
- **Perfil**: Dono(a), Recepção ou Profissional. Define o que o vínculo pode fazer (ver **Permissão**).
- **Permissão**: uma ação do painel nomeada na matriz de permissões (ex.: `editar-servicos`). Perguntada com `pode(perfil, permissão)`.
- **Serviço**: o que o salão oferece, com duração e preço. Nunca é apagado, só desativado.
- **Profissional**: quem atende. Pode estar ligado a um login (o "sou eu"). Nunca é apagado, só desativado.
- **Horário semanal**: os dias e horários em que um profissional atende, com **pausa** opcional. No banco, cada dia vira uma ou duas **faixas**.
- **Folga**: período em que o profissional não atende (férias, compromisso). Digitada no fuso do salão, gravada em UTC.
- **Cliente**: quem agenda. Dado pessoal (LGPD): Profissional não vê o telefone.
- **Agendamento**: um cliente, um serviço e um profissional num horário. Nunca é apagado: muda de **status** (agendado, confirmado, concluído, faltou, cancelado). Faltou e cancelado liberam o horário.
- **Remarcar**: mudar dia, hora ou profissional de um agendamento ainda de pé; serviço, cliente e preço ficam.
- **Encaixe**: agendamento fora do expediente ou numa folga, feito pelo painel com confirmação.

## Módulos do front-end

- **Permissões** (`src/lib/permissoes.ts`): a matriz de perfis em código. Interface: `pode(perfil, permissão)`.
- **Regras de cadastro** (`src/lib/regras/`): leitura e validação puras de cada entidade (`lerServico`, `lerProfissional`, `lerFolga`, `lerSalao`). Entra dado cru, sai valor válido ou erros por campo.
- **Ação do painel** (`src/lib/acao.ts`): a Server Action padrão do painel. Exige a permissão, lê com a regra, executa, traduz erros do banco e atualiza a tela.
- **Página protegida** (`src/components/pagina-protegida.tsx`): o esqueleto das páginas do painel. Exige a permissão, valida o id da rota e entrega o vínculo para o conteúdo.
