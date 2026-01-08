"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export function Bubble(props: {
  label: ReactNode;
  subLabel?: ReactNode;
  radius: number;
  x: number;
  y: number;
  tone?: "time" | "category" | "action";
  onClick?: () => void;
}) {
  const { label, subLabel, radius, x, y, tone = "category", onClick } = props;

  const colors =
    tone === "time"
      ? {
          border: "rgba(56,189,248,0.35)",
          glow: "rgba(56,189,248,0.25)",
          core: "rgba(2,132,199,0.18)",
        }
      : tone === "action"
        ? {
            border: "rgba(167,139,250,0.35)",
            glow: "rgba(167,139,250,0.22)",
            core: "rgba(124,58,237,0.16)",
          }
        : {
            border: "rgba(34,197,94,0.30)",
            glow: "rgba(34,197,94,0.18)",
            core: "rgba(21,128,61,0.14)",
          };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="absolute select-none"
      style={{
        left: x,
        top: y,
        width: radius * 2,
        height: radius * 2,
        marginLeft: -radius,
        marginTop: -radius,
      }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: [0, -8, 0],
        filter: ["brightness(1)", "brightness(1.06)", "brightness(1)"],
      }}
      transition={{
        scale: { type: "spring", stiffness: 380, damping: 26 },
        opacity: { duration: 0.18 },
        y: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
        filter: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className="relative h-full w-full rounded-full"
        style={{
          border: `1px solid ${colors.border}`,
          background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 18%, ${colors.core} 55%, rgba(0,0,0,0.15) 100%)`,
          boxShadow: `0 18px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.14), 0 0 28px ${colors.glow}`,
          backdropFilter: "blur(10px)",
        }}
      >
        {/* 高光 */}
        <div
          className="absolute left-[18%] top-[14%] h-[28%] w-[28%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 55%, rgba(255,255,255,0) 75%)",
            filter: "blur(0.2px)",
          }}
        />

        {/* 反光弧 */}
        <div
          className="absolute right-[12%] bottom-[14%] h-[40%] w-[40%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 60% 60%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0) 72%)",
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <div className="text-sm font-semibold tracking-tight text-white drop-shadow">
            {label}
          </div>
          {subLabel ? (
            <div className="mt-0.5 text-[11px] text-zinc-200/80">
              {subLabel}
            </div>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
}

