import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Info,
  Camera,
  Sun,
  Sunrise,
  Moon,
  Cookie,
} from "lucide-react";
import {
  meals,
  sum,
  shiftDate,
  localDate,
  type Entry,
  type Goals,
  type Meal,
} from "../domain/model";
import { db } from "../data/db";
import { FoodIcon } from "../components/FoodIcon";
import { SwipeableRow } from "../components/SwipeableRow";
import { Modal } from "../components/Modal";
import { Button } from "../components/ui/button";
export function Home({
  date,
  setDate,
  entries,
  goals,
  onAdd,
  onCopy,
  onConfirm,
  onScan,
}: {
  date: string;
  setDate: (s: string) => void;
  entries: Entry[];
  goals: Goals;
  onAdd: (m: Meal) => void;
  onCopy: (m: Meal) => void;
  onConfirm: (title: string, action: () => Promise<unknown>) => void;
  onScan: () => void;
}) {
  const rows = entries.filter((e) => e.date === date),
    n = sum(rows.map((e) => e.nutrition));
  const start = useRef<{ x: number; y: number } | null>(null);
  const [compact, setCompact] = useState(false),
    [activeMeal, setActiveMeal] = useState<Meal | null>(null);
  useEffect(() => {
    const sync = () => setCompact(window.scrollY >= 85);
    window.addEventListener("scroll", sync, { passive: true });
    sync();
    return () => window.removeEventListener("scroll", sync);
  }, []);
  const ratio = Math.min(n.calories / goals.calories, 1),
    isToday = date === localDate();
  const d = new Date(date + "T12:00:00");
  const mealIcons = [Sunrise, Sun, Moon, Cookie];
  const items = rows.filter((e) => e.meal === activeMeal);
  return (
    <div
      onTouchStart={(e) => {
        start.current = null;
        if (
          (e.target as HTMLElement).closest(
            "[data-swipe],button,input,.day-picker",
          ) ||
          e.touches.length !== 1
        )
          return;
        start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        if (!start.current) return;
        const x = e.changedTouches[0].clientX - start.current.x,
          y = e.changedTouches[0].clientY - start.current.y;
        if (Math.abs(x) > 60 && Math.abs(x) > Math.abs(y) * 1.5)
          setDate(shiftDate(date, x < 0 ? 1 : -1));
        start.current = null;
      }}
    >
      <div className="home-title">
        <h1>{isToday ? "今日饮食" : "饮食回顾"}</h1>
        {!isToday && (
          <button className="go-today" onClick={() => setDate(localDate())}>
            返回今天
          </button>
        )}
      </div>
      <div className="date-nav">
        <button
          aria-label="前一天"
          onClick={() => setDate(shiftDate(date, -1))}
        >
          <ChevronLeft size={17} />
        </button>
        <label className="day-picker">
          <CalendarDays size={17} />
          <span>
            <b>{`${d.getMonth() + 1}月${d.getDate()}日 · ${["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()]}`}</b>
            <small>{isToday ? "今天" : "历史日期"} · 点击选择日期</small>
          </span>
          <input
            aria-label="饮食日期"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </label>
        <button aria-label="后一天" onClick={() => setDate(shiftDate(date, 1))}>
          <ChevronRight size={17} />
        </button>
      </div>
      <p className="swipe-hint">
        <Info size={14} />
        空白处左右滑切换日期，餐次卡片左滑可删除
      </p>
      {compact && (
        <div className="sticky-summary compact">
          <div className="summary-top">
            <div>
              <span className="summary-caption">
                {d.getMonth() + 1}月{d.getDate()}日 · 已摄入
              </span>
              <strong>
                {Math.round(n.calories)} <small>/ {goals.calories} kcal</small>
              </strong>
            </div>
            {!isToday && (
              <button className="go-today" onClick={() => setDate(localDate())}>
                返回今天
              </button>
            )}
          </div>
          <div className="progress">
            <div style={{ width: `${ratio * 100}%` }} />
          </div>
        </div>
      )}
      <section className="summary">
        <div className="summary-top">
          <div>
            <span className="summary-caption">
              {isToday ? "今日" : "当日"}已摄入热量
            </span>
            <strong>
              {Math.round(n.calories)} <small>/ {goals.calories} kcal</small>
            </strong>
          </div>
          <span className="date-pill">{Math.round(ratio * 100)}% 目标</span>
        </div>
        <div className="progress">
          <div style={{ width: `${ratio * 100}%` }} />
        </div>
        <p className="remaining">
          {n.calories > goals.calories
            ? `已超过目标 ${Math.round(n.calories - goals.calories)} kcal`
            : `距离目标还差 ${Math.round(goals.calories - n.calories)} kcal`}
        </p>
        <div className="nutrition-tracks">
          {(["protein", "carbs", "fat"] as const).map((k, i) => (
            <div className="nutri-row" key={k}>
              <span>{["蛋白质", "碳水", "脂肪"][i]}</span>
              <div className="mini-track">
                <i
                  style={{
                    width: `${Math.min((n[k] / goals[k]) * 100, 100)}%`,
                    background: ["#89a992", "#cbb69a", "#c3a4a0"][i],
                  }}
                />
              </div>
              <b>
                {n[k].toFixed(1)} / {goals[k]}g
              </b>
            </div>
          ))}
        </div>
      </section>
      <div className="section-heading">
        <h2>{isToday ? "今天吃了什么" : "这一天吃了什么"}</h2>
        <span>{rows.length} 条食物记录</span>
      </div>
      <div className="meal-list">
        {meals.map((meal, index) => {
          const list = rows.filter((e) => e.meal === meal),
            total = sum(list.map((e) => e.nutrition)),
            Icon = mealIcons[index];
          return (
            <section key={meal}>
              <SwipeableRow
                label={`删除${meal}`}
                onDelete={() =>
                  onConfirm(`删除${date}的${meal}全部记录？`, () =>
                    db.entries
                      .where("[date+meal]")
                      .equals([date, meal])
                      .delete(),
                  )
                }
              >
                <button
                  className="meal-view"
                  aria-label={`查看${meal}食物明细`}
                  onClick={() => setActiveMeal(meal)}
                >
                  <span className="meal-icon">
                    <Icon size={21} />
                  </span>
                  <span className="meal-content">
                    <b>{meal}</b>
                    <small>
                      {list.length
                        ? `${list.length} 项 · ${list.map((e) => e.name).join("、")}`
                        : "尚未记录，点此查看"}
                    </small>
                  </span>
                  <span className="meal-right">
                    {list.length
                      ? `${Math.round(total.calories)} kcal`
                      : "未记录"}
                    <ChevronRight size={14} />
                  </span>
                </button>
              </SwipeableRow>
            </section>
          );
        })}
      </div>
      <div className="section-heading">
        <h2>快捷操作</h2>
      </div>
      <button className="quick-action" onClick={onScan}>
        <Camera size={19} />
        拍照识别食物（尚未接入）
      </button>
      <p className="check-tip">
        <Info size={15} />
        未记录的日期不代表摄入为0。数据保存在本机，可在「我的」中备份。
      </p>
      {activeMeal && (
        <Modal
          title={`${activeMeal} · ${date}`}
          onClose={() => setActiveMeal(null)}
        >
          <div className="meal-detail-heading">
            <span>
              {items.length} 条记录 ·{" "}
              {Math.round(sum(items.map((e) => e.nutrition)).calories)} kcal
            </span>
            <button
              aria-label={`复制${activeMeal}`}
              disabled={!items.length}
              onClick={() => {
                onCopy(activeMeal);
                setActiveMeal(null);
              }}
            >
              <Copy size={17} />
              复制餐次
            </button>
          </div>
          <div className="entry-list">
            {items.length ? (
              items.map((e) => (
                <SwipeableRow
                  key={e.id}
                  label={`删除记录${e.name}`}
                  onDelete={() =>
                    onConfirm(`删除这条${e.name}记录？`, () =>
                      db.entries.delete(e.id),
                    )
                  }
                >
                  <div className="food-row">
                    <FoodIcon kind={e.icon} />
                    <div className="row-title">
                      <strong>{e.name}</strong>
                      <span>
                        {e.amount}
                        {e.unit} · {e.basis}
                      </span>
                    </div>
                    <span className="row-calories">
                      {Math.round(e.nutrition.calories)}
                      <small> kcal</small>
                    </span>
                  </div>
                </SwipeableRow>
              ))
            ) : (
              <p className="empty-detail">这餐还没有记录</p>
            )}
          </div>
          <Button
            className="full"
            onClick={() => {
              onAdd(activeMeal);
              setActiveMeal(null);
            }}
          >
            <Plus size={17} />
            添加食物
          </Button>
        </Modal>
      )}
    </div>
  );
}
