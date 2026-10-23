import { useState } from "react"
import { Download, PackageSearch, Search, Truck } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, ErrorState, formatDateTime, formatMoney, OrderStatusBadge, orderStatusMeta, PageHeader, Pagination, TableSkeleton } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useOrders, useOrderStatusCounts, useShipOrder } from "@/hooks/queries"
import type { OrderStatus } from "@/mock/data"

const tabs: (OrderStatus | "all")[] = ["all", "pending_payment", "paid", "shipped", "completed", "refunded"]

export default function OrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "all">("all")
  const [keyword, setKeyword] = useState("")
  const [input, setInput] = useState("")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const { data, isPending, isError, refetch, isPlaceholderData } = useOrders({ page, pageSize, keyword, status })
  const { data: counts } = useOrderStatusCounts()
  const ship = useShipOrder()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="订单管理"
        description="查看与处理所有渠道的订单"
        action={
          <Button variant="outline" onClick={() => toast.success("演示：已开始导出，完成后会通知你")}>
            <Download /> 导出
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* 状态页签只在手机上横向滚动。⚠️ 必须同时写 overflow-y-hidden：只写 overflow-x-auto 时浏览器会把纵向也设成 auto，
            页签内容比容器高 1px 就会冒出纵向滚动条（Windows 上带上下箭头）。桌面端放得下，直接关掉滚动 */}
        <div className="no-scrollbar -mx-4 overflow-x-auto overflow-y-hidden px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <Tabs
            value={status}
            onValueChange={(v) => {
              setStatus(v as OrderStatus | "all")
              setPage(0)
            }}
          >
            <TabsList>
              {tabs.map((t) => (
                <TabsTrigger key={t} value={t} className="gap-1.5">
                  {t === "all" ? "全部" : orderStatusMeta[t].label}
                  <span className="text-xs text-muted-foreground tabular-nums">{counts?.[t] ?? 0}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <form
          className="relative w-full lg:w-72"
          onSubmit={(e) => {
            e.preventDefault()
            setKeyword(input)
            setPage(0)
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="订单号、客户、商品，回车搜索" className="pl-8" aria-label="搜索订单" />
        </form>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          <TableSkeleton cols={6} />
        ) : data.rows.length === 0 ? (
          <EmptyState icon={PackageSearch} title="没有找到订单" description="换个状态或关键词试试" />
        ) : (
          <Table className={isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>客户</TableHead>
                <TableHead className="hidden md:table-cell">商品</TableHead>
                <TableHead className="hidden text-right sm:table-cell">数量</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="hidden xl:table-cell">渠道</TableHead>
                <TableHead className="hidden lg:table-cell">下单时间</TableHead>
                <TableHead>
                  <span className="sr-only">操作</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell>{o.customer}</TableCell>
                  <TableCell className="hidden max-w-56 truncate md:table-cell">{o.product}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{o.quantity}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatMoney(o.amount)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground xl:table-cell">{o.channel}</TableCell>
                  <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">{formatDateTime(o.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {o.status === "paid" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={ship.isPending && ship.variables === o.id}
                        onClick={() => ship.mutate(o.id, { onSuccess: () => toast.success(`订单 ${o.id} 已发货`) })}
                      >
                        <Truck /> 发货
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => toast.info(`演示：查看订单 ${o.id}`)}>
                        详情
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {data && data.total > 0 ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={data.total}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(0)
          }}
        />
      ) : null}
    </div>
  )
}
