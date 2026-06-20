FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json packages/shared/
COPY apps/api/package*.json apps/api/

RUN npm ci

COPY packages/shared/ packages/shared/
RUN npm run build:shared

COPY apps/api/ apps/api/
RUN npm --workspace @kovixalabs/api run build

FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/packages/shared/dist packages/shared/dist/
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/apps/api/dist apps/api/dist/
COPY --from=builder /app/apps/api/package.json apps/api/
COPY apps/api/prisma/ apps/api/prisma/
COPY apps/api/.env.example apps/api/.env

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
