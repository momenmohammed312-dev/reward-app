FROM node:20-alpine AS builder

WORKDIR /build
COPY package.json package-lock.json tsconfig.json ./
COPY src/ ./src/
RUN npm ci --legacy-peer-deps && npm run build

FROM node:20-alpine AS runner

WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --omit=dev

COPY --from=builder /build/dist ./dist

USER appuser
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
