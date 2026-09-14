# ==============================================================================
# QUIZZBOARD CLIENT DOCKERFILE (Multi-Stage Build Angular 21 & Nginx Alpine)
# ==============================================================================

# Étape 1 : Build Angular
FROM node:22-alpine AS builder
WORKDIR /app

# Installation des dépendances avec cache npm
COPY package*.json ./
RUN npm ci || npm install

# Compilation de l'application Angular
COPY . .
RUN npm run build -- --configuration production

# Étape 2 : Nginx pour servir l'application SPA
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# Nettoyage des fichiers HTML par défaut de Nginx
RUN rm -rf ./*

# Copie des artefacts compilés Angular (dist/quizzboard-client/browser)
COPY --from=builder /app/dist/quizzboard-client/browser ./

# Configuration Nginx personnalisée avec support du routage SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
