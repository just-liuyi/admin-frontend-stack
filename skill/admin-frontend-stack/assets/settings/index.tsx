import { useState } from "react"
import { useSearchParams } from "react-router"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { settingCategories } from "./sections"

const first = settingCategories[0].id

/**
 * 系统设置页：顶部分类页签 + 当前分类的表单（每个分类单独保存）。
 * 分类清单在 sections.tsx；数据与接口在 settings-api.ts。
 */
export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  // 当前分类放在地址里（?tab=account）：刷新、分享链接、在多页签之间切换后都还在这个分类
  const current = settingCategories.find((c) => c.id === params.get("tab")) ?? settingCategories[0]
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState<string | null>(null)

  const go = (id: string) => {
    setDirty(false)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id === first) next.delete("tab")
        else next.set("tab", id)
        return next
      },
      { replace: true },
    )
  }
  // 有未保存的修改时先确认，避免改了一半切走就丢了
  const select = (id: string) => {
    if (id === current.id) return
    if (dirty) setPending(id)
    else go(id)
  }

  const pendingLabel = settingCategories.find((c) => c.id === pending)?.label

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">系统设置</h1>
        <p className="text-sm text-muted-foreground">按分类管理系统配置，每个分类单独保存</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* 分类多时手机上横向滑动。⚠️ 横向滚动必须同时写 overflow-y-hidden（见 patterns.md） */}
        <div className="no-scrollbar -mx-4 overflow-x-auto overflow-y-hidden px-4 md:mx-0 md:px-0">
          <Tabs value={current.id} onValueChange={select}>
            <TabsList variant="line" className="w-full justify-start gap-6 border-b p-0" aria-label="设置分类">
              {settingCategories.map((c) => (
                <TabsTrigger
                  key={c.id}
                  value={c.id}
                  className="flex-none gap-1.5 px-0 pb-2.5 after:bg-primary data-active:text-primary data-active:hover:text-primary dark:data-active:text-primary dark:data-active:hover:text-primary"
                >
                  <c.icon aria-hidden="true" />
                  {c.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {/* key：切换分类时整个表单重新挂载，不会带着上一个分类的状态 */}
        <current.Component key={current.id} onDirtyChange={setDirty} />
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放弃未保存的修改？</AlertDialogTitle>
            <AlertDialogDescription>
              「{current.label}」里有修改还没保存。切换到「{pendingLabel}」后，这些修改会丢失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => pending && go(pending)}>
              放弃修改
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
