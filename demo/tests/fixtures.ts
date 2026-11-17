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

/** 登录页当前显示的验证码类型；没有验证码时返回 null */
export async function captchaKind(page: Page): Promise<"slider" | "digits" | null> {
  // 验证码是异步取题的：先等它出现（最多 5 秒），仍然没有才认为未启用
  const field = page.locator("[data-captcha]:visible")
  await expect.poll(async () => field.count(), { timeout: 5000 }).toBeGreaterThan(0).catch(() => {})
  if ((await field.count()) === 0) return null
  return (await field.first().getAttribute("data-captcha")) as "slider" | "digits"
}

/**
 * 像人一样"看懂"验证码并完成它：
 * - 数字图形：读出图片里的数字填进输入框
 * - 滑块：从背景图里找到缺口位置，把滑块拖过去
 * 演示用的验证码在前端生成、答案在图片里可见，所以能这样解；真实项目由后端校验，这里只是模拟用户操作。
 */
export async function solveCaptcha(page: Page) {
  const kind = await captchaKind(page)
  if (!kind) return
  if (kind === "digits") {
    const code = await page.locator('[data-captcha="digits"] svg text:visible').allTextContents()
    await page.locator("[data-captcha-input]:visible").fill(code.join(""))
    return
  }
  const holeX = await page.evaluate(() => {
    const img = document.querySelector<HTMLImageElement>('[data-captcha="slider"] img')!
    const svg = decodeURIComponent(img.getAttribute("src")!.replace("data:image/svg+xml;charset=utf-8,", ""))
    return Number(svg.match(/translate\((\d+) (\d+)\)/)![1])
  })
  const handle = (await page.locator('[role="slider"]:visible').boundingBox())!
  const x = handle.x + handle.width / 2
  const y = handle.y + handle.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + holeX, y, { steps: 12 })
  await page.mouse.up()
  await expect(page.locator('[data-captcha="slider"]:visible'), "滑块验证通过").toContainText("验证通过")
}

/** 填写账号密码（或手机验证码）并完成验证码 */
export async function login(page: Page, user: { username?: string; password?: string; phone?: string; code?: string } = {}) {
  if (user.phone) {
    await page.getByRole("tab", { name: "手机验证码登录" }).click()
    await page.locator("#phone").fill(user.phone)
    await page.locator("#code").fill(user.code ?? "123456")
  } else {
    await page.locator("#username").fill(user.username ?? "admin")
    await page.locator("#password").fill(user.password ?? "123456")
  }
  await solveCaptcha(page)
  await page.getByRole("button", { name: "登 录" }).click()
}
