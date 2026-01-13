export type BubbleLayoutItem = {
  id: string;
  radius: number;
};

export type BubblePosition = {
  x: number;
  y: number;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * 轻量“防重叠”布局：
 * - 允许部分相交：只要中心距 >= overlapFactor * (r1+r2) 就算合格
 * - 多次迭代做简单的斥力分离
 */
export function computeBubbleLayout(params: {
  items: BubbleLayoutItem[];
  width: number;
  height: number;
  overlapFactor?: number; // 0~1，越小允许越多相交
  iterations?: number;
  seed?: number;
}): Record<string, BubblePosition> {
  const {
    items,
    width,
    height,
    overlapFactor = 0.85,
    iterations = 80,
    seed = 42,
  } = params;

  const w = Math.max(1, width);
  const h = Math.max(1, height);

  // 简单可重复的伪随机
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };

  const state = items.map((it) => {
    const pad = it.radius + 10;
    return {
      id: it.id,
      r: it.radius,
      x: pad + rand() * Math.max(1, w - pad * 2),
      y: pad + rand() * Math.max(1, h - pad * 2),
    };
  });

  // 迭代分离
  for (let k = 0; k < iterations; k++) {
    for (let i = 0; i < state.length; i++) {
      for (let j = i + 1; j < state.length; j++) {
        const a = state[i]!;
        const b = state[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const desired = overlapFactor * (a.r + b.r);

        if (dist < desired) {
          const push = (desired - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }

    // 轻微往中心收拢，避免都挤到边缘
    const cx = w / 2;
    const cy = h / 2;
    for (const p of state) {
      p.x += (cx - p.x) * 0.002;
      p.y += (cy - p.y) * 0.002;

      p.x = clamp(p.x, p.r + 6, w - p.r - 6);
      p.y = clamp(p.y, p.r + 6, h - p.r - 6);
    }
  }

  const out: Record<string, BubblePosition> = {};
  for (const p of state) out[p.id] = { x: p.x, y: p.y };
  return out;
}

