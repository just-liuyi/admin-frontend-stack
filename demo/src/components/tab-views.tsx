import { Activity, Fragment } from "react"
import { useLocation, useRoutes } from "react-router"

import { findNavTrail } from "@/config/nav"
import { pageRoutes } from "@/config/routes"
import { useTabsStore } from "@/stores/tabs"

/**
 * 页面容器：每个打开的页签各渲染一份页面，只显示当前这一个。
 * 用 React 19 的 <Activity> 隐藏其余页签——状态（筛选、分页、勾选、表单输入）会保留，
 * 隐藏期间副作用会被清理，不会在后台继续请求。
 */
export function TabViews() {
  const { pathname, search } = useLocation()
  const tabs = useTabsStore((s) => s.tabs)
  const isNavPage = findNavTrail(pathname).length > 0

  // 菜单外的地址（如 404）不进页签，直接渲染
  if (!isNavPage) return <TabPage path={pathname + search} />

  // 当前地址还没写进页签时（首帧），先把它补进来渲染，避免闪空白
  const list = tabs.some((t) => t.key === pathname) ? tabs : [...tabs, { key: pathname, path: pathname + search, refreshKey: 0 }]

  return list.map((t) => {
    const active = t.key === pathname
    return (
      <Activity key={t.key} mode={active ? "visible" : "hidden"} name={t.key}>
        {/* 当前页签用真实地址，确保筛选参数与地址栏一致；refreshKey 变化时重新挂载 = "刷新" */}
        <Fragment key={t.refreshKey}>
          <TabPage path={active ? pathname + search : t.path} />
        </Fragment>
      </Activity>
    )
  })
}

/** 按指定地址渲染页面：页面里的 useLocation / useSearchParams 读到的是这个地址 */
function TabPage({ path }: { path: string }) {
  return useRoutes(pageRoutes, path)
}
