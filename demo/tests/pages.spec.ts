import { expect, hasRing, primaryColor, test, visibleTable } from "./fixtures"

// 各业务页面：能正常打开、手机上不横向滚动、关键交互。页签焦点框的通用改法见 skill 的 references/patterns.md
test.use({ viewport: { width: 1440, height: 900 } })

const pages: [string, string][] = [
  ["/", "仪表盘"],
  ["/users", "用户列表"],
  ["/roles", "角色权限"],
  ["/orders", "订单管理"],
  ["/settings", "系统设置"],
]

for (const [path, title] of pages) {
  test(`「${title}」能正常打开`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
  })
}

test.describe("手机端", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  for (const [path, title] of pages) {
    test(`「${title}」没有横向滚动`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth)).toBe(true)
    })
  }
})

test("用户列表：勾选、批量删除确认、筛选无结果", async ({ page }) => {
  await page.goto("/users")
  const boxes = page.locator('[aria-label^="选择 "]:visible')
  for (const i of [0, 2, 3]) await boxes.nth(i).click()
  await expect(page.getByText(/已选\s*3\s*项/)).toBeVisible()
  await expect(page.locator('[aria-label="全选本页"]:visible'), "部分选中时表头是半选").toHaveAttribute("data-state", "indeterminate")
  await page.getByRole("button", { name: "批量删除" }).click()
  await expect(page.getByRole("alertdialog")).toContainText("删除 3 个用户")
  await page.getByRole("button", { name: "确认删除" }).click()
  await expect(page.getByText("共 83 条")).toBeVisible()

  await page.getByLabel("搜索用户").fill("不存在的人")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/q=/)
  await expect(page.getByText("没有符合条件的用户")).toBeVisible()
})

test("角色权限：分组全选框显示全选 / 半选 / 未选", async ({ page }) => {
  await page.goto("/roles")
  await expect(page.locator("#g-dashboard")).toHaveAttribute("data-state", "checked")
  await expect(page.locator("#g-user")).toHaveAttribute("data-state", "indeterminate")
  await expect(page.locator("#g-order")).toHaveAttribute("data-state", "indeterminate")
  await expect(page.locator("#g-system")).toHaveAttribute("data-state", "unchecked")
})

test("订单管理：发货", async ({ page }) => {
  await page.goto("/orders")
  await expect(visibleTable(page).locator("tbody tr").first()).toBeVisible()
  await visibleTable(page).getByRole("button", { name: "发货" }).first().click()
  await expect(page.locator("[data-sonner-toast]")).toContainText("已发货")
})

test("页签焦点框只在键盘操作时出现", async ({ page }) => {
  await page.goto("/orders")
  const pending = page.locator("main [role=tablist]:visible").getByRole("tab", { name: /待发货/ })
  await pending.click()
  expect(await hasRing(pending), "刷新后第一次鼠标点击：没有焦点框").toBe(false)
  await expect(pending).toHaveCSS("outline-style", "none")
  await page.keyboard.press("ArrowRight")
  const shipped = page.locator("main [role=tablist]:visible").getByRole("tab", { name: /已发货/ })
  await expect.poll(() => hasRing(shipped), "键盘切换：有焦点框").toBe(true)
  await page.mouse.click(1300, 700)
  await pending.click()
  expect(await hasRing(pending), "用过键盘后再用鼠标点：没有焦点框").toBe(false)
})

test.describe("登录页页签的键盘焦点", () => {
  test.use({ loggedIn: false })
  test("键盘切换时不出现框，下划线加粗到 4px", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("tab", { name: "账号密码登录" }).focus()
    await page.keyboard.press("ArrowRight")
    const sms = page.getByRole("tab", { name: "手机验证码登录" })
    await expect(sms).toBeFocused()
    expect(await hasRing(sms)).toBe(false)
    await expect(sms).toHaveCSS("outline-style", "none")
    expect(await sms.evaluate((el) => getComputedStyle(el, "::after").height)).toBe("4px")
    await expect(sms).toHaveCSS("color", await primaryColor(page))
  })
})
