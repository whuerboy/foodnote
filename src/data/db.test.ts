import { beforeEach, afterEach, describe, it, expect } from "vitest";
import {
  FoodnoteDB,
  saveFood,
  addEntry,
  copyMeal,
  exportBackup,
  restoreBackup,
} from "./db";
import type { Food } from "../domain/model";
let db: FoodnoteDB;
const food: Food = {
  id: "oats",
  name: "燕麦",
  unit: "g",
  basis: "干重",
  icon: "grain",
  nutrition: { calories: 380, protein: 13, carbs: 68, fat: 7 },
  favorite: false,
  archived: false,
  updatedAt: 1,
};
beforeEach(() => {
  db = new FoodnoteDB("test-" + crypto.randomUUID());
});
afterEach(async () => {
  await db.delete();
});
describe("IndexedDB 业务闭环", () => {
  it("真实保存记录与营养快照，编辑删除食物不影响历史", async () => {
    await saveFood(food, db);
    const e = await addEntry(food.id, 50, "2026-10-10", "早餐", db);
    await saveFood(
      { ...food, nutrition: { ...food.nutrition, calories: 100 } },
      db,
    );
    expect((await db.entries.get(e.id))?.nutrition.calories).toBe(190);
    await db.foods.delete(food.id);
    expect(await db.entries.count()).toBe(1);
  });
  it("关闭再打开仍保留数据", async () => {
    await saveFood(food, db);
    await addEntry(food.id, 50, "2026-10-10", "早餐", db);
    db.close();
    await db.open();
    expect(await db.entries.count()).toBe(1);
  });
  it("归档食物不能新增饮食，历史仍在", async () => {
    await saveFood({ ...food, archived: true }, db);
    await expect(
      addEntry(food.id, 50, "2026-10-10", "早餐", db),
    ).rejects.toThrow();
    expect(await db.entries.count()).toBe(0);
  });
  it("餐次复制生成新编号并保留快照", async () => {
    await saveFood(food, db);
    await addEntry(food.id, 50, "2026-10-10", "早餐", db);
    await copyMeal("2026-10-10", "早餐", "2026-10-11", "午餐", db);
    const rows = await db.entries.toArray();
    expect(rows).toHaveLength(2);
    expect(rows[0].id).not.toBe(rows[1].id);
    expect(rows[0].nutrition).toEqual(rows[1].nutrition);
    await expect(
      copyMeal("2026-10-10", "早餐", "2026-10-10", "早餐", db),
    ).rejects.toThrow();
  });
  it("完整备份与恢复，并拒绝损坏数据且保持原数据", async () => {
    await saveFood(food, db);
    await addEntry(food.id, 50, "2026-10-10", "早餐", db);
    const backup = await exportBackup(db);
    await db.entries.clear();
    await restoreBackup(backup, db);
    expect(await db.entries.count()).toBe(1);
    await expect(
      restoreBackup(
        { ...backup, foods: [{ ...food, nutrition: { calories: -10 } }] },
        db,
      ),
    ).rejects.toThrow();
    expect(await db.entries.count()).toBe(1);
    await expect(
      restoreBackup(
        { ...backup, entries: [{ ...backup.entries[0], date: "2026-02-30" }] },
        db,
      ),
    ).rejects.toThrow();
    expect(await db.entries.count()).toBe(1);
  });
});
