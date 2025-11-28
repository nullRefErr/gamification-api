# ==========================================
# Development Stage - Node.js 22
# ==========================================
FROM node:22-alpine AS development

# Install build dependencies for native modules
RUN apk --no-cache add --update --virtual .builds-deps build-base python3 py3-pip make g++

# Set working directory
WORKDIR /usr/src/app

# Build argument for application name
ARG app
RUN echo "Building: $app"

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy entire project (libs, config files, etc.)
COPY . ./

# Remove all apps except the target app to reduce build context
RUN rm -rf ./apps
COPY apps/${app} ./apps/${app}

# Build the application
RUN npm run build -- ${app} --inspect false --skip-nx-cache=true

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

EXPOSE 3000

# ==========================================
# Production Stage - Node.js 22
# ==========================================
FROM node:22-alpine AS production

# Set production environment
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Build argument for application name
ARG app
RUN echo "Building production: $app"

# Install production runtime dependencies only (no build tools)
RUN apk --no-cache add dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies only using npm ci for reproducibility
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copy built artifacts from development stage
COPY --from=development --chown=nodejs:nodejs /usr/src/app/dist ./dist
COPY --from=development --chown=nodejs:nodejs /usr/src/app/libs ./libs
COPY --from=development --chown=nodejs:nodejs /usr/src/app/nx.json ./nx.json
COPY --from=development --chown=nodejs:nodejs /usr/src/app/tsconfig.base.json ./tsconfig.base.json

# Switch to non-root user
USER nodejs

# Health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

EXPOSE 3000

# Use dumb-init to handle signals properly
CMD ["dumb-init", "node", "dist/apps/${app}/main.js"]
