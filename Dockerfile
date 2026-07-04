FROM node:22-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-slim AS runner

WORKDIR /app

COPY --from=builder /app/.output ./.output

USER node

CMD ["node", ".output/server/index.mjs"]
