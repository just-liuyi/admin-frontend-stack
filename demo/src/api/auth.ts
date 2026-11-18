/**
 * 登录接口。⚠️ 这里是演示用的假实现（演示账号 admin / 123456，验证码 123456）。
 * 接入真实后端时只替换函数内部，保持函数名、参数和返回值不变，登录页就不用改。
 * 登录失败请抛 LoginError（message 会直接显示在表单里），其他异常显示"登录失败，请稍后再试"。
 */
import { getSettingsSnapshot } from "@/api/settings"
import type { CurrentUser } from "@/stores/auth"
import { CaptchaError, consumeCaptchaToken, verifyDigits, type CaptchaProof } from "./captcha"

export class LoginError extends Error {}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * 校验验证码。演示：是否启用读的是前端设置；真实项目必须由后端判断并在服务端校验。
 * - 滑块：前端验证成功后拿到 token，这里只消费一次
 * - 数字图形：把用户输入的数字交给校验函数比对
 */
function checkCaptcha(proof?: CaptchaProof) {
  if (!getSettingsSnapshot().captchaEnabled) return
  if (!proof) throw new LoginError("请先完成验证码")
  if ("token" in proof) {
    if (!consumeCaptchaToken(proof.token)) throw new LoginError("验证码已失效，请重新验证")
    return
  }
  try {
    if (!verifyDigits(proof.id, proof.answer)) throw new LoginError("验证码不正确，请重新输入")
  } catch (e) {
    if (e instanceof LoginError) throw e
    throw new LoginError(e instanceof CaptchaError ? e.message : "验证码校验失败，请重新获取")
  }
}

export async function loginWithPassword(username: string, password: string, captcha?: CaptchaProof): Promise<CurrentUser> {
  await delay(700)
  checkCaptcha(captcha)
  if (username !== "admin" || password !== "123456") throw new LoginError("账号或密码错误")
  return { name: "Admin", email: "admin@example.com" }
}

export async function sendSmsCode(phone: string): Promise<{ phone: string; expiresIn: number }> {
  await delay(500)
  return { phone, expiresIn: 60 }
}

export async function loginWithSms(phone: string, code: string, captcha?: CaptchaProof): Promise<CurrentUser> {
  await delay(700)
  checkCaptcha(captcha)
  if (code !== "123456") throw new LoginError("验证码错误或已过期")
  return { name: "Admin", email: `${phone}@example.com` }
}
