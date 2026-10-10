import { ChevronLeft, Heart, Pencil, Archive } from "lucide-react";
import type { Food } from "../domain/model";
import { nutrientKeys, nutrientLabels } from "../domain/model";
import { FoodIcon } from "./FoodIcon";
import { Button } from "./ui/button";
export function FoodDetail({
  food,
  onBack,
  onEdit,
  onFavorite,
  onArchive,
}: {
  food: Food;
  onBack: () => void;
  onEdit: () => void;
  onFavorite: () => void;
  onArchive: () => void;
}) {
  return (
    <>
      <div className="detail-heading">
        <button className="icon-button" aria-label="返回菜单" onClick={onBack}>
          <ChevronLeft size={17} />
        </button>
        <h1>食物详情</h1>
      </div>
      <div className="detail-hero">
        <FoodIcon kind={food.icon} large />
        <h2>{food.name}</h2>
        <p>
          {food.ingredients ? "组合菜品" : (food.kind ?? "食材")} · 每100
          {food.unit} · {food.basis}
        </p>
      </div>
      <section className="card">
        <div className="section-heading compact-heading">
          <h2>营养信息</h2>
          <span className="date-pill">每100{food.unit}</span>
        </div>
        <div className="detail-nutri-grid">
          {nutrientKeys.map((k) => (
            <div key={k}>
              <span>{nutrientLabels[k]}</span>
              <strong>
                {food.nutrition[k].toFixed(1)}
                <small> {k === "calories" ? "kcal" : "g"}</small>
              </strong>
            </div>
          ))}
        </div>
      </section>
      <div className="section-heading">
        <h2>数据说明</h2>
      </div>
      <section className="card">
        <ul className="datalist">
          <li>
            <span>重量基准</span>
            <b>
              每100{food.unit} · {food.basis}
            </b>
          </li>
          <li>
            <span>数据来源</span>
            <b>{food.source || "用户手动输入"}</b>
          </li>
          <li>
            <span>类别</span>
            <b>{food.ingredients ? "组合菜品" : (food.kind ?? "食材")}</b>
          </li>
        </ul>
        {food.ingredients && (
          <div className="recipe-parts">
            {food.ingredients.map((i, n) => (
              <p key={n}>
                {i.name} · {i.amount}
                {i.unit}
              </p>
            ))}
            <p>
              成品总量 {food.yieldAmount}
              {food.unit}
            </p>
          </div>
        )}
      </section>
      <div className="hero-tools">
        <Button variant="outline" onClick={onFavorite}>
          <Heart size={17} fill={food.favorite ? "currentColor" : "none"} />
          {food.favorite ? "取消收藏" : "收藏食物"}
        </Button>
        <Button variant="outline" onClick={onEdit}>
          <Pencil size={17} />
          编辑
        </Button>
      </div>
      <Button className="archive-button" variant="ghost" onClick={onArchive}>
        <Archive size={17} />
        {food.archived ? "恢复食物" : "归档食物"}
      </Button>
      <p className="footer-note">点击底部 ＋ 将当前食物加入饮食记录</p>
    </>
  );
}
