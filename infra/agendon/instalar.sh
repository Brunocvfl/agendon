#!/usr/bin/env bash
# Instala o AgendOn num servidor já preparado pelo infra/bootstrap.sh. Roda como root, a partir de uma
# cópia da pasta infra/. Idempotente. Passo a passo completo em infra/README.md.
#
#   sudo bash infra/agendon/instalar.sh "<chave pública SSH do deploy (GitHub Actions)>"
#
# Faz: usuário `deploy` (só roda o deploy.sh), /srv/agendon com compose e deploy.sh, modelos dos .env
# (sem valores), site do Caddy (produção, www e staging com senha).
# NÃO faz: segredos (.env.producao/.env.staging), certificado, senha do staging, DNS, GitHub.
set -euo pipefail

CHAVE=${1:-}
INFRA=$(cd "$(dirname "$0")/.." && pwd)
DIR=/srv/agendon
[ "$(id -u)" = 0 ] || { echo "Rode como root (sudo)." >&2; exit 1; }
[[ "$CHAVE" =~ ^ssh-ed25519\ [A-Za-z0-9+/=]+ ]] || { echo "uso: instalar.sh \"<chave pública ssh-ed25519 do deploy>\"" >&2; exit 2; }
[ -d /srv/caddy ] && docker network inspect web > /dev/null 2>&1 || { echo "Rode antes o infra/bootstrap.sh." >&2; exit 1; }

echo "== Usuário deploy"
id deploy > /dev/null 2>&1 || adduser --disabled-password --gecos "" deploy > /dev/null
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
# Comando forçado: a chave do GitHub Actions só consegue rodar o deploy.sh.
echo "restrict,command=\"$DIR/deploy.sh\" $CHAVE" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys

echo "== $DIR"
install -d -o root -g deploy -m 1775 "$DIR" # sticky: o deploy cria os próprios arquivos e não apaga os do root
install -o root -g root -m 755 "$INFRA/agendon/deploy.sh" "$DIR/deploy.sh"
install -o root -g root -m 644 "$INFRA/agendon/compose.yaml" "$DIR/compose.yaml"
for f in .env .deploy.lock; do
	[ -f "$DIR/$f" ] || install -o deploy -g deploy -m 640 /dev/null "$DIR/$f"
done

modelo() {
	cat << EOF
# Segredos do AgendOn ($1). Só neste servidor (root:deploy 640), nunca no Git.
# Sem aspas, um por linha. Depois de editar: sudo -u deploy docker compose up -d --force-recreate $1
SUPABASE_SECRET_KEY=
TURNSTILE_SECRET_KEY=$2
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
META_ACCESS_TOKEN=
META_PHONE_NUMBER_ID=
META_WABA_ID=
ADMINS_PLATAFORMA=
WHATSAPP_PROCESSAR_SEGREDO=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:legal@agendon.app.br
EOF
}
# Chave de teste do Turnstile (pública, sempre passa) no staging.
[ -s "$DIR/.env.producao" ] || modelo producao "" > "$DIR/.env.producao"
[ -s "$DIR/.env.staging" ] || modelo staging 1x0000000000000000000000000000000AA > "$DIR/.env.staging"
chown root:deploy "$DIR/.env.producao" "$DIR/.env.staging"
chmod 640 "$DIR/.env.producao" "$DIR/.env.staging"

echo "== Site no Caddy"
install -o ops -g ops -m 644 "$INFRA/caddy/sites/agendon.caddy" /srv/caddy/sites/agendon.caddy
[ -f /srv/caddy/usuarios/agendon-staging ] || {
	echo "   Falta a senha do staging: /srv/caddy/usuarios/agendon-staging (ver README)."
	install -o ops -g ops -m 644 /dev/null /srv/caddy/usuarios/agendon-staging
}
if [ -f /srv/caddy/certs/agendon.app.br.pem ] && [ -s /srv/caddy/usuarios/agendon-staging ]; then
	(cd /srv/caddy && docker compose up -d --quiet-pull > /dev/null 2>&1)
	docker exec caddy caddy reload --config /etc/caddy/Caddyfile > /dev/null 2>&1 && echo "   Caddy recarregado."
else
	echo "   Caddy não recarregado: faltam o certificado em /srv/caddy/certs ou a senha do staging (ver README)."
fi

echo "== Pronto. Segredos a preencher:"
for f in .env.producao .env.staging; do
	vazias=$(grep -cE '^[A-Z_]+=$' "$DIR/$f" || true)
	echo "   $f: $vazias vazia(s)"
done
