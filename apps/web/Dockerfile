FROM node:22-alpine AS base
RUN npm install -g pnpm@10.27.0

FROM base AS deps
WORKDIR /app
COPY . .
RUN pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @qimela/types build
RUN pnpm --filter @qimela/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
