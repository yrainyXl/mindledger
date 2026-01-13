import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { ExpenseInput, ExpenseRecord } from "./expenseSchema";

type ExpenseDb = {
  version: 1;
  items: ExpenseRecord[];
};

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "expenses.json");

async function ensureDbFile() {
  await fs.mkdir(DB_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    const initial: ExpenseDb = { version: 1, items: [] };
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readDb(): Promise<ExpenseDb> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, "utf8");
  const parsed = JSON.parse(raw) as any;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) {
    return { version: 1, items: [] };
  }

  // 数据平滑迁移：将旧的 category (string) 转换为 categories (string[])
  const migratedItems = parsed.items.map((item: any) => {
    if (item.category && !item.categories) {
      const { category, ...rest } = item;
      return { ...rest, categories: [category] };
    }
    return item;
  });

  return { ...parsed, items: migratedItems };
}

async function writeDb(db: ExpenseDb) {
  try {
    await ensureDbFile();
    const tmp = `${DB_PATH}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, DB_PATH);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[expenseStore] writeDb failed to ${DB_PATH}:`, error);
    throw error;
  }
}

export async function listExpenses() {
  const db = await readDb();
  return db.items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addExpense(input: ExpenseInput) {
  try {
    const db = await readDb();
    const record: ExpenseRecord = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    db.items.unshift(record);
    await writeDb(db);
    return record;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[expenseStore] addExpense failed:", error);
    throw error;
  }
}

export async function markExpenseNotionSynced(params: {
  id: string;
  notionPageId: string;
  notionUrl: string;
}) {
  const db = await readDb();
  const idx = db.items.findIndex((x) => x.id === params.id);
  if (idx === -1) return;
  const existing = db.items[idx]!;
  db.items[idx] = {
    ...existing,
    notionPageId: params.notionPageId,
    notionUrl: params.notionUrl,
    notionSyncedAt: new Date().toISOString(),
  };
  await writeDb(db);
}

/**
 * 清理已同步到 Notion 的记录
 * 删除所有有 notionSyncedAt 字段的记录，保留未同步记录作为备份
 * @returns 清理统计信息
 */
export async function cleanupSyncedExpenses(): Promise<{
  deleted: number;
  kept: number;
  totalBefore: number;
}> {
  const db = await readDb();
  const totalBefore = db.items.length;
  
  // 过滤出未同步的记录（没有 notionSyncedAt 字段）
  const unsynced = db.items.filter((item) => !item.notionSyncedAt);
  const deleted = totalBefore - unsynced.length;
  
  // 只保留未同步的记录
  db.items = unsynced;
  await writeDb(db);
  
  return {
    deleted,
    kept: unsynced.length,
    totalBefore,
  };
}

/**
 * 获取已同步记录数量（用于判断是否需要清理）
 */
export async function getSyncedCount(): Promise<number> {
  const db = await readDb();
  return db.items.filter((item) => item.notionSyncedAt).length;
}
