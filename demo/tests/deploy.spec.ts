import { expect, test } from "./fixtures"

// 部署在子路径（GitHub Pages：/admin-frontend-stack/）时的检查。服务由 tests/serve-pages.mjs 提供
test.use({ loggedIn: false, viewport: { width: 1440, height: 860 } })

const B = "http://127.0.0.1:4174/admin-frontend-stack"
const path = (page: import("@playwright/test").Page) => {
  const u = new URL(page.url())
  return u.pathname + u.search
}

test("子路径部署：深层地址、登录回跳、菜单、页签、刷新、404、退出登录", async ({ page }) => {
  await page.goto(B + "/users")
  await expect.poll(() => path(page), "直接打开深层地址 → 登录页并带回跳地址").toBe("/admin-frontend-stack/login?redirect=%2Fusers")
  await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible()
  await expect(page.locator("[data-mascot]")).toHaveCount(4)

  await page.locator("#username").fill("admin")
  await page.locator("#password").fill("123456")
  await page.getByRole("button", { name: "登 录" }).click()
  await expect.poll(() => path(page)).toBe("/admin-frontend-stack/users")
  await expect(page.locator("table:visible tbody tr").first()).toBeVisible()

  await page.locator('[data-slot="sidebar-content"] a', { hasText: "订单管理" }).click()
  await expect.poll(() => path(page)).toBe("/admin-frontend-stack/orders")
  await expect(page.locator('[aria-label="已打开的页面"] [role="listitem"]')).toHaveText(["仪表盘", "用户列表", "订单管理"])

  await page.reload()
  await expect(page.getByRole("heading", { level: 1, name: "订单管理" }), "在深层地址刷新，页面和登录态都还在").toBeVisible()

  await page.goto(B + "/no-such-page")
  await expect(page.getByText("页面不存在")).toBeVisible()
  await page.getByRole("link", { name: "返回首页" }).click()
  await expect.poll(() => path(page)).toBe("/admin-frontend-stack/")

  await page.getByRole("button", { name: "个人菜单" }).click()
  await page.getByRole("menuitem", { name: "退出登录" }).click()
  await expect.poll(() => path(page)).toMatch(/^\/admin-frontend-stack\/login/)
})
