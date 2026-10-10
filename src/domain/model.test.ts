import { describe, it, expect } from "vitest";
import {
  scale,
  sum,
  recipeNutrition,
  statistics,
  trendGroups,
  shiftDate,
  isDate,
  type Entry,
} from "./model";
const n = { calories: 380, protein: 13, carbs: 68, fat: 7 };
describe("营养与日期计算", () => {
  it("按实际重量计算，不提前舍入", () => {
    expect(scale(n, 50)).toEqual({
      calories: 190,
      protein: 6.5,
      carbs: 34,
      fat: 3.5,
    });
    expect(sum([scale(n, 33.3), scale(n, 66.7)]).calories).toBeCloseTo(380);
  });
  it("拒绝负值、非有限数和无效重量", () => {
    for (const amount of [0, -1, NaN, Infinity])
      expect(() => scale(n, amount)).toThrow();
    expect(() => scale({ ...n, fat: -1 }, 100)).toThrow();
  });
  it("配方使用成品出品量计算每100g营养", () => {
    const ingredients = [
      {
        foodId: "a",
        name: "燕麦",
        amount: 50,
        unit: "g" as const,
        nutrition: n,
      },
      {
        foodId: "b",
        name: "牛奶",
        amount: 200,
        unit: "mL" as const,
        nutrition: { calories: 60, protein: 3, carbs: 5, fat: 3 },
      },
    ];
    expect(recipeNutrition(ingredients, 200)).toEqual({
      calories: 155,
      protein: 6.25,
      carbs: 22,
      fat: 4.75,
    });
    expect(() => recipeNutrition([], 100)).toThrow();
  });
  it("跨月、闰年与非法日期", () => {
    expect(shiftDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(isDate("2026-02-30")).toBe(false);
  });
  it("周/月/年只汇总对应区间，不将未记录日期算入日均", () => {
    const entries = [
      { date: "2026-10-05", nutrition: n },
      { date: "2026-10-10", nutrition: n },
      { date: "2026-09-30", nutrition: n },
    ] as Entry[];
    expect(statistics(entries, "周", "2026-10-10").total.calories).toBe(760);
    expect(statistics(entries, "月", "2026-10-10").days).toBe(2);
    expect(statistics(entries, "年", "2026-10-10").total.calories).toBe(1140);
  });
});

describe("V4记录日均趋势", () => {
  it("月趋势按7天分组，未记录日期不进入分母", () => {
    const entries = [
      { date: "2026-10-01", nutrition: n },
      { date: "2026-10-02", nutrition: { ...n, calories: 200 } },
      { date: "2026-10-09", nutrition: n },
    ] as Entry[];
    const groups = trendGroups(entries, "月", "2026-10-10");
    expect(groups).toHaveLength(5);
    expect(groups[0].days).toBe(2);
    expect(groups[0].average?.calories).toBe(290);
    expect(groups[1].average?.protein).toBe(13);
    expect(groups[2].average).toBeNull();
  });
  it("周趋势与年趋势均支持四项营养，空白不等于0", () => {
    const entries = [{ date: "2026-10-10", nutrition: n }] as Entry[];
    const week = trendGroups(entries, "周", "2026-10-10");
    expect(week).toHaveLength(7);
    expect(week[0].average).toBeNull();
    expect(week[5].average).toEqual(n);
    const year = trendGroups(entries, "年", "2026-10-10");
    expect(year).toHaveLength(12);
    expect(year[9].average).toEqual(n);
  });
});
