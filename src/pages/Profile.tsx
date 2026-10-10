import { useState } from "react";
import { Download, Upload, ShieldCheck, Leaf } from "lucide-react";
import {
  type Goals,
  nutrientKeys,
  nutrientLabels,
  validNutrition,
} from "../domain/model";
import { db, exportBackup, validateBackup, restoreBackup } from "../data/db";
import { Button } from "../components/ui/button";
export function Profile({
  goals,
  notify,
  onConfirm,
}: {
  goals: Goals;
  notify: (s: string) => void;
  onConfirm: (t: string, a: () => Promise<unknown>) => void;
}) {
  const [draft, setDraft] = useState(goals);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="page-intro">
        <h1>我的设置</h1>
        <p>营养目标、数据与应用偏好</p>
      </div>
      <section className="card">
        <h2>每日营养目标</h2>
        <ul className="datalist">
          {nutrientKeys.map((k) => (
            <li key={k}>
              <span>{nutrientLabels[k]}</span>
              <b>
                {goals[k]} {k === "calories" ? "kcal" : "g"}
              </b>
            </li>
          ))}
        </ul>
        <details className="goal-editor">
          <summary>修改目标</summary>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (
                  !validNutrition(draft) ||
                  nutrientKeys.some((k) => draft[k] <= 0)
                )
                  throw Error("目标必须大于0");
                await db.settings.put(draft);
                notify("目标已保存");
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <div className="field-grid">
              {nutrientKeys.map((k) => (
                <label key={k}>
                  {nutrientLabels[k]}（{k === "calories" ? "kcal" : "g"}）
                  <input
                    required
                    type="number"
                    min="1"
                    max="100000"
                    step="any"
                    value={draft[k]}
                    onChange={(e) =>
                      setDraft({ ...draft, [k]: Number(e.target.value) })
                    }
                  />
                </label>
              ))}
            </div>
            <Button type="submit">保存目标</Button>
          </form>
        </details>
      </section>
      <section className="card">
        <h2>数据与备份</h2>
        <p className="muted">
          食物和记录保存在当前浏览器。换设备或清理浏览器前，请导出备份。
        </p>
        <div className="form-stack">
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const b = await exportBackup();
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(b, null, 2)], {
                    type: "application/json",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = `foodnote-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                notify("备份已导出");
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Download size={18} />
            导出 JSON 备份
          </Button>
          <label className="import-button">
            <Upload size={18} />
            恢复 JSON 备份
            <input
              aria-label="恢复 JSON 备份"
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  if (file.size > 20 * 1024 * 1024)
                    throw Error("备份不能超过20MB");
                  const data = validateBackup(JSON.parse(await file.text()));
                  onConfirm(
                    `恢复 ${data.foods.length} 个食物、${data.entries.length} 条记录？这会替换当前设备全部数据。`,
                    async () => {
                      await restoreBackup(data);
                      notify("备份已恢复");
                    },
                  );
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            />
          </label>
          <Button
            variant="ghost"
            onClick={async () => {
              try {
                const ok = await navigator.storage?.persist?.();
                notify(
                  ok
                    ? "浏览器已授予持久存储"
                    : "浏览器暂未授予持久存储，请定期备份",
                );
              } catch {
                notify("当前浏览器不支持持久存储请求");
              }
            }}
          >
            <ShieldCheck size={18} />
            请求持久存储
          </Button>
        </div>
      </section>
      <section className="card">
        <h2>安装到 iPhone</h2>
        <p>
          在 Safari
          打开应用，点击分享，然后选择「添加到主屏幕」。首次联网打开并缓存完成后，即可离线记录。
        </p>
      </section>
      <section className="card">
        <h2>图像识别</h2>
        <p className="muted">
          在线图像识别尚未支持。已预留服务接口，当前请手动填写营养数据。
        </p>
      </section>
      <p className="footer-note">无需账号 · 本地优先 · Foodnote 1.0</p>
    </>
  );
}
