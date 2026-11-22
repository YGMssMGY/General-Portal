FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
RUN pnpm prune --prod

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app ./
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads /app/.next
VOLUME /app/uploads
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["pnpm", "start"]
