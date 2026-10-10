import { test, expect, type Page, type Locator } from "@playwright/test";
async function createOats(page: Page) {
  await page.getByRole("button", { name: "菜单", exact: true }).click();
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page.getByRole("button", { name: "手动创建食物", exact: true }).click();
  await page.getByLabel("名称", { exact: true }).fill("燕麦");
  await page.getByLabel("重量基准").selectOption("干重");
  await page.getByLabel("热量（kcal）").fill("380");
  await page.getByLabel("蛋白质（g）").fill("13");
  await page.getByLabel("碳水（g）").fill("68");
  await page.getByLabel("脂肪（g）").fill("7");
  await page.getByRole("button", { name: "保存食物", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function recordOats(page: Page) {
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page.getByLabel("餐次", { exact: true }).selectOption("早餐");
  await page
    .getByLabel("食物", { exact: true })
    .selectOption({ label: "燕麦 · 干重 · g" });
  await page.getByLabel("实际食用量（g）").fill("50");
  await page.getByRole("button", { name: "保存饮食记录", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("创建、记录、刷新、历史日期和统计", async ({ page }, testInfo) => {
  await createOats(page);
  await page.screenshot({
    path: testInfo.outputPath("menu.png"),
    animations: "disabled",
    style: ".toast {visibility:hidden}",
  });
  await page.locator(".food-open").click();
  await page.screenshot({
    path: testInfo.outputPath("detail.png"),
    animations: "disabled",
    style: ".toast {visibility:hidden}",
  });
  await page.getByRole("button", { name: "返回菜单", exact: true }).click();
  await recordOats(page);
  await expect(page.locator(".summary strong")).toContainText("190");
  await page.reload();
  await expect(page.locator(".summary strong")).toContainText("190");
  await page.getByRole("button", { name: "前一天", exact: true }).click();
  await expect(page.locator(".summary strong")).toContainText("0");
  await page.getByRole("button", { name: "后一天", exact: true }).click();
  await expect(page.locator(".summary strong")).toContainText("190");
  await page.getByRole("button", { name: "统计", exact: true }).click();
  for (const p of ["一周", "一个月", "一年"]) {
    await page.getByRole("button", { name: p, exact: true }).click();
    await expect(page.locator(".stats-grid")).toContainText("190.0");
  }
  await page.screenshot({
    path: testInfo.outputPath("stats.png"),
    animations: "disabled",
    style: ".toast {visibility:hidden}",
  });
  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("profile.png"),
    animations: "disabled",
    style: ".toast {visibility:hidden}",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("编辑食物保留快照，复制餐次与删除单条记录", async ({ page }) => {
  await createOats(page);
  await recordOats(page);
  await page.getByRole("button", { name: "菜单", exact: true }).click();
  await page.locator(".food-open").click();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByLabel("热量（kcal）").fill("100");
  await page.getByRole("button", { name: "保存食物", exact: true }).click();
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(page.locator(".summary strong")).toContainText("190");
  await page
    .getByRole("button", { name: "查看早餐食物明细", exact: true })
    .click();
  await page.getByRole("button", { name: "复制早餐", exact: true }).click();
  await page.getByLabel("目标餐次").selectOption("午餐");
  await page.getByRole("button", { name: "复制并保存" }).click();
  await expect(page.locator(".summary strong")).toContainText("380");
  await page
    .getByRole("button", { name: "查看早餐食物明细", exact: true })
    .click();
  await page
    .getByRole("button", { name: "显示删除记录燕麦", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "删除记录燕麦", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".summary strong")).toContainText("190");
});
test("备份恢复与离线重新打开", async ({ page, context }) => {
  await createOats(page);
  await recordOats(page);
  await page.getByRole("button", { name: "我的", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 JSON 备份" }).click();
  const download = await downloadPromise;
  const file = await download.path();
  expect(file).toBeTruthy();
  await page.getByLabel("恢复 JSON 备份").setInputFiles(file!);
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(page.locator(".summary strong")).toContainText("190");
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page
    .getByLabel("食物", { exact: true })
    .selectOption({ label: "燕麦 · 干重 · g" });
  await page.getByRole("button", { name: "保存饮食记录" }).click();
  await expect(page.locator(".summary strong")).toContainText("570");
});
test("空状态、小屏宽度与固定摘要", async ({ page }) => {
  await expect(page.locator(".summary strong")).toContainText("0");
  await page.setViewportSize({ width: 320, height: 568 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 350));
  await expect(page.locator(".sticky-summary")).toHaveClass(/compact/);
  const box = await page.locator(".sticky-summary").boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeLessThan(20);
});

test("横向手势、垂直滚动优先与左滑删除", async ({ page }, testInfo) => {
  await createOats(page);
  await recordOats(page);
  const summary = page.locator(".summary");
  const before = await page.getByLabel("饮食日期").inputValue();
  await touchEvent(summary, "touchstart", {
    touches: [{ clientX: 280, clientY: 250 }],
  });
  await touchEvent(summary, "touchend", {
    changedTouches: [{ clientX: 150, clientY: 255 }],
  });
  await expect(page.getByLabel("饮食日期")).not.toHaveValue(before);
  await page.getByRole("button", { name: "前一天", exact: true }).click();
  await expect(page.getByLabel("饮食日期")).toHaveValue(before);
  await touchEvent(summary, "touchstart", {
    touches: [{ clientX: 280, clientY: 250 }],
  });
  await touchEvent(summary, "touchend", {
    changedTouches: [{ clientX: 270, clientY: 390 }],
  });
  await expect(page.getByLabel("饮食日期")).toHaveValue(before);
  await page
    .getByRole("button", { name: "查看早餐食物明细", exact: true })
    .click();
  const row = page.locator(".entry-list .swipe-front").first();
  await touchEvent(row, "touchstart", {
    touches: [{ clientX: 280, clientY: 400 }],
  });
  await touchEvent(row, "touchend", {
    changedTouches: [{ clientX: 150, clientY: 402 }],
  });
  await expect(row).toHaveClass(/swiped/);
  await expect(page.getByLabel("饮食日期")).toHaveValue(before);
  await page.getByRole("button", { name: "删除记录燕麦", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.locator(".summary strong")).toContainText("190");
  await touchEvent(row, "touchstart", {
    touches: [{ clientX: 150, clientY: 402 }],
  });
  await touchEvent(row, "touchend", {
    changedTouches: [{ clientX: 280, clientY: 400 }],
  });
  await expect(row).not.toHaveClass(/swiped/);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator(".summary")).not.toHaveClass(/compact/);
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    animations: "disabled",
    style: ".toast { visibility: hidden; }",
  });
  await page.getByRole("button", { name: "菜单", exact: true }).click();
  const menuRow = page.locator(".food-list .swipe-front").first();
  await menuRow.dispatchEvent("pointerdown", { clientX: 280, clientY: 300 });
  await menuRow.dispatchEvent("pointerup", { clientX: 150, clientY: 302 });
  await expect(menuRow).toHaveClass(/swiped/);
  await page.getByRole("button", { name: "删除菜品燕麦", exact: true }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".food-list .swipe")).toHaveCount(0);
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(page.locator(".summary strong")).toContainText("190");
});

async function touchEvent(locator: Locator, type: string, data: object) {
  await locator.evaluate(
    (el, arg) => {
      const event = new Event(arg.type, { bubbles: true });
      Object.assign(event, arg.data);
      el.dispatchEvent(event);
    },
    { type, data },
  );
}
