import { NextResponse } from "next/server";
import { z } from "zod";
import { expenseInputSchema } from "@/lib/expenseSchema";
import {
  addExpense,
  listExpenses,
  markExpenseNotionSynced,
  cleanupSyncedExpenses,
  getSyncedCount,
} from "@/lib/expenseStore";
import { createNotionExpense, notionEnabled } from "@/lib/notion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    // Notion 同步改为后台异步：先返回本地保存成功，再在后台 best-effort 写入 Notion
    if (notionEnabled()) {
      const toSync = record;
      setTimeout(() => {
        void (async () => {
          try {
            const notion = await createNotionExpense(toSync);
            await markExpenseNotionSynced({
              id: toSync.id,
              notionPageId: notion.pageId,
              notionUrl: notion.url,
            });
          } catch (e) {
            // 不影响接口响应；仅记录日志方便排查
            // eslint-disable-next-line no-console
            console.error("[notion] sync failed", e);
          }
        })();
      }, 0);
    }

    // 自动清理检查：如果已同步记录超过阈值，后台触发清理
    const cleanupEnabled = process.env.EXPENSES_CLEANUP_ENABLED !== "false";
    const cleanupThreshold = Number.parseInt(
      process.env.EXPENSES_CLEANUP_THRESHOLD || "100",
      10,
    );

    if (cleanupEnabled) {
      setTimeout(() => {
        void (async () => {
          try {
            const syncedCount = await getSyncedCount();
            if (syncedCount >= cleanupThreshold) {
              const result = await cleanupSyncedExpenses();
              // eslint-disable-next-line no-console
              console.log(
                `[cleanup] auto cleanup completed: deleted ${result.deleted}, kept ${result.kept}`,
              );
            }
          } catch (e) {
            // 清理失败不影响接口响应；仅记录日志
            // eslint-disable-next-line no-console
            console.error("[cleanup] auto cleanup failed", e);
          }
        })();
      }, 0);
    }

    return NextResponse.json(
      { ok: true, item: record, localSaved: true, notionSyncScheduled: notionEnabled() },
      { status: 201 },
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[expenses] POST error:", err);
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

