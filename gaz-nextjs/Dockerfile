# Etapa de instalare a dependențelor
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && apt-get upgrade -y \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --prefer-offline --no-audit --progress=false

# Etapa de build
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && apt-get upgrade -y \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN npx prisma generate
RUN npm run build

# Imaginea finală de rulare
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PRISMA_VERSION=5.12.1
ENV PRISMA_CLI_PATH=/usr/local/bin/prisma
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && apt-get upgrade -y \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g "prisma@${PRISMA_VERSION}" --prefer-offline --no-audit --progress=false \
  && "${PRISMA_CLI_PATH}" --version

COPY --from=builder /app/healthcheck.mjs ./healthcheck.mjs
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "healthcheck.mjs"]
CMD ["sh", "-c", "$PRISMA_CLI_PATH migrate deploy && node server.js"]
