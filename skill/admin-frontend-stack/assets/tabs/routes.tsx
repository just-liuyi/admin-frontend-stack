import type { ComponentType } from "react"
import type { RouteObject } from "react-router"
import { Link } from "react-router"
import { FileQuestion } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * 页面路由表：每个页签用它按自己的地址渲染页面（见 tab-views.tsx）。
 * ⚠️ 这是模板：path 要和 config/nav.ts 的菜单地址一一对应；把 placeholder(...) 换成真实页面组件，例如
 *   import UsersPage from "@/pages/users"
 *   ["/users", UsersPage],
 */
const placeholder = (title: string): ComponentType =>
  function Placeholder() {
    return <h1 className="text-xl font-semibold">{title}</h1>
  }

const pages: [path: string, Page: ComponentType][] = [
  ["/", placeholder("仪表盘")],
  ["/users", placeholder("用户列表")],
  ["/roles", placeholder("角色权限")],
  ["/orders", placeholder("订单管理")],
  ["/settings", placeholder("系统设置")],
]

function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
        <FileQuestion className="size-7" aria-hidden="true" />
      </span>
      <div>
        <p className="text-base font-medium">页面不存在</p>
        <p className="text-sm text-muted-foreground">你访问的地址有误，或页面已被移除</p>
      </div>
      <Button asChild variant="outline">
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  )
}

export const pageRoutes: RouteObject[] = [...pages.map(([path, Page]) => ({ path, element: <Page /> })), { path: "*", element: <NotFound /> }]
