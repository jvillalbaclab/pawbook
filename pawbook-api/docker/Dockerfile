# Imagen OCI única para api y worker (NFR-PORT-001); el entrypoint cambia por proceso.
# Construir desde la raíz del repo: docker build -f docker/Dockerfile -t pawbook-api .

FROM oven/bun:1.4.2 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY contracts/package.json contracts/
RUN bun install --frozen-lockfile
COPY tsconfig.json ./
COPY contracts/src contracts/src
COPY src src
# Bundle autocontenido: la imagen final no necesita node_modules.
RUN bun run build

FROM oven/bun:1.4.2-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY --from=build --chown=bun:bun /app/dist ./dist
USER bun
EXPOSE 3001
CMD ["bun", "dist/main.api.js"]
