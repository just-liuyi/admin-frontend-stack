import { expect, test } from "./fixtures"

// 多页签：打开、切换保留状态、刷新、各种关闭操作、上限 10 个。规范见 skill 的 references/tabs.md
test.use({ viewport: { width: 1440, height: 900 } })

const items = '[aria-label="已打开的页面"] [role="listitem"]'

test.describe("多页签", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  /** 从侧边栏打开页面；子菜单收起时先展开父级 */
  async function openVia(page: import("@playwright/test").Page, href: string) {
    const link = page.locator(`[data-slot="sidebar-content"] a[href="${href}"]`)
    if (!(await link.isVisible())) await page.locator('[data-sidebar="menu-button"]', { hasText: "用户管理" }).click()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${href}(\\?|$)`))
  }
  const tab = (page: import("@playwright/test").Page, name: string) => page.locator(items, { hasText: name })
  async function menu(page: import("@playwright/test").Page, name: string, action: string) {
    await tab(page, name).click({ button: "right" })
    await page.getByRole("menuitem", { name: action, exact: true }).click()
  }

  test("打开页面依次加入页签，当前页签高亮，页签栏没有纵向滚动条", async ({ page }) => {
    await expect(page.locator(items)).toHaveText(["仪表盘"])
    for (const h of ["/users", "/roles", "/orders", "/settings"]) await openVia(page, h)
    await expect(page.locator(items)).toHaveText(["仪表盘", "用户列表", "角色权限", "订单管理", "系统设置"])
    await expect(page.locator('[aria-label="已打开的页面"] [aria-current="page"]')).toHaveText("系统设置")
    await expect(page.locator('[aria-label="已打开的页面"]')).toHaveCSS("overflow-y", "hidden")
  })

  test("切走再切回保留筛选和勾选；“刷新”清空勾选、保留筛选；浏览器刷新后页签还在", async ({ page }) => {
    for (const h of ["/users", "/orders"]) await openVia(page, h)
    await tab(page, "用户列表").locator("a").click()
    await page.getByLabel("状态筛选").click()
    await page.getByRole("option", { name: "正常" }).click()
    await expect(page).toHaveURL(/status=active/)
    const boxes = page.locator('[aria-label^="选择 "]:visible')
    await boxes.nth(0).click()
    await boxes.nth(1).click()
    await tab(page, "订单管理").locator("a").click()
    await tab(page, "用户列表").locator("a").click()
    await expect(page).toHaveURL(/status=active/)
    await expect(page.getByText(/已选\s*2\s*项/)).toBeVisible()

    await menu(page, "用户列表", "刷新")
    await expect(page.getByText(/已选\s*\d+\s*项/)).toHaveCount(0)
    await expect(page).toHaveURL(/status=active/)

    await page.reload()
    await expect(page.locator(items)).toHaveText(["仪表盘", "用户列表", "订单管理"])
  })

  test("首页页签固定：没有 ×，右键“关闭”不可用", async ({ page }) => {
    await openVia(page, "/users")
    await expect(tab(page, "仪表盘").locator('button[aria-label^="关闭"]')).toHaveCount(0)
    await tab(page, "仪表盘").click({ button: "right" })
    await expect(page.getByRole("menuitem", { name: "关闭", exact: true })).toHaveAttribute("data-disabled", "")
  })

  test("关闭左侧 / 右侧 / 其他：结果正确，当前页被关掉时跳到右键的页签", async ({ page }) => {
    for (const h of ["/users", "/roles", "/orders", "/settings"]) await openVia(page, h)
    await tab(page, "用户列表").locator("a").click()
    await menu(page, "订单管理", "关闭左侧")
    await expect(page.locator(items)).toHaveText(["仪表盘", "订单管理", "系统设置"])
    await expect(page).toHaveURL(/\/orders$/)

    await openVia(page, "/roles")
    await expect(page.locator(items), "再打开的页签加在最后").toHaveText(["仪表盘", "订单管理", "系统设置", "角色权限"])
    await menu(page, "订单管理", "关闭右侧")
    await expect(page.locator(items)).toHaveText(["仪表盘", "订单管理"])
    await expect(page).toHaveURL(/\/orders$/)

    for (const h of ["/users", "/settings"]) await page.goto(h)
    await menu(page, "用户列表", "关闭其他")
    await expect(page.locator(items)).toHaveText(["仪表盘", "用户列表"])
    await expect(page).toHaveURL(/\/users$/)
  })

  test("点 × 关闭当前页签跳到右边；中键关闭其他页签；⌄ 按钮关闭全部", async ({ page }) => {
    await page.goto("/users")
    await page.goto("/orders")
    await tab(page, "用户列表").locator("a").click()
    await tab(page, "用户列表").getByRole("button", { name: "关闭 用户列表" }).click()
    await expect(page).toHaveURL(/\/orders$/)
    await expect(page.locator(items)).toHaveText(["仪表盘", "订单管理"])

    await page.goto("/roles")
    await tab(page, "订单管理").click({ button: "middle" })
    await expect(page.locator(items)).toHaveText(["仪表盘", "角色权限"])
    await expect(page).toHaveURL(/\/roles$/)

    await page.goto("/users")
    await page.getByRole("button", { name: "页签操作" }).click()
    await page.getByRole("menuitem", { name: "关闭全部" }).click()
    await expect(page.locator(items)).toHaveText(["仪表盘"])
    await expect(page).toHaveURL(/127\.0\.0\.1:4173\/$/)
  })

  test("不存在的地址显示 404，不新增页签", async ({ page }) => {
    await page.goto("/no-such-page")
    await expect(page.getByText("页面不存在")).toBeVisible()
    await expect(page.locator(items)).toHaveCount(1)
  })

  test("页签上限 10 个：淘汰最左边的可关闭页签，首页和刚打开的保留", async ({ page }) => {
    const keys = () => page.evaluate(() => JSON.parse(sessionStorage.getItem("tabs")!).state.tabs.map((t: { key: string }) => t.key))
    await page.goto("/roles")
    const seed = ["/", "/roles", "/p1", "/p2", "/p3", "/p4", "/p5", "/p6", "/p7", "/p8"].map((k) => ({ key: k, path: k, refreshKey: 0 }))
    await page.evaluate((tabs) => sessionStorage.setItem("tabs", JSON.stringify({ state: { tabs }, version: 0 })), seed)
    await page.reload()
    await expect.poll(keys).toHaveLength(10)
    await page.locator('[data-slot="sidebar-content"] a[href="/orders"]').click()
    await expect.poll(keys).toEqual(["/", "/p1", "/p2", "/p3", "/p4", "/p5", "/p6", "/p7", "/p8", "/orders"])
    await page.goto("/settings")
    await expect.poll(keys).toEqual(["/", "/p2", "/p3", "/p4", "/p5", "/p6", "/p7", "/p8", "/orders", "/settings"])
  })
})

test.describe("手机端", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test("不显示页签栏，页面正常显示", async ({ page }) => {
    await page.goto("/users")
    await expect(page.getByRole("heading", { name: "用户列表" })).toBeVisible()
    await expect(page.locator('[aria-label="已打开的页面"]')).toBeHidden()
  })
})
