FROM node:18-alpine AS builder
WORKDIR /app

# 1. Copy package files from the root context
COPY package.json ./
COPY package-lock.json* ./

# 2. Install dependencies
RUN npm install

# 3. Copy EVERYTHING from your specific frontend subfolder 
# directly into the current WORKDIR (/app)
COPY . .
# 4. Now 'public/index.html' is exactly where react-scripts expects it
RUN npm run build