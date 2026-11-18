/**
 * 共享设置 API：类型、模拟存储、读取 / 保存接口和查询 hooks。
 * 登录接口、登录页和设置页共同依赖本模块；本模块不得反向依赖 pages 目录。
 * ⚠️ fetchSettings / saveSettings 是演示用的假实现（数据存在浏览器 localStorage 里，换浏览器或清缓存后恢复默认）。
 * 接入真实后端时只替换这两个函数的内部，保持函数名、参数和返回值不变，页面就不用改。
 * 新增设置项：在 Settings 类型和 DEFAULTS 里加字段，再到 sections.tsx 的对应分类里加输入框。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { CaptchaKind } from "@/api/captcha"

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
  captchaEnabled: boolean
  captchaType: CaptchaKind
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

const DEFAULTS: Settings = {
  siteName: "Nova 运营后台",
  supportEmail: "support@example.com",
  announcement: "双十一大促将于 11 月 1 日 0 点开始，请提前确认库存与物流。",
  orderAutoCloseMinutes: 30,
  autoConfirmDays: 7,
  allowCancelAfterPaid: true,
  captchaEnabled: true,
  captchaType: "slider",
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

const STORAGE_KEY = "mock-settings"

/** 演示用：设置存在 localStorage 里，刷新页面后仍然有效（真实项目由后端保存） */
function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Settings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

let store: Settings = loadSettings()

function persistSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // 隐私模式下写不进去，忽略即可
  }
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
  persistSettings()
}

/** 同步读取当前设置：登录接口用它判断是否需要验证码（演示用；真实项目由后端判断） */
export function getSettingsSnapshot(): Settings {
  return { ...store }
}

export type LoginConfig = { captchaEnabled: boolean; captchaType: CaptchaKind }

/** 登录页需要的公开配置（真实项目应是一个不需要登录就能访问的接口） */
async function fetchLoginConfig(): Promise<LoginConfig> {
  await delay(120)
  return { captchaEnabled: store.captchaEnabled, captchaType: store.captchaType }
}

export const useLoginConfig = () => useQuery({ queryKey: ["login-config"], queryFn: fetchLoginConfig })

export const useSettings = () => useQuery({ queryKey: ["settings"], queryFn: fetchSettings })

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["settings"] })
      // 验证码开关会影响登录页，一起刷新
      void qc.invalidateQueries({ queryKey: ["login-config"] })
    },
  })
}
