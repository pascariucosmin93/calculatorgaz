# Etapa de instalare a dependențelor (dev+prod, necesare pentru build/typecheck)
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
# `RUN --mount` necesită BuildKit, care nu este disponibil pe toți runnerii
# CI. Păstrăm buildul compatibil și cu builderul Docker clasic.
RUN npm ci --ignore-scripts --prefer-offline --no-audit --progress=false

# Etapa de build
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN ./node_modules/.bin/prisma generate --schema=prisma/schema.prisma \
  && grep -q "invoiceUpload" node_modules/.prisma/client/index.d.ts \
  && grep -q "tariffProfile" node_modules/.prisma/client/index.d.ts
RUN npm run build

# Dependențe minime pentru migrator: doar prisma CLI (migrate deploy nu are
# nevoie de @prisma/client generat, doar de schema + fișierele de migrare).
FROM node:22-alpine AS deps-migrator
WORKDIR /app
RUN apk add --no-cache openssl
COPY prisma ./prisma
RUN npm install --no-save --omit=optional prisma@5.12.1

# Imaginea pentru migrarea bazei de date
FROM node:22-alpine AS migrator
WORKDIR /app
RUN apk add --no-cache openssl
RUN rm -rf /usr/local/lib/node_modules/npm \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx
COPY --from=deps-migrator /app/node_modules ./node_modules
COPY --from=deps-migrator /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod 755 ./docker-entrypoint.sh \
  && addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 --ingroup appgroup appuser
USER appuser
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

# Imaginea finală de rulare
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

# npm nu e folosit la runtime (CMD rulează server.js direct) — îl scoatem ca
# să nu rămână vulnerabilitățile din dependențele lui interne (tar, pacote etc).
RUN rm -rf /usr/local/lib/node_modules/npm \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx

RUN addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 --ingroup appgroup appuser

COPY --from=builder --chown=appuser:appgroup /app/healthcheck.mjs ./healthcheck.mjs
COPY --from=builder --chown=appuser:appgroup /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder --chown=appuser:appgroup /app/otel-preload.cjs ./otel-preload.cjs
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
RUN chmod 755 ./docker-entrypoint.sh

USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "healthcheck.mjs"]
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "--max-old-space-size=512", "server.js"]
