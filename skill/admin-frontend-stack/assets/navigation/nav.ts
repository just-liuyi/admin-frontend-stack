import type { LucideIcon } from "lucide-react"
import { LayoutDashboard, Settings, ShoppingBag, Users } from "lucide-react"

/** 二级菜单项：只有标题和路径，不带图标 */
export type NavLeaf = { title: string; url: string; permission?: string }

/** 一级菜单项：要么直接跳转（url），要么展开子菜单（children），二者只能有其一 */
export type NavItem = { title: string; icon: LucideIcon; permission?: string } & (
  | { url: string; children?: never }
  | { url?: never; children: NavLeaf[] }
)

export type NavGroup = { label?: string; items: NavItem[] }

/** 唯一的菜单数据源：侧边栏、面包屑、路由守卫都读这一份 */
export const navGroups: NavGroup[] = [
  { items: [{ title: "仪表盘", url: "/", icon: LayoutDashboard }] },
  {
    label: "业务",
    items: [
      {
        title: "用户管理",
        icon: Users,
        children: [
          { title: "用户列表", url: "/users" },
          { title: "角色权限", url: "/roles" },
        ],
      },
      { title: "订单管理", url: "/orders", icon: ShoppingBag },
    ],
  },
  { label: "系统", items: [{ title: "系统设置", url: "/settings", icon: Settings }] },
]

/** 选中状态由当前路由决定；"/" 只做精确匹配，其余路径同时匹配其子路径 */
export function isActivePath(pathname: string, url: string) {
  if (url === "/") return pathname === "/"
  return pathname === url || pathname.startsWith(`${url}/`)
}

/** 面包屑：按当前路由在菜单数据里找到 [一级标题, 二级标题] */
export function findNavTrail(pathname: string): string[] {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.children) {
        const leaf = item.children.find((c) => isActivePath(pathname, c.url))
        if (leaf) return [item.title, leaf.title]
      } else if (isActivePath(pathname, item.url)) {
        return [item.title]
      }
    }
  }
  return []
}
