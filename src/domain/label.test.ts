import { describe, expect, it } from "vitest";
import { fromKcal, parseNutritionLabel, per100, toKcal } from "./label";
describe("标签能量和份量换算", () => {
  it("kJ 与 J 转 kcal，并保持单位切换值", () => {
    expect(toKcal(836.8, "kJ")).toBeCloseTo(200);
    expect(toKcal(836800, "J")).toBeCloseTo(200);
    expect(fromKcal(200, "kJ")).toBeCloseTo(836.8);
    expect(toKcal(200, "kcal")).toBe(200);
    expect(() => toKcal(-1, "J")).toThrow();
  });
  it("中英文标签提取第一列，不误读 NRV", () => {
    const a = parseNutritionLabel(
      "营养成分表 每100克\n能量 836.8 千焦 10%\n蛋白质 10.0 克 17%\n脂肪 8.0 克 13%\n碳水化合物 22.0 克 7%",
    );
    expect(a.servingAmount).toBe(100);
    expect(a.energyUnit).toBe("kJ");
    expect(a.nutrition.calories).toBeCloseTo(200);
    expect(a.nutrition.protein).toBe(10);
    expect(a.nutrition.carbs).toBe(22);
    expect(parseNutritionLabel("磺 水 化 合 物 22.0 克").nutrition.carbs).toBe(
      22,
    );
    const b = parseNutritionLabel(
      "Per 30 mL\nEnergy 60 kcal\nProtein 3 g\nTotal Fat 2 g\nCarbohydrate 6 g",
    );
    expect(b.unit).toBe("mL");
    expect(b.servingAmount).toBe(30);
    expect(
      per100(b.nutrition as Required<typeof b.nutrition>, 30).calories,
    ).toBe(200);
  });
  it("不把缺失数值当0，不猜测单位和份量", () => {
    const a = parseNutritionLabel("能量 500\n脂肪 0 克");
    expect(a.energyUnit).toBeUndefined();
    expect(parseNutritionLabel("能量 836.8 干 焦").energyUnit).toBeUndefined();
    expect(a.nutrition.calories).toBeUndefined();
    expect(a.servingAmount).toBeUndefined();
    expect(a.nutrition.protein).toBeUndefined();
    expect(a.nutrition.fat).toBe(0);
    expect(() =>
      per100({ calories: 1, protein: 1, carbs: 1, fat: 1 }, 0),
    ).toThrow();
  });
});
