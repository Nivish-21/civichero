# Cloud Run container for the Community Hero app (Vite client + Express server).
# Build stage compiles the client bundle and the CJS server bundle; runtime
# stage ships only production deps + the built dist/.

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite bakes VITE_* vars into the client bundle at build time, so they must be
# present here. Firebase web values are public by design; pass them (and the
# Maps key) as --build-arg, e.g.:
#   docker build --build-arg VITE_FIREBASE_API_KEY=... --build-arg VITE_FIREBASE_PROJECT_ID=... .
# For Cloud Run via `gcloud run deploy --source`, set them as substitutions.
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_AUTH_DOMAIN=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_FIREBASE_STORAGE_BUCKET=""
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=""
ARG VITE_FIREBASE_APP_ID=""
ARG VITE_FIREBASE_FIRESTORE_DB_ID=""
ARG VITE_GOOGLE_MAPS_API_KEY=""
ENV VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY} \
    VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN} \
    VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID} \
    VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET} \
    VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID} \
    VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID} \
    VITE_FIREBASE_FIRESTORE_DB_ID=${VITE_FIREBASE_FIRESTORE_DB_ID} \
    VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
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
