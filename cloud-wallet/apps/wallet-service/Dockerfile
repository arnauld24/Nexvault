FROM node:18-alpine

WORKDIR /app

# Copy package definition and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Create a non-root user and set permissions
RUN addgroup -g 1001 -S nodejs && adduser -S wallet -u 1001
RUN chown -R wallet:nodejs /app
USER wallet

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "index.js"]