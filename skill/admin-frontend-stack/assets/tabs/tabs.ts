import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

/** 一个页签 = 一个页面（按 pathname 去重）；path 带查询参数，切回来时筛选条件还在 */
export type Tab = { key: string; path: string; refreshKey: number }

/** 固定页签：不能关闭，永远在最左 */
export const PINNED_KEY = "/"
/** 页签上限：超过后自动关掉最左边的可关闭页签（当前页签除外） */
const MAX_TABS = 10

type TabsState = {
  tabs: Tab[]
  /** 路由变化时调用：没有就新增，有就更新地址 */
  open: (key: string, path: string) => void
  /** 以下关闭操作都返回"关闭后应跳转的地址"；当前页签没被关掉时返回 null */
  close: (key: string, activeKey: string) => string | null
  closeLeft: (key: string, activeKey: string) => string | null
  closeRight: (key: string, activeKey: string) => string | null
  closeOthers: (key: string, activeKey: string) => string | null
  closeAll: (activeKey: string) => string | null
  refresh: (key: string) => void
  /** 退出登录时清空，只留固定页签 */
  reset: () => void
}

const pinned: Tab = { key: PINNED_KEY, path: PINNED_KEY, refreshKey: 0 }
const closable = (t: Tab) => t.key !== PINNED_KEY

/**
 * 用新列表替换旧列表。若当前页签被关掉：
 * - 指定了 focusKey（右键的那个页签）且它还在 → 跳到它（与浏览器、VS Code 一致）
 * - 否则跳到原位置右边的页签，没有就左边
 */
function apply(set: (s: Partial<TabsState>) => void, prev: Tab[], next: Tab[], activeKey: string, focusKey?: string) {
  set({ tabs: next })
  if (next.some((t) => t.key === activeKey)) return null
  const focus = focusKey ? next.find((t) => t.key === focusKey) : undefined
  if (focus) return focus.path
  const i = prev.findIndex((t) => t.key === activeKey)
  const survivor = prev.slice(i + 1).find((t) => next.includes(t)) ?? [...prev.slice(0, i)].reverse().find((t) => next.includes(t))
  return (survivor ?? next[0]).path
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [pinned],
      open: (key, path) =>
        set(({ tabs }) => {
          const existing = tabs.find((t) => t.key === key)
          if (existing) return existing.path === path ? {} : { tabs: tabs.map((t) => (t.key === key ? { ...t, path } : t)) }
          let next = [...tabs, { key, path, refreshKey: 0 }]
          while (next.length > MAX_TABS) {
            const victim = next.find((t) => closable(t) && t.key !== key)
            if (!victim) break
            next = next.filter((t) => t !== victim)
          }
          return { tabs: next }
        }),
      close: (key, activeKey) => {
        const prev = get().tabs
        if (key === PINNED_KEY) return null
        return apply(set, prev, prev.filter((t) => t.key !== key), activeKey)
      },
      closeLeft: (key, activeKey) => {
        const prev = get().tabs
        const i = prev.findIndex((t) => t.key === key)
        return apply(set, prev, prev.filter((t, j) => j >= i || !closable(t)), activeKey, key)
      },
      closeRight: (key, activeKey) => {
        const prev = get().tabs
        const i = prev.findIndex((t) => t.key === key)
        return apply(set, prev, prev.filter((t, j) => j <= i || !closable(t)), activeKey, key)
      },
      closeOthers: (key, activeKey) => {
        const prev = get().tabs
        return apply(set, prev, prev.filter((t) => t.key === key || !closable(t)), activeKey, key)
      },
      closeAll: (activeKey) => {
        const prev = get().tabs
        return apply(set, prev, prev.filter((t) => !closable(t)), activeKey)
      },
      reset: () => set({ tabs: [pinned] }),
      refresh: (key) => set(({ tabs }) => ({ tabs: tabs.map((t) => (t.key === key ? { ...t, refreshKey: t.refreshKey + 1 } : t)) })),
    }),
    // sessionStorage：刷新浏览器后页签还在；新开浏览器窗口从干净状态开始
    { name: "tabs", storage: createJSONStorage(() => sessionStorage) },
  ),
)

/** 某个页签"左侧/右侧/其他"还有没有可关闭的，用来禁用菜单项 */
export function closableCounts(tabs: Tab[], key: string) {
  const i = tabs.findIndex((t) => t.key === key)
  return {
    left: tabs.slice(0, Math.max(i, 0)).filter(closable).length,
    right: tabs.slice(i + 1).filter(closable).length,
    others: tabs.filter((t) => t.key !== key && closable(t)).length,
    all: tabs.filter(closable).length,
  }
}
