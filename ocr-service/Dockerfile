FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --prefer-offline --no-audit --progress=false

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 --ingroup appgroup appuser

COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup server.js ./
COPY --chown=appuser:appgroup extract.js ./
COPY --chown=appuser:appgroup package.json ./

USER appuser
EXPOSE 8089

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:8089/health').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
