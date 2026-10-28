# Build multi-stage du frontend statique TOKPa.
FROM node:24.22.1-slim AS frontend-build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Variable Vite publique, compilée dans les assets (pas un secret).
# Surchargeable pour staging/local avec --build-arg.
ARG VITE_API_BASE_URL=https://api.tokpa.bj/api
RUN VITE_API_BASE_URL="${VITE_API_BASE_URL}" npm run build

FROM nginx:alpine AS frontend-runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
