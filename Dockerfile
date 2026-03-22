# Use a multi-stage build for a smaller, more secure production image

# ─── STAGE 1: BUILD ───────────────────────────────────────────
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for building)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the NestJS application
RUN npm run build

# Install only production dependencies for the final image
RUN npm ci --only=production && npm cache clean --force

# ─── STAGE 2: PRODUCTION ──────────────────────────────────────
FROM node:20-alpine AS production

# Set Node environment
ENV NODE_ENV production

# Set working directory
WORKDIR /app

# Copy production dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled application code from builder stage
COPY --from=builder /app/dist ./dist

# Copy package.json (needed for some runtime checks and scripts)
COPY --from=builder /app/package.json ./

# Expose the application port (Render usually provides process.env.PORT, default to 3000)
EXPOSE 3000

# Start the application using the compiled entry point
# We use node instead of npm start for better signal handling and performance
CMD ["node", "dist/main.js"]
