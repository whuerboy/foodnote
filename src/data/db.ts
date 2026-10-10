import Dexie, { type Table } from "dexie";
import {
  type Food,
  type Entry,
  type Goals,
  type Meal,
  scale,
  validNutrition,
  recipeNutrition,
  isDate,
  meals,
} from "../domain/model";
export class FoodnoteDB extends Dexie {
  foods!: Table<Food, string>;
  entries!: Table<Entry, string>;
  settings!: Table<Goals, string>;
  constructor(name = "foodnote-v1") {
    super(name);
    this.version(1).stores({
      foods: "id,name,archived,updatedAt",
      entries: "id,date,[date+meal],foodId,createdAt",
      settings: "id",
    });
  }
}
export const db = new FoodnoteDB();
export const defaultGoals: Goals = {
  id: "goals",
  calories: 2000,
  protein: 100,
  carbs: 250,
  fat: 65,
};
export async function saveFood(food: Food, database = db) {
  if (
    !food.name.trim() ||
    food.name.length > 100 ||
    !validNutrition(food.nutrition)
  )
    throw Error("请填写名称和有效营养值");
  if (food.ingredients)
    food.nutrition = recipeNutrition(food.ingredients, food.yieldAmount!);
  await database.foods.put({
    ...food,
    name: food.name.trim(),
    updatedAt: Date.now(),
  });
}
export async function addEntry(
  foodId: string,
  amount: number,
  date: string,
  meal: Meal,
  database = db,
) {
  if (!isDate(date) || !meals.includes(meal)) throw Error("日期或餐次无效");
  return database.transaction(
    "rw",
    database.foods,
    database.entries,
    async () => {
      const f = await database.foods.get(foodId);
      if (!f || f.archived) throw Error("该食物不可用");
      const e: Entry = {
        id: crypto.randomUUID(),
        date,
        meal,
        foodId,
        name: f.name,
        amount,
        unit: f.unit,
        basis: f.basis,
        icon: f.icon,
        nutrition: scale(f.nutrition, amount),
        createdAt: Date.now(),
      };
      await database.entries.add(e);
      return e;
    },
  );
}
export async function copyMeal(
  from: string,
  meal: Meal,
  to: string,
  target: Meal,
  database = db,
) {
  if (!isDate(to)) throw Error("目标日期无效");
  if (from === to && meal === target) throw Error("请选择不同日期或餐次");
  const rows = await database.entries
    .where("[date+meal]")
    .equals([from, meal])
    .toArray();
  if (!rows.length) throw Error("该餐没有记录");
  await database.entries.bulkAdd(
    rows.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      date: to,
      meal: target,
      createdAt: Date.now(),
    })),
  );
}
export type Backup = {
  format: "foodnote";
  version: 1;
  exportedAt: string;
  foods: Food[];
  entries: Entry[];
  settings: Goals[];
};
export async function exportBackup(database = db): Promise<Backup> {
  return database.transaction(
    "r",
    database.foods,
    database.entries,
    database.settings,
    async () => ({
      format: "foodnote",
      version: 1,
      exportedAt: new Date().toISOString(),
      foods: await database.foods.toArray(),
      entries: await database.entries.toArray(),
      settings: await database.settings.toArray(),
    }),
  );
}
export function validateBackup(value: unknown): Backup {
  const b = value as Backup;
  const id = (v: unknown) =>
    typeof v === "string" && v.length > 0 && v.length <= 100;
  const unit = (v: unknown) => v === "g" || v === "mL";
  const basis = (v: unknown) => ["生重", "熟重", "干重"].includes(String(v));
  const amount = (v: number) => Number.isFinite(v) && v > 0 && v <= 100000;
  if (
    !b ||
    b.format !== "foodnote" ||
    b.version !== 1 ||
    ![b.foods, b.entries, b.settings].every(Array.isArray) ||
    b.foods.length > 100000 ||
    b.entries.length > 100000 ||
    b.settings.length > 1
  )
    throw Error("备份格式或版本不受支持");
  for (const f of b.foods) {
    if (
      !id(f.id) ||
      !id(f.name) ||
      !unit(f.unit) ||
      !basis(f.basis) ||
      typeof f.icon !== "string" ||
      typeof f.favorite !== "boolean" ||
      typeof f.archived !== "boolean" ||
      !Number.isFinite(f.updatedAt) ||
      !validNutrition(f.nutrition)
    )
      throw Error("备份中的食物数据无效");
    if (
      (f.kind !== undefined && !["食材", "包装食品"].includes(f.kind)) ||
      (f.source !== undefined &&
        (typeof f.source !== "string" || f.source.length > 200))
    )
      throw Error("食品类别或来源无效");
    if (f.ingredients) {
      if (
        !Array.isArray(f.ingredients) ||
        !amount(f.yieldAmount!) ||
        f.ingredients.some(
          (i) =>
            !id(i.foodId) ||
            !id(i.name) ||
            !unit(i.unit) ||
            !amount(i.amount) ||
            !validNutrition(i.nutrition),
        )
      )
        throw Error("配方数据无效");
      recipeNutrition(f.ingredients, f.yieldAmount!);
    }
  }
  for (const e of b.entries)
    if (
      !id(e.id) ||
      !id(e.foodId) ||
      !id(e.name) ||
      !isDate(e.date) ||
      !meals.includes(e.meal) ||
      !unit(e.unit) ||
      !basis(e.basis) ||
      typeof e.icon !== "string" ||
      !amount(e.amount) ||
      !Number.isFinite(e.createdAt) ||
      !validNutrition(e.nutrition)
    )
      throw Error("备份中的记录无效");
  for (const g of b.settings)
    if (
      g.id !== "goals" ||
      !validNutrition(g) ||
      g.calories <= 0 ||
      g.protein <= 0 ||
      g.carbs <= 0 ||
      g.fat <= 0
    )
      throw Error("目标数据无效");
  for (const arr of [b.foods, b.entries])
    if (new Set(arr.map((x) => x.id)).size !== arr.length)
      throw Error("备份含重复编号");
  return b;
}
export async function restoreBackup(value: unknown, database = db) {
  const b = validateBackup(value);
  await database.transaction(
    "rw",
    database.foods,
    database.entries,
    database.settings,
    async () => {
      await Promise.all([
        database.foods.clear(),
        database.entries.clear(),
        database.settings.clear(),
      ]);
      await database.foods.bulkPut(b.foods);
      await database.entries.bulkPut(b.entries);
      await database.settings.bulkPut(b.settings);
    },
  );
}
