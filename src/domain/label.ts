import type { Nutrition } from "./model";
export type EnergyUnit = "kcal" | "kJ" | "J";
export function toKcal(value: number, unit: EnergyUnit): number {
  if (!Number.isFinite(value) || value < 0) throw Error("请输入有效的能量");
  return unit === "kJ" ? value / 4.184 : unit === "J" ? value / 4184 : value;
}
export function fromKcal(value: number, unit: EnergyUnit): number {
  return unit === "kJ" ? value * 4.184 : unit === "J" ? value * 4184 : value;
}
export interface LabelDraft {
  nutrition: Partial<Nutrition>;
  unit: "g" | "mL";
  servingAmount?: number;
  energyUnit?: EnergyUnit;
  energy?: number;
  text: string;
}
/** Read the first amount on each nutrient row, excluding the NRV percentage. */
export function parseNutritionLabel(raw: string): LabelDraft {
  const text = raw
    .normalize("NFKC")
    .replace(/千\s*焦/g, "kJ")
    .replace(/千\s*卡|大卡/g, "kcal")
    .replace(/焦耳/g, "J");
  const header = text.match(
    /(?:每\s*|per\s*)(\d+(?:\.\d+)?)\s*(毫升|ml|克|g)/i,
  );
  const draft: LabelDraft = {
    nutrition: {},
    unit: header && /ml|毫升/i.test(header[2]) ? "mL" : "g",
    servingAmount: header ? Number(header[1]) : undefined,
    text: raw,
  };
  const patterns: [keyof Nutrition, RegExp][] = [
    [
      "calories",
      /(?:能\s*量|热\s*量|energy|calories)\s*[:：]?\s*([\d]+(?:[.,]\d+)?)\s*(kcal|kj|j)?/i,
    ],
    ["protein", /(?:蛋\s*白\s*质|protein)\s*[:：]?\s*([\d]+(?:[.,]\d+)?)/i],
    ["fat", /(?:脂\s*肪|(?:total\s+)?fat)\s*[:：]?\s*([\d]+(?:[.,]\d+)?)/i],
    [
      "carbs",
      /(?:(?:碳\s*)?水\s*化\s*合\s*物|碳\s*水|(?:total\s+)?carbohydrates?)\s*[:：]?\s*([\d]+(?:[.,]\d+)?)/i,
    ],
  ];
  for (const [key, pattern] of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number(match[1].replace(",", "."));
    if (key === "calories") {
      // A missing energy unit must be confirmed; do not assume kcal.
      draft.energy = value;
      draft.energyUnit = match[2]
        ? /kj/i.test(match[2])
          ? "kJ"
          : /^j$/i.test(match[2])
            ? "J"
            : "kcal"
        : undefined;
      if (draft.energyUnit)
        draft.nutrition.calories = toKcal(value, draft.energyUnit);
    } else draft.nutrition[key] = value;
  }
  return draft;
}
export function per100(n: Nutrition, servingAmount: number): Nutrition {
  if (!Number.isFinite(servingAmount) || servingAmount <= 0)
    throw Error("请确认标签对应的重量或容量");
  return {
    calories: (n.calories * 100) / servingAmount,
    protein: (n.protein * 100) / servingAmount,
    carbs: (n.carbs * 100) / servingAmount,
    fat: (n.fat * 100) / servingAmount,
  };
}
