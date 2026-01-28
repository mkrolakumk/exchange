FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install esbuild
RUN mkdir -p dist/src && \
    cp index.html manifest.webmanifest dist/ && \
    cp -r assets dist/ && \
    npx esbuild sw.js --minify --minify-identifiers --outfile=dist/sw.js && \
    npx esbuild src/styles.css --minify --outfile=dist/src/styles.css && \
    for file in $(find src -name "*.js"); do \
    npx esbuild "$file" --minify --minify-identifiers --outfile="dist/$file"; \
    done

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-aws.conf /etc/nginx/nginx-aws.conf
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-setup-nginx.sh && \
    echo 'if [ "$ENVIRONMENT" = "aws" ]; then' >> /docker-entrypoint.d/40-setup-nginx.sh && \
    echo '  echo "Tryb AWS: używanie uproszczonej konfiguracji"' >> /docker-entrypoint.d/40-setup-nginx.sh && \
    echo '  cp /etc/nginx/nginx-aws.conf /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.d/40-setup-nginx.sh && \
    echo 'else' >> /docker-entrypoint.d/40-setup-nginx.sh && \
    echo '  echo "Tryb lokalny: używanie proxy config"' >> /docker-entrypoint.d/40-setup-nginx.sh && \
    echo 'fi' >> /docker-entrypoint.d/40-setup-nginx.sh && \
    echo 'API_URL=${API_URL:-/api}' >> /docker-entrypoint.d/40-setup-nginx.sh && \
    echo 'find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|__API_URL__|${API_URL}|g" {} +' >> /docker-entrypoint.d/40-setup-nginx.sh && \
    chmod +x /docker-entrypoint.d/40-setup-nginx.sh
EXPOSE 80
