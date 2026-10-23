// 演示用的本地假数据：固定随机种子，每次刷新内容一致

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}
const rand = seeded(20261023)
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
const between = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1))

const surnames = ["张", "王", "李", "赵", "刘", "陈", "杨", "黄", "周", "吴", "徐", "孙", "马", "朱", "胡", "郭", "何", "林", "罗", "高"]
const givenNames = ["伟", "芳", "娜", "敏", "静", "磊", "洋", "艳", "勇", "杰", "娟", "涛", "明", "超", "秀英", "霞", "平", "刚", "桂英", "晓东", "雨萱", "子涵", "浩然", "思远"]
const pinyin: Record<string, string> = { 张: "zhang", 王: "wang", 李: "li", 赵: "zhao", 刘: "liu", 陈: "chen", 杨: "yang", 黄: "huang", 周: "zhou", 吴: "wu", 徐: "xu", 孙: "sun", 马: "ma", 朱: "zhu", 胡: "hu", 郭: "guo", 何: "he", 林: "lin", 罗: "luo", 高: "gao" }

export type Role = { id: string; name: string; description: string; permissions: string[]; builtIn: boolean }

export const permissionGroups = [
  { key: "dashboard", label: "仪表盘", items: [{ key: "dashboard:view", label: "查看仪表盘" }] },
  {
    key: "user",
    label: "用户管理",
    items: [
      { key: "user:view", label: "查看用户" },
      { key: "user:edit", label: "新增与编辑用户" },
      { key: "user:delete", label: "删除用户" },
      { key: "role:edit", label: "管理角色权限" },
    ],
  },
  {
    key: "order",
    label: "订单管理",
    items: [
      { key: "order:view", label: "查看订单" },
      { key: "order:ship", label: "发货" },
      { key: "order:refund", label: "退款" },
      { key: "order:export", label: "导出订单" },
    ],
  },
  { key: "system", label: "系统设置", items: [{ key: "system:edit", label: "修改系统设置" }] },
] as const

const allPermissions = permissionGroups.flatMap((g) => g.items.map((i) => i.key))

export const roles: Role[] = [
  { id: "r1", name: "超级管理员", description: "拥有全部权限，不可删除", permissions: [...allPermissions], builtIn: true },
  { id: "r2", name: "运营", description: "负责用户与订单的日常处理", permissions: ["dashboard:view", "user:view", "user:edit", "order:view", "order:ship", "order:export"], builtIn: false },
  { id: "r3", name: "客服", description: "查看用户与订单，可处理退款", permissions: ["user:view", "order:view", "order:refund"], builtIn: false },
  { id: "r4", name: "财务", description: "查看订单、处理退款与导出", permissions: ["dashboard:view", "order:view", "order:refund", "order:export"], builtIn: false },
  { id: "r5", name: "只读访客", description: "仅可查看，不能做任何修改", permissions: ["dashboard:view", "user:view", "order:view"], builtIn: false },
]

export type UserStatus = "active" | "disabled" | "pending"
export type User = { id: string; name: string; email: string; phone: string; roleId: string; status: UserStatus; createdAt: string; lastLoginAt: string | null }

function dateDaysAgo(days: number, hour = between(8, 22), minute = between(0, 59)) {
  const d = new Date(2026, 9, 23, hour, minute)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export const users: User[] = Array.from({ length: 86 }, (_, i) => {
  const surname = pick(surnames)
  const given = pick(givenNames)
  const status: UserStatus = i % 11 === 3 ? "disabled" : i % 9 === 5 ? "pending" : "active"
  const created = i < 30 ? between(0, 60) : between(61, 420)
  return {
    id: `U${String(10001 + i)}`,
    name: surname + given,
    email: `${pinyin[surname]}.${String(i + 7).padStart(2, "0")}@example.com`,
    phone: `1${pick(["38", "39", "58", "86", "37", "52"])}${String(between(10000000, 99999999))}`,
    roleId: i === 0 ? "r1" : pick(["r2", "r2", "r3", "r3", "r4", "r5"]),
    status,
    createdAt: dateDaysAgo(created),
    lastLoginAt: status === "pending" ? null : dateDaysAgo(between(0, Math.min(created, 30))),
  }
})

export type OrderStatus = "pending_payment" | "paid" | "shipped" | "completed" | "refunded" | "cancelled"
export type Order = { id: string; customer: string; product: string; quantity: number; amount: number; status: OrderStatus; channel: string; createdAt: string }

const products = [
  { name: "无线降噪耳机 Pro", price: 1299 },
  { name: "机械键盘 87 键", price: 459 },
  { name: "4K 显示器 27 英寸", price: 2399 },
  { name: "人体工学办公椅", price: 1680 },
  { name: "便携充电宝 20000mAh", price: 169 },
  { name: "智能手表 S3", price: 899 },
  { name: "Type-C 扩展坞", price: 299 },
  { name: "降噪麦克风", price: 368 },
]
const channels = ["官网", "小程序", "App", "线下门店"]

export const orders: Order[] = Array.from({ length: 300 }, (_, i) => {
  const p = pick(products)
  const qty = rand() < 0.75 ? 1 : between(2, 4)
  // 越靠近今天订单越多（模拟增长），共覆盖约 64 天，保证"上一周期"也有数据可比
  const days = Math.floor(64 * (i / 300) ** 1.15)
  const r = rand()
  // 状态跟着下单时间走：今天的多是待付款/待发货，3 天前的基本已完成
  const status: OrderStatus =
    r < 0.05 ? "cancelled" : r < 0.1 && days > 2 ? "refunded"
    : days === 0 ? (r < 0.45 ? "pending_payment" : "paid")
    : days <= 2 ? (r < 0.6 ? "paid" : "shipped")
    : days <= 5 ? (r < 0.5 ? "shipped" : "completed")
    : "completed"
  const created = new Date(dateDaysAgo(days))
  const ymd = `${created.getFullYear()}${String(created.getMonth() + 1).padStart(2, "0")}${String(created.getDate()).padStart(2, "0")}`
  return {
    id: `SO${ymd}${String(i).padStart(4, "0")}`,
    customer: pick(surnames) + pick(givenNames),
    product: p.name,
    quantity: qty,
    amount: p.price * qty,
    status,
    channel: pick(channels),
    createdAt: created.toISOString(),
  }
})

export type Settings = { siteName: string; supportEmail: string; orderAutoCloseMinutes: number; allowRegister: boolean; emailNotify: boolean; announcement: string }
export const settings: Settings = {
  siteName: "Nova 运营后台",
  supportEmail: "support@example.com",
  orderAutoCloseMinutes: 30,
  allowRegister: false,
  emailNotify: true,
  announcement: "双十一大促将于 11 月 1 日 0 点开始，请提前确认库存与物流。",
}
