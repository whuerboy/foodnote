import { useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  type Entry,
  type Goals,
  type Nutrition,
  statistics,
  trendGroups,
  nutrientKeys,
  nutrientLabels,
  shiftDate,
  localDate,
} from "../domain/model";
export function Stats({
  entries,
  date,
  goals,
}: {
  entries: Entry[];
  date: string;
  goals: Goals;
}) {
  const [period, setPeriod] = useState<"周" | "月" | "年">("周"),
    [anchor, setAnchor] = useState(date),
    [metric, setMetric] = useState<keyof Nutrition>("calories");
  const s = statistics(entries, period, anchor),
    groups = trendGroups(entries, period, anchor);
  const chart = groups.map((g) => ({
    label: g.label,
    value: g.average?.[metric] ?? null,
    days: g.days,
  }));
  const changePeriod = (direction: number) => {
    const d = new Date(anchor + "T12:00:00");
    if (period === "周") setAnchor(shiftDate(anchor, 7 * direction));
    else if (period === "月")
      setAnchor(
        localDate(new Date(d.getFullYear(), d.getMonth() + direction, 1)),
      );
    else
      setAnchor(
        localDate(new Date(d.getFullYear() + direction, d.getMonth(), 1)),
      );
  };
  return (
    <>
      <div className="page-intro">
        <h1>饮食统计</h1>
        <p>观察一周、一个月或一年的营养摄入</p>
      </div>
      <div className="tabs">
        {(["周", "月", "年"] as const).map((p) => (
          <button
            key={p}
            aria-pressed={period === p}
            onClick={() => setPeriod(p)}
          >
            {p === "周" ? "一周" : p === "月" ? "一个月" : "一年"}
          </button>
        ))}
      </div>
      <div className="period-nav">
        <button aria-label="上一个统计周期" onClick={() => changePeriod(-1)}>
          <ChevronLeft size={17} />
        </button>
        <label>
          <b>
            {s.start} — {s.end}
          </b>
          <small>当前查看：每{period}趋势</small>
          <input
            aria-label="统计日期"
            type="date"
            value={anchor}
            onChange={(e) => e.target.value && setAnchor(e.target.value)}
          />
        </label>
        <button aria-label="下一个统计周期" onClick={() => changePeriod(1)}>
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="stats-overview">
        <div className="card stat-main">
          <span>记录日平均热量</span>
          <strong>
            {s.days ? Math.round(s.total.calories / s.days) : "—"}
            <small> kcal / 天</small>
          </strong>
          <p>目标 {goals.calories} kcal / 天</p>
        </div>
        <div className="stat-aside">
          <small>本周期有记录</small>
          <b>
            {s.days} <small>天</small>
          </b>
          <small>未记录日不计入日均</small>
        </div>
      </div>
      <div className="section-heading">
        <h2>摄入趋势</h2>
        <span>
          {period === "周" ? "按天" : period === "月" ? "按7天分组" : "按月"}
          展示日均
        </span>
      </div>
      <div className="metric-tabs">
        {nutrientKeys.map((k) => (
          <button
            key={k}
            aria-pressed={metric === k}
            onClick={() => setMetric(k)}
          >
            {nutrientLabels[k]}
          </button>
        ))}
      </div>
      <section className="card chart-card">
        <div className="compact-heading">
          <h2>{nutrientLabels[metric]} · 记录日平均</h2>
          <span>{metric === "calories" ? "kcal" : "g"}</span>
        </div>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid vertical={false} stroke="#e5e9e1" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis
                width={36}
                tick={{ fontSize: 10 }}
                domain={[0, (max: number) => Math.max(max, goals[metric])]}
              />
              <Tooltip
                formatter={(v) => [
                  `${Number(v).toFixed(1)} ${metric === "calories" ? "kcal" : "g"} / 记录日均`,
                  nutrientLabels[metric],
                ]}
              />
              <Bar dataKey="value" fill="#a6bba8" radius={[6, 6, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-note">
          {s.days
            ? "点击或轻触图表查看记录日均。空白位置表示没有饮食记录，不代表摄入0。"
            : "本周期暂无记录，未记录日期不计为摄入0。"}
        </p>
      </section>
      <div className="section-heading">
        <h2>营养汇总</h2>
      </div>
      <div className="stats-grid">
        {nutrientKeys.map((k) => (
          <div className="card" key={k}>
            <span>{nutrientLabels[k]} / 记录日均</span>
            <strong>
              {s.days ? (s.total[k] / s.days).toFixed(1) : "—"}{" "}
              <small>{k === "calories" ? "kcal" : "g"}</small>
            </strong>
            <p className="muted">累计 {s.total[k].toFixed(1)}</p>
          </div>
        ))}
      </div>
      <p className="check-tip">
        <Info size={15} />
        统计使用你的真实本地记录，未记录日不计入日均。
      </p>
    </>
  );
}
