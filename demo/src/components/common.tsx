import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"

import { IconTile } from "@/components/icon-tile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { OrderStatus, UserStatus } from "@/mock/data"

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

// 状态 → 语义色。完整类名写在表里，不拼接
type Tone = "success" | "warning" | "danger" | "info" | "muted"
const toneClass: Record<Tone, string> = {
  success: "bg-success/10 text-success dark:bg-success/20",
  warning: "bg-warning/15 text-warning dark:bg-warning/20",
  danger: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  info: "bg-primary/10 text-primary dark:bg-primary/20",
  muted: "bg-muted text-muted-foreground",
}
const dotClass: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-primary",
  muted: "bg-muted-foreground",
}

function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <Badge variant="outline" className={`gap-1.5 border-transparent ${toneClass[tone]}`}>
      <span className={`size-1.5 rounded-full ${dotClass[tone]}`} aria-hidden="true" />
      {children}
    </Badge>
  )
}

export const userStatusMeta: Record<UserStatus, { label: string; tone: Tone }> = {
  active: { label: "正常", tone: "success" },
  pending: { label: "待激活", tone: "warning" },
  disabled: { label: "已禁用", tone: "muted" },
}
export const UserStatusBadge = ({ status }: { status: UserStatus }) => (
  <StatusBadge tone={userStatusMeta[status].tone}>{userStatusMeta[status].label}</StatusBadge>
)

export const orderStatusMeta: Record<OrderStatus, { label: string; tone: Tone }> = {
  pending_payment: { label: "待付款", tone: "warning" },
  paid: { label: "待发货", tone: "info" },
  shipped: { label: "已发货", tone: "info" },
  completed: { label: "已完成", tone: "success" },
  refunded: { label: "已退款", tone: "danger" },
  cancelled: { label: "已取消", tone: "muted" },
}
export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <StatusBadge tone={orderStatusMeta[status].tone}>{orderStatusMeta[status].label}</StatusBadge>
)

export const formatMoney = (n: number) => `¥${n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export function formatDateTime(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function EmptyState({ icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <IconTile icon={icon} variant="soft" size="lg" />
      <div>
        <p className="text-base font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm text-destructive">数据加载失败，请检查网络后重试</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw /> 重试
      </Button>
    </div>
  )
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>共 {total} 条</span>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">每页</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger size="sm" className="w-20" aria-label="每页条数">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} 条
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="tabular-nums">
          {page + 1} / {pageCount}
        </span>
        <Button variant="outline" size="icon-sm" aria-label="上一页" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="下一页" disabled={page >= pageCount - 1} onClick={() => onPageChange(page + 1)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
