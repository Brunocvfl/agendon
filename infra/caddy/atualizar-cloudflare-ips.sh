#!/usr/bin/env bash
# Baixa as faixas de IP da Cloudflare e atualiza:
#   1. /srv/caddy/cloudflare_ips: proxies confiáveis do Caddy (de onde aceitar CF-Connecting-IP);
#   2. o firewall: as portas 80 e 443 só aceitam conexões vindas da Cloudflare (ufw e, para as portas
#      publicadas pelo Docker, a cadeia DOCKER-USER via firewall-web.sh).
# Rodar como root (sudo). Seguro para rodar de novo: só troca as regras se a lista baixada for válida.
set -euo pipefail

DIR=/srv/caddy
v4=$(curl -fsS --max-time 20 https://www.cloudflare.com/ips-v4)
v6=$(curl -fsS --max-time 20 https://www.cloudflare.com/ips-v6)
faixas=$(printf '%s\n%s\n' "$v4" "$v6" | grep -E '^[0-9a-f:.]+/[0-9]+$' || true)
total=$(printf '%s\n' "$faixas" | grep -c . || true)
if [ "$total" -lt 10 ]; then
	echo "Lista da Cloudflare inválida ($total faixas); nada foi alterado." >&2
	exit 1
fi

printf '%s\n' "$faixas" > "$DIR/cloudflare_faixas"
printf 'trusted_proxies static %s\n' "$(printf '%s ' $faixas)" > "$DIR/cloudflare_ips.novo"
mv "$DIR/cloudflare_ips.novo" "$DIR/cloudflare_ips"

# Portas publicadas pelo Docker (o ufw não vale para elas).
"$DIR/firewall-web.sh"

# ufw: tira as regras antigas de 80/443 e libera só as faixas da Cloudflare.
while ufw status numbered | grep -qE ' (80|443)/tcp '; do
	n=$(ufw status numbered | grep -E ' (80|443)/tcp ' | head -1 | sed -E 's/^\[ *([0-9]+)\].*/\1/')
	ufw --force delete "$n" >/dev/null
done
for f in $faixas; do
	ufw allow proto tcp from "$f" to any port 80,443 comment cloudflare >/dev/null
done
ufw reload >/dev/null

if docker ps --format '{{.Names}}' | grep -qx caddy; then
	docker exec caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null
fi
echo "Cloudflare: $total faixas aplicadas no Caddy e no ufw."
