import { Fragment, useState } from "react"
import { Link, useLocation } from "react-router"
import { Box, Check, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { isActivePath, navGroups, type NavItem, type NavLeaf } from "@/config/nav"

// 选中项用主色浅底，和悬停的灰底区分开；只在这一处定义，所有菜单按钮共用。
// ⚠️ 必须带 `!`：shadcn 的 data-active 变体用 :where() 实现，优先级低于 hover，不加的话悬停时选中色会被盖掉
const activeClass = "data-active:bg-primary/10! data-active:text-primary! dark:data-active:bg-primary/20!"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      {/* 高度与顶栏一致（h-14），底线和顶栏底线连成一条；折叠后上下排列放不下，取消固定高度和底线 */}
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:border-b-0">
        {/* 展开：Logo 在左、收放按钮在右；折叠：上下排列，按钮仍在侧边栏最上方 */}
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
          <Link
            to="/"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:flex-none"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Box className="size-4" aria-hidden="true" />
            </span>
            <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">Nova</span>
          </Link>
          <SidebarToggle />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      {/* 不放 SidebarFooter：用户菜单在顶栏右上角，收放按钮在顶部 */}
    </Sidebar>
  )
}

/** 收放按钮：固定在侧边栏顶部，不占菜单位置 */
function SidebarToggle() {
  const { state, isMobile, toggleSidebar } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  const label = isMobile ? "关闭菜单" : collapsed ? "展开侧边栏" : "收起侧边栏"
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose

  const button = (
    <Button variant="outline" size="icon" aria-label={label} onClick={toggleSidebar}>
      <Icon />
    </Button>
  )
  // 手机端抽屉打开时焦点会落在这个按钮上，加 Tooltip 会自动弹出气泡，所以手机端不加
  if (isMobile) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">
        {label}
        <kbd className="ml-2 opacity-70">Ctrl B</kbd>
      </TooltipContent>
    </Tooltip>
  )
}

function NavMain() {
  const { pathname } = useLocation()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  // 手机上侧边栏是抽屉，点完菜单要关掉，否则会挡住页面
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  return navGroups.map((group, i) => (
    <Fragment key={group.label ?? i}>
      {/* 分组之间用分隔线；折叠后分组标题隐藏，靠它仍能看出分组 */}
      {i > 0 ? <SidebarSeparator /> : null}
      <SidebarGroup>
        {/* ⚠️ 折叠时分组标题会上移并透明，但仍会挡住上一组最后一项的悬停和点击，必须关掉鼠标事件 */}
        {group.label ? (
          <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">{group.label}</SidebarGroupLabel>
        ) : null}
        <SidebarMenu>
          {group.items.map((item) =>
            item.children ? (
              collapsed ? (
                <CollapsedParent key={item.title} item={item} items={item.children} pathname={pathname} />
              ) : (
                <ExpandableParent
                  key={item.title}
                  item={item}
                  items={item.children}
                  pathname={pathname}
                  onNavigate={closeOnMobile}
                />
              )
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActivePath(pathname, item.url)} tooltip={item.title} className={activeClass}>
                  <Link to={item.url} onClick={closeOnMobile}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ),
          )}
        </SidebarMenu>
      </SidebarGroup>
    </Fragment>
  ))
}

type ParentProps = { item: NavItem; items: NavLeaf[]; pathname: string }

/** 展开状态的二级菜单：点击父级展开/收起，父级本身不跳转 */
function ExpandableParent({ item, items, pathname, onNavigate }: ParentProps & { onNavigate: () => void }) {
  const childActive = items.some((c) => isActivePath(pathname, c.url))
  const [open, setOpen] = useState(childActive)
  // 路由切换到某个子项时自动展开它的父级（渲染期间调整状态，React 官方推荐写法，不用 useEffect）
  const [prevChildActive, setPrevChildActive] = useState(childActive)
  if (childActive !== prevChildActive) {
    setPrevChildActive(childActive)
    if (childActive) setOpen(true)
  }

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          {/* 收起时如果当前页在里面，父级显示为选中，用户才知道自己在哪 */}
          <SidebarMenuButton isActive={childActive && !open} className={activeClass}>
            <item.icon />
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((child) => (
              <SidebarMenuSubItem key={child.url}>
                <SidebarMenuSubButton asChild isActive={isActivePath(pathname, child.url)} className={activeClass}>
                  <Link to={child.url} onClick={onNavigate}>
                    <span>{child.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

/**
 * 折叠状态的二级菜单：SidebarMenuSub 在折叠时被隐藏，所以改为点击图标向右弹出浮层。
 * ⚠️ 不要给这里的 SidebarMenuButton 传 tooltip：它会在外面包一层 Tooltip，
 *    DropdownMenuTrigger asChild 就套不到真正的按钮上。Tooltip 要像下面这样手动嵌套。
 */
function CollapsedParent({ item, items, pathname }: ParentProps) {
  const childActive = items.some((c) => isActivePath(pathname, c.url))

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton isActive={childActive} aria-label={item.title} className={activeClass}>
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start" className="min-w-40">
          <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map((child) => {
            const active = isActivePath(pathname, child.url)
            return (
              <DropdownMenuItem key={child.url} asChild>
                <Link to={child.url} aria-current={active ? "page" : undefined}>
                  {child.title}
                  {active ? <Check className="ml-auto" /> : null}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
