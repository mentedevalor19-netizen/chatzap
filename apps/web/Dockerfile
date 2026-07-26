FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS runner
WORKDIR /app
RUN corepack enable
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ARG NEXT_PUBLIC_WS_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY packages ./packages
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY pnpm-lock.yaml ./
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN pnpm --filter @wa-crm/shared build
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
