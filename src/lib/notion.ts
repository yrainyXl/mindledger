import { Client } from "@notionhq/client";
import type { ExpenseRecord } from "@/lib/expenseSchema";
import { toNotionProperties } from "@/lib/expenseSchema";

type NotionEnv = {
  token: string;
  databaseId: string;
};

function getNotionEnv(): NotionEnv | null {
  const token = process.env.NOTION_TOKEN?.trim();
  const databaseId = process.env.NOTION_DATABASE_ID?.trim();
  if (!token || !databaseId) return null;
  return { token, databaseId };
}

function getTitlePropertyName() {
  return (process.env.NOTION_TITLE_PROPERTY?.trim() || "Name").toString();
}

let cachedClient: Client | null = null;
function getClient() {
  const env = getNotionEnv();
  if (!env) return null;
  if (!cachedClient) cachedClient = new Client({ auth: env.token });
  return { client: cachedClient, databaseId: env.databaseId };
}

export function notionEnabled() {
  return Boolean(getNotionEnv());
}

export type NotionCreateResult = {
  pageId: string;
  url: string;
};

export async function createNotionExpense(expense: ExpenseRecord): Promise<NotionCreateResult> {
  const ctx = getClient();
  if (!ctx) {
    throw new Error("NOTION_NOT_CONFIGURED");
  }

  const titleProp = getTitlePropertyName();
  const baseProps = toNotionProperties(expense) as Record<string, any>;
  const titleText = `${expense.category} ¥${expense.amount}`;
  baseProps[titleProp] = { title: [{ text: { content: titleText } }] };

  const res = await ctx.client.pages.create({
    parent: { database_id: ctx.databaseId },
    properties: baseProps,
  });

  const url = "url" in res && typeof res.url === "string" ? res.url : "";
  return { pageId: res.id, url };
}

