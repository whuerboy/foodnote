import { useState } from "react";
import { Search, ChevronLeft } from "lucide-react";
import { foodCategories, type Entry, type Food } from "../domain/model";
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
  const [category, setCategory] = useState("全部分类");
  const recent = [...entries]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((e) => e.foodId);
  const visible = foods
    .filter(
      (f) =>
        f.name.toLowerCase().includes(query.toLowerCase()) &&
        (category === "全部分类" || (f.category ?? "未分类") === category) &&
        (filter === "已归档" ? f.archived : !f.archived) &&
        (filter !== "收藏" || f.favorite) &&
        (filter !== "最近" || recent.includes(f.id)) &&
        (kind === "全部" ||
          (f.ingredients ? "组合菜品" : (f.kind ?? "食材")) === kind),
    )
    .sort((a, b) =>
      filter === "最近"
        ? recent.indexOf(a.id) - recent.indexOf(b.id)
        : b.updatedAt - a.updatedAt ||
          foodCategories.indexOf(a.category!) -
            foodCategories.indexOf(b.category!) ||
          a.name.localeCompare(b.name, "zh-CN"),
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
      <label className="category-select">
        食物分类
        <select
          aria-label="按食物分类筛选"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {["全部分类", ...foodCategories, "未分类"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <p className="library-note">
        已内置常用食物，营养按每100g可食部分标注。生熟重量请对应选择；包装食品以实际标签为准，烹调用油另计。
      </p>
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
                  {f.ingredients
                    ? "组合菜品"
                    : (f.category ?? f.kind ?? "食材")}{" "}
                  · {f.basis} · {f.favorite ? "已收藏" : "可收藏"}
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
