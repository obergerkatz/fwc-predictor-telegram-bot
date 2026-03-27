FROM node:24.12.0-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including dev for build)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build TypeScript
RUN pnpm run build

# Copy SQL migration files to dist
RUN cp -r src/db/migrations dist/db/

# Remove dev dependencies
RUN pnpm prune --prod

# Create logs directory
RUN mkdir -p logs

# Expose port (if needed for health checks)
EXPOSE 3000

# Run the application
CMD ["pnpm", "start"]
