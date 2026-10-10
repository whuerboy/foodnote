import { test, expect } from "@playwright/test";
test("配方、收藏、归档和整餐删除", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "菜单", exact: true }).click();
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page.getByRole("button", { name: "手动创建食物", exact: true }).click();
  await page.getByLabel("名称", { exact: true }).fill("测试牛奶");
  await page.getByLabel("计量单位").selectOption("mL");
  await page.getByRole("button", { name: "插画 牛奶", exact: true }).click();
  await page.getByLabel("热量（kcal）").fill("60");
  await page.getByLabel("蛋白质（g）").fill("3");
  await page.getByRole("button", { name: "保存食物", exact: true }).click();
  await page.locator(".food-open").filter({ hasText: "测试牛奶" }).click();
  await page.getByRole("button", { name: "收藏食物", exact: true }).click();
  await page.getByRole("button", { name: "返回菜单", exact: true }).click();
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await expect(page.locator(".food-list")).toContainText("测试牛奶");
  await page.getByRole("button", { name: "全部食物", exact: true }).click();
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page.getByRole("button", { name: "创建组合菜品", exact: true }).click();
  await page.getByLabel("名称", { exact: true }).fill("热测试牛奶");
  await page
    .getByRole("checkbox", { name: "组合菜品（按原料计算）", exact: true })
    .check();
  await page
    .getByLabel("选择原料")
    .selectOption({ label: "测试牛奶 · mL · 生重" });
  await page.getByLabel("原料用量").fill("200");
  await page.getByRole("button", { name: "添加原料", exact: true }).click();
  await page.getByLabel("成品总量（g）").fill("200");
  await page.getByRole("button", { name: "保存食物", exact: true }).click();
  await expect(page.locator(".food-list")).toContainText("60.0 kcal");
  await page.locator(".food-open").filter({ hasText: "热测试牛奶" }).click();
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page.getByRole("button", { name: "保存饮食记录" }).click();
  await page.getByRole("button", { name: "归档食物", exact: true }).click();
  await page.getByRole("button", { name: "已归档", exact: true }).click();
  await expect(page.locator(".food-list")).toContainText("热测试牛奶");
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(page.locator(".summary strong")).toContainText("60");
  await page.getByRole("button", { name: "显示删除午餐", exact: true }).click();
  await page.getByRole("button", { name: "删除午餐", exact: true }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".summary strong")).toContainText("0");
});
