export type TimeSlotKey = "morning" | "noon" | "evening" | "night";

export type TimeSlot = {
  key: TimeSlotKey;
  label: string;
  hint: string;
  categories: { key: string; label: string }[];
};

export const TIME_SLOTS: TimeSlot[] = [
  {
    key: "morning",
    label: "早上",
    hint: "早餐 / 通勤 / 咖啡",
    categories: [
      { key: "breakfast", label: "早餐" },
      { key: "commute", label: "通勤" },
      { key: "drink", label: "饮品" },
      { key: "shopping", label: "购物" },
    ],
  },
  {
    key: "noon",
    label: "中午",
    hint: "午餐 / 购物 / 娱乐",
    categories: [
      { key: "lunch", label: "午餐" },
      { key: "shopping", label: "购物" },
      { key: "fun", label: "娱乐" },
      { key: "transport", label: "交通" },
    ],
  },
  {
    key: "evening",
    label: "晚上",
    hint: "晚餐 / 运动 / 社交",
    categories: [
      { key: "dinner", label: "晚餐" },
      { key: "sport", label: "运动" },
      { key: "social", label: "社交" },
      { key: "home", label: "住房" },
    ],
  },
  {
    key: "night",
    label: "夜晚",
    hint: "夜宵 / 网购 / 出行",
    categories: [
      { key: "midnight_snack", label: "夜宵" },
      { key: "online_shopping", label: "网购" },
      { key: "ride", label: "出行" },
      { key: "other", label: "其他" },
    ],
  },
];

