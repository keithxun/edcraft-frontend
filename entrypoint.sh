#!/bin/sh
set -e

# Generate /config.js from the template using runtime environment variables.
# Pass API_URL and CORS_PROXY_URL as Docker env vars.
envsubst '${API_URL} ${CORS_PROXY_URL}' \
  < /etc/nginx/config.js.template \
  > /usr/share/nginx/html/config.js

# An existing ingress can own /api. Set BACKEND_ORIGIN when Nginx should proxy it.
if [ -n "${BACKEND_ORIGIN:-}" ]; then
  envsubst '${BACKEND_ORIGIN}' < /etc/nginx/edcraft-api.template > /etc/nginx/edcraft-api.inc
else
  : > /etc/nginx/edcraft-api.inc
fi

exec nginx -g 'daemon off;'
