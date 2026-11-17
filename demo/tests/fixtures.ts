import { test as base, expect, type Locator, type Page } from "@playwright/test"

/**
 * 公共夹具：
 * - loggedIn（默认 true）：打开页面前写入演示登录态；登录相关的测试用 test.use({ loggedIn: false })
 * - pageErrors（自动）：收集页面运行时错误和控制台报错，测试结束时必须为空
 */
export const test = base.extend<{ loggedIn: boolean; pageErrors: string[] }>({
  loggedIn: [true, { option: true }],
  context: async ({ context, loggedIn }, use) => {
    if (loggedIn) {
      await context.addInitScript(() => {
        if (!localStorage.getItem("auth")) localStorage.setItem("auth", JSON.stringify({ state: { user: { name: "Admin", email: "admin@example.com" } }, version: 0 }))
      })
    }
    await use(context)
  },
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on("pageerror", (e) => errors.push(String(e)))
      page.on("console", (m) => {
        // 子路径部署时，直接打开深层地址会先收到 404.html（状态码 404），属于预期
        if (m.type() === "error" && !/Failed to load resource.*404/.test(m.text())) errors.push(m.text())
      })
      await use(errors)
      expect(errors, "页面不应有运行时错误").toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** 页签保活：后台页签的页面仍在 DOM 里（隐藏），选择器要限定可见 */
export const visibleTable = (page: Page) => page.locator("table:visible")

/** 斜切角度：读 transform 矩阵的第三个值（tan 角度），没有变换时为 0 */
export async function skewOf(el: Locator) {
  const t = await el.evaluate((e) => getComputedStyle(e).transform)
  const m = t.match(/matrix\(1, 0, ([-\d.e]+), 1/)
  return m ? Number(m[1]) : 0
}

/** 是否显示了 shadcn 的焦点圈（box-shadow 中有扩散半径不为 0 的阴影） */
export async function hasRing(el: Locator) {
  return el.evaluate((e) => /0px 0px 0px (?!0px)[\d.]+px/.test(getComputedStyle(e).boxShadow))
}

/** 当前主题主色的实际颜色值 */
export function primaryColor(page: Page) {
  return page.evaluate(() => {
    const s = document.createElement("span")
    s.className = "text-primary"
    document.body.append(s)
    const c = getComputedStyle(s).color
    s.remove()
    return c
  })
}
