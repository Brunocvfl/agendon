#!/usr/bin/env bash
# Deploy do AgendOn na VPS. Única coisa que a chave do GitHub Actions pode rodar (comando forçado no
# authorized_keys do usuário `deploy`): o Actions envia "<producao|staging> <sha do commit>".
#
#   1. baixa ghcr.io/codehousedevs/agendon[-staging]:<sha>;
#   2. troca o contêiner e espera o healthcheck (/api/saude);
#   3. se não ficar saudável, volta para a imagem anterior e sai com erro;
#   4. apaga as imagens antigas do ambiente (mantém as 3 mais recentes).
set -euo pipefail

DIR=/srv/agendon
read -r AMBIENTE SHA EXTRA <<< "${SSH_ORIGINAL_COMMAND:-${*:-}}"
[ -z "${EXTRA:-}" ] || { echo "uso: <producao|staging> <sha>" >&2; exit 2; }
case "${AMBIENTE:-}" in
	producao) IMAGEM=ghcr.io/codehousedevs/agendon; VAR=PRODUCAO_TAG ;;
	staging) IMAGEM=ghcr.io/codehousedevs/agendon-staging; VAR=STAGING_TAG ;;
	*) echo "ambiente inválido" >&2; exit 2 ;;
esac
[[ "${SHA:-}" =~ ^[0-9a-f]{40}$ ]] || { echo "sha inválido" >&2; exit 2; }
CONTEINER=agendon-$AMBIENTE

cd "$DIR"
exec 9> "$DIR/.deploy.lock"
flock -w 600 9 || { echo "outro deploy em andamento" >&2; exit 1; }
[ -f "$DIR/.env.$AMBIENTE" ] || { echo "falta $DIR/.env.$AMBIENTE" >&2; exit 1; }
touch "$DIR/.env"

anterior=$(grep -E "^$VAR=" "$DIR/.env" | cut -d= -f2 || true)
definir_tag() {
	if grep -qE "^$VAR=" "$DIR/.env"; then sed -i "s/^$VAR=.*/$VAR=$1/" "$DIR/.env"; else echo "$VAR=$1" >> "$DIR/.env"; fi
}
saudavel() {
	for _ in $(seq 1 45); do
		case "$(docker inspect -f '{{.State.Health.Status}}' "$CONTEINER" 2>/dev/null || echo ausente)" in
			healthy) return 0 ;;
			unhealthy) return 1 ;;
		esac
		sleep 2
	done
	return 1
}

echo "[$AMBIENTE] baixando ${SHA:0:7}"
# Imagem privada no GHCR: o Actions manda pela entrada padrão o GITHUB_TOKEN da execução (vale só
# enquanto o job roda). Login só para este pull, numa configuração temporária; nada fica guardado.
TOKEN=""
read -r -t 10 TOKEN || true
CONFIG_TEMP=$(mktemp -d)
trap 'rm -rf "$CONFIG_TEMP"' EXIT
export DOCKER_CONFIG=$CONFIG_TEMP
if [ -n "$TOKEN" ]; then
	printf '%s' "$TOKEN" | docker login ghcr.io -u github-actions --password-stdin > /dev/null 2>&1 \
		|| { echo "login no GHCR falhou" >&2; exit 1; }
fi
docker pull -q "$IMAGEM:$SHA" > /dev/null
unset DOCKER_CONFIG
definir_tag "$SHA"
docker compose up -d --no-deps "$AMBIENTE" 2>&1 | grep -v -E '^\s*$' || true

if saudavel; then
	echo "[$AMBIENTE] no ar: ${SHA:0:7}"
else
	echo "[$AMBIENTE] ${SHA:0:7} não ficou saudável. Últimas linhas do log:" >&2
	docker logs --tail 30 "$CONTEINER" 2>&1 | sed 's/^/    /' >&2 || true
	if [ -n "$anterior" ] && [ "$anterior" != "$SHA" ] && [ "$anterior" != "ausente" ]; then
		echo "[$AMBIENTE] voltando para ${anterior:0:7}" >&2
		definir_tag "$anterior"
		docker compose up -d --no-deps "$AMBIENTE" > /dev/null 2>&1
		saudavel && echo "[$AMBIENTE] ${anterior:0:7} de volta no ar" >&2 || echo "[$AMBIENTE] a anterior também não ficou saudável!" >&2
	fi
	exit 1
fi

# Limpeza: mantém as 3 imagens mais recentes deste ambiente (a atual entre elas).
docker image ls "$IMAGEM" --format '{{.CreatedAt}}\t{{.Repository}}:{{.Tag}}' | sort -r | tail -n +4 | cut -f2 \
	| while read -r velha; do [ "$velha" = "$IMAGEM:$SHA" ] || docker image rm -f "$velha" > /dev/null 2>&1 || true; done
docker image prune -f > /dev/null 2>&1 || true
