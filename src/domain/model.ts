export const meals = ["早餐", "午餐", "晚餐", "加餐"] as const;
export type Meal = (typeof meals)[number];
export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
export type Ingredient = {
  foodId: string;
  amount: number;
  name: string;
  unit: "g" | "mL";
  nutrition: Nutrition;
};
export type Food = {
  id: string;
  name: string;
  unit: "g" | "mL";
  basis: "生重" | "熟重" | "干重";
  icon: string;
  kind?: "食材" | "包装食品";
  source?: string;
  nutrition: Nutrition;
  favorite: boolean;
  archived: boolean;
  updatedAt: number;
  ingredients?: Ingredient[];
  yieldAmount?: number;
};
export type Entry = {
  id: string;
  date: string;
  meal: Meal;
  foodId: string;
  name: string;
  amount: number;
  unit: "g" | "mL";
  basis: Food["basis"];
  icon: string;
  nutrition: Nutrition;
  createdAt: number;
};
export type Goals = Nutrition & { id: "goals" };
export const zero: Nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
export const nutrientKeys = ["calories", "protein", "carbs", "fat"] as const;
export const nutrientLabels = {
  calories: "热量",
  protein: "蛋白质",
  carbs: "碳水",
  fat: "脂肪",
};
export function validNutrition(n: Nutrition) {
  return (
    n &&
    nutrientKeys.every(
      (k) => Number.isFinite(n[k]) && n[k] >= 0 && n[k] <= 100000,
    )
  );
}
export function scale(n: Nutrition, amount: number): Nutrition {
  if (
    !validNutrition(n) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 100000
  )
    throw Error("请输入有效的营养值与重量");
  return Object.fromEntries(
    nutrientKeys.map((k) => [k, (n[k] * amount) / 100]),
  ) as Nutrition;
}
export function sum(items: Nutrition[]): Nutrition {
  return items.reduce(
    (a, n) =>
      Object.fromEntries(
        nutrientKeys.map((k) => [k, a[k] + n[k]]),
      ) as Nutrition,
    { ...zero },
  );
}
export function recipeNutrition(
  ingredients: Ingredient[],
  yieldAmount: number,
): Nutrition {
  if (
    !ingredients.length ||
    !Number.isFinite(yieldAmount) ||
    yieldAmount <= 0 ||
    yieldAmount > 100000
  )
    throw Error("请填写原料和成品总重量");
  const total = sum(ingredients.map((i) => scale(i.nutrition, i.amount)));
  return Object.fromEntries(
    nutrientKeys.map((k) => [k, (total[k] * 100) / yieldAmount]),
  ) as Nutrition;
}
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function shiftDate(date: string, days: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export function isDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T12:00:00");
  return !isNaN(d.getTime()) && localDate(d) === v;
}
export function statistics(
  entries: Entry[],
  period: "周" | "月" | "年",
  date: string,
) {
  const d = new Date(date + "T12:00:00");
  let start = date,
    end = date;
  if (period === "周") {
    start = shiftDate(date, -((d.getDay() + 6) % 7));
    end = shiftDate(start, 6);
  } else if (period === "月") {
    start = localDate(new Date(d.getFullYear(), d.getMonth(), 1));
    end = localDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  } else {
    start = `${d.getFullYear()}-01-01`;
    end = `${d.getFullYear()}-12-31`;
  }
  const selected = entries.filter((e) => e.date >= start && e.date <= end);
  const bins: { label: string; calories: number }[] = [];
  if (period === "年") {
    for (let m = 1; m <= 12; m++)
      bins.push({
        label: `${m}月`,
        calories: sum(
          selected
            .filter((e) => Number(e.date.slice(5, 7)) === m)
            .map((e) => e.nutrition),
        ).calories,
      });
  } else {
    for (let s = start; s <= end; s = shiftDate(s, 1))
      bins.push({
        label: s.slice(5),
        calories: sum(
          selected.filter((e) => e.date === s).map((e) => e.nutrition),
        ).calories,
      });
  }
  return {
    start,
    end,
    bins,
    total: sum(selected.map((e) => e.nutrition)),
    days: new Set(selected.map((e) => e.date)).size,
  };
}

/** V4 trend: day averages, seven-day groups for a month, monthly groups for a year. */
export function trendGroups(
  entries: Entry[],
  period: "周" | "月" | "年",
  anchor: string,
) {
  const { start, end } = statistics(entries, period, anchor);
  const selected = entries.filter((e) => e.date >= start && e.date <= end);
  const ranges: { start: string; end: string; label: string }[] = [];
  if (period === "年") {
    const year = Number(start.slice(0, 4));
    for (let m = 0; m < 12; m++)
      ranges.push({
        start: localDate(new Date(year, m, 1)),
        end: localDate(new Date(year, m + 1, 0)),
        label: `${m + 1}月`,
      });
  } else {
    for (let s = start; s <= end; s = shiftDate(s, period === "月" ? 7 : 1)) {
      const e = period === "月" ? shiftDate(s, 6) : s;
      ranges.push({
        start: s,
        end: e > end ? end : e,
        label:
          period === "周"
            ? ["日", "一", "二", "三", "四", "五", "六"][
                new Date(s + "T12:00:00").getDay()
              ]
            : `${Number(s.slice(8))}–${Number((e > end ? end : e).slice(8))}日`,
      });
    }
  }
  return ranges.map((r) => {
    const rows = selected.filter((e) => e.date >= r.start && e.date <= r.end),
      days = new Set(rows.map((e) => e.date)).size,
      total = sum(rows.map((e) => e.nutrition));
    return {
      ...r,
      days,
      average: days
        ? (Object.fromEntries(
            nutrientKeys.map((k) => [k, total[k] / days]),
          ) as Nutrition)
        : null,
    };
  });
}
