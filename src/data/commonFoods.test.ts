import { it, expect } from "vitest";
import Dexie from "dexie";
import { commonFoods, initializeCommonFoods } from "./commonFoods";
import { FoodnoteDB, addEntry, exportBackup, restoreBackup } from "./db";
import { foodCategories, validNutrition, scale } from "../domain/model";
it("常用库完整可追溯、分类覆盖且100g营养计算正确", () => {
  expect(commonFoods).toHaveLength(79);
  expect(new Set(commonFoods.map((f) => f.id)).size).toBe(79);
  for (const f of commonFoods) {
    expect(validNutrition(f.nutrition)).toBe(true);
    expect(f.source).toMatch(/USDA FDC SR Legacy · FDC \d+/);
    expect(f.unit).toBe("g");
  }
  expect(new Set(commonFoods.map((f) => f.category))).toEqual(
    new Set(foodCategories),
  );
  const rice = commonFoods.find((f) => f.id === "common-usda-169757")!;
  expect(scale(rice.nutrition, 200).calories).toBe(260);
});
it("导入只添加，保留手动食物、历史、编辑、删除与备份恢复", async () => {
  const db = new FoodnoteDB("library-" + crypto.randomUUID());
  try {
    const rice = {
      ...commonFoods[0],
      id: "user-rice",
      nutrition: { calories: 100, protein: 2, carbs: 20, fat: 1 },
      updatedAt: 123,
    };
    await db.foods.put(rice);
    const entry = await addEntry(rice.id, 100, "2026-10-11", "午餐", db);
    expect(await initializeCommonFoods(db)).toBe(78);
    expect(await db.foods.count()).toBe(79);
    expect((await db.foods.get(rice.id))?.nutrition.calories).toBe(100);
    expect((await db.entries.get(entry.id))?.nutrition.calories).toBe(100);
    const id = commonFoods[1].id;
    await db.foods.update(id, { name: "我的大米", archived: true });
    await db.foods.delete(commonFoods[2].id);
    expect(await initializeCommonFoods(db)).toBe(0);
    expect(await db.foods.get(commonFoods[2].id)).toBeUndefined();
    expect((await db.foods.get(id))?.name).toBe("我的大米");
    const backup = await exportBackup(db);
    await restoreBackup(backup, db);
    expect(await initializeCommonFoods(db)).toBe(0);
    expect(await db.entries.count()).toBe(1);
  } finally {
    await db.delete();
  }
});
it("旧数据库升级不丢失用户数据，多标签并发不重复导入", async () => {
  const name = "upgrade-" + crypto.randomUUID();
  const legacy = new Dexie(name);
  legacy
    .version(1)
    .stores({
      foods: "id,name,archived,updatedAt",
      entries: "id,date,[date+meal],foodId,createdAt",
      settings: "id",
    });
  await legacy
    .table("foods")
    .put({ ...commonFoods[0], id: "legacy-user", name: "我的食物" });
  legacy.close();
  const db = new FoodnoteDB(name);
  try {
    await db.open();
    await Promise.all([initializeCommonFoods(db), initializeCommonFoods(db)]);
    expect(await db.foods.count()).toBe(80);
    expect((await db.foods.get("legacy-user"))?.name).toBe("我的食物");
  } finally {
    await db.delete();
  }
});
