"use client";

import { useEffect, useMemo, useState } from "react";
import { expenseInputSchema, type ExpenseRecord } from "@/lib/expenseSchema";

type Feedback =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

type ParsedLine = {
  amount?: number;
  currency?: string;
  category?: string;
  date?: string;
  note?: string;
  tags?: string[];
  parseError?: string;
};

export default function Home() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [line, setLine] = useState<string>("");

  const [items, setItems] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function refreshList() {
    const res = await fetch("/api/expenses", { cache: "no-store" });
    const data = (await res.json()) as { ok: boolean; items?: ExpenseRecord[] };
    if (data?.ok && Array.isArray(data.items)) setItems(data.items);
  }

  useEffect(() => {
    refreshList().catch(() => {
      // 初次加载失败不阻塞输入
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function shiftDays(yyyyMmDd: string, deltaDays: number) {
    const d = new Date(`${yyyyMmDd}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return d.toISOString().slice(0, 10);
  }

  function parseLine(input: string): ParsedLine {
    const text = input.trim();
    if (!text) return { parseError: "请输入一段描述，例如：今天中午吃了牛肉面14元" };

    // tags: #标签
    const tags = Array.from(text.matchAll(/#([\p{L}\p{N}_-]{1,20})/gu))
      .map((m) => m[1].trim())
      .filter(Boolean);

    // date
    let date = today;
    const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (dateMatch?.[1]) date = dateMatch[1];
    else if (text.includes("昨天")) date = shiftDays(today, -1);
    else if (text.includes("今天")) date = today;

    // currency
    let currency = "CNY";
    if (text.includes("$") || /USD/i.test(text)) currency = "USD";
    else if (text.includes("€") || /EUR/i.test(text)) currency = "EUR";
    else if (text.includes("¥") || text.includes("元") || /RMB|CNY/i.test(text))
      currency = "CNY";

    // amount: 优先匹配“xx元/xx块/xxrmb/xxcny/xxusd”等
    let amount: number | undefined;
    const m1 = text.match(/(\d+(?:\.\d+)?)\s*(元|块|rmb|cny|usd|eur)/i);
    if (m1?.[1]) amount = Number(m1[1]);
    if (amount === undefined) {
      const m2 = text.match(/(\d+(?:\.\d+)?)/);
      if (m2?.[1]) amount = Number(m2[1]);
    }
    if (amount === undefined || Number.isNaN(amount)) {
      return { parseError: "没有识别到金额，请包含数字金额，例如：牛肉面14元" };
    }

    // category: 简单关键词分类（可随时扩展）
    const t = text;
    let category = "其他";
    if (/(吃|饭|面|米粉|奶茶|咖啡|餐|外卖|早餐|午餐|晚餐)/.test(t)) category = "餐饮";
    else if (/(地铁|公交|打车|滴滴|高铁|火车|机票|加油|停车)/.test(t)) category = "交通";
    else if (/(房租|水费|电费|燃气|物业|宽带)/.test(t)) category = "住房";
    else if (/(超市|购物|淘宝|京东|拼多多|便利店)/.test(t)) category = "购物";
    else if (/(挂号|医院|药|体检)/.test(t)) category = "医疗";

    return {
      amount,
      currency,
      category,
      date,
      note: text,
      tags: tags.length ? Array.from(new Set(tags)).slice(0, 10) : undefined,
    };
  }

  const parsedPreview = useMemo(() => parseLine(line), [line, today]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setErrors({});

    if (parsedPreview.parseError) {
      setFeedback({ type: "error", message: parsedPreview.parseError });
      return;
    }

    const candidate = {
      amount: parsedPreview.amount,
      currency: parsedPreview.currency,
      category: parsedPreview.category,
      date: parsedPreview.date,
      note: parsedPreview.note,
      tags: parsedPreview.tags,
    };

    const parsed = expenseInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (v?.[0]) fieldErrors[k] = v[0];
      }
      setErrors(fieldErrors);
      setFeedback({ type: "error", message: "请先修正表单错误再提交。" });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        const msg =
          data?.error?.message ||
          (res.status === 422 ? "数据校验失败" : "提交失败");
        setFeedback({ type: "error", message: msg });

        const details = data?.error?.details?.fieldErrors as
          | Record<string, string[]>
          | undefined;
        if (details) {
          const fieldErrors: Record<string, string> = {};
          for (const [k, v] of Object.entries(details)) {
            if (v?.[0]) fieldErrors[k] = v[0];
          }
          setErrors(fieldErrors);
        }
        return;
      }

      const item = data.item as ExpenseRecord | undefined;
      if (item) setItems((prev) => [item, ...prev]);
      setFeedback({ type: "success", message: "已记录这笔消费 ✅" });

      setLine("");
    } catch {
      setFeedback({ type: "error", message: "网络异常，请稍后重试。" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-zinc-50">
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <header className="mb-8 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            MindLedger
          </h1>
          <p className="text-sm leading-6 text-zinc-300">
            用一句话记录消费，例如：<span className="text-zinc-100">今天中午吃了牛肉面14元</span>
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-sm backdrop-blur sm:p-7">
          <form onSubmit={onSubmit} className="grid gap-4 sm:gap-5">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="line">
                记录一句话
              </label>
              <textarea
                id="line"
                rows={3}
                placeholder="例如：今天中午吃了牛肉面14元"
                className="resize-none rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-zinc-50 outline-none transition placeholder:text-zinc-500 focus:border-zinc-600"
                value={line}
                onChange={(e) => setLine(e.target.value)}
              />
              <p className="text-xs text-zinc-400">
                支持关键词：今天/昨天、金额（如 14元 / 23.5）、#标签（如 #工作）。
              </p>
            </div>

            {!parsedPreview.parseError ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <span className="text-zinc-400">识别金额：</span>
                    <span className="font-semibold">
                      {parsedPreview.amount} {parsedPreview.currency}
                    </span>
                  </span>
                  <span>
                    <span className="text-zinc-400">分类：</span>
                    <span className="font-semibold">{parsedPreview.category}</span>
                  </span>
                  <span>
                    <span className="text-zinc-400">日期：</span>
                    <span className="font-semibold">{parsedPreview.date}</span>
                  </span>
                </div>
                {parsedPreview.tags?.length ? (
                  <div className="mt-1 text-xs text-zinc-400">
                    标签：{parsedPreview.tags.map((t) => `#${t}`).join(" ")}
                  </div>
                ) : null}
              </div>
            ) : null}

            {errors.amount ? (
              <p className="text-xs text-red-300">{errors.amount}</p>
            ) : null}
            {errors.category ? (
              <p className="text-xs text-red-300">{errors.category}</p>
            ) : null}
            {errors.date ? (
              <p className="text-xs text-red-300">{errors.date}</p>
            ) : null}

            {feedback ? (
              <div
                className={[
                  "rounded-xl border px-3 py-2 text-sm",
                  feedback.type === "success"
                    ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-200"
                    : "border-red-900/60 bg-red-950/40 text-red-200",
                ].join(" ")}
                role="status"
              >
                {feedback.message}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 px-5 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:opacity-60"
              >
                {loading ? "提交中…" : "提交记录"}
              </button>

              <p className="text-xs text-zinc-400">
                数据将保存到本地：<code className="font-mono">data/expenses.json</code>
              </p>
            </div>
          </form>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              最近记录
            </h2>
            <button
              type="button"
              onClick={() => refreshList()}
              className="text-xs text-zinc-300 underline-offset-4 hover:underline"
            >
              刷新
            </button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-300">
              暂无记录，先提交一笔试试。
            </div>
          ) : (
            <ul className="grid gap-3">
              {items.slice(0, 10).map((it) => (
                <li
                  key={it.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {it.category}
                      </div>
                      <div className="mt-1 text-xs text-zinc-300">
                        {it.date}
                        {it.note ? ` · ${it.note}` : ""}
                        {it.tags?.length ? ` · #${it.tags.join(" #")}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold tabular-nums">
                      {it.amount} {it.currency}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
