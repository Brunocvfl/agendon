# Imagem de produção do AgendOn (VPS). Montada no GitHub Actions, publicada no GHCR e só executada no servidor.
#
# As variáveis NEXT_PUBLIC_* entram no JavaScript do navegador durante o build, por isso são argumentos do
# build (uma imagem por ambiente: produção e staging). Os segredos do servidor NÃO entram na imagem: vêm do
# `.env` da VPS quando o contêiner sobe.
#
#   docker build \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
#     --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
#     --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=... \
#     --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY=... \
#     --build-arg NEXT_DEPLOYMENT_ID=<sha do commit> \
#     -t agendon .

ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
# Proteção contra versões misturadas na troca de contêiner (ver `deploymentId` na documentação do Next).
ARG NEXT_DEPLOYMENT_ID
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN test -n "$NEXT_PUBLIC_SUPABASE_URL" && test -n "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
    || (echo "Faltam as variáveis NEXT_PUBLIC_SUPABASE_* (--build-arg)" && exit 1)
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS app
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Usuário sem privilégios (o `node` já existe na imagem oficial).
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/saude || exit 1
CMD ["node", "server.js"]
