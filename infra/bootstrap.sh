#!/usr/bin/env bash
# Base de um servidor da Code House (Ubuntu 24.04), como o CHCOMPSP01. Roda como root, no servidor,
# a partir de uma cópia da pasta infra/ do repositório. Idempotente: rodar de novo só corrige o que
# estiver diferente. Passo a passo completo (antes e depois deste script) em infra/README.md.
#
#   sudo bash infra/bootstrap.sh <hostname> "<chave pública SSH do administrador>"
#
# Faz: hostname, relógio (NTP.br), atualizações (e automáticas), usuário `ops` (sudo, só por chave),
# SSH sem root e sem senha, ufw (22/80/443), fail2ban, Docker (logs limitados) e a rede `web`, e o
# Caddy compartilhado em /srv/caddy com 80/443 só para a Cloudflare.
# NÃO faz (é manual, ver README): certificado de origem da Cloudflare, senhas do basic auth, projetos.
set -euo pipefail

NOME=${1:-}
CHAVE=${2:-}
INFRA=$(cd "$(dirname "$0")" && pwd)
[ "$(id -u)" = 0 ] || { echo "Rode como root (sudo)." >&2; exit 1; }
[[ "$NOME" =~ ^[a-z0-9-]{1,63}$ ]] || { echo "uso: bootstrap.sh <hostname em minúsculas> \"<chave pública>\"" >&2; exit 2; }
[[ "$CHAVE" =~ ^ssh-(ed25519|rsa)\ [A-Za-z0-9+/=]+ ]] || { echo "Chave pública SSH inválida." >&2; exit 2; }
. /etc/os-release
[ "$ID" = ubuntu ] || { echo "Feito para Ubuntu (encontrado: $ID)." >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive

passo() { printf '\n== %s\n' "$*"; }

# Grava o arquivo só se o conteúdo mudou; devolve 0 se mudou.
gravar() {
	local destino=$1 modo=${2:-644} tmp
	tmp=$(mktemp)
	cat > "$tmp"
	if [ -f "$destino" ] && cmp -s "$tmp" "$destino"; then
		rm -f "$tmp"
		return 1
	fi
	install -D -m "$modo" "$tmp" "$destino"
	rm -f "$tmp"
	echo "   gravado: $destino"
}

passo "Hostname: $NOME"
[ "$(hostname)" = "$NOME" ] || hostnamectl set-hostname "$NOME"
grep -qE "^127\.0\.1\.1[[:space:]]+$NOME\$" /etc/hosts || {
	sed -i '/^127\.0\.1\.1[[:space:]]/d' /etc/hosts
	echo "127.0.1.1 $NOME" >> /etc/hosts
}

passo "Relógio (NTP.br)"
gravar /etc/systemd/timesyncd.conf.d/ntp-br.conf <<'EOF' && systemctl restart systemd-timesyncd || true
[Time]
NTP=a.st1.ntp.br b.st1.ntp.br c.st1.ntp.br
FallbackNTP=ntp.ubuntu.com
EOF
timedatectl set-ntp true || true
timedatectl set-timezone America/Sao_Paulo

passo "Pacotes e atualizações"
apt-get update -qq
apt-get -y -qq -o Dpkg::Options::=--force-confold upgrade > /dev/null
apt-get -y -qq install ufw fail2ban unattended-upgrades curl ca-certificates > /dev/null
gravar /etc/apt/apt.conf.d/20auto-upgrades <<'EOF' || true
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now fail2ban unattended-upgrades > /dev/null 2>&1

passo "Usuário ops (administrador, só por chave)"
id ops > /dev/null 2>&1 || adduser --disabled-password --gecos "" ops > /dev/null
usermod -aG sudo ops
gravar /etc/sudoers.d/90-ops 440 <<'EOF' || true
ops ALL=(ALL) NOPASSWD:ALL
EOF
visudo -cf /etc/sudoers.d/90-ops > /dev/null
install -d -m 700 -o ops -g ops /home/ops/.ssh
touch /home/ops/.ssh/authorized_keys
grep -qF "$CHAVE" /home/ops/.ssh/authorized_keys || echo "$CHAVE" >> /home/ops/.ssh/authorized_keys
chown ops:ops /home/ops/.ssh/authorized_keys && chmod 600 /home/ops/.ssh/authorized_keys

passo "SSH: sem root e sem senha"
# Só fecha depois que o ops tem chave (acima). Vale antes do 50-cloud-init.conf (o primeiro valor vence).
if gravar /etc/ssh/sshd_config.d/00-chcomp.conf <<'EOF'
# Code House: acesso só por chave, sem root (vale antes do 50-cloud-init.conf)
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
EOF
then
	sshd -t && systemctl reload ssh
	echo "   ATENÇÃO: a partir de agora, entre com: ssh ops@<ip> (root e senha desligados)"
fi

passo "Firewall (ufw)"
ufw default deny incoming > /dev/null
ufw default allow outgoing > /dev/null
ufw allow 22/tcp > /dev/null
# 80/443: o atualizar-cloudflare-ips.sh (abaixo) libera só as faixas da Cloudflare.
ufw --force enable > /dev/null

passo "Docker"
if ! command -v docker > /dev/null; then
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
	chmod a+r /etc/apt/keyrings/docker.asc
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
		> /etc/apt/sources.list.d/docker.list
	apt-get update -qq
	apt-get -y -qq install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null
fi
if gravar /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "local",
  "log-opts": { "max-size": "20m", "max-file": "5" },
  "live-restore": true
}
EOF
then
	systemctl restart docker
fi
systemctl enable docker containerd > /dev/null 2>&1
usermod -aG docker ops
docker network inspect web > /dev/null 2>&1 || docker network create web > /dev/null

passo "Caddy compartilhado (/srv/caddy)"
install -d -m 755 /srv /srv/caddy /srv/caddy/sites /srv/caddy/usuarios
install -d -m 700 /srv/caddy/certs
# Scripts que o root executa ficam com o root; a configuração, com o ops.
install -o root -g root -m 755 "$INFRA/caddy/atualizar-cloudflare-ips.sh" "$INFRA/caddy/firewall-web.sh" /srv/caddy/
install -o ops -g ops -m 644 "$INFRA/caddy/Caddyfile" "$INFRA/caddy/compose.yaml" /srv/caddy/
install -m 644 "$INFRA/caddy/chcomp-firewall-web.service" /etc/systemd/system/chcomp-firewall-web.service
systemctl daemon-reload
systemctl enable chcomp-firewall-web > /dev/null 2>&1
gravar /etc/cron.d/chcomp-cloudflare-ips <<'EOF' || true
0 5 * * 1 root /srv/caddy/atualizar-cloudflare-ips.sh >/dev/null
EOF
/srv/caddy/atualizar-cloudflare-ips.sh

if ls /srv/caddy/sites/*.caddy > /dev/null 2>&1; then
	(cd /srv/caddy && docker compose up -d --quiet-pull 2>&1 | grep -vE '^\s*$' || true)
else
	echo "   Caddy não iniciado: nenhum site em /srv/caddy/sites (instale um projeto, ver README)."
fi

passo "Pronto"
echo "   $(hostname) | $(lsb_release -ds) | Docker $(docker version --format '{{.Server.Version}}')"
[ -f /var/run/reboot-required ] && echo "   Reinicie o servidor (atualização de kernel): sudo systemctl reboot"
exit 0
