import type { ComponentType } from "react"
import type { LucideIcon } from "lucide-react"
import { Bell, CreditCard, DatabaseBackup, HardDrive, ShieldCheck, ShoppingCart, Store } from "lucide-react"
import { z } from "zod"

import type { Settings } from "./settings-api"
import { FieldGrid, SelectField, SettingsForm, SwitchField, TextareaField, TextField } from "./settings-form"

export type SectionProps = { onDirtyChange: (dirty: boolean) => void }

/**
 * 设置分类清单。新增分类：写一个 XxxSection 组件，再在这里加一行，导航和地址（?tab=id）自动生效。
 * 第一个分类是默认分类。
 */
export const settingCategories: { id: string; label: string; icon: LucideIcon; Component: ComponentType<SectionProps> }[] = [
  { id: "basic", label: "基本信息", icon: Store, Component: BasicSection },
  { id: "order", label: "订单规则", icon: ShoppingCart, Component: OrderSection },
  { id: "account", label: "账号安全", icon: ShieldCheck, Component: AccountSection },
  { id: "notify", label: "消息通知", icon: Bell, Component: NotifySection },
  { id: "payment", label: "支付配置", icon: CreditCard, Component: PaymentSection },
  { id: "storage", label: "文件存储", icon: HardDrive, Component: StorageSection },
  { id: "backup", label: "数据备份", icon: DatabaseBackup, Component: BackupSection },
]

const int = (min: number, max: number, unit: string) =>
  z.number({ error: "请输入数字" }).int("请输入整数").min(min, `不少于 ${min}${unit}`).max(max, `不超过 ${max}${unit}`)

// ---------- 基本信息 ----------
const basicSchema = z.object({
  siteName: z.string().trim().min(2, "名称至少 2 个字").max(30, "名称不超过 30 个字"),
  supportEmail: z.email("邮箱格式不正确"),
  announcement: z.string().max(200, "公告不超过 200 字"),
})
const pickBasic = (s: Settings) => ({ siteName: s.siteName, supportEmail: s.supportEmail, announcement: s.announcement })

function BasicSection({ onDirtyChange }: SectionProps) {
  return (
    <SettingsForm title="基本信息" description="显示在登录页、邮件和所有管理员的仪表盘上" schema={basicSchema} pick={pickBasic} onDirtyChange={onDirtyChange}>
      {(form) => (
        <FieldGrid>
          <TextField form={form} name="siteName" label="站点名称" />
          <TextField form={form} name="supportEmail" label="客服邮箱" type="email" />
          <TextareaField form={form} name="announcement" label="后台公告" description="显示在所有管理员的仪表盘顶部，留空则不显示" />
        </FieldGrid>
      )}
    </SettingsForm>
  )
}

// ---------- 订单规则 ----------
const orderSchema = z.object({ orderAutoCloseMinutes: int(5, 1440, " 分钟"), autoConfirmDays: int(1, 30, " 天"), allowCancelAfterPaid: z.boolean() })
const pickOrder = (s: Settings) => ({ orderAutoCloseMinutes: s.orderAutoCloseMinutes, autoConfirmDays: s.autoConfirmDays, allowCancelAfterPaid: s.allowCancelAfterPaid })

function OrderSection({ onDirtyChange }: SectionProps) {
  return (
    <SettingsForm title="订单规则" description="下单、付款、收货各环节的自动处理规则" schema={orderSchema} pick={pickOrder} onDirtyChange={onDirtyChange}>
      {(form) => (
        <FieldGrid>
          <TextField form={form} name="orderAutoCloseMinutes" label="未付款订单自动关闭（分钟）" number />
          <TextField form={form} name="autoConfirmDays" label="发货后自动确认收货（天）" number />
          <SwitchField form={form} name="allowCancelAfterPaid" label="付款后允许用户取消" description="发货前可申请取消，需客服审核" />
        </FieldGrid>
      )}
    </SettingsForm>
  )
}

// ---------- 账号安全 ----------
const accountSchema = z.object({ allowRegister: z.boolean(), passwordMinLength: int(6, 32, " 位"), loginLockAttempts: int(3, 20, " 次"), sessionTimeoutMinutes: int(10, 1440, " 分钟") })
const pickAccount = (s: Settings) => ({ allowRegister: s.allowRegister, passwordMinLength: s.passwordMinLength, loginLockAttempts: s.loginLockAttempts, sessionTimeoutMinutes: s.sessionTimeoutMinutes })

function AccountSection({ onDirtyChange }: SectionProps) {
  return (
    <SettingsForm title="账号安全" description="注册、密码与登录相关的安全策略" schema={accountSchema} pick={pickAccount} onDirtyChange={onDirtyChange}>
      {(form) => (
        <FieldGrid>
          <TextField form={form} name="passwordMinLength" label="密码最少位数" number />
          <TextField form={form} name="loginLockAttempts" label="连续登录失败锁定（次）" number description="达到次数后锁定 30 分钟" />
          <TextField form={form} name="sessionTimeoutMinutes" label="无操作自动退出（分钟）" number />
          <SwitchField form={form} name="allowRegister" label="开放用户自助注册" description="关闭后只能由管理员创建账号" />
        </FieldGrid>
      )}
    </SettingsForm>
  )
}

// ---------- 消息通知 ----------
const notifySchema = z.object({ emailNotify: z.boolean(), smsShipNotify: z.boolean(), dailyReport: z.boolean() })
const pickNotify = (s: Settings) => ({ emailNotify: s.emailNotify, smsShipNotify: s.smsShipNotify, dailyReport: s.dailyReport })

function NotifySection({ onDirtyChange }: SectionProps) {
  return (
    <SettingsForm title="消息通知" description="哪些事件需要通知谁" schema={notifySchema} pick={pickNotify} onDirtyChange={onDirtyChange}>
      {(form) => (
        <FieldGrid>
          <SwitchField form={form} name="emailNotify" label="新订单邮件提醒" description="有新订单时发送邮件到客服邮箱" />
          <SwitchField form={form} name="smsShipNotify" label="发货短信通知" description="订单发货后给买家发送短信" />
          <SwitchField form={form} name="dailyReport" label="每日经营日报" description="每天 9 点把前一天的数据发给管理员" />
        </FieldGrid>
      )}
    </SettingsForm>
  )
}

// ---------- 支付配置 ----------
const paymentSchema = z.object({ wechatPayEnabled: z.boolean(), alipayEnabled: z.boolean(), merchantId: z.string().regex(/^\d{10}$/, "商户号为 10 位数字") })
const pickPayment = (s: Settings) => ({ wechatPayEnabled: s.wechatPayEnabled, alipayEnabled: s.alipayEnabled, merchantId: s.merchantId })

function PaymentSection({ onDirtyChange }: SectionProps) {
  return (
    <SettingsForm title="支付配置" description="可用的支付方式与商户信息" schema={paymentSchema} pick={pickPayment} onDirtyChange={onDirtyChange}>
      {(form) => (
        <FieldGrid>
          <TextField form={form} name="merchantId" label="微信支付商户号" />
          <SwitchField form={form} name="wechatPayEnabled" label="启用微信支付" />
          <SwitchField form={form} name="alipayEnabled" label="启用支付宝" />
        </FieldGrid>
      )}
    </SettingsForm>
  )
}

// ---------- 文件存储 ----------
const storageSchema = z.object({
  storageProvider: z.enum(["local", "aliyun-oss", "tencent-cos"]),
  maxUploadMB: int(1, 500, " MB"),
  allowedFileTypes: z.string().trim().regex(/^[a-z0-9]+(,[a-z0-9]+)*$/, "用英文逗号分隔，如 jpg,png,pdf"),
})
const pickStorage = (s: Settings) => ({ storageProvider: s.storageProvider, maxUploadMB: s.maxUploadMB, allowedFileTypes: s.allowedFileTypes })

function StorageSection({ onDirtyChange }: SectionProps) {
  return (
    <SettingsForm title="文件存储" description="上传文件存放在哪里、允许上传什么" schema={storageSchema} pick={pickStorage} onDirtyChange={onDirtyChange}>
      {(form) => (
        <FieldGrid>
          <SelectField
            form={form}
            name="storageProvider"
            label="存储位置"
            options={[
              { value: "local", label: "本地服务器" },
              { value: "aliyun-oss", label: "阿里云 OSS" },
              { value: "tencent-cos", label: "腾讯云 COS" },
            ]}
          />
          <TextField form={form} name="maxUploadMB" label="单个文件上限（MB）" number />
          <TextField form={form} name="allowedFileTypes" label="允许的文件类型" description="英文逗号分隔" />
        </FieldGrid>
      )}
    </SettingsForm>
  )
}

// ---------- 数据备份 ----------
const backupSchema = z.object({ autoBackup: z.boolean(), backupHour: int(0, 23, " 点"), backupRetentionDays: int(1, 365, " 天") })
const pickBackup = (s: Settings) => ({ autoBackup: s.autoBackup, backupHour: s.backupHour, backupRetentionDays: s.backupRetentionDays })

function BackupSection({ onDirtyChange }: SectionProps) {
  return (
    <SettingsForm title="数据备份" description="数据库自动备份策略" schema={backupSchema} pick={pickBackup} onDirtyChange={onDirtyChange}>
      {(form) => (
        <FieldGrid>
          <TextField form={form} name="backupHour" label="每天几点备份（0–23）" number />
          <TextField form={form} name="backupRetentionDays" label="备份保留天数" number />
          <SwitchField form={form} name="autoBackup" label="开启自动备份" />
        </FieldGrid>
      )}
    </SettingsForm>
  )
}
