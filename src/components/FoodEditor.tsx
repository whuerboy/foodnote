import { fromKcal, toKcal, type EnergyUnit } from "../domain/label";
import type { ScannedFood } from "./LabelScanner";
import { useState } from "react";
import {
  type Food,
  type Ingredient,
  nutrientKeys,
  nutrientLabels,
  zero,
  recipeNutrition,
} from "../domain/model";
import { saveFood } from "../data/db";
import { Button } from "./ui/button";
import { FoodIcon, foodIcons, iconLabels } from "./FoodIcon";
export function FoodEditor({
  food,
  initialRecipe = false,
  scanned,
  foods,
  onSaved,
}: {
  food?: Food;
  initialRecipe?: boolean;
  scanned?: ScannedFood;
  foods: Food[];
  onSaved: () => void;
}) {
  const [name, setName] = useState(food?.name ?? "");
  const [kind, setKind] = useState<NonNullable<Food["kind"]>>(
    food?.kind ?? (scanned ? "包装食品" : "食材"),
  );
  const [source, setSource] = useState(food?.source ?? scanned?.source ?? "");
  const [unit, setUnit] = useState<Food["unit"]>(
    food?.unit ?? scanned?.unit ?? "g",
  );
  const [basis, setBasis] = useState<Food["basis"]>(food?.basis ?? "生重");
  const [icon, setIcon] = useState(food?.icon ?? "oats");
  const [nutrition, setNutrition] = useState(
    food?.nutrition ?? scanned?.nutrition ?? { ...zero },
  );
  const [energyUnit, setEnergyUnit] = useState<EnergyUnit>("kcal");
  const [recipe, setRecipe] = useState(
    food ? !!food.ingredients : initialRecipe,
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    food?.ingredients ?? [],
  );
  const [yieldAmount, setYield] = useState(food?.yieldAmount ?? 100);
  const [ingredientId, setIngredientId] = useState("");
  const [amount, setAmount] = useState(100);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  let calculated = zero;
  try {
    if (recipe) calculated = recipeNutrition(ingredients, yieldAmount);
  } catch {
    /* Invalid drafts display zero until saved. */
  }
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await saveFood({
            id: food?.id ?? crypto.randomUUID(),
            name,
            unit,
            basis,
            icon,
            kind,
            source,
            nutrition: recipe ? calculated : nutrition,
            favorite: food?.favorite ?? false,
            archived: food?.archived ?? false,
            updatedAt: Date.now(),
            ...(recipe ? { ingredients, yieldAmount } : {}),
          });
          onSaved();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        名称
        <input
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：燕麦 / 鸡胸肉沙拉"
        />
      </label>
      <label>
        食品类别
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as NonNullable<Food["kind"]>)}
        >
          <option>食材</option>
          <option>包装食品</option>
        </select>
      </label>
      <div className="field-grid">
        <label>
          计量单位
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Food["unit"])}
          >
            <option>g</option>
            <option>mL</option>
          </select>
        </label>
        <label>
          重量基准
          <select
            value={basis}
            onChange={(e) => setBasis(e.target.value as Food["basis"])}
          >
            <option>生重</option>
            <option>熟重</option>
            <option>干重</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend>食物插画</legend>
        <div className="icon-picker">
          {foodIcons.map((i) => (
            <button
              type="button"
              key={i}
              aria-label={`插画 ${iconLabels[i]}`}
              aria-pressed={icon === i}
              onClick={() => setIcon(i)}
            >
              <FoodIcon kind={i} />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="check-label">
        <input
          type="checkbox"
          checked={recipe}
          onChange={(e) => setRecipe(e.target.checked)}
        />
        组合菜品（按原料计算）
      </label>
      {recipe ? (
        <>
          <p className="muted">
            原料使用各自标注的 g / mL，营养按原料累计，再除以实际成品总量。
          </p>
          <div className="field-grid">
            <label>
              选择原料
              <select
                value={ingredientId}
                onChange={(e) => setIngredientId(e.target.value)}
              >
                <option value="">请选择</option>
                {foods
                  .filter((f) => !f.archived && f.id !== food?.id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} · {f.unit} · {f.basis}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              原料用量
              <input
                type="number"
                min="0.1"
                max="100000"
                step="any"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!ingredientId || amount <= 0}
            onClick={() => {
              const f = foods.find((f) => f.id === ingredientId)!;
              setIngredients([
                ...ingredients,
                {
                  foodId: f.id,
                  name: f.name,
                  unit: f.unit,
                  nutrition: { ...f.nutrition },
                  amount,
                },
              ]);
            }}
          >
            添加原料
          </Button>
          {ingredients.map((i, index) => (
            <div className="inline-row" key={index}>
              <span>
                {i.name} · {i.amount}
                {i.unit}
              </span>
              <button
                type="button"
                onClick={() =>
                  setIngredients(ingredients.filter((_, j) => j !== index))
                }
              >
                移除
              </button>
            </div>
          ))}
          <label>
            成品总量（{unit}）
            <input
              required
              type="number"
              min="0.1"
              max="100000"
              step="any"
              value={yieldAmount}
              onChange={(e) => setYield(Number(e.target.value))}
            />
          </label>
          <p>
            每100{unit}：{calculated.calories.toFixed(1)} kcal
          </p>
        </>
      ) : (
        <>
          <p className="muted">填写食品包装或可靠来源上的每100{unit}营养值。</p>
          <label>
            能量单位
            <select
              aria-label="能量单位"
              value={energyUnit}
              onChange={(e) => setEnergyUnit(e.target.value as EnergyUnit)}
            >
              <option value="kcal">kcal（千卡 / 大卡）</option>
              <option value="kJ">kJ（千焦）</option>
              <option value="J">J（焦耳）</option>
            </select>
          </label>
          {energyUnit !== "kcal" && (
            <p className="energy-result">
              自动换算：每100{unit} ≈ {nutrition.calories.toFixed(2)} kcal
            </p>
          )}
          <div className="field-grid">
            {nutrientKeys.map((k) => (
              <label key={k}>
                {nutrientLabels[k]}（{k === "calories" ? energyUnit : "g"}）
                <input
                  required
                  type="number"
                  min="0"
                  max={k === "calories" ? fromKcal(100000, energyUnit) : 100000}
                  step="any"
                  value={
                    Number.isFinite(nutrition[k])
                      ? k === "calories"
                        ? Number(fromKcal(nutrition[k], energyUnit).toFixed(6))
                        : nutrition[k]
                      : ""
                  }
                  onChange={(e) =>
                    setNutrition({
                      ...nutrition,
                      [k]:
                        e.target.value === ""
                          ? NaN
                          : k === "calories"
                            ? toKcal(Number(e.target.value), energyUnit)
                            : Number(e.target.value),
                    })
                  }
                />
              </label>
            ))}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <label>
        数据来源
        <input
          maxLength={200}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="例如：包装营养标签 / 手动录入"
        />
      </label>
      <Button disabled={busy} type="submit">
        {busy ? "正在保存…" : "保存食物"}
      </Button>
    </form>
  );
}
