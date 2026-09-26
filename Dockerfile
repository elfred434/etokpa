FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY docker/entrypoint.sh /usr/local/bin/tokpa-front-entrypoint
RUN chmod +x /usr/local/bin/tokpa-front-entrypoint

EXPOSE 5173

ENTRYPOINT ["tokpa-front-entrypoint"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
