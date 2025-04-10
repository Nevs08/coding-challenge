# --- Build Stage: Angular ---
FROM node:20-alpine AS webapp-build

WORKDIR /app/webapp

# Install Angular dependencies
COPY webapp/package*.json ./
RUN npm install

# Copy source and build Angular project
COPY webapp ./
RUN npm run build -- --configuration production

# --- Build Stage: Bun Server ---
FROM oven/bun:latest AS server-build

WORKDIR /app/server

# Install Bun dependencies
COPY server/package.json server/bun.lock ./
RUN bun install

# Copy source and build using bun
COPY server ./
RUN bun build src/index.ts --outdir dist

# --- Final Stage: Bun + Nginx together ---
FROM oven/bun:alpine as final

# Install nginx
RUN apk add --no-cache nginx

# Copy Angular build to nginx
COPY --from=webapp-build /app/webapp/dist/webapp/browser /usr/share/nginx/html
RUN chmod -R 755 /usr/share/nginx/html

#DEBUG:
RUN ls -l /usr/share/nginx/html

COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy Bun server
COPY --from=server-build /app/server/package.json /app/server/bun.lock /app/server/
COPY --from=server-build /app/server/dist /app/server/dist


# Set working dir and install production deps
WORKDIR /app/server
RUN bun install --production

# Expose ports
EXPOSE 80
EXPOSE 3000

# Start Bun backend and Nginx
CMD sh -c "bun run dist/index.js & nginx -g 'daemon off;'"