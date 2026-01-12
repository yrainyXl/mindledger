# 1. 基础镜像
FROM node:18-alpine AS base

# 2. 依赖安装阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制依赖定义文件
COPY package.json package-lock.json ./
# 安装所有依赖（包含 devDependencies，因为构建需要它们）
RUN npm ci

# 3. 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 禁用 Next.js 遥测数据采集
ENV NEXT_TELEMETRY_DISABLED=1

# 执行构建
RUN npm run build

# 4. 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 仅复制必要的文件，利用 standalone 输出减小体积
COPY --from=builder /app/public ./public

# 设置 .next 权限
RUN mkdir .next
RUN chown nextjs:nodejs .next

# 本地 JSON 存储目录（挂载卷时也需要可写）
RUN mkdir -p data
RUN chown nextjs:nodejs data

# 复制构建产物和依赖
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

# 启动应用
CMD ["node", "server.js"]