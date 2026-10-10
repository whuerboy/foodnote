import { test, expect } from "@playwright/test";
test("常见食物自动导入、分类搜索、生熟基准、直接记录及删除不复活", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "菜单", exact: true }).click();
  await expect(page.locator(".food-list .swipe")).toHaveCount(79);
  await page.getByLabel("按食物分类筛选").selectOption("主食");
  await expect(page.locator(".food-list")).toContainText("白米饭");
  await expect(page.locator(".food-list")).not.toContainText("橄榄油");
  await page.getByLabel("搜索食物", { exact: true }).fill("白米饭");
  await page.locator(".food-open").click();
  await expect(page.locator(".detail-hero")).toContainText("熟重");
  await expect(page.locator(".detail-nutri-grid")).toContainText("130.0");
  await expect(
    page.getByRole("link", { name: "查看原始营养数据" }),
  ).toHaveAttribute("href", /169757/);
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page.getByLabel("实际食用量（g）").fill("200");
  await page.getByRole("button", { name: "保存饮食记录" }).click();
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(page.locator(".summary strong")).toContainText("260");
  await page.getByRole("button", { name: "菜单", exact: true }).click();
  await page.getByLabel("按食物分类筛选").selectOption("调味料");
  await page.getByLabel("搜索食物", { exact: true }).fill("橄榄油");
  await expect(page.locator(".food-list")).toContainText("884.0 kcal");
  await page
    .getByRole("button", { name: "显示删除菜品橄榄油", exact: true })
    .click();
  await page
    .getByRole("button", { name: "删除菜品橄榄油", exact: true })
    .click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".food-list .swipe")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "菜单", exact: true }).click();
  await expect(page.locator(".food-list .swipe")).toHaveCount(78);
  await page.getByLabel("搜索食物", { exact: true }).fill("橄榄油");
  await expect(page.locator(".food-list .swipe")).toHaveCount(0);
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(page.locator(".summary strong")).toContainText("260");
});
