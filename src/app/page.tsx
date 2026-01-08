"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { expenseInputSchema, type ExpenseRecord } from "@/lib/expenseSchema";
import { Bubble } from "@/components/bubbles/Bubble";
import { computeBubbleLayout } from "@/components/bubbles/layout";
import { TIME_SLOTS, type TimeSlot, type TimeSlotKey } from "@/components/bubbles/types";
import { useContainerSize } from "@/components/bubbles/useContainerSize";

export default function Home() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 三段式：time -> category -> amount
  type Step =
    | { kind: "time" }
    | { kind: "category"; time: TimeSlot }
    | { kind: "amount"; time: TimeSlot; category: { key: string; label: string } };
  const [stack, setStack] = useState<Step[]>([{ kind: "time" }]);
  const step = stack[stack.length - 1]!;

  const [amountText, setAmountText] = useState("");

  const [items, setItems] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<
    | { type: "success"; message: string }
    | { type: "error"; message: string }
    | null
  >(null);

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

  function push(next: Step) {
    setToast(null);
    setStack((s) => [...s, next]);
  }

  function back() {
    setToast(null);
    setAmountText("");
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  function resetToRoot() {
    setToast(null);
    setAmountText("");
    setStack([{ kind: "time" }]);
  }

  function parseAmount(input: string) {
    const t = input.trim().replace(/[，,]/g, ".");
    if (!t) return undefined;
    const m = t.match(/(\d+(?:\.\d+)?)/);
    if (!m?.[1]) return undefined;
    const n = Number(m[1]);
    if (Number.isNaN(n)) return undefined;
    return n;
  }

  async function submitAmount() {
    if (step.kind !== "amount") return;
    setToast(null);

    const amount = parseAmount(amountText);
    if (amount === undefined) {
      setToast({ type: "error", message: "请输入金额（例如 14 或 23.5）" });
      return;
    }

    const categoryLabel = step.category.label;
    const timeLabel = step.time.label;
    const note = `${timeLabel}·${categoryLabel}`;

    const candidate = {
      amount,
      currency: "CNY",
      category: categoryLabel,
      date: today,
      note,
      tags: [step.time.label],
    };

    const parsed = expenseInputSchema.safeParse(candidate);
    if (!parsed.success) {
      setToast({ type: "error", message: "数据校验失败，请检查金额/备注长度等。" });
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
        setToast({
          type: "error",
          message: data?.error?.message || "提交失败，请稍后重试。",
        });
        return;
      }

      const item = data.item as ExpenseRecord | undefined;
      if (item) setItems((prev) => [item, ...prev]);
      setToast({ type: "success", message: "已记录 ✅" });
      setAmountText("");
      resetToRoot();
    } catch {
      setToast({ type: "error", message: "网络异常，请稍后重试。" });
    } finally {
      setLoading(false);
    }
  }

  const header = useMemo(() => {
    if (step.kind === "time") return { title: "选择时间", subtitle: "早上 / 中午 / 晚上 / 夜晚" };
    if (step.kind === "category")
      return { title: `选择分类`, subtitle: `时间：${step.time.label}` };
    return { title: "输入金额", subtitle: `${step.time.label} · ${step.category.label}` };
  }, [step]);

  const { ref: stageRef, size } = useContainerSize<HTMLDivElement>();

  const bubbles = useMemo(() => {
    if (step.kind === "time") {
      return TIME_SLOTS.map((t) => ({
        id: t.key,
        label: t.label,
        subLabel: t.hint,
        radius: 78,
        tone: "time" as const,
        onClick: () => push({ kind: "category", time: t }),
      }));
    }
    if (step.kind === "category") {
      return step.time.categories.map((c, idx) => ({
        id: `${step.time.key}:${c.key}`,
        label: c.label,
        subLabel: idx < 3 ? "点击选择" : undefined,
        radius: 66,
        tone: "category" as const,
        onClick: () => push({ kind: "amount", time: step.time, category: c }),
      }));
    }
    // 最后一步极简：不显示气泡，只保留金额输入与确认按钮
    return [];
  }, [step, loading]);

  const positions = useMemo(() => {
    if (size.width === 0 || size.height === 0) return {};
    return computeBubbleLayout({
      items: bubbles.map((b) => ({ id: b.id, radius: b.radius })),
      width: size.width,
      height: size.height,
      overlapFactor: 0.82,
      iterations: 90,
      seed: step.kind === "time" ? 11 : step.kind === "category" ? 22 : 33,
    });
  }, [bubbles, size.width, size.height, step.kind]);

  // 极简导航：Esc 返回；Shift+Esc 重选
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (stack.length <= 1) return;
      e.preventDefault();
      if (e.shiftKey) resetToRoot();
      else back();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stack.length]);

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(56,189,248,0.16),transparent_45%),radial-gradient(900px_circle_at_80%_20%,rgba(167,139,250,0.14),transparent_45%),radial-gradient(900px_circle_at_50%_90%,rgba(34,197,94,0.10),transparent_45%),linear-gradient(to_bottom,rgb(9,9,11),rgb(0,0,0))] text-zinc-50">
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.kind}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="relative"
          >
            <div
              ref={stageRef}
              className="relative h-[520px] w-full"
              onClick={(e) => {
                // 点击空白区域=返回（避免点到气泡也触发）
                if (stack.length <= 1) return;
                if (e.target !== e.currentTarget) return;
                back();
              }}
              onDoubleClick={(e) => {
                // 双击空白=重选
                if (stack.length <= 1) return;
                if (e.target !== e.currentTarget) return;
                resetToRoot();
              }}
            >
              {bubbles.map((b) => {
                const p = positions[b.id];
                if (!p) return null;
                return (
                  <Bubble
                    key={b.id}
                    label={b.label}
                    subLabel={b.subLabel}
                    radius={b.radius}
                    x={p.x}
                    y={p.y}
                    tone={b.tone}
                    onClick={b.onClick}
                  />
                );
              })}

              {step.kind === "amount" ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="pointer-events-auto w-full max-w-md px-6">
                    <div className="text-center text-xs text-zinc-300">
                      {step.time.label} · {step.category.label}
                    </div>

                    <div className="mt-5 grid gap-5">
                      <div>
                        <input
                          value={amountText}
                          onChange={(e) => setAmountText(e.target.value)}
                          inputMode="decimal"
                          placeholder="金额（例如 14 或 23.5）"
                          className="h-12 w-full bg-transparent text-center text-3xl font-semibold tracking-tight text-zinc-50 outline-none placeholder:text-zinc-600"
                        />
                        <div className="mx-auto mt-2 h-px w-44 bg-zinc-700/70" />
                      </div>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => submitAmount()}
                          disabled={loading}
                          className="text-sm font-semibold text-zinc-100 hover:text-white disabled:opacity-60"
                        >
                          {loading ? "提交中…" : "提交"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>

        {toast ? (
          <div className="mt-3 text-center text-sm">
            <span className={toast.type === "success" ? "text-emerald-300" : "text-red-300"}>
              {toast.message}
            </span>
          </div>
        ) : null}
      </main>
    </div>
  );
}
