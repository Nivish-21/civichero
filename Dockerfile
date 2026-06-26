# Cloud Run container for the Community Hero app (Vite client + Express server).
# Build stage compiles the client bundle and the CJS server bundle; runtime
# stage ships only production deps + the built dist/.

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NOTE: VITE_GOOGLE_MAPS_API_KEY is baked into the client bundle at build time.
# Pass it as a build arg when the map is needed:
#   gcloud builds ... --substitutions, or docker build --build-arg.
ARG VITE_GOOGLE_MAPS_API_KEY=""
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
RUN npm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Cloud Run sets PORT; server.ts reads process.env.PORT (default 8080).
EXPOSE 8080
CMD ["node", "dist/server.cjs"]
