FROM node:22-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY . .
RUN pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app .
RUN pnpm --filter @qimela/types build
# Generate Prisma client before compiling (requires schema to exist)
RUN pnpm --filter @qimela/api db:generate
RUN pnpm --filter @qimela/api build
# Self-contained prod bundle: resolves @qimela/types as a real package (no symlinks)
RUN pnpm deploy --filter @qimela/api --prod /deploy
# pnpm deploy isolates dependencies but drops the dynamically generated Prisma client. Regenerate it!
RUN cp -r apps/api/prisma /deploy/prisma && cd /deploy && npx prisma generate

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /deploy .
# Copy compiled output since pnpm deploy ignores dist/ due to .gitignore
COPY --from=builder /app/apps/api/dist ./dist
# Prisma schema + migrations are needed by migrate deploy at startup
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 3000
# Run pending migrations then start the server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main"]
