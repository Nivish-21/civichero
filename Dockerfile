# Cloud Run container for the Community Hero app (Vite client + Express server).
# Build stage compiles the client bundle and the CJS server bundle; runtime
# stage ships only production deps + the built dist/.

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite bakes VITE_* vars into the client bundle at build time, so they must be
# present here. Pass them as --build-arg at docker build time, or via
# Cloud Build substitution variables when deploying with gcloud run deploy --source.
ARG VITE_FIREBASE_API_KEY="AIzaSyBXg2oZ6k-bIBfxP3L4v_XHOv-QWtTru6Y"
ARG VITE_FIREBASE_AUTH_DOMAIN="civichero-84074.firebaseapp.com"
ARG VITE_FIREBASE_PROJECT_ID="civichero-84074"
ARG VITE_FIREBASE_STORAGE_BUCKET="civichero-84074.firebasestorage.app"
ARG VITE_FIREBASE_MESSAGING_SENDER_ID="1051965377286"
ARG VITE_FIREBASE_APP_ID="1:1051965377286:web:741bd2b4b16d6becd8ac87"
ARG VITE_FIREBASE_FIRESTORE_DB_ID=""
ARG VITE_GOOGLE_MAPS_API_KEY="AIzaSyCDxbQzx5szhkWajzXtmQDaCrPY0YQHZwU"
ARG VITE_ADMIN_UID="C5XRA9Othneg0sJafJ46YceQTbp1"
ARG VITE_CLEANER_CODE="CLEAN2026"
ARG VITE_VERIFY_THRESHOLD="2"
ENV VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY} \
    VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN} \
    VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID} \
    VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET} \
    VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID} \
    VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID} \
    VITE_FIREBASE_FIRESTORE_DB_ID=${VITE_FIREBASE_FIRESTORE_DB_ID} \
    VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY} \
    VITE_ADMIN_UID=${VITE_ADMIN_UID} \
    VITE_CLEANER_CODE=${VITE_CLEANER_CODE} \
    VITE_VERIFY_THRESHOLD=${VITE_VERIFY_THRESHOLD}
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
