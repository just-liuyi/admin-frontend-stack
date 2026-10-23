import { useEffect, useRef, type ComponentType, type ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeftToLine, ArrowRightToLine, ChevronDown, Pin, RotateCw, X, XCircle, Columns2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { findNavTrail } from "@/config/nav"
import { cn } from "@/lib/utils"
import { closableCounts, PINNED_KEY, useTabsStore, type Tab } from "@/stores/tabs"

const titleOf = (key: string) => findNavTrail(key).at(-1) ?? key

/** 多页签栏：放在顶栏下方。打开菜单里的页面自动加页签；右键页签或点右侧 ⌄ 按钮执行关闭操作 */
export function TabBar() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const tabs = useTabsStore((s) => s.tabs)
  const open = useTabsStore((s) => s.open)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 路由变化 → 写入页签（菜单外的地址不进页签）
  useEffect(() => {
    if (findNavTrail(pathname).length > 0) open(pathname, pathname + search)
  }, [pathname, search, open])

  // 当前页签滚动到可见区域
  useEffect(() => {
    scrollRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [pathname, tabs.length])

  const go = (target: string | null) => {
    if (target) navigate(target)
  }

  return (
    <div className="flex h-10 items-center gap-1 border-b bg-background pr-2 pl-4">
      {/* ⚠️ 横向滚动必须同时写 overflow-y-hidden，否则会冒出纵向滚动条（见 patterns.md） */}
      <div ref={scrollRef} className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden" role="list" aria-label="已打开的页面">
        {tabs.map((t) => (
          <TabItem key={t.key} tab={t} active={t.key === pathname} onNavigate={go} />
        ))}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="页签操作">
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <TabActions tabKey={pathname} onNavigate={go} Item={DropdownMenuItem} Separator={DropdownMenuSeparator} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function TabItem({ tab, active, onNavigate }: { tab: Tab; active: boolean; onNavigate: (to: string | null) => void }) {
  const { pathname } = useLocation()
  const close = useTabsStore((s) => s.close)
  const pinned = tab.key === PINNED_KEY
  const title = titleOf(tab.key)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="listitem"
          className={cn(
            "group/tab flex h-7 shrink-0 items-center rounded-md text-sm transition-colors",
            active ? "bg-primary/10 text-primary dark:bg-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          // 鼠标中键关闭
          onAuxClick={(e) => {
            if (e.button === 1 && !pinned) {
              e.preventDefault()
              onNavigate(close(tab.key, pathname))
            }
          }}
        >
          <Link
            to={tab.path}
            aria-current={active ? "page" : undefined}
            className={cn("flex h-full items-center gap-1.5 rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-ring", pinned ? "px-2.5" : "pr-1 pl-2.5")}
          >
            {pinned ? <Pin className="size-3" aria-hidden="true" /> : null}
            {title}
          </Link>
          {pinned ? null : (
            // 不嵌套在 Link 里（交互元素不能互相嵌套）；当前页签常显，其余悬停时显示
            <button
              type="button"
              aria-label={`关闭 ${title}`}
              onClick={() => onNavigate(close(tab.key, pathname))}
              className={cn(
                "mr-1 flex size-5 items-center justify-center rounded-sm outline-hidden hover:bg-foreground/10 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring",
                active ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100",
              )}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <TabActions tabKey={tab.key} onNavigate={onNavigate} Item={ContextMenuItem} Separator={ContextMenuSeparator} />
      </ContextMenuContent>
    </ContextMenu>
  )
}

type ItemComp = (props: { onSelect?: (e: Event) => void; disabled?: boolean; variant?: "default" | "destructive"; children: ReactNode }) => ReactNode

/** 右键菜单和 ⌄ 按钮共用同一组操作；tabKey 是被操作的页签 */
function TabActions({ tabKey, onNavigate, Item, Separator }: { tabKey: string; onNavigate: (to: string | null) => void; Item: ItemComp; Separator: ComponentType }) {
  const { pathname } = useLocation()
  const qc = useQueryClient()
  const tabs = useTabsStore((s) => s.tabs)
  const s = useTabsStore.getState()
  const n = closableCounts(tabs, tabKey)
  const isPinned = tabKey === PINNED_KEY

  return (
    <>
      <Item
        onSelect={() => {
          s.refresh(tabKey)
          // 重新挂载后再让该页数据重新请求
          qc.invalidateQueries({ type: "active" })
          if (tabKey !== pathname) onNavigate(tabs.find((t) => t.key === tabKey)?.path ?? null)
        }}
      >
        <RotateCw /> 刷新
      </Item>
      <Separator />
      <Item disabled={isPinned} onSelect={() => onNavigate(s.close(tabKey, pathname))}>
        <X /> 关闭
      </Item>
      <Item disabled={n.left === 0} onSelect={() => onNavigate(s.closeLeft(tabKey, pathname))}>
        <ArrowLeftToLine /> 关闭左侧
      </Item>
      <Item disabled={n.right === 0} onSelect={() => onNavigate(s.closeRight(tabKey, pathname))}>
        <ArrowRightToLine /> 关闭右侧
      </Item>
      <Item disabled={n.others === 0} onSelect={() => onNavigate(s.closeOthers(tabKey, pathname))}>
        <Columns2 /> 关闭其他
      </Item>
      <Separator />
      <Item variant="destructive" disabled={n.all === 0} onSelect={() => onNavigate(s.closeAll(pathname))}>
        <XCircle /> 关闭全部
      </Item>
    </>
  )
}
