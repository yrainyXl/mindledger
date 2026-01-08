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
  category: z
    .string()
    .trim()
    .min(1, "分类不能为空")
    .max(50, "分类最多 50 个字符"),
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
};

/**
 * 为未来接入 Notion 做准备：这里提供一个“属性映射”示例结构，
 * 未来只需要把 store 层替换为 Notion API 写入即可。
 */
export function toNotionProperties(expense: ExpenseRecord) {
  return {
    Amount: { number: expense.amount },
    Currency: { select: { name: expense.currency } },
    Category: { select: { name: expense.category } },
    Date: { date: { start: expense.date } },
    Note: expense.note ? { rich_text: [{ text: { content: expense.note } }] } : undefined,
    Tags: expense.tags
      ? { multi_select: expense.tags.map((t) => ({ name: t })) }
      : undefined,
    CreatedAt: { date: { start: expense.createdAt } },
  };
}

