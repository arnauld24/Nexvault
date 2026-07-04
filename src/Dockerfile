FROM node:18-alpine AS builder
WORKDIR /app

# 1. Copy package files from the root context
COPY package.json ./
COPY package-lock.json* ./

# 2. Install dependencies
RUN npm install

# 3. Copy frontend source only
COPY public ./public
COPY src ./src
COPY .env* ./

# 4. Build the app
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx config for SPA routing
RUN echo 'server { \
  listen 5173; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
    expires 1y; \
    add_header Cache-Control "public, immutable"; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]