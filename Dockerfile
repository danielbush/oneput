# syntax=docker/dockerfile:1.4

# =============================================================================
# Stage 1: base
# Base image with system dependencies and tooling
# =============================================================================
FROM node:24-bookworm-slim AS base

# Install system dependencies for Playwright and development
RUN apt-get update && apt-get install -y \
    # Additional tools
    git \
    ca-certificates \
    curl \
    wget \
    # For mkcert
    libnss3-tools \
    && rm -rf /var/lib/apt/lists/*

# Install task-runner from official source
RUN sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin

# Install mkcert for HTTPS dev server
RUN curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64" \
    && chmod +x mkcert-v*-linux-amd64 \
    && mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set up working directory
WORKDIR /app
RUN chown -R node:node /app

USER node

# =============================================================================
# Stage 2: dependencies
# Install Node dependencies and Playwright browsers
# =============================================================================
FROM base AS dependencies

USER node

# Copy dependency files and patches
COPY --chown=node:node package.json pnpm-lock.yaml ./
COPY --chown=node:node patches/ ./patches/

RUN  pnpm install --frozen-lockfile

# =============================================================================
# Stage 3: development
# Development environment with hot reload
# =============================================================================
FROM dependencies AS development

# Install additional dev tools
USER root
RUN apt-get update && apt-get install -y \
    vim \
    neovim \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Setup sudo for node user (useful for devcontainer)
RUN echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
# RUN chown -R node:node /home/node

USER node
COPY --chown=node:node . .

# Generate mkcert certificates for HTTPS dev server
RUN mkcert -install && \
    mkcert localhost 127.0.0.1 ::1 0.0.0.0

EXPOSE 5173 4173 9323

# Health check for dev server
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -k -f https://localhost:5173/ || exit 1

RUN pnpm run prepare
# Default command
CMD ["pnpm", "dev", "--host"]
