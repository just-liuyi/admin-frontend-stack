import { Navigate, useLocation } from "react-router"
import { AppShell } from "@/components/app-shell"
import LoginPage from "@/pages/login"
import { safeRedirect, useAuthStore } from "@/stores/auth"
import { useApplyTheme } from "@/stores/theme"

// 页面路由表在 config/routes.tsx，由 TabViews 按每个页签的地址渲染；登录页在外壳之外
export default function App() {
  const { pathname, search } = useLocation()
  const user = useAuthStore((s) => s.user)
  // 主题要在最外层应用：登录页不在外壳里，放在外壳里的话登录页不会变深色
  useApplyTheme()

  // 登录成功后的跳转只在这里做一次（登录页自己不跳，否则两处跳转会互相覆盖）
  if (pathname === "/login") return user ? <Navigate to={safeRedirect(search)} replace /> : <LoginPage />
  // 未登录访问任何页面 → 跳登录页，并带上回跳地址
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(pathname + search)}`} replace />
  return <AppShell />
}
