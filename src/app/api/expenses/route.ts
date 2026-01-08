import { NextResponse } from "next/server";
import { z } from "zod";
import { expenseInputSchema } from "@/lib/expenseSchema";
import { addExpense, listExpenses } from "@/lib/expenseStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listExpenses();
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_JSON", message: "请求体必须是合法 JSON" } },
        { status: 400 },
      );
    }

    const parsed = expenseInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "数据校验失败",
            details: parsed.error.flatten(),
          },
        },
        { status: 422 },
      );
    }

    const record = await addExpense(parsed.data);
    return NextResponse.json({ ok: true, item: record }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "数据校验失败",
            details: err.flatten(),
          },
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "服务器错误" } },
      { status: 500 },
    );
  }
}

