import { useState } from "react"
import { Link } from "react-router"
import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight, PackageCheck, ShoppingCart, UserPlus, Wallet } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ErrorState, formatDateTime, formatMoney, OrderStatusBadge, PageHeader } from "@/components/common"
import { IconTile } from "@/components/icon-tile"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDashboard } from "@/hooks/queries"

const trendConfig = { revenue: { label: "销售额", color: "var(--chart-1)" } } satisfies ChartConfig
const channelConfig = { amount: { label: "销售额", color: "var(--chart-1)" } } satisfies ChartConfig

export default function DashboardPage() {
  const [days, setDays] = useState<7 | 30>(30)
  const { data, isPending, isError, refetch } = useDashboard(days)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="仪表盘"
        description="经营数据概览，数据截至今日 23:59"
        action={
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as 7 | 30)}>
            <TabsList>
              <TabsTrigger value="7">近 7 天</TabsTrigger>
              <TabsTrigger value="30">近 30 天</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {isError ? (
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Wallet} title="销售额" value={data ? formatMoney(data.revenue) : undefined} change={data?.revenueChange} />
            <StatCard icon={ShoppingCart} title="订单数" value={data?.orderCount.toLocaleString()} change={data?.orderChange} />
            <StatCard icon={UserPlus} title="新增用户" value={data?.newUsers.toLocaleString()} change={data?.newUserChange} />
            <StatCard icon={PackageCheck} title="待发货" value={data?.pendingShip.toLocaleString()} hint="需要尽快处理" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>销售趋势</CardTitle>
                <CardDescription>每日销售额（元），不含待付款与已取消订单</CardDescription>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ChartContainer config={trendConfig} className="h-64 w-full">
                    <AreaChart data={data.trend} margin={{ left: 4, right: 8 }}>
                      <defs>
                        <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                      <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => (v >= 10000 ? `${v / 10000}万` : String(v))} />
                      <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                      <Area dataKey="revenue" type="monotone" fill="url(#fillRevenue)" stroke="var(--color-revenue)" strokeWidth={2} />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>渠道分布</CardTitle>
                <CardDescription>各渠道销售额（元）</CardDescription>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ChartContainer config={channelConfig} className="h-64 w-full">
                    <BarChart data={data.byChannel} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="channel" tickLine={false} axisLine={false} width={64} />
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="amount" fill="var(--color-amount)" fillOpacity={0.85} radius={4} barSize={22} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>最近订单</CardTitle>
              <CardAction>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/orders">查看全部</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead className="hidden md:table-cell">商品</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">下单时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending
                    ? Array.from({ length: 6 }, (_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    : data.recentOrders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">{o.id}</TableCell>
                          <TableCell>{o.customer}</TableCell>
                          <TableCell className="hidden max-w-48 truncate md:table-cell">{o.product}</TableCell>
                          <TableCell>
                            <OrderStatusBadge status={o.status} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(o.amount)}</TableCell>
                          <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">{formatDateTime(o.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({ icon, title, value, change, hint }: { icon: LucideIcon; title: string; value?: string; change?: number; hint?: string }) {
  const up = (change ?? 0) >= 0
  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        <IconTile icon={icon} variant="soft" size="md" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-muted-foreground">{title}</span>
          {value === undefined ? <Skeleton className="h-7 w-28" /> : <span className="text-2xl font-semibold tabular-nums">{value}</span>}
          {change !== undefined ? (
            <span className={`inline-flex items-center gap-0.5 text-xs ${up ? "text-success" : "text-destructive"}`}>
              {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(change)}% <span className="text-muted-foreground">较上一周期</span>
            </span>
          ) : hint ? (
            <span className="text-xs text-muted-foreground">{hint}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
