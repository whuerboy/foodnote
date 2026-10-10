import { lazy, Suspense, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Home as HomeIcon,
  Utensils,
  Plus,
  ChartNoAxesColumn,
  User,
  WifiOff,
} from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { db, defaultGoals, copyMeal } from "./data/db";
import { localDate, type Food, type Meal, meals } from "./domain/model";
import { Home } from "./pages/Home";
import { Menu } from "./pages/Menu";
import { Profile } from "./pages/Profile";
import { Modal } from "./components/Modal";
import { FoodDetail } from "./components/FoodDetail";
import { LabelScanner, type ScannedFood } from "./components/LabelScanner";
import { FoodEditor } from "./components/FoodEditor";
import { EntryForm } from "./components/EntryForm";
import { Button } from "./components/ui/button";
const Stats = lazy(() =>
  import("./pages/Stats").then((m) => ({ default: m.Stats })),
);
type Panel =
  | { type: "food"; food?: Food; recipe?: boolean; scanned?: ScannedFood }
  | { type: "entry"; food?: Food; meal: Meal }
  | { type: "copy"; meal: Meal }
  | { type: "choice" }
  | { type: "scan" }
  | { type: "create-choice" }
  | null;
export default function App() {
  const [page, setPage] = useState("首页");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [date, setDate] = useState(localDate());
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState("");
  const [failure, setFailure] = useState("");
  const [confirm, setConfirm] = useState<{
    title: string;
    action: () => Promise<unknown>;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [update, setUpdate] = useState<(() => void) | null>(null);
  const foods = useLiveQuery(() => db.foods.toArray(), [], []);
  const detailFood = foods.find((f) => f.id === detailId);
  const entries = useLiveQuery(() => db.entries.toArray(), [], []);
  const goals = useLiveQuery(
    async () => (await db.settings.get("goals")) ?? defaultGoals,
    [],
    defaultGoals,
  );
  useEffect(() => {
    db.open().catch((e) => setFailure(`无法打开本地数据库：${e.message}`));
    const goOnline = () => setOnline(true),
      goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const sw = registerSW({
      onOfflineReady: () => setToast("已准备好离线使用"),
      onNeedRefresh: () =>
        setUpdate(() => () => {
          void sw(true);
        }),
    });
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const ask = (title: string, action: () => Promise<unknown>) =>
    setConfirm({ title, action });
  const saved = () => {
    setPanel(null);
    setToast("已保存");
  };
  return (
    <div className="app-shell">
      {!online && (
        <div className="connection">
          <WifiOff size={13} />
          离线模式 · 数据保存在本机
        </div>
      )}
      {update && (
        <div className="update-banner">
          新版本已就绪<Button onClick={update}>更新</Button>
        </div>
      )}
      {failure && (
        <p className="error" role="alert">
          {failure}
        </p>
      )}
      <main>
        {page === "首页" && (
          <Home
            date={date}
            setDate={setDate}
            entries={entries}
            goals={goals}
            onAdd={(meal) => setPanel({ type: "entry", meal })}
            onCopy={(meal) => setPanel({ type: "copy", meal })}
            onConfirm={ask}
            onScan={() => setPanel({ type: "scan" })}
          />
        )}{" "}
        {page === "菜单" && (
          <Menu
            foods={foods}
            entries={entries}
            onEdit={(food) => {
              setDetailId(food.id);
              setPage("详情");
              window.scrollTo({ top: 0 });
            }}
            onAdd={(food) => setPanel({ type: "entry", food, meal: "午餐" })}
            onConfirm={ask}
          />
        )}{" "}
        {page === "详情" && detailFood && (
          <FoodDetail
            food={detailFood}
            onBack={() => setPage("菜单")}
            onEdit={() => setPanel({ type: "food", food: detailFood })}
            onFavorite={() => {
              void db.foods.update(detailFood.id, {
                favorite: !detailFood.favorite,
              });
            }}
            onArchive={async () => {
              await db.foods.update(detailFood.id, {
                archived: !detailFood.archived,
              });
              setPage("菜单");
              setToast("已保存");
            }}
          />
        )}
        {page === "统计" && (
          <Suspense fallback={<p className="muted">正在加载统计…</p>}>
            <Stats entries={entries} date={date} goals={goals} />
          </Suspense>
        )}{" "}
        {page === "我的" && (
          <Profile
            key={JSON.stringify(goals)}
            goals={goals}
            notify={setToast}
            onConfirm={ask}
          />
        )}
      </main>
      <nav className="bottom-nav" aria-label="主导航">
        {[
          { name: "首页", Icon: HomeIcon },
          { name: "菜单", Icon: Utensils },
          { name: "添加", Icon: Plus },
          { name: "统计", Icon: ChartNoAxesColumn },
          { name: "我的", Icon: User },
        ].map(({ name, Icon }) => (
          <button
            key={name}
            aria-label={name === "添加" ? "添加" : undefined}
            aria-current={name === page ? "page" : undefined}
            className={
              name === "添加"
                ? "central-add"
                : name === page || (page === "详情" && name === "菜单")
                  ? "nav-active"
                  : ""
            }
            onClick={() => {
              if (name === "添加")
                setPanel(
                  page === "详情" && detailFood
                    ? { type: "entry", food: detailFood, meal: "午餐" }
                    : page === "菜单"
                      ? { type: "create-choice" }
                      : page === "首页"
                        ? { type: "entry", meal: "午餐" }
                        : { type: "choice" },
                );
              else {
                setPage(name);
                window.scrollTo({ top: 0 });
              }
            }}
          >
            <Icon size={name === "添加" ? 30 : 21} />
            {name !== "添加" && <span>{name}</span>}
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {panel && (
        <Modal
          title={
            panel.type === "food"
              ? panel.food
                ? "食物详情"
                : "新建食物 / 菜品"
              : panel.type === "entry"
                ? "记录这一餐"
                : panel.type === "copy"
                  ? "复制餐次"
                  : panel.type === "scan"
                    ? "拍照识别"
                    : panel.type === "create-choice"
                      ? "你想新建什么？"
                      : "添加"
          }
          onClose={() => setPanel(null)}
        >
          {panel.type === "food" && (
            <>
              <FoodEditor
                food={panel.food}
                initialRecipe={panel.recipe}
                scanned={panel.scanned}
                foods={foods}
                onSaved={saved}
              />
              {panel.food && (
                <Button
                  className="archive-button"
                  variant="ghost"
                  onClick={async () => {
                    await db.foods.update(panel.food!.id, {
                      archived: !panel.food!.archived,
                    });
                    saved();
                  }}
                >
                  {panel.food.archived ? "恢复食物" : "归档食物"}
                </Button>
              )}
            </>
          )}
          {panel.type === "entry" && (
            <EntryForm
              foods={foods}
              entries={entries}
              date={date}
              meal={panel.meal}
              food={panel.food}
              onSaved={saved}
            />
          )}{" "}
          {panel.type === "copy" && (
            <CopyForm date={date} meal={panel.meal} onSaved={saved} />
          )}{" "}
          {panel.type === "create-choice" && (
            <div className="form-stack">
              <Button
                variant="outline"
                onClick={() => setPanel({ type: "food" })}
              >
                手动创建食物
              </Button>
              <Button
                variant="outline"
                onClick={() => setPanel({ type: "food", recipe: true })}
              >
                创建组合菜品
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPanel({ type: "scan" })}
              >
                拍照识别营养标签
              </Button>
            </div>
          )}
          {panel.type === "scan" && (
            <LabelScanner
              onAccept={(scanned) => setPanel({ type: "food", scanned })}
            />
          )}
          {panel.type === "choice" && (
            <div className="form-stack">
              <Button onClick={() => setPanel({ type: "entry", meal: "午餐" })}>
                添加饮食记录
              </Button>
              <Button
                variant="outline"
                onClick={() => setPanel({ type: "food" })}
              >
                新建食物 / 菜品
              </Button>
            </div>
          )}
        </Modal>
      )}
      {confirm && (
        <Modal title="确认操作" onClose={() => !pending && setConfirm(null)}>
          <p>{confirm.title}</p>
          <div className="confirm-actions">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setConfirm(null)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await confirm.action();
                  setConfirm(null);
                  setToast("操作完成");
                } catch (e) {
                  setToast((e as Error).message);
                } finally {
                  setPending(false);
                }
              }}
            >
              确认
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function CopyForm({
  date,
  meal,
  onSaved,
}: {
  date: string;
  meal: Meal;
  onSaved: () => void;
}) {
  const [to, setTo] = useState(localDate());
  const [target, setTarget] = useState(meal);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await copyMeal(date, meal, to, target);
          onSaved();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        复制 {date} 的{meal}，保留原有营养快照。
      </p>
      <label>
        目标日期
        <input
          required
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      <label>
        目标餐次
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as Meal)}
        >
          {meals.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Button disabled={busy} type="submit">
        复制并保存
      </Button>
    </form>
  );
}
