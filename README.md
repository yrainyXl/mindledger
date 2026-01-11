# MindLedger（个人日常消费记录）

一个简洁的个人消费记录小项目，目标是打通：

- 前端：输入 + 校验 + 提交反馈
- 后端：API 路由接收数据、验证与错误处理
- 存储：本地结构化存储（为未来接入 Notion 做准备）

## 运行

```bash
npm run dev
```

访问 `http://localhost:3000`（地址以终端输出为准）。

## Notion 同步（后端自动写入数据库）

本项目支持在 `POST /api/expenses` 时**自动同步写入 Notion Database**（服务端执行，后台异步 best-effort）。

- 接口会**先写入本地并立刻返回**（保证手机端手感快）
- Notion 写入会在后台进行；失败不会阻塞响应，可在服务端日志中看到 `[notion] sync failed`

### 1) 在 Notion 创建 Integration

- Notion → Settings → Connections → Develop or manage integrations
- 新建一个 integration，复制 **Internal Integration Token**

### 2) 准备一个 Notion Database（表）

Notion 数据库必定有一个 **Title 属性**（例如常见的 `Name`）。你需要记住它的名字，并在环境变量里通过 `NOTION_TITLE_PROPERTY` 配置（默认 `Name`）。

另外，确保数据库里至少有以下属性（名称需一致）：

- `Name`（或你的 Title 属性名）：Title
- `Amount`：Number
- `Currency`：Select
- `Category`：Select
- `Date`：Date
- `Note`：Rich text（可选）
- `Tags`：Multi-select（可选）
- `CreatedAt`：Date

并把该数据库 **Share** 给你的 integration（连接权限）。

### 3) 配置环境变量

由于环境限制无法写入 `.env.example`，我提供了模板文件 `notion.env.example`。

把它复制为 `.env.local` 并填入：

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`
- `NOTION_TITLE_PROPERTY`（可选，默认 `Name`）

然后重新启动 `npm run dev`。

## API

### `GET /api/expenses`

返回最近的消费记录列表（按 `createdAt` 倒序）。

### `POST /api/expenses`

请求体示例：

```json
{
  "amount": 23.5,
  "currency": "CNY",
  "category": "餐饮",
  "date": "2026-01-08",
  "note": "和朋友聚餐",
  "tags": ["工作", "聚餐"]
}
```

成功返回：

- `201`：`{ ok: true, item: ... }`

错误返回：

- `400`：JSON 非法
- `422`：数据校验失败（包含 `details.fieldErrors`）
- `500`：服务器错误

### `POST /api/expenses/cleanup`

手动触发清理：删除所有已同步到 Notion 的记录（有 `notionSyncedAt` 字段），保留未同步记录作为备份。

成功返回：

- `200`：`{ ok: true, message: "清理完成", stats: { deleted: 10, kept: 5, totalBefore: 15 } }`

## 数据清理机制

本项目实现了**自动清理机制**，用于管理本地 `data/expenses.json` 文件：

### 清理策略

- **删除已同步记录**：所有已成功同步到 Notion 的记录（有 `notionSyncedAt` 字段）会被删除
- **保留未同步记录**：未同步的记录会保留作为备份，避免数据丢失
- **自动触发**：每次写入记录后，如果已同步记录数超过阈值，会自动触发清理

### 环境变量配置

在 `.env.local` 中可以配置：

- `EXPENSES_CLEANUP_ENABLED`：是否启用自动清理（默认 `true`，设为 `false` 禁用）
- `EXPENSES_CLEANUP_THRESHOLD`：触发自动清理的阈值（默认 `100`，即已同步记录达到 100 条时触发）

### 手动清理

可以通过调用 `POST /api/expenses/cleanup` 手动触发清理。

### 注意事项

- 清理操作是**不可逆**的，确保 Notion 同步成功后再清理
- 自动清理使用后台异步执行，不影响接口响应速度
- 保留未同步记录作为备份，避免数据丢失

## 数据存储结构（Notion 预留）

本地存储文件：`data/expenses.json`

```json
{
  "version": 1,
  "items": [
    {
      "id": "uuid",
      "amount": 23.5,
      "currency": "CNY",
      "category": "餐饮",
      "date": "2026-01-08",
      "note": "和朋友聚餐",
      "tags": ["工作", "聚餐"],
      "createdAt": "2026-01-08T12:34:56.000Z",
      "notionPageId": "2e4a5d34-2220-8131-b3ad-fe0ea037199e",
      "notionUrl": "https://www.notion.so/...",
      "notionSyncedAt": "2026-01-08T12:34:58.000Z"
    }
  ]
}
```

**字段说明**：

- `id`：唯一标识符（UUID）
- `amount`、`currency`、`category`、`date`、`note`、`tags`：消费记录的基本信息
- `createdAt`：创建时间（ISO 8601）
- `notionPageId`、`notionUrl`、`notionSyncedAt`：Notion 同步信息（可选，仅在成功同步后存在）

已同步到 Notion 的记录会包含 `notionSyncedAt` 字段，这些记录会在自动清理时被删除。

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
