/**
 * 登录接口。⚠️ 这里是演示用的假实现（演示账号 admin / 123456，验证码 123456）。
 * 接入真实后端时只替换函数内部，保持函数名、参数和返回值不变，登录页就不用改。
 * 登录失败请抛 LoginError（message 会直接显示在表单里），其他异常显示"登录失败，请稍后再试"。
 */
import type { CurrentUser } from "@/stores/auth"

export class LoginError extends Error {}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function loginWithPassword(username: string, password: string): Promise<CurrentUser> {
  await delay(700)
  if (username !== "admin" || password !== "123456") throw new LoginError("账号或密码错误")
  return { name: "Admin", email: "admin@example.com" }
}

export async function sendSmsCode(phone: string): Promise<{ phone: string; expiresIn: number }> {
  await delay(500)
  return { phone, expiresIn: 60 }
}

export async function loginWithSms(phone: string, code: string): Promise<CurrentUser> {
  await delay(700)
  if (code !== "123456") throw new LoginError("验证码错误或已过期")
  return { name: "Admin", email: `${phone}@example.com` }
}
