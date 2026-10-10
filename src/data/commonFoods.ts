import type { Food } from "../domain/model";
import type { FoodnoteDB } from "./db";
import data from "./common-foods.json";
export const commonFoods: Food[] = data as Food[];
const key = "common-foods-v1";
/** One-time, additive import; deletion/editing/archiving and backups stay intact. */
export async function initializeCommonFoods(database: FoodnoteDB) {
  return database.transaction(
    "rw",
    database.foods,
    database.metadata,
    async () => {
      if (await database.metadata.get(key)) return 0;
      const existing = await database.foods.toArray();
      const names = new Set(
        existing.map((f) => `${f.name.trim()}|${f.basis}|${f.unit}`),
      );
      const ids = new Set(existing.map((f) => f.id));
      const additions = commonFoods.filter(
        (f) => !ids.has(f.id) && !names.has(`${f.name}|${f.basis}|${f.unit}`),
      );
      await database.foods.bulkAdd(additions);
      await database.metadata.put({ id: key, value: true });
      return additions.length;
    },
  );
}
