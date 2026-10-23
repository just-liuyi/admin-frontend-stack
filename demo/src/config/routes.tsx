import type { RouteObject } from "react-router"
import { Link } from "react-router"
import { FileQuestion } from "lucide-react"

import { EmptyState } from "@/components/common"
import { Button } from "@/components/ui/button"
import DashboardPage from "@/pages/dashboard"
import OrdersPage from "@/pages/orders"
import RolesPage from "@/pages/roles"
import SettingsPage from "@/pages/settings"
import UsersPage from "@/pages/users"

/** 页面路由表：每个页签用它按自己的地址渲染页面（见 tab-views.tsx） */
export const pageRoutes: RouteObject[] = [
  { path: "/", element: <DashboardPage /> },
  { path: "/users", element: <UsersPage /> },
  { path: "/roles", element: <RolesPage /> },
  { path: "/orders", element: <OrdersPage /> },
  { path: "/settings", element: <SettingsPage /> },
  {
    path: "*",
    element: (
      <EmptyState
        icon={FileQuestion}
        title="页面不存在"
        description="你访问的地址有误，或页面已被移除"
        action={
          <Button asChild variant="outline">
            <Link to="/">返回首页</Link>
          </Button>
        }
      />
    ),
  },
]
