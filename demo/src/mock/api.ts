// 模拟接口：带网络延迟，分页、筛选、排序都在"服务端"完成，和真实接口的形态一致
import { orders, roles, settings, users, type Order, type OrderStatus, type Role, type Settings, type User, type UserStatus } from "./data"

const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms + Math.random() * 250))

export type Page<T> = { rows: T[]; total: number }
export type SortParam = { id: string; desc: boolean } | undefined

function sortRows<T>(rows: T[], sort: SortParam) {
  if (!sort) return rows
  const key = sort.id as keyof T
  return [...rows].sort((a, b) => {
    const r = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0
    return sort.desc ? -r : r
  })
}

export type UserQuery = { page: number; pageSize: number; keyword: string; status: UserStatus | "all"; roleId: string; sort?: SortParam }

export async function fetchUsers(q: UserQuery): Promise<Page<User>> {
  await delay()
  const kw = q.keyword.trim().toLowerCase()
  const filtered = users.filter(
    (u) =>
      (!kw || u.name.includes(kw) || u.email.toLowerCase().includes(kw) || u.phone.includes(kw)) &&
      (q.status === "all" || u.status === q.status) &&
      (q.roleId === "all" || u.roleId === q.roleId),
  )
  const sorted = sortRows(filtered, q.sort ?? { id: "createdAt", desc: true })
  return { rows: sorted.slice(q.page * q.pageSize, (q.page + 1) * q.pageSize), total: filtered.length }
}

export async function deleteUsers(ids: string[]) {
  await delay(300)
  for (const id of ids) {
    const i = users.findIndex((u) => u.id === id)
    if (i >= 0) users.splice(i, 1)
  }
}

export async function setUsersStatus(ids: string[], status: UserStatus) {
  await delay(300)
  for (const u of users) if (ids.includes(u.id)) u.status = status
}

export async function fetchRoles(): Promise<(Role & { userCount: number })[]> {
  await delay()
  return roles.map((r) => ({ ...r, userCount: users.filter((u) => u.roleId === r.id).length }))
}

export async function updateRolePermissions(id: string, permissions: string[]) {
  await delay(350)
  const role = roles.find((r) => r.id === id)
  if (role) role.permissions = [...permissions]
}

export type OrderQuery = { page: number; pageSize: number; keyword: string; status: OrderStatus | "all"; sort?: SortParam }

export async function fetchOrders(q: OrderQuery): Promise<Page<Order>> {
  await delay()
  const kw = q.keyword.trim()
  const filtered = orders.filter((o) => (!kw || o.id.includes(kw) || o.customer.includes(kw) || o.product.includes(kw)) && (q.status === "all" || o.status === q.status))
  const sorted = sortRows(filtered, q.sort ?? { id: "createdAt", desc: true })
  return { rows: sorted.slice(q.page * q.pageSize, (q.page + 1) * q.pageSize), total: filtered.length }
}

export async function fetchOrderStatusCounts(): Promise<Record<OrderStatus | "all", number>> {
  await delay(200)
  const counts = { all: orders.length } as Record<OrderStatus | "all", number>
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1
  return counts
}

export async function shipOrder(id: string) {
  await delay(300)
  const o = orders.find((x) => x.id === id)
  if (o) o.status = "shipped"
}

export type DashboardStats = {
  revenue: number
  revenueChange: number
  orderCount: number
  orderChange: number
  newUsers: number
  newUserChange: number
  pendingShip: number
  trend: { date: string; revenue: number; orders: number }[]
  byChannel: { channel: string; amount: number }[]
  recentOrders: Order[]
}

export async function fetchDashboard(days: 7 | 30): Promise<DashboardStats> {
  await delay(600)
  const inRange = (o: Order, from: number, to: number) => {
    const d = (new Date(2026, 9, 23, 23, 59).getTime() - new Date(o.createdAt).getTime()) / 86400000
    return d >= from && d < to
  }
  const paidLike = (o: Order) => o.status !== "cancelled" && o.status !== "pending_payment"
  const cur = orders.filter((o) => inRange(o, 0, days))
  const prev = orders.filter((o) => inRange(o, days, days * 2))
  const sum = (list: Order[]) => list.filter(paidLike).reduce((s, o) => s + o.amount, 0)
  const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round(((a - b) / b) * 1000) / 10)

  const trend = Array.from({ length: days }, (_, i) => {
    const day = days - 1 - i
    const list = cur.filter((o) => inRange(o, day, day + 1))
    const d = new Date(2026, 9, 23 - day)
    return { date: `${d.getMonth() + 1}/${d.getDate()}`, revenue: sum(list), orders: list.length }
  })
  const byChannel = ["官网", "小程序", "App", "线下门店"].map((channel) => ({ channel, amount: sum(cur.filter((o) => o.channel === channel)) }))
  const userAge = (u: (typeof users)[number]) => (new Date(2026, 9, 23, 23, 59).getTime() - new Date(u.createdAt).getTime()) / 86400000
  const newUsersNow = users.filter((u) => userAge(u) < days).length
  const newUsersPrev = users.filter((u) => userAge(u) >= days && userAge(u) < days * 2).length

  return {
    revenue: sum(cur),
    revenueChange: pct(sum(cur), sum(prev)),
    orderCount: cur.length,
    orderChange: pct(cur.length, prev.length),
    newUsers: newUsersNow,
    newUserChange: pct(newUsersNow, newUsersPrev),
    pendingShip: orders.filter((o) => o.status === "paid").length,
    trend,
    byChannel,
    recentOrders: [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
  }
}

export async function fetchSettings(): Promise<Settings> {
  await delay()
  return { ...settings }
}

export async function saveSettings(next: Settings) {
  await delay(500)
  Object.assign(settings, next)
}
