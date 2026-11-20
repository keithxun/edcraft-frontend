# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:25-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Skip tsc; just bundle with Vite
RUN npx vite build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-api.template /etc/nginx/edcraft-api.template
COPY config.js.template /etc/nginx/config.js.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
