#!/bin/sh
set -e
cd /app

if [ ! -x node_modules/.bin/vite ]; then
  echo "Installation des dépendances npm…"
  npm ci
fi

exec "$@"
