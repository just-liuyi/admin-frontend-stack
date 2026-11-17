import { expect, primaryColor, test } from "./fixtures"

// 系统设置：分类页签、每个分类单独保存、未保存提醒、字段对齐。规范见 skill 的 references/settings.md
test.use({ viewport: { width: 1440, height: 900 } })

const title = (page: import("@playwright/test").Page) => page.locator("form h2")
const tab = (page: import("@playwright/test").Page, name: string) => page.getByRole("tab", { name })
const saveBtn = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "保存", exact: true })

test("切换分类：地址带 ?tab=，刷新后仍在原分类", async ({ page }) => {
  await page.goto("/settings")
  await expect(title(page)).toHaveText("基本信息")
  await tab(page, "账号安全").click()
  await expect(page).toHaveURL(/tab=account/)
  await expect(title(page)).toHaveText("账号安全")
  await page.reload()
  await expect(title(page)).toHaveText("账号安全")
})

test("未保存提醒、校验、保存、放弃修改", async ({ page }) => {
  await page.goto("/settings?tab=account")
  const minLen = page.locator("#passwordMinLength")
  await minLen.fill("10")
  await expect(page.getByText("有未保存的修改")).toBeVisible()
  await expect(saveBtn(page)).toBeEnabled()

  await tab(page, "消息通知").click()
  await expect(page.getByRole("alertdialog"), "有未保存修改时切换要确认").toBeVisible()
  await page.getByRole("button", { name: "继续编辑" }).click()
  await expect(minLen, "继续编辑：修改还在").toHaveValue("10")
  await expect(page).toHaveURL(/tab=account/)

  await minLen.fill("3")
  await saveBtn(page).click()
  await expect(page.getByText("不少于 6 位")).toBeVisible()

  await minLen.fill("10")
  await saveBtn(page).click()
  await expect(page.getByText("「账号安全」已保存")).toBeVisible()
  await expect(page.getByText("有未保存的修改")).toHaveCount(0)
  await tab(page, "消息通知").click()
  await expect(page.getByRole("alertdialog"), "保存后切换不再确认").toHaveCount(0)
  await expect(title(page)).toHaveText("消息通知")
  await tab(page, "账号安全").click()
  await expect(minLen, "切回来，保存的值还在").toHaveValue("10")

  await page.locator("#sessionTimeoutMinutes").fill("60")
  await tab(page, "基本信息").click()
  await page.getByRole("button", { name: "放弃修改" }).click()
  await expect(title(page)).toHaveText("基本信息")
  await tab(page, "账号安全").click()
  await expect(page.locator("#sessionTimeoutMinutes"), "放弃的修改没有被保存").toHaveValue("120")
})

for (const width of [1440, 1920]) {
  test(`${width} 宽：每个分类同一行字段的标题、控件中线、控件高度对齐`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const t of ["basic", "order", "account", "notify", "payment", "storage", "backup"]) {
      await page.goto(`/settings?tab=${t}`)
      await expect(page.locator('form [data-slot="field"]').first()).toBeVisible()
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll('form [data-slot="field"]')].map((f) => {
          const label = f.querySelector("label")!.getBoundingClientRect()
          const sw = f.querySelector("button[role=switch]")
          const ctl = (sw ? sw.parentElement! : f.querySelector("input, textarea, button[role=combobox]")!).getBoundingClientRect()
          return { top: Math.round(label.top), mid: Math.round(ctl.top + ctl.height / 2), h: Math.round(ctl.height), textarea: !!f.querySelector("textarea") }
        }),
      )
      const byRow = new Map<number, typeof rows>()
      for (const r of rows.filter((r) => !r.textarea)) byRow.set(r.top, [...(byRow.get(r.top) ?? []), r])
      for (const [top, rs] of byRow) {
        expect(new Set(rs.map((r) => r.mid)).size, `${t} 第 ${top}px 行：控件中线`).toBe(1)
        expect(new Set(rs.map((r) => r.h)).size, `${t} 第 ${top}px 行：控件高度`).toBe(1)
      }
    }
  })
}

test("深色模式：点过的分类页签悬停时仍是主色", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", JSON.stringify({ state: { theme: "dark" }, version: 0 })))
  await page.goto("/settings")
  const storage = tab(page, "文件存储")
  await storage.click()
  await expect(storage).toHaveAttribute("data-state", "active")
  await expect(storage).toHaveCSS("color", await primaryColor(page))
})

test.describe("手机端", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test("表单完整显示在屏幕内", async ({ page }) => {
    await page.goto("/settings?tab=account")
    await expect(title(page)).toHaveText("账号安全")
    const right = await page.locator("form").evaluate((f) => f.getBoundingClientRect().right)
    expect(right, "表单右边缘不超出屏幕").toBeLessThanOrEqual(390)
    expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth)).toBe(true)
  })
})
