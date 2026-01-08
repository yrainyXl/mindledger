import { promises as fs } from "fs";
import path from "path";
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
  const parsed = JSON.parse(raw) as ExpenseDb;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) {
    return { version: 1, items: [] };
  }
  return parsed;
}

async function writeDb(db: ExpenseDb) {
  await ensureDbFile();
  const tmp = `${DB_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

export async function listExpenses() {
  const db = await readDb();
  return db.items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addExpense(input: ExpenseInput) {
  const db = await readDb();
  const record: ExpenseRecord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  db.items.unshift(record);
  await writeDb(db);
  return record;
}

