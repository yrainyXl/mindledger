import { z } from "zod";

function isValidYyyyMmDd(value: string) {
  // HTML <input type="date"> typically yields YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime());
}

export const expenseInputSchema = z.object({
  amount: z.coerce
    .number({
      message: "金额必须是数字",
    })
    .positive("金额必须大于 0")
    .max(1_000_000_000, "金额过大"),
  currency: z
    .string()
    .trim()
    .min(1, "币种不能为空")
    .max(10, "币种过长")
    .default("CNY"),
  categories: z
    .array(z.string().trim().min(1).max(50))
    .min(1, "至少选择一个分类")
    .max(10, "最多选择 10 个分类"),
  date: z
    .string()
    .refine(isValidYyyyMmDd, "日期格式不正确（应为 YYYY-MM-DD）"),
  note: z
    .string()
    .trim()
    .max(200, "备注最多 200 个字符")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  tags: z
    .array(z.string().trim().min(1).max(20))
    .max(10, "标签最多 10 个")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export type ExpenseRecord = ExpenseInput & {
  id: string;
  createdAt: string; // ISO string
  notionPageId?: string;
  notionUrl?: string;
  notionSyncedAt?: string; // ISO string
};

/**
 * 为未来接入 Notion 做准备：这里提供一个“属性映射”示例结构，
 * 未来只需要把 store 层替换为 Notion API 写入即可。
 */
export function toNotionProperties(expense: ExpenseRecord) {
  const props: Record<string, unknown> = {
    Amount: { number: expense.amount },
    Currency: { select: { name: expense.currency } },
    Category: { multi_select: expense.categories.map((c) => ({ name: c })) },
    Date: { date: { start: expense.date } },
    CreatedAt: { date: { start: expense.createdAt } },
  };

  if (expense.note) {
    props.Note = { rich_text: [{ text: { content: expense.note } }] };
  }

  if (expense.tags?.length) {
    props.Tags = { multi_select: expense.tags.map((t) => ({ name: t })) };
  }

  return props;
}

