import { Fragment, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { Bell, Search } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { TabBar } from "@/components/tab-bar"
import { TabViews } from "@/components/tab-views"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { UserMenu } from "@/components/user-menu"
import { findNavTrail } from "@/config/nav"
import { useAuthStore } from "@/stores/auth"
import { useTabsStore } from "@/stores/tabs"

/**
 * 折叠状态只有一份：SidebarProvider 管理，并自动写入 cookie `sidebar_state`。
 * Vite 项目里 Provider 不会自己读回 cookie，所以初始值在这里读一次。不要再存一份到 Zustand。
 */
function readSidebarCookie() {
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/)
  return match ? match[1] === "true" : true
}

export function AppShell() {
  const [defaultOpen] = useState(readSidebarCookie)
  // 主题在 App.tsx 最外层应用（登录页也要生效），这里不再调用 useApplyTheme
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = () => {
    useAuthStore.getState().logout()
    useTabsStore.getState().reset()
    navigate("/login", { replace: true })
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        {/* 顶栏 + 页签栏一起吸顶 */}
        <div className="sticky top-0 z-10">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            {/* 仅手机端：侧边栏变成抽屉后，侧边栏顶部的按钮看不到，需要这里的入口打开它 */}
            <SidebarTrigger className="size-8 md:hidden" aria-label="打开菜单" />
            <AppBreadcrumb />
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="搜索">
                <Search />
              </Button>
              <Button variant="ghost" size="icon" aria-label="通知">
                <Bell />
              </Button>
              {/* 外壳只在已登录时渲染（见 App.tsx），所以 user 一定存在 */}
              {user ? <UserMenu user={user} onLogout={logout} /> : null}
            </div>
          </header>
          {/* 页签栏只在电脑上显示：手机屏幕放不下，靠侧边栏抽屉切换页面 */}
          <div className="hidden md:block">
            <TabBar />
          </div>
        </div>
        <div className="flex-1 p-4 md:p-6">
          <TabViews />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppBreadcrumb() {
  const { pathname } = useLocation()
  const trail = findNavTrail(pathname)
  // ⚠️ shadcn 的 BreadcrumbList 默认 flex-wrap，名称长时会折成多行撑破 56px 的顶栏。
  // 这里强制单行：手机只显示当前页，电脑显示完整路径，过长都用省略号截断。
  return (
    <Breadcrumb className="min-w-0 flex-1">
      <BreadcrumbList className="flex-nowrap">
        {trail.map((title, i) => {
          const isLast = i === trail.length - 1
          return (
            <Fragment key={title}>
              {i > 0 ? <BreadcrumbSeparator className="hidden md:inline-flex" /> : null}
              <BreadcrumbItem className={isLast ? "min-w-0" : "hidden min-w-0 md:inline-flex"}>
                {isLast ? (
                  <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
                ) : (
                  <span className="truncate text-muted-foreground">{title}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
