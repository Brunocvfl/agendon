#!/usr/bin/env bash
# Portas 80/443 do Caddy só para a Cloudflare. O Docker publica portas por fora do ufw, então a regra
# fica na cadeia DOCKER-USER (que o Docker respeita). Lê as faixas de /srv/caddy/cloudflare_faixas
# (gerado por atualizar-cloudflare-ips.sh). Roda no boot pelo chcomp-firewall-web.service e a cada
# atualização da lista. Rodar como root.
set -euo pipefail

FAIXAS=/srv/caddy/cloudflare_faixas
CADEIA=CHCOMP-WEB
IFACE=$(ip -4 route show default | awk '{print $5; exit}')

[ -s "$FAIXAS" ] || { echo "Sem $FAIXAS; rode atualizar-cloudflare-ips.sh" >&2; exit 1; }
iptables -L DOCKER-USER -n >/dev/null 2>&1 || iptables -N DOCKER-USER

iptables -N "$CADEIA" 2>/dev/null || true
iptables -F "$CADEIA"
while read -r f; do
	case "$f" in *:*) continue ;; esac # só IPv4 (o servidor não tem IPv6 público)
	iptables -A "$CADEIA" -s "$f" -j RETURN
done < "$FAIXAS"
iptables -A "$CADEIA" -j DROP

for regra in "-p tcp -m conntrack --ctorigdstport 80" "-p tcp -m conntrack --ctorigdstport 443" "-p udp -m conntrack --ctorigdstport 443"; do
	# shellcheck disable=SC2086
	iptables -C DOCKER-USER -i "$IFACE" $regra --ctdir ORIGINAL -j "$CADEIA" 2>/dev/null \
		|| iptables -I DOCKER-USER -i "$IFACE" $regra --ctdir ORIGINAL -j "$CADEIA"
done
echo "DOCKER-USER: 80/443 em $IFACE só da Cloudflare."
