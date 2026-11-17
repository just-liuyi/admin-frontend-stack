/**
 * 系统设置的数据：类型、读取 / 保存接口、查询 hooks。
 * ⚠️ fetchSettings / saveSettings 是演示用的假实现（数据存在内存里，刷新即恢复默认）。
 * 接入真实后端时只替换这两个函数的内部，保持函数名、参数和返回值不变，页面就不用改。
 * 新增设置项：在 Settings 类型和 defaults 里加字段，再到 sections.tsx 的对应分类里加输入框。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type StorageProvider = "local" | "aliyun-oss" | "tencent-cos"

export type Settings = {
  // 基本信息
  siteName: string
  supportEmail: string
  announcement: string
  // 订单规则
  orderAutoCloseMinutes: number
  autoConfirmDays: number
  allowCancelAfterPaid: boolean
  // 账号安全
  allowRegister: boolean
  passwordMinLength: number
  loginLockAttempts: number
  sessionTimeoutMinutes: number
  // 消息通知
  emailNotify: boolean
  smsShipNotify: boolean
  dailyReport: boolean
  // 支付配置
  wechatPayEnabled: boolean
  alipayEnabled: boolean
  merchantId: string
  // 文件存储
  storageProvider: StorageProvider
  maxUploadMB: number
  allowedFileTypes: string
  // 数据备份
  autoBackup: boolean
  backupHour: number
  backupRetentionDays: number
}

let store: Settings = {
  siteName: "Nova 运营后台",
  supportEmail: "support@example.com",
  announcement: "双十一大促将于 11 月 1 日 0 点开始，请提前确认库存与物流。",
  orderAutoCloseMinutes: 30,
  autoConfirmDays: 7,
  allowCancelAfterPaid: true,
  allowRegister: false,
  passwordMinLength: 8,
  loginLockAttempts: 5,
  sessionTimeoutMinutes: 120,
  emailNotify: true,
  smsShipNotify: true,
  dailyReport: false,
  wechatPayEnabled: true,
  alipayEnabled: true,
  merchantId: "1600012345",
  storageProvider: "aliyun-oss",
  maxUploadMB: 20,
  allowedFileTypes: "jpg,png,pdf,xlsx",
  autoBackup: true,
  backupHour: 3,
  backupRetentionDays: 30,
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchSettings(): Promise<Settings> {
  await delay(400)
  return { ...store }
}

/** 只保存传进来的那部分：每个设置分类单独保存 */
async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await delay(500)
  store = { ...store, ...patch }
}

export const useSettings = () => useQuery({ queryKey: ["settings"], queryFn: fetchSettings })

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: saveSettings, onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }) })
}
