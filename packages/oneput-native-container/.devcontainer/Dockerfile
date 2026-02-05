ARG BASE_IMAGE=agentic
FROM ${BASE_IMAGE}

USER root
# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

USER node
EXPOSE 8081
RUN pnpm create expo --template blank-typescript --yes .
