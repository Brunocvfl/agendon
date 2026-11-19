# Servidores da Code House

Padrão de nome: `CH` + função + local + número (ex.: `CHCOMPSP01` = Code House, compartilhado, São Paulo, 01).
Hostname em minúsculas (`chcompsp01`). O IP não vai para o Git (repositório público; a Cloudflare esconde a origem).

| Pasta | O que é |
|---|---|
| `bootstrap.sh` | Base de qualquer servidor: SSH, firewall, Docker, Caddy |
| `caddy/` | Caddy compartilhado (`/srv/caddy`): um arquivo por site em `sites/`, 80/443 só para a Cloudflare |
| `agendon/` | AgendOn (`/srv/agendon`): `instalar.sh`, `compose.yaml` e o `deploy.sh` que o GitHub Actions chama |

Os scripts são idempotentes: rodar de novo só corrige o que estiver diferente.

## Servidor novo, do zero

Requisitos: VPS com Ubuntu 24.04 limpo (sem painel), virtualização completa (KVM ou Xen HVM), IPv4, a sua
chave SSH cadastrada para o root na criação (ou senha do root para o primeiro acesso).

**1. Base** (do seu computador, na raiz do repositório):

```bash
scp -r infra root@<ip>:/root/infra
ssh root@<ip> 'bash /root/infra/bootstrap.sh chcompsp02 "'"$(cat ~/.ssh/id_ed25519.pub)"'"'
```

O script fecha o root e a senha no SSH: dali em diante, `ssh ops@<ip>`. Se pedir, reinicie (`sudo systemctl reboot`).

**2. Cloudflare** (DNS do domínio já na Cloudflare):
- Registros `A` do domínio, `www` (CNAME para o domínio) e `staging`, apontando para o IP novo, **com proxy (laranja)**.
- SSL/TLS: **Full (strict)**.
- Certificado de origem (SSL/TLS → Servidor de origem): ECC, 15 anos, `dominio` e `*.dominio`. Grave em
  `/srv/caddy/certs/<dominio>.pem` e `.key` (a chave privada aparece uma vez só; trocou o certificado,
  `docker compose restart caddy` em `/srv/caddy`).

**3. AgendOn**:

```bash
# chave do deploy (sem senha, só para o GitHub Actions): gere no seu computador
ssh-keygen -t ed25519 -N "" -C github-actions-deploy-agendon -f deploy_agendon
scp -r infra ops@<ip>:/tmp/infra
ssh ops@<ip> "sudo bash /tmp/infra/agendon/instalar.sh \"$(cat deploy_agendon.pub)\" && rm -rf /tmp/infra"
```

Depois:
- **Senha do staging** (basic auth do Caddy):
  `docker run --rm caddy:2.11.9-alpine caddy hash-password --plaintext '<senha>'` e grave
  `agendon <hash>` em `/srv/caddy/usuarios/agendon-staging`.
- **Segredos**: `sudo nano /srv/agendon/.env.producao` e `.env.staging` (modelo com os nomes; valores no
  gerenciador de senhas, no Supabase — chave secreta própria por servidor —, na Meta, no Vault do Supabase
  de produção para o `WHATSAPP_PROCESSAR_SEGREDO` e um par VAPID por ambiente).
- **GitHub** (repositório → Settings → Secrets): `DEPLOY_SSH_KEY` (conteúdo do `deploy_agendon`, depois
  apague o arquivo), `DEPLOY_HOST` (IP) e `DEPLOY_KNOWN_HOSTS` (`ssh-keyscan -t ed25519 <ip>`). Variáveis
  dos ambientes `producao` e `staging`: as `NEXT_PUBLIC_*` (ver `.github/workflows/deploy.yml`).
- **Primeiro deploy**: Actions → "Deploy (VPS)" → Run workflow na `main` (produção) e um push num PR (staging).
- **Supabase de staging**: `https://staging.<dominio>/**` na lista de retorno do Auth (`supabase/config.toml`).
- **Monitor**: UptimeRobot em `https://<dominio>/api/saude` (e staging).

## Do dia a dia

```bash
ssh ops@<ip>
cd /srv/agendon && docker compose ps                    # contêineres
docker logs --since 1h agendon-producao                # logs (sem dado pessoal)
sudo nano /srv/agendon/.env.producao                   # segredo novo
sudo -u deploy docker compose up -d --force-recreate producao
sudo /srv/caddy/atualizar-cloudflare-ips.sh            # faixas da Cloudflare (roda toda segunda)
```

Voltar uma versão: Actions → "Deploy (VPS)" → Run workflow num commit anterior, ou no servidor
`sudo -u deploy SSH_ORIGINAL_COMMAND="producao <sha>" /srv/agendon/deploy.sh` (imagem ainda guardada:
o deploy mantém as 3 últimas).
