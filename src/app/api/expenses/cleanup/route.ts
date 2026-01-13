import { NextResponse } from "next/server";
import { cleanupSyncedExpenses } from "@/lib/expenseStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/expenses/cleanup
 * 手动触发清理：删除所有已同步到 Notion 的记录
 * 保留未同步记录作为备份
 */
export async function POST() {
  try {
    const result = await cleanupSyncedExpenses();
    
    return NextResponse.json({
      ok: true,
      message: "清理完成",
      stats: {
        deleted: result.deleted,
        kept: result.kept,
        totalBefore: result.totalBefore,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CLEANUP_ERROR",
          message: err instanceof Error ? err.message : "清理失败",
        },
      },
      { status: 500 },
    );
  }
}
