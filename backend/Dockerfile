FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

ARG DATABASE_URL=mysql://techx:essential@127.0.0.1:3306/techx
ARG SHADOW_DATABASE_URL=mysql://techx:essential@127.0.0.1:3306/techx_shadow
ENV DATABASE_URL=$DATABASE_URL \
    SHADOW_DATABASE_URL=$SHADOW_DATABASE_URL

RUN npm run prisma:generate
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["sh", "-c", "npm run prisma:migrate && node dist/index.js"]