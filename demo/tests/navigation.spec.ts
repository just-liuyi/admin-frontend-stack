import { expect, test, visibleTable } from "./fixtures"

// 导航外壳：侧边栏、收放按钮、二级菜单、右上角个人入口、头像、手机端。规范见 skill 的 references/navigation.md
test.use({ viewport: { width: 1280, height: 720 } })

const sidebar = '[data-slot="sidebar"]'

test("展开状态：收放按钮在顶部、没有底部用户菜单、当前子菜单展开高亮、两条线对齐", async ({ page }) => {
  await page.goto("/users")
  await expect(page.locator('[data-slot="sidebar-header"] button[aria-label="收起侧边栏"]')).toBeVisible()
  await expect(page.locator('[data-slot="sidebar-footer"]')).toHaveCount(0)
  await expect(page.locator('[data-slot="sidebar-menu-sub-button"][data-active="true"]')).toHaveText("用户列表")
  const hb = (await page.locator('[data-slot="sidebar-header"]').boundingBox())!
  const tb = (await page.locator("header").boundingBox())!
  expect(Math.abs(hb.y + hb.height - (tb.y + tb.height)), "侧边栏顶部底线与顶栏底线对齐").toBeLessThan(1)
  await expect(page.locator('[data-slot="sidebar-content"] [data-slot="sidebar-separator"]'), "3 组菜单之间 2 条分隔线").toHaveCount(2)
})

test("折叠：按钮仍在顶部、状态记住、悬停显示名称、点父级弹出子菜单", async ({ page, context }) => {
  await page.goto("/users")
  await page.locator('button[aria-label="收起侧边栏"]').click()
  await expect(page.locator(sidebar).first()).toHaveAttribute("data-state", "collapsed")

  const open = page.locator('[data-slot="sidebar-header"] button[aria-label="展开侧边栏"]')
  const box = (await open.boundingBox())!
  expect(box.y < 60 && box.x < 48, `收放按钮仍在侧边栏顶部 ${JSON.stringify(box)}`).toBe(true)
  await expect(page.locator('[data-slot="sidebar-header"]')).toHaveCSS("border-bottom-width", "0px")
  await expect.poll(async () => (await context.cookies()).find((c) => c.name === "sidebar_state")?.value).toBe("false")

  await page.mouse.move(640, 400)
  await page.locator('[data-slot="sidebar-content"] a[href="/orders"]').hover()
  await expect(page.locator('[data-slot="tooltip-content"]').first()).toContainText("订单管理")

  await page.locator('button[aria-label="用户管理"]').click()
  await expect(page.locator('[data-slot="dropdown-menu-content"] [data-slot="dropdown-menu-item"]')).toHaveText(["用户列表", "角色权限"])
  await page.locator('[data-slot="dropdown-menu-content"] a[href="/roles"]').click()
  await expect(page).toHaveURL(/\/roles$/)

  await page.reload()
  await expect(page.locator(sidebar).first(), "刷新后仍是折叠").toHaveAttribute("data-state", "collapsed")

  await page.locator('button[aria-label="展开侧边栏"]').click()
  await expect(page.locator('[data-slot="sidebar-menu-sub-button"][data-active="true"]')).toHaveText("角色权限")
  const parent = page.locator('[data-sidebar="menu-button"]', { hasText: "用户管理" })
  await parent.click()
  await expect(parent, "收起父级后，父级显示为选中").toHaveAttribute("data-active", "true")
})

test("右上角个人菜单：位置、内容、切换深色", async ({ page }) => {
  await page.goto("/")
  const btn = page.locator('button[aria-label="个人菜单"]')
  const b = (await btn.boundingBox())!
  expect(b.x > 1180 && b.y < 20, `个人入口在右上角 ${JSON.stringify(b)}`).toBe(true)
  await btn.click()
  const menu = page.locator('[data-slot="dropdown-menu-content"]')
  for (const t of ["Admin", "admin@example.com", "个人设置", "切换主题", "退出登录"]) await expect(menu).toContainText(t)
  await page.getByText("切换主题").hover()
  await page.getByRole("menuitemradio", { name: "深色" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
})

test("用户表格里的头像都是生成的 SVG", async ({ page }) => {
  await page.goto("/users")
  await expect(visibleTable(page).locator("tbody tr").first()).toBeVisible()
  expect(await visibleTable(page).locator('[data-slot="avatar-fallback"] svg').count()).toBeGreaterThanOrEqual(10)
})

test.describe("手机端", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test("顶栏打开菜单、长菜单名不换行、抽屉点菜单后自动关闭", async ({ page }) => {
    await page.goto("/users")
    const trigger = page.locator('header button[aria-label="打开菜单"]')
    await expect(trigger).toBeVisible()

    await page.locator('[data-slot="breadcrumb-page"]').evaluate((el) => (el.textContent = "供应商资质审核记录明细与历史版本对照"))
    const crumb = await page.evaluate(() => ({ h: document.querySelector('[data-slot="breadcrumb-list"]')!.getBoundingClientRect().height, sw: document.documentElement.scrollWidth, iw: innerWidth }))
    expect(crumb.h <= 24 && crumb.sw === crumb.iw, `面包屑一行、无横向滚动 ${JSON.stringify(crumb)}`).toBe(true)

    await page.reload()
    await page.locator('header button[aria-label="打开菜单"]').click()
    await expect(page.locator('button[aria-label="关闭菜单"]')).toBeVisible()
    await page.locator('[data-mobile="true"] a[href="/orders"]').click()
    await expect(page).toHaveURL(/\/orders$/)
    await expect(page.locator('[data-mobile="true"]')).toHaveCount(0)
  })
})
