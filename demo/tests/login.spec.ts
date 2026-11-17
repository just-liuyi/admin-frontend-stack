import { captchaKind, expect, hasRing, login, primaryColor, skewOf, solveCaptcha, test } from "./fixtures"

// 登录页：小人互动、随机配色、两种登录方式、登录守卫与回跳。规范见 skill 的 references/login.md
test.use({ loggedIn: false, viewport: { width: 1440, height: 860 } })

const mascot = (page: import("@playwright/test").Page, id: string) => page.locator(`[data-mascot="${id}"]`)
const pupil = (page: import("@playwright/test").Page, id: string) => mascot(page, id).locator("[data-pupil]").first().evaluate((el) => (el as HTMLElement).style.transform)
const heightOf = (page: import("@playwright/test").Page, id: string) => mascot(page, id).evaluate((el) => (el as HTMLElement).offsetHeight)
const loginBtn = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "登 录" })

test("未登录访问内页跳到登录页，登录后回到原页面", async ({ page }) => {
  await page.goto("/users")
  await expect(page).toHaveURL(/\/login\?redirect=%2Fusers$/)
  await login(page)
  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByText("欢迎回来，Admin")).toBeVisible()
  await expect(page.locator('[aria-label="已打开的页面"] [role="listitem"]')).toHaveText(["仪表盘", "用户列表"])

  await page.goto("/login")
  await expect(page, "已登录再访问登录页 → 回首页").toHaveURL(/4173\/$/)

  await page.getByRole("button", { name: "个人菜单" }).click()
  await page.getByRole("menuitem", { name: "退出登录" }).click()
  await expect(page).toHaveURL(/\/login/)
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("tabs")!).state.tabs.length), "退出后页签只剩首页").toBe(1)
})

test("回跳地址是外站时不跳过去", async ({ page }) => {
  await page.goto("/login?redirect=" + encodeURIComponent("//evil.example.com"))
  await login(page)
  await expect(page).toHaveURL("http://127.0.0.1:4173/")
})

test("小人：跟随鼠标、看表单、偷看密码、显示密码时回避", async ({ page }) => {
  await page.goto("/login")
  await page.mouse.move(10, 400)
  await expect.poll(() => skewOf(mascot(page, "tall")), "鼠标在左：向左歪").toBeGreaterThan(0.03)
  await page.mouse.move(1430, 400)
  await expect.poll(() => skewOf(mascot(page, "tall")), "鼠标在右：向右歪").toBeLessThan(-0.03)
  await expect.poll(async () => Number((await pupil(page, "tall")).match(/translate\(([-\d.]+)px/)?.[1] ?? 0), "眼珠向右").toBeGreaterThan(2)

  await page.locator("#username").click()
  await expect.poll(() => skewOf(mascot(page, "yellow")), "看向表单").toBeLessThan(-0.09)
  await page.keyboard.type("admin")
  await page.locator("#password").click()
  await page.waitForTimeout(800)
  expect(await heightOf(page, "tall"), "空密码框不偷看").toBe(400)
  await page.keyboard.type("wrong")
  await expect.poll(() => heightOf(page, "tall"), "输入密码：伸长脖子").toBe(440)
  await expect.poll(() => skewOf(mascot(page, "tall"))).toBeLessThan(-0.3)

  await page.getByRole("button", { name: "显示密码" }).click()
  await expect.poll(() => pupil(page, "dark"), "显示密码：看向别处").toBe("translate(-4px, -4px)")
  await expect.poll(() => heightOf(page, "tall")).toBe(400)
  await expect.poll(async () => Math.abs(await skewOf(mascot(page, "tall")))).toBeLessThan(0.001)
  await expect(page.locator("#password")).toHaveAttribute("type", "text")
  expect(await page.evaluate(() => document.activeElement?.id), "焦点仍在密码框").toBe("password")
})

test("登录失败：表单内提示、小人摇头低头后恢复；空提交显示中文提示", async ({ page }) => {
  await page.goto("/login")
  await page.locator("#username").fill("admin")
  await page.locator("#password").fill("wrong")
  await solveCaptcha(page)
  await loginBtn(page).click()
  await expect(page.getByRole("button", { name: "登录中…" })).toBeDisabled()
  await expect(page.getByRole("alert")).toHaveText("账号或密码错误")
  await expect(page.locator(".animate-shake")).toHaveCount(1)
  await expect.poll(() => pupil(page, "tall")).toBe("translate(0px, 3px)")
  await expect.poll(() => pupil(page, "tall"), { timeout: 4000 }).not.toBe("translate(0px, 3px)")

  await page.reload()
  await loginBtn(page).click()
  await expect(page.getByText("请输入用户名")).toBeVisible()
  await expect(page.getByText("请输入密码")).toBeVisible()
})

test("手机验证码登录：校验手机号、倒计时、错误验证码、登录成功", async ({ page }) => {
  await page.goto("/login")
  await page.getByRole("tab", { name: "手机验证码登录" }).click()
  await page.getByRole("button", { name: "获取验证码" }).click()
  await expect(page.getByText("请输入正确的手机号")).toBeVisible()
  await page.locator("#phone").fill("13800138000")
  await page.getByRole("button", { name: "获取验证码" }).click()
  await expect(page.getByRole("button", { name: /秒后重发/ })).toBeVisible()
  await page.locator("#code").fill("000000")
  await solveCaptcha(page)
  await loginBtn(page).click()
  await expect(page.getByRole("alert")).toHaveText("验证码错误或已过期")
  await page.locator("#code").fill("123456")
  await solveCaptcha(page)
  await loginBtn(page).click()
  await expect(page).toHaveURL("http://127.0.0.1:4173/")
})

test("随机配色：每次打开不同、四色各用一次、深色身体上五官为白色、同一次访问内不变", async ({ page }) => {
  const read = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-mascot]")].map((el) => ({
        color: el.dataset.color!,
        features: [...el.querySelectorAll("[data-mouth], span.rounded-full[data-pupil]")].filter((f) => !f.parentElement!.classList.contains("bg-white")).map((f) => f.className),
      })),
    )
  const combos = new Set<string>()
  for (let n = 0; n < 12; n++) {
    await page.goto("/login")
    const info = await read()
    combos.add(info.map((x) => x.color).join(","))
    expect(new Set(info.map((x) => x.color)).size).toBe(4)
    for (const x of info) {
      const dark = x.color === "bg-mascot-1" || x.color === "bg-mascot-2"
      for (const cls of x.features) expect(cls, `${x.color} 上的五官颜色`).toContain(dark ? "bg-white" : "bg-mascot-ink")
    }
  }
  expect(combos.size, "12 次打开出现多种组合").toBeGreaterThanOrEqual(4)

  const before = (await read()).map((x) => x.color).join(",")
  await page.locator("#username").fill("admin")
  await page.locator("#password").fill("abc")
  await loginBtn(page).click()
  await expect(page.getByRole("alert")).toBeVisible()
  expect((await read()).map((x) => x.color).join(",")).toBe(before)
})

test("切换登录方式：位置不跳、没有焦点框、悬停时选中色保持主色（浅色和深色）", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await page.addInitScript((t) => localStorage.setItem("theme", JSON.stringify({ state: { theme: t }, version: 0 })), theme)
    await page.goto("/login")
    // 等登录配置就绪、表单渲染出来再量（配置没回来时显示的是骨架）
    await expect(page.locator("#username")).toBeVisible()
    const pos = () => page.evaluate(() => ({ title: Math.round(document.querySelector("h1")!.getBoundingClientRect().top), tabs: Math.round(document.querySelector('[role="tablist"]')!.getBoundingClientRect().top) }))
    const p0 = await pos()
    const sms = page.getByRole("tab", { name: "手机验证码登录" })
    await sms.click()
    await expect(sms).toHaveAttribute("data-state", "active")
    expect(await pos(), "标题和页签位置不变").toEqual(p0)
    expect(await hasRing(sms), "鼠标点击后没有焦点圈").toBe(false)
    await expect(sms).toHaveCSS("outline-style", "none")
    await expect(sms, `${theme}：鼠标仍停在刚点的页签上，文字是主色`).toHaveCSS("color", await primaryColor(page))
    await page.getByRole("tab", { name: "账号密码登录" }).click()
    expect(await pos()).toEqual(p0)
  }
})

test.describe("手机端", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test("只显示登录卡片、没有横向滚动、切换登录方式不跳", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible()
    await expect(page.locator("[data-mascot]").first()).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth)).toBe(true)
    const top = () => page.evaluate(() => Math.round(document.querySelector("h1")!.getBoundingClientRect().top))
    const t0 = await top()
    await page.getByRole("tab", { name: "手机验证码登录" }).click()
    expect(await top()).toBe(t0)
  })
})

test.describe("减少动态效果", () => {
  test.use({ reducedMotion: "reduce" })
  test("小人不跟随鼠标", async ({ page }) => {
    await page.goto("/login")
    await page.mouse.move(1430, 400)
    await page.waitForTimeout(800)
    expect(await skewOf(mascot(page, "tall"))).toBe(0)
  })
})

test.describe("登录验证码", () => {
  test("默认启用滑块验证码；没完成验证码不能登录", async ({ page }) => {
    await page.goto("/login")
    expect(await captchaKind(page)).toBe("slider")
    await page.locator("#username").fill("admin")
    await page.locator("#password").fill("123456")
    await loginBtn(page).click()
    await expect(page.getByRole("alert")).toHaveText("请先完成验证码")
    await expect(page, "仍然停在登录页").toHaveURL(/\/login/)
  })

  test("滑块：拖错位置提示没对上并换一张，拖对后通过", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator('[data-captcha="slider"] img')).toBeVisible()
    const holeX = async () =>
      page.evaluate(() => {
        const img = document.querySelector<HTMLImageElement>('[data-captcha="slider"] img')!
        const svg = decodeURIComponent(img.getAttribute("src")!.replace("data:image/svg+xml;charset=utf-8,", ""))
        return Number(svg.match(/translate\((\d+) (\d+)\)/)![1])
      })
    const drag = async (dx: number) => {
      const h = (await page.locator('[role="slider"]:visible').boundingBox())!
      const x = h.x + h.width / 2
      const y = h.y + h.height / 2
      await page.mouse.move(x, y)
      await page.mouse.down()
      await page.mouse.move(x + dx, y, { steps: 12 })
      await page.mouse.up()
    }
    await drag((await holeX()) + 40)
    await expect(page.locator('[data-captcha="slider"]')).toContainText("没对上")
    await expect.poll(async () => (await page.locator('[data-captcha="slider"]').innerText()).includes("向右拖动")).toBe(true)
    await drag(await holeX())
    await expect(page.locator('[data-captcha="slider"]')).toContainText("验证通过")
  })

  test("数字图形验证码：填错提示并换一张，填对可登录", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("mock-settings", JSON.stringify({ captchaType: "digits" })))
    await page.goto("/login")
    expect(await captchaKind(page)).toBe("digits")
    const code = () => page.evaluate(() => [...document.querySelectorAll('[data-captcha="digits"] svg text')].map((t) => t.textContent).join(""))
    const first = await code()
    await page.locator("#username").fill("admin")
    await page.locator("#password").fill("123456")
    await page.locator("[data-captcha-input]").fill(first === "1111" ? "2222" : "1111")
    await loginBtn(page).click()
    await expect(page.getByRole("alert")).toHaveText("验证码不正确，请重新输入")
    // 失败后题目作废、组件重新挂载：要等新题就绪、输入框清空再填，否则填进去的内容会被重置掉
    const input = page.locator("[data-captcha-input]")
    await expect.poll(code).not.toBe(first)
    await expect(input, "新题就绪后输入框是空的").toHaveValue("")
    const next = await code()
    await input.fill(next)
    await expect(input).toHaveValue(next)
    await loginBtn(page).click()
    await expect(page).toHaveURL("http://127.0.0.1:4173/")
  })

  test("关闭验证码：登录页不显示，也不影响登录", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("mock-settings", JSON.stringify({ captchaEnabled: false })))
    await page.goto("/login")
    expect(await captchaKind(page)).toBeNull()
    await page.locator("#username").fill("admin")
    await page.locator("#password").fill("123456")
    await loginBtn(page).click()
    await expect(page).toHaveURL("http://127.0.0.1:4173/")
  })

  test("切换登录方式时验证码跟着换，且只给当前页签取题", async ({ page }) => {
    await page.goto("/login")
    expect(await captchaKind(page)).toBe("slider")
    await page.getByRole("tab", { name: "手机验证码登录" }).click()
    // 短信页签的验证码加载完成后：只有 1 个真实验证码，账号密码页签里只剩占位（没有取题）
    await expect(page.locator('[data-captcha="slider"]:visible')).toHaveCount(1)
    await expect(page.locator('[data-captcha-placeholder]')).toHaveCount(1)
    // 换回账号密码页签，验证码重新出现（不是复用隐藏页签的旧题）
    await page.getByRole("tab", { name: "账号密码登录" }).click()
    await expect(page.locator('[data-captcha="slider"]:visible')).toHaveCount(1)
  })
})

test.describe("验证码外观", () => {
  test("滑块图片、轨道、数字验证码这一行，都和输入框同宽对齐", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator('[data-captcha="slider"] img')).toBeVisible()
    const box = async (sel: string) => (await page.locator(sel).first().boundingBox())!
    const input = await box("#username")
    for (const sel of ['[data-captcha="slider"] img', '[role="slider"] >> xpath=..']) {
      const b = await box(sel)
      expect(Math.round(b.x), `${sel} 左边对齐`).toBe(Math.round(input.x))
      expect(Math.round(b.width), `${sel} 同宽`).toBe(Math.round(input.width))
    }
    expect(Math.round((await box('[role="slider"] >> xpath=..')).height), "轨道与输入框同高").toBe(Math.round(input.height))

    await page.evaluate(() => localStorage.setItem("mock-settings", JSON.stringify({ captchaType: "digits" })))
    await page.reload()
    await expect(page.locator("#captcha")).toBeVisible()
    const field = await box("#captcha")
    const img = await box('[data-captcha="digits"] button')
    expect(Math.round(field.x), "数字输入框左边对齐").toBe(Math.round(input.x))
    expect(Math.round(img.x + img.width), "验证码图片右边对齐").toBe(Math.round(input.x + input.width))
    expect(Math.round(field.height)).toBe(Math.round(input.height))
    expect(Math.round(img.height)).toBe(Math.round(input.height))
  })

  test("只点一下滑块不算一次尝试，题目不会被消耗", async ({ page }) => {
    await page.goto("/login")
    const img = page.locator('[data-captcha="slider"] img')
    await expect(img).toBeVisible()
    const src = await img.getAttribute("src")
    await page.locator('[role="slider"]').click()
    await page.waitForTimeout(1200)
    await expect(page.locator('[data-captcha="slider"]')).toContainText("向右拖动滑块完成拼图")
    expect(await img.getAttribute("src"), "还是同一张图").toBe(src)
    await solveCaptcha(page)
  })

  test("拼图用的是不带缺口的原图（拼到位后不会显示成灰块）", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator('[data-captcha="slider"] img')).toBeVisible()
    const [bg, piece] = await page.evaluate(() => [
      document.querySelector('[data-captcha="slider"] img')!.getAttribute("src")!,
      getComputedStyle(document.querySelector("[data-piece]")!).backgroundImage,
    ])
    expect(decodeURIComponent(bg)).toContain("translate(")
    expect(decodeURIComponent(piece), "拼图图案里没有缺口").not.toContain("translate(")
  })
})

test("滑块验证码整块（标题 + 图片 + 轨道）与「用户名 + 密码」两个字段等高，拼图为图片高度的一半", async ({ page }) => {
  await page.goto("/login")
  await expect(page.locator('[data-captcha="slider"] img')).toBeVisible()
  const m = await page.evaluate(() => {
    const fields = [...document.querySelectorAll<HTMLElement>("form [data-slot=field]")].filter((f) => f.offsetParent)
    const r = (el: Element) => el.getBoundingClientRect()
    return {
      twoFields: Math.round(r(fields[1]).bottom - r(fields[0]).top),
      captcha: Math.round(r(fields[2]).height),
      image: Math.round(r(document.querySelector('[data-captcha="slider"] img')!).height),
      piece: Math.round(r(document.querySelector("[data-piece]")!).height),
    }
  })
  expect(m.captcha).toBe(m.twoFields)
  expect(m.piece * 2).toBe(m.image)
})
