import { useState } from "react";
import {
  type Food,
  type Entry,
  type Meal,
  meals,
  scale,
} from "../domain/model";
import { addEntry } from "../data/db";
import { Button } from "./ui/button";
export function EntryForm({
  foods,
  entries,
  date,
  meal,
  food,
  onSaved,
}: {
  foods: Food[];
  entries: Entry[];
  date: string;
  meal: Meal;
  food?: Food;
  onSaved: () => void;
}) {
  const [id, setId] = useState(food?.id ?? "");
  const [amount, setAmount] = useState(100);
  const [day, setDay] = useState(date);
  const [m, setMeal] = useState(meal);
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const f = foods.find((f) => f.id === id);
  const recent = entries
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((e) => e.foodId);
  const options = foods.filter(
    (f) =>
      !f.archived &&
      f.name.includes(query) &&
      (filter !== "收藏" || f.favorite) &&
      (filter !== "最近" || recent.includes(f.id)),
  );
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await addEntry(id, amount, day, m);
          onSaved();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="field-grid">
        <label>
          日期
          <input
            required
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <label>
          餐次
          <select
            aria-label="餐次"
            value={m}
            onChange={(e) => setMeal(e.target.value as Meal)}
          >
            {meals.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="tabs">
        {["全部", "收藏", "最近"].map((t) => (
          <button
            type="button"
            key={t}
            aria-pressed={filter === t}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <label>
        搜索食物
        <input
          value={query}
          placeholder="输入名称筛选"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <label>
        食物
        <select
          aria-label="食物"
          required
          value={id}
          onChange={(e) => setId(e.target.value)}
        >
          <option value="">请选择已创建的食物</option>
          {options.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} · {f.basis} · {f.unit}
            </option>
          ))}
        </select>
      </label>
      <label>
        实际食用量（{f?.unit ?? "g"}）
        <input
          required
          type="number"
          min="0.1"
          max="100000"
          step="any"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </label>
      {f && amount > 0 && amount <= 100000 && (
        <div className="card preview-nutrition">
          <strong>{scale(f.nutrition, amount).calories.toFixed(1)} kcal</strong>
          <span>
            蛋白质 {scale(f.nutrition, amount).protein.toFixed(1)}g · 碳水{" "}
            {scale(f.nutrition, amount).carbs.toFixed(1)}g · 脂肪{" "}
            {scale(f.nutrition, amount).fat.toFixed(1)}g
          </span>
        </div>
      )}
      {!foods.some((f) => !f.archived) && (
        <p className="muted">请先到菜单，点击底部 ＋ 创建食物。</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || !f}>
        保存饮食记录
      </Button>
    </form>
  );
}
