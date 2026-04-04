FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY . .
RUN pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app .
RUN pnpm --filter @kimela/types build
RUN pnpm --filter @kimela/api build
RUN pnpm deploy --filter @kimela/api --prod /deploy

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /deploy .

EXPOSE 3000
CMD ["node", "dist/main"]
