import { test, expect } from "@playwright/test";
for (const language of ["中文", "英文"]) {
  test(`${language}标签照片真实 OCR、单位换算、保存及离线再次识别`, async ({
    page,
    context,
    browser,
  }, testInfo) => {
    test.setTimeout(120000);
    const fixture = await browser.newPage({
      viewport: { width: 900, height: 700 },
    });
    await fixture.setContent(
      `<div style="background:white;color:black;font:42px Arial;padding:40px;line-height:1.8">${language === "中文" ? "营养成分表<br>每100克<br>能量 836.8 kJ<br>蛋白质 10.0 克<br>脂肪 8.0 克<br>碳水化合物 22.0 克" : "Nutrition Facts<br>Per 100 g<br>Energy 836.8 kJ<br>Protein 10.0 g<br>Fat 8.0 g<br>Carbohydrate 22.0 g"}</div>`,
    );
    const png = await fixture.screenshot();
    await fixture.close();
    await page.goto("/");
    await page
      .getByRole("button", { name: "拍照识别营养标签", exact: true })
      .click();
    await page.getByLabel("选择营养标签图片").setInputFiles({
      name: "nutrition.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(
      page.getByRole("heading", { name: "核对营养标签" }),
    ).toBeVisible({ timeout: 90000 });
    await expect(page.getByLabel("标签能量", { exact: true })).toHaveValue(
      "836.8",
    );
    await expect(page.getByLabel("标签能量单位")).toHaveValue("kJ");
    await expect(page.getByLabel("标签蛋白质（g）")).toHaveValue("10");
    await expect(page.locator(".energy-result")).toContainText("200.00 kcal");
    await page.getByRole("button", { name: "确认并创建食物" }).click();
    await page.getByLabel("名称", { exact: true }).fill("拍照录入燕麦");
    await page.getByRole("button", { name: "保存食物", exact: true }).click();
    await page.getByRole("button", { name: "菜单", exact: true }).click();
    await expect(page.locator(".food-list")).toContainText("200.0 kcal");
    await page.getByRole("button", { name: "首页", exact: true }).click();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page
      .getByRole("button", { name: "拍照识别营养标签", exact: true })
      .click();
    await page.getByLabel("选择营养标签图片").setInputFiles({
      name: "nutrition.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(page.getByLabel("标签能量", { exact: true })).toHaveValue(
      "836.8",
      { timeout: 90000 },
    );
    await page.screenshot({ path: testInfo.outputPath("scan-review.png") });
  });
}
test("kJ 手动录入自动换算，小屏表单独立排布", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.getByRole("button", { name: "菜单", exact: true }).click();
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page.getByRole("button", { name: "手动创建食物", exact: true }).click();
  await page.getByLabel("名称", { exact: true }).fill("千焦能量");
  await page.getByLabel("能量单位", { exact: true }).selectOption("kJ");
  await page.getByLabel("热量（kJ）").fill("836.8");
  await expect(page.locator(".energy-result")).toContainText("200.00 kcal");
  expect(
    await page
      .locator(".field-grid")
      .first()
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      ),
  ).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "保存食物", exact: true }).click();
  await expect(page.locator(".food-list")).toContainText("200.0 kcal");
  await page.locator(".food-open").click();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByLabel("能量单位", { exact: true }).selectOption("J");
  await expect(page.getByLabel("热量（J）")).toHaveValue("836800");
});

test("不同屏幕宽度自动调整网格且无横向溢出", async ({ browser }, testInfo) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:43719/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const columns = await page
      .locator(".meal-list")
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      );
    expect(columns).toBe(width >= 781 ? 2 : 1);
    if (width === 320 || width === 1440)
      await page.screenshot({
        path: testInfo.outputPath(`responsive-${width}.png`),
        fullPage: true,
      });
    await page.getByRole("button", { name: "统计", exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const statColumns = await page
      .locator(".stats-overview")
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      );
    expect(statColumns).toBe(width < 380 ? 1 : 2);
    await context.close();
  }
});
