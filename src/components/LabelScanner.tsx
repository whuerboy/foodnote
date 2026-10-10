import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { recognizeLabel } from "../services/imageRecognition";
import {
  parseNutritionLabel,
  per100,
  toKcal,
  type EnergyUnit,
  type LabelDraft,
} from "../domain/label";
import { nutrientLabels, type Nutrition } from "../domain/model";
import { Button } from "./ui/button";
export type ScannedFood = {
  nutrition: Nutrition;
  unit: "g" | "mL";
  source: string;
};
export function LabelScanner({
  onAccept,
}: {
  onAccept: (draft: ScannedFood) => void;
}) {
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LabelDraft | null>(null);
  const [text, setText] = useState("");
  const [values, setValues] = useState({
    energy: "",
    protein: "",
    fat: "",
    carbs: "",
  });
  const [energyUnit, setEnergyUnit] = useState<EnergyUnit | "">("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<"g" | "mL">("g");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function apply(draft: LabelDraft) {
    setResult(draft);
    setText(draft.text);
    setEnergyUnit(draft.energyUnit ?? "");
    setAmount(draft.servingAmount?.toString() ?? "");
    setUnit(draft.unit);
    setValues({
      energy: draft.energy?.toString() ?? "",
      protein: draft.nutrition.protein?.toString() ?? "",
      fat: draft.nutrition.fat?.toString() ?? "",
      carbs: draft.nutrition.carbs?.toString() ?? "",
    });
  }
  async function read(file?: File) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("照片过大，请选择小于25MB的图片");
      return;
    }
    setError("");
    setResult(null);
    setBusy(true);
    setProgress(0);
    setPreview(URL.createObjectURL(file));
    try {
      const draft = await recognizeLabel(file, (value) => {
        if (alive.current) setProgress(value);
      });
      if (alive.current) {
        apply(draft);
        if (Object.keys(draft.nutrition).length === 0)
          setError(
            "未能读取营养值。请拍摄清晰、正向的营养成分表，或在下方补填。",
          );
      }
    } catch {
      if (alive.current)
        setError(
          "识别失败。首次识别需联网下载识别组件，请确认网络、图片格式并重试。",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const kcal =
    values.energy !== "" &&
    Number(values.energy) >= 0 &&
    Number.isFinite(Number(values.energy)) &&
    energyUnit
      ? toKcal(Number(values.energy) || 0, energyUnit)
      : null;
  return (
    <div className="form-stack scanner">
      <p className="muted">
        拍摄包装上的营养成分表，保持文字清晰、画面正向。照片在本机识别，不上传；首次识别需联网加载组件。餐盘照片无法可靠推算重量和营养。
      </p>
      <div className="scan-actions">
        <label className="import-button">
          <Camera size={20} />
          拍照
          <input
            aria-label="拍摄营养标签"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            onChange={(e) => {
              void read(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <label className="import-button">
          <ImagePlus size={20} />
          选择图片
          <input
            aria-label="选择营养标签图片"
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              void read(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {preview && (
        <img className="scan-preview" src={preview} alt="待识别的营养标签" />
      )}
      {busy && (
        <div role="status">
          <p>
            正在识别
            {progress > 0
              ? ` · ${Math.round(progress * 100)}%`
              : " · 准备识别组件…"}
          </p>
          <progress max="1" value={progress} />
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && (
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!energyUnit) return;
            try {
              const n = {
                calories: toKcal(Number(values.energy), energyUnit),
                protein: Number(values.protein),
                fat: Number(values.fat),
                carbs: Number(values.carbs),
              };
              onAccept({
                nutrition: per100(n, Number(amount)),
                unit,
                source: "包装营养标签 · 本机拍照识别并核对",
              });
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <h2>核对营养标签</h2>
          <p className="muted">
            填写标签的第一列含量，不要填
            NRV%。未识别出的数值留空，请补齐；不会自动保存。
          </p>
          <div className="field-grid">
            <label>
              标签对应量
              <input
                required
                type="number"
                min="0.1"
                max="100000"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="例如 100 或每份 30"
              />
            </label>
            <label>
              标签计量单位
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as "g" | "mL")}
              >
                <option>g</option>
                <option>mL</option>
              </select>
            </label>
          </div>
          <div className="field-grid">
            <label>
              标签能量
              <input
                required
                type="number"
                min="0"
                step="any"
                value={values.energy}
                onChange={(e) =>
                  setValues({ ...values, energy: e.target.value })
                }
              />
            </label>
            <label>
              标签能量单位
              <select
                required
                value={energyUnit}
                onChange={(e) => setEnergyUnit(e.target.value as EnergyUnit)}
              >
                <option value="">请确认</option>
                <option value="kJ">kJ（千焦）</option>
                <option value="J">J（焦耳）</option>
                <option value="kcal">kcal（千卡）</option>
              </select>
            </label>
          </div>
          {kcal !== null && (
            <p className="energy-result">
              标签能量 ≈ {kcal.toFixed(2)} kcal
              {Number(amount) > 0
                ? ` · 每100${unit} ≈ ${((kcal * 100) / Number(amount)).toFixed(2)} kcal`
                : ""}
            </p>
          )}
          <div className="field-grid">
            {(["protein", "fat", "carbs"] as const).map((k) => (
              <label key={k}>
                标签{nutrientLabels[k]}（g）
                <input
                  required
                  type="number"
                  min="0"
                  max="100000"
                  step="any"
                  value={values[k]}
                  onChange={(e) =>
                    setValues({ ...values, [k]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <details>
            <summary>查看识别文字</summary>
            <textarea
              aria-label="识别文字"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => apply(parseNutritionLabel(text))}
            >
              重新解析文字
            </Button>
          </details>
          <Button type="submit">确认并创建食物</Button>
        </form>
      )}
    </div>
  );
}
