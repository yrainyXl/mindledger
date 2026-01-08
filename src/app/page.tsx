"use client";

import { useEffect, useMemo, useState } from "react";
import { expenseInputSchema } from "@/lib/expenseSchema";
import { Bubble } from "@/components/bubbles/Bubble";
import { TIME_SLOTS, type TimeSlot, type TimeSlotKey } from "@/components/bubbles/types";
import { useContainerSize } from "@/components/bubbles/useContainerSize";

export default function Home() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  type Mode = "time" | "category" | "amount";
  const [mode, setMode] = useState<Mode>("time");
  const [selectedTimeKey, setSelectedTimeKey] = useState<TimeSlotKey | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<{
    key: string;
    label: string;
  } | null>(null);

  const selectedTime = useMemo<TimeSlot | null>(() => {
    if (!selectedTimeKey) return null;
    return TIME_SLOTS.find((t) => t.key === selectedTimeKey) ?? null;
  }, [selectedTimeKey]);

  const [amountText, setAmountText] = useState("");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<
    | { type: "success"; message: string }
    | { type: "error"; message: string }
    | null
  >(null);

  function back() {
    setToast(null);
    setAmountText("");
    if (mode === "amount") {
      setMode("category");
      return;
    }
    if (mode === "category") {
      setMode("time");
      setSelectedCategory(null);
      setSelectedTimeKey(null);
      return;
    }
  }

  function resetToRoot() {
    setToast(null);
    setAmountText("");
    setMode("time");
    setSelectedCategory(null);
    setSelectedTimeKey(null);
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
    if (mode !== "amount" || !selectedTime || !selectedCategory) return;
    setToast(null);

    const amount = parseAmount(amountText);
    if (amount === undefined) {
      setToast({ type: "error", message: "请输入金额（例如 14 或 23.5）" });
      return;
    }

    const categoryLabel = selectedCategory.label;
    const timeLabel = selectedTime.label;
    const note = `${timeLabel}·${categoryLabel}`;

    const candidate = {
      amount,
      currency: "CNY",
      category: categoryLabel,
      date: today,
      note,
      tags: [selectedTime.label],
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

      setToast({ type: "success", message: "已记录 ✅" });
      setAmountText("");
      resetToRoot();
    } catch {
      setToast({ type: "error", message: "网络异常，请稍后重试。" });
    } finally {
      setLoading(false);
    }
  }

  const { ref: stageRef, size } = useContainerSize<HTMLDivElement>();

  const timeBubbles = useMemo(() => {
    return TIME_SLOTS.map((t) => ({
      id: t.key,
      time: t,
      label: t.label,
      subLabel: t.hint,
      radius: 78,
      tone: "time" as const,
    }));
  }, []);

  const center = useMemo(() => {
    return {
      x: Math.max(1, size.width) / 2,
      y: Math.max(1, size.height) / 2,
    };
  }, [size.width, size.height]);

  const timePositions = useMemo(() => {
    // 4 个时间气泡：固定为“花瓣”布局，确保轻微相交且不散乱
    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    if (w === 1 || h === 1) return {};

    const r = 78;
    // offset 决定相交程度：越小重叠越多；这里做轻微相交
    const offset = r * 1.25;
    const pad = r + 10;

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    const cx = clamp(center.x, pad, w - pad);
    const cy = clamp(center.y, pad, h - pad);

    const pts: Record<TimeSlotKey, { x: number; y: number }> = {
      morning: { x: cx - offset, y: cy - offset },
      noon: { x: cx + offset, y: cy - offset },
      evening: { x: cx + offset, y: cy + offset },
      night: { x: cx - offset, y: cy + offset },
    };

    // 再做一次整体缩放/夹紧，避免小屏溢出
    const scale = Math.min(
      1,
      (w - pad * 2) / (offset * 2 + r * 2),
      (h - pad * 2) / (offset * 2 + r * 2),
    );
    if (scale < 1) {
      for (const k of Object.keys(pts) as TimeSlotKey[]) {
        const p = pts[k];
        const dx = p.x - cx;
        const dy = p.y - cy;
        pts[k] = { x: cx + dx * scale, y: cy + dy * scale };
      }
    }

    const out: Record<string, { x: number; y: number }> = {};
    for (const k of Object.keys(pts) as TimeSlotKey[]) out[k] = pts[k];
    return out;
  }, [size.width, size.height, center.x, center.y]);

  const categoryBubbles = useMemo(() => {
    if (mode !== "category" || !selectedTime) return [];
    const cats = selectedTime.categories;
    const n = cats.length;
    const rCat = 62;
    const rSelected = 92; // 选中时间气泡的“最终半径”在渲染里固定

    // 让分类圆彼此相交：控制相邻圆的 chord length < 2*rCat
    // chord = 2*R*sin(pi/n) => R = chord / (2*sin(pi/n))
    const targetChord = 2 * rCat * 0.78; // 约 22% 相交
    const minOrbitForOverlap = targetChord / (2 * Math.sin(Math.PI / n));

    // 同时避免“直接盖住中心气泡”：让分类圆中心离中心 >= rSelected + rCat * 1.05
    const minOrbitForCenterClear = rSelected + rCat * 1.05;

    const orbit = Math.max(minOrbitForOverlap, minOrbitForCenterClear);

    // 每个时间段给一个稳定旋转，避免看起来“散”
    const baseRotate =
      selectedTime.key === "morning"
        ? -Math.PI / 2
        : selectedTime.key === "noon"
          ? -Math.PI / 3
          : selectedTime.key === "evening"
            ? 0
            : Math.PI / 3;

    return cats.map((c, i) => {
      const a = baseRotate + (2 * Math.PI * i) / n;
      return {
        id: `cat:${selectedTime.key}:${c.key}`,
        category: c,
        label: c.label,
        radius: rCat,
        tone: "category" as const,
        x: center.x + orbit * Math.cos(a),
        y: center.y + orbit * Math.sin(a),
      };
    });
  }, [mode, selectedTime, center.x, center.y]);

  // 极简导航：Esc 返回；Shift+Esc 重选
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (mode === "time") return;
      e.preventDefault();
      if (e.shiftKey) resetToRoot();
      else back();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode]);

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(56,189,248,0.16),transparent_45%),radial-gradient(900px_circle_at_80%_20%,rgba(167,139,250,0.14),transparent_45%),radial-gradient(900px_circle_at_50%_90%,rgba(34,197,94,0.10),transparent_45%),linear-gradient(to_bottom,rgb(9,9,11),rgb(0,0,0))] text-zinc-50">
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <div
          ref={stageRef}
          className="relative h-[520px] w-full"
          onClick={(e) => {
            // 点击空白区域=返回（避免点到气泡也触发）
            if (mode === "time") return;
            if (e.target !== e.currentTarget) return;
            back();
          }}
          onDoubleClick={(e) => {
            // 双击空白=重选
            if (mode === "time") return;
            if (e.target !== e.currentTarget) return;
            resetToRoot();
          }}
        >
          {/* 第一层：时间气泡（点击后不切整页，只做焦点展开） */}
          {timeBubbles.map((b) => {
            const base = timePositions[b.id];
            if (!base) return null;

            const isSelected = selectedTimeKey === b.id;
            const isFocusing = mode !== "time" && isSelected;
            const isHidden = mode !== "time" && !isSelected;

            const target = isFocusing ? { x: center.x, y: center.y } : base;
            const targetRadius = isFocusing ? 92 : b.radius;

            return (
              <Bubble
                key={b.id}
                label={b.label}
                subLabel={mode === "time" ? b.subLabel : undefined}
                radius={targetRadius}
                x={target.x}
                y={target.y}
                tone={b.tone}
                floating={mode === "time"}
                visible={!isHidden}
                scale={isFocusing ? 1.08 : 1}
                disabled={isHidden}
                zIndex={isFocusing ? 30 : 10}
                onClick={() => {
                  if (mode !== "time") return;
                  setToast(null);
                  setSelectedTimeKey(b.time.key);
                  setSelectedCategory(null);
                  setMode("category");
                }}
              />
            );
          })}

          {/* 第二层：围绕选中气泡的相交分类圆 */}
          {categoryBubbles.map((c) => (
            <Bubble
              key={c.id}
              label={c.label}
              radius={c.radius}
              x={c.x}
              y={c.y}
              tone={c.tone}
              floating={false}
              visible={mode === "category"}
              scale={1}
              zIndex={20}
              onClick={() => {
                setToast(null);
                setSelectedCategory(c.category);
                setMode("amount");
              }}
            />
          ))}

          {/* 第三层：金额输入（保持极简，不显示气泡） */}
          {mode === "amount" && selectedTime && selectedCategory ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="pointer-events-auto w-full max-w-md px-6">
                <div className="text-center text-xs text-zinc-300">
                  {selectedTime.label} · {selectedCategory.label}
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
