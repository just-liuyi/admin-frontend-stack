import { create } from "zustand"
import { persist } from "zustand/middleware"

export type CurrentUser = { name: string; email: string; avatarUrl?: string }

type AuthState = {
  user: CurrentUser | null
  login: (user: CurrentUser) => void
  logout: () => void
}

/** 演示用的登录态：真实项目里 token 由请求层管理，401 时统一跳转登录页 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: "auth" },
  ),
)

/** 登录后的回跳地址：只接受站内路径，防止 ?redirect=//evil.com 把用户带到外部网站 */
export function safeRedirect(search: string) {
  const r = new URLSearchParams(search).get("redirect")
  return r && r.startsWith("/") && !r.startsWith("//") ? r : "/"
}
