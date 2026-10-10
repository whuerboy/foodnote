import { useState } from "react";
import { Search, ChevronLeft } from "lucide-react";
import type { Entry, Food } from "../domain/model";
import { db } from "../data/db";
import { SwipeableRow } from "../components/SwipeableRow";
import { FoodIcon } from "../components/FoodIcon";
export function Menu({
  foods,
  entries,
  onEdit,
  onConfirm,
}: {
  foods: Food[];
  entries: Entry[];
  onEdit: (f: Food) => void;
  onAdd: (f: Food) => void;
  onConfirm: (t: string, a: () => Promise<unknown>) => void;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("全部"),
    [kind, setKind] = useState("全部");
  const recent = [...entries]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((e) => e.foodId);
  const visible = foods
    .filter(
      (f) =>
        f.name.toLowerCase().includes(query.toLowerCase()) &&
        (filter === "已归档" ? f.archived : !f.archived) &&
        (filter !== "收藏" || f.favorite) &&
        (filter !== "最近" || recent.includes(f.id)) &&
        (kind === "全部" ||
          (f.ingredients ? "组合菜品" : (f.kind ?? "食材")) === kind),
    )
    .sort((a, b) =>
      filter === "最近"
        ? recent.indexOf(a.id) - recent.indexOf(b.id)
        : b.updatedAt - a.updatedAt,
    );
  return (
    <>
      <div className="page-intro">
        <h1>我的菜单</h1>
        <p>保存常吃食物，记录时可直接选择</p>
      </div>
      <label className="search">
        <Search size={17} />
        <input
          aria-label="搜索食物"
          placeholder="搜索食物名称，如 虾仁"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="tabs">
        {["全部", "食材", "包装食品", "组合菜品"].map((t) => (
          <button key={t} aria-pressed={kind === t} onClick={() => setKind(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="filter-chips">
        {["全部食物", "收藏", "最近", "已归档"].map((t) => (
          <button
            key={t}
            aria-pressed={filter === (t === "全部食物" ? "全部" : t)}
            onClick={() => setFilter(t === "全部食物" ? "全部" : t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="section-heading">
        <h2>食物列表</h2>
        <span>{visible.length} 项</span>
      </div>
      <p className="swipe-hint">
        <ChevronLeft size={14} />
        向左滑动菜品，可删除；历史饮食记录会保留
      </p>
      <div className="food-list card">
        {!visible.length && (
          <div className="empty-state">
            <p>
              {foods.length
                ? "没有找到匹配的食物"
                : "从第一种食物开始，点击底部 ＋ 创建。"}
            </p>
          </div>
        )}
        {visible.map((f) => (
          <SwipeableRow
            key={f.id}
            label={`删除菜品${f.name}`}
            onDelete={() =>
              onConfirm(`永久删除${f.name}？历史饮食快照会保留。`, () =>
                db.foods.delete(f.id),
              )
            }
          >
            <button className="food-open food-row" onClick={() => onEdit(f)}>
              <FoodIcon kind={f.icon} />
              <span className="row-title">
                <strong>{f.name}</strong>
                <span>
                  {f.ingredients ? "组合菜品" : (f.kind ?? "食材")} · {f.basis}{" "}
                  · {f.favorite ? "已收藏" : "可收藏"}
                </span>
                <span>
                  蛋白 {f.nutrition.protein.toFixed(1)}g · 碳水{" "}
                  {f.nutrition.carbs.toFixed(1)}g · 脂肪{" "}
                  {f.nutrition.fat.toFixed(1)}g
                </span>
              </span>
              <span className="food-kcal">
                {f.nutrition.calories.toFixed(1)} kcal
                <small>每100{f.unit}</small>
              </span>
            </button>
          </SwipeableRow>
        ))}
      </div>
    </>
  );
}
