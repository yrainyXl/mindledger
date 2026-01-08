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
      "createdAt": "2026-01-08T12:34:56.000Z"
    }
  ]
}
```

未来要接入 Notion 时，可以复用 `src/lib/expenseSchema.ts` 的字段定义与
`toNotionProperties()` 映射逻辑，然后把 `src/lib/expenseStore.ts` 替换为 Notion API 写入即可。

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
