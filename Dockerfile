FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY backend/prisma backend/prisma
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=development
ENV PORT=5000
ENV APP_URL=http://localhost:5000
ENV UPLOAD_DIR=backend/uploads
ENV IMPORT_DIR=backend/runtime-imports
ENV PUBLIC_DIR=backend/public
ENV SESSION_COOKIE_NAME=bilal_rms_session
ENV SESSION_TTL_DAYS=30
ENV MAX_UPLOAD_MB=10
ENV ADMIN_EMAIL=admin@bilalgarments.pk
ENV ADMIN_PASSWORD=admin123

WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/backend/package.json backend/package.json
COPY --from=build /app/backend/prisma backend/prisma
RUN npm ci --omit=dev

COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/public backend/public
COPY --from=build /app/scripts scripts

RUN mkdir -p backend/uploads backend/runtime-imports

EXPOSE 5000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=12 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "npm run db:deploy && node backend/dist/server.js"]
