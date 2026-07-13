FROM node:24.15-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY mobile/package.json mobile/package.json
RUN npm ci

COPY server server
COPY mobile mobile
RUN npm run build

FROM node:24.15-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY mobile/package.json mobile/package.json
RUN npm ci --omit=dev --workspace @vision-assist/server

COPY --from=build /app/server/dist server/dist
COPY --from=build /app/mobile/www/browser server/public

USER node
EXPOSE 3000
CMD ["npm", "start", "-w", "server"]
