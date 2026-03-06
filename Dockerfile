FROM node:22-slim

LABEL org.opencontainers.image.source=https://github.com/creeperkatze/tanktinder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

RUN chown -R node:node /app

USER node

CMD ["node", ".output/server/index.mjs"]
