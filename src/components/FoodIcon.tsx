export const foodIcons = [
  "oats",
  "shrimp",
  "broccoli",
  "chicken",
  "potato",
  "rice",
  "milk",
  "egg",
  "banana",
  "recipe",
] as const;
export const iconLabels: Record<string, string> = {
  oats: "燕麦",
  shrimp: "虾仁",
  broccoli: "西兰花",
  chicken: "鸡胸肉",
  potato: "土豆",
  rice: "米饭",
  milk: "牛奶",
  egg: "鸡蛋",
  banana: "香蕉",
  recipe: "组合菜品",
};
const legacy: Record<string, string> = {
  bowl: "recipe",
  leaf: "broccoli",
  fish: "shrimp",
  grain: "oats",
  fruit: "banana",
};
export function FoodIcon({
  kind = "recipe",
  large = false,
}: {
  kind?: string;
  large?: boolean;
}) {
  const icon =
    legacy[kind] ??
    (foodIcons.includes(kind as (typeof foodIcons)[number]) ? kind : "recipe");
  const tone =
    icon === "shrimp"
      ? "pink"
      : ["broccoli", "recipe"].includes(icon)
        ? "green"
        : icon === "milk"
          ? "blue"
          : "cream";
  return (
    <span
      className={`food-icon ${tone} ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      <img src={`${import.meta.env.BASE_URL}food-icons/${icon}.svg`} alt="" draggable={false} />
    </span>
  );
}
