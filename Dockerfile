FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Build the app
COPY . .
RUN npm run build

# Production server
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the nginx template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Expose the port (dynamically set via Coolify/env)
ENV PORT=80
EXPOSE $PORT

# Nginx alpine image automatically processes templates in /etc/nginx/templates/*.template
# and outputs them to /etc/nginx/conf.d/*.conf before starting the server.
CMD ["nginx", "-g", "daemon off;"]
