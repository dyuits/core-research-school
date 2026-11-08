FROM node:24-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm check && pnpm build
ENV NODE_ENV=production PORT=3001 DATA_DIR=/data
EXPOSE 3001
VOLUME /data
CMD ["node", "dist/index.js"]
