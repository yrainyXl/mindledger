"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { expenseInputSchema } from "@/lib/expenseSchema";

export default function Home() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 手机优先：唯一必填就是金额，其它自动填默认值
  const [amountText, setAmountText] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  type TimeKey = "morning" | "noon" | "afternoon" | "evening" | "night";
  const TIME_PRESETS: { key: TimeKey; label: string; categories: string[] }[] = [
    { key: "morning", label: "早上", categories: ["早餐", "交通"] },
    { key: "noon", label: "中午", categories: ["午餐", "购物", "娱乐"] },
    { key: "afternoon", label: "下午", categories: ["咖啡", "零食"] },
    { key: "evening", label: "晚上", categories: ["晚餐", "交通", "购物"] },
    { key: "night", label: "夜晚", categories: ["夜宵", "网购", "出行"] },
  ];

  const [timeKey, setTimeKey] = useState<TimeKey>(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return "morning";
    if (h >= 11 && h < 14) return "noon";
    if (h >= 14 && h < 18) return "afternoon";
    if (h >= 18 && h < 23) return "evening";
    return "night";
  });
  const timePreset = useMemo(() => {
    return TIME_PRESETS.find((t) => t.key === timeKey) ?? TIME_PRESETS[1]!;
  }, [timeKey]);

  const GENERAL_CATEGORIES = ["理发", "手机话费", "房租"];

  type CategoryLevel = "time" | "preset" | "custom";
  const [categoryLevel, setCategoryLevel] = useState<CategoryLevel>("time");
  const [customCategory, setCustomCategory] = useState("");

  type QuickMode = "coarse" | "fine";
  const [quickMode, setQuickMode] = useState<QuickMode>("coarse");
  const [coarseBase, setCoarseBase] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<
    | { type: "success"; message: string }
    | { type: "error"; message: string }
    | null
  >(null);

  function parseAmount(input: string) {
    const t = input.trim().replace(/[，,]/g, ".");
    if (!t) return undefined;
    const m = t.match(/(\d+(?:\.\d+)?)/);
    if (!m?.[1]) return undefined;
    const n = Number(m[1]);
    if (Number.isNaN(n)) return undefined;
    return n;
  }

  const quickValues = useMemo(() => {
    if (quickMode === "coarse") return [5, 10, 15, 20, 25, 30];
    const base = coarseBase ?? 10;
    const start = Math.max(1, base - 4);
    // 细分 5 个数：例如 base=10 -> 6..10
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [quickMode, coarseBase]);

  function onQuickTap(v: number) {
    setToast(null);
    if (quickMode === "coarse") {
      setCoarseBase(v);
      setAmountText(String(v));
      setQuickMode("fine");
      return;
    }
    setAmountText(String(v));
    setQuickMode("coarse");
    setCoarseBase(null);
  }

  async function submit() {
    setToast(null);

    const amount = parseAmount(amountText);
    if (amount === undefined) {
      setToast({ type: "error", message: "请输入金额（例如 14 或 23.5）" });
      return;
    }
    if (amount <= 0) {
      setToast({ type: "error", message: "金额必须大于 0" });
      return;
    }

    const note = "";
    
    // 聚合所有选择的类别，并处理自定义输入（按逗号或空格拆分）
    const finalCategoriesSet = new Set<string>();
    
    if (categoryLevel === "custom" && customCategory.trim()) {
      // 支持逗号、顿号或空格拆分多个自定义类别
      const split = customCategory.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean);
      split.forEach(s => finalCategoriesSet.add(s));
    } else {
      selectedCategories.forEach(c => finalCategoriesSet.add(c));
    }

    const candidate = {
      amount,
      currency: "CNY",
      categories: Array.from(finalCategoriesSet),
      date: today,
      note,
      tags: [timePreset.label],
    };

    const parsed = expenseInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "数据校验失败";
      setToast({ type: "error", message: errorMsg });
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

      const amountTextDisplay = amount % 1 === 0 ? String(amount) : amount.toFixed(2);
      const categoriesDisplay = candidate.categories.join("·");
      setToast({
        type: "success",
        message: `已记录：${timePreset.label}·${categoriesDisplay} ¥${amountTextDisplay}`,
      });
      setAmountText("");
      setQuickMode("coarse");
      setCoarseBase(null);
      setCategoryLevel("time");
      setSelectedCategories([]);
      setCustomCategory("");
    } catch {
      setToast({ type: "error", message: "网络异常，请稍后重试。" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(800px_circle_at_25%_20%,rgba(250,204,21,0.35),transparent_55%),radial-gradient(900px_circle_at_85%_25%,rgba(244,114,182,0.35),transparent_55%),radial-gradient(1000px_circle_at_50%_85%,rgba(34,211,238,0.28),transparent_60%),linear-gradient(to_bottom,#07070b,#000)] text-white">
      <main className="mx-auto w-full max-w-md px-5 pb-10 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-10"
        >
          <div className="text-center text-sm font-medium text-white/70">
            极速记账
          </div>

          <div className="mt-6">
            <div className="text-center text-[52px] font-semibold tracking-tight">
              <span className="mr-2 align-middle text-white/60">¥</span>
              <input
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="w-[220px] bg-transparent text-center text-[52px] font-semibold tracking-tight text-white outline-none placeholder:text-white/20"
              />
            </div>
            <div className="mx-auto mt-3 h-px w-44 bg-white/20" />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-center">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={quickMode === "coarse" ? "coarse" : `fine:${coarseBase ?? "x"}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="flex flex-wrap items-center justify-center gap-2"
                >
                  {quickValues.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => onQuickTap(v)}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur hover:bg-white/15 active:scale-[0.98]"
                    >
                      {v}
                    </button>
                  ))}

                  {quickMode === "fine" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMode("coarse");
                        setCoarseBase(null);
                      }}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/70 backdrop-blur hover:bg-white/15 active:scale-[0.98]"
                    >
                      返回
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setAmountText("");
                      setQuickMode("coarse");
                      setCoarseBase(null);
                    }}
                    className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/70 backdrop-blur hover:bg-white/15 active:scale-[0.98]"
                  >
                    清空
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-2 text-center text-xs text-white/40">
              小额点选；大额直接输入
            </div>
          </div>

          {/* 时间段 -> 类别：像金额一样“一排联动” */}
          <div className="mt-7">
            <div className="mx-auto flex max-w-sm items-center justify-center">
              <AnimatePresence mode="popLayout" initial={false}>
                {/* 第1层：时间段 */}
                {categoryLevel === "time" ? (
                  <motion.div
                    key="cat:time"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="flex flex-wrap items-center justify-center gap-2"
                  >
                    {(
                      [
                        { k: "morning", label: "早上", c: "bg-sky-400/25 text-sky-100" },
                        { k: "noon", label: "中午", c: "bg-amber-400/25 text-amber-100" },
                        { k: "afternoon", label: "下午", c: "bg-cyan-400/25 text-cyan-100" },
                        { k: "evening", label: "晚上", c: "bg-fuchsia-400/25 text-fuchsia-100" },
                        { k: "night", label: "夜晚", c: "bg-indigo-400/25 text-indigo-100" },
                      ] as const
                    ).map((x) => {
                      const active = timeKey === x.k;
                      return (
                        <button
                          key={x.k}
                          type="button"
                          onClick={() => {
                            setTimeKey(x.k);
                            setSelectedCategories([]);
                            setCategoryLevel("preset");
                          }}
                          className={[
                            "rounded-full px-4 py-2 text-sm backdrop-blur transition",
                            x.c,
                            active ? "ring-2 ring-white/35" : "opacity-80 hover:opacity-100",
                          ].join(" ")}
                        >
                          {x.label}
                        </button>
                      );
                    })}
                  </motion.div>
                ) : null}

                {/* 第2层：时间段对应类别 + 通用 + 返回 */}
                {categoryLevel === "preset" ? (
                  <motion.div
                    key={`cat:preset:${timeKey}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="flex flex-wrap items-center justify-center gap-2"
                  >
                    {[...timePreset.categories, ...GENERAL_CATEGORIES].map((c) => {
                      const active = selectedCategories.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setSelectedCategories(prev => 
                              prev.includes(c) 
                                ? (prev.length > 1 ? prev.filter(x => x !== c) : prev)
                                : [...prev.filter(x => x === "其他" ? false : true), c]
                            );
                          }}
                          className={[
                            "rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur transition",
                            active ? "ring-2 ring-white/35" : "opacity-80 hover:opacity-100",
                          ].join(" ")}
                        >
                          {c}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        setCustomCategory("");
                        setCategoryLevel("custom");
                      }}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur hover:bg-white/15 active:scale-[0.98]"
                    >
                      其他
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategoryLevel("time")}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/70 backdrop-blur hover:bg-white/15 active:scale-[0.98]"
                    >
                      返回
                    </button>
                  </motion.div>
                ) : null}

                {/* 第3层：自定义“其他”输入框（同一行覆盖） */}
                {categoryLevel === "custom" ? (
                  <motion.div
                    key="cat:custom"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="flex flex-wrap items-center justify-center gap-2"
                  >
                    <input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="类型1, 类型2..."
                      className="h-10 w-40 rounded-full bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/40 backdrop-blur"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const v = customCategory.trim();
                        if (!v) return;
                        const split = v.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean);
                        if (split.length > 0) {
                          setSelectedCategories(split);
                        }
                        setCategoryLevel("preset");
                      }}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur hover:bg-white/15 active:scale-[0.98]"
                    >
                      确定
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryLevel("preset")}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/70 backdrop-blur hover:bg-white/15 active:scale-[0.98]"
                    >
                      返回
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <motion.button
              type="button"
              onClick={() => submit()}
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="h-14 w-full rounded-2xl bg-[linear-gradient(90deg,rgba(250,204,21,0.95),rgba(244,114,182,0.92),rgba(34,211,238,0.92))] text-base font-semibold text-black shadow-[0_18px_60px_rgba(244,114,182,0.22)] disabled:opacity-60"
            >
              {loading ? "记录中…" : "记录"}
            </motion.button>
          </div>

          {toast ? (
            <div className="mt-4 text-center text-sm">
              <span className={toast.type === "success" ? "text-emerald-200" : "text-red-200"}>
                {toast.message}
              </span>
            </div>
          ) : (
            <div className="mt-4 text-center text-xs text-white/40">
              {today} · {timePreset.label} ·{" "}
              {categoryLevel === "custom" && customCategory.trim() 
                ? customCategory.trim().split(/[,，、\s]+/).join("·") 
                : (selectedCategories.length > 0 ? selectedCategories.join("·") : "未选类别")}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
