import { useEffect, useState, type ComponentProps } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Box, Eye, EyeOff, Loader2, Lock, MessageSquareText, Smartphone, User } from "lucide-react"
import { toast } from "sonner"

import { LoginMascots, type Mood } from "@/components/login-mascots"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginError, loginWithPassword, loginWithSms, sendSmsCode } from "@/api/auth"
import { useAuthStore, type CurrentUser } from "@/stores/auth"
import { useTabsStore } from "@/stores/tabs"
import { cn } from "@/lib/utils"

const APP_NAME = "Nova 运营后台"

type Focus = "username" | "password" | "phone" | "code" | null

/**
 * 登录方式页签的样式。⚠️ shadcn 默认的焦点样式是一圈灰框（ring + outline），鼠标点击后也会出现，
 * 在下划线页签上像个被截断的气泡。这里去掉灰框，改为聚焦时下划线从 2px 加粗到 4px：键盘用户能看出焦点，又不改变布局。
 * 另外 shadcn 的 hover:text-foreground 会盖掉选中色（点完鼠标还停在上面时变黑），所以选中时悬停也保持主色。
 */
const tabTriggerClass =
  "flex-none px-0 pb-2.5 text-base after:bg-primary data-active:text-primary data-active:hover:text-primary dark:data-active:text-primary in-data-[input=keyboard]:focus-visible:border-transparent in-data-[input=keyboard]:focus-visible:ring-0 in-data-[input=keyboard]:focus-visible:outline-none focus-visible:after:h-1"

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const resetTabs = useTabsStore((s) => s.reset)

  // 小人的情绪由表单状态推出来
  const [focus, setFocus] = useState<Focus>(null)
  const [passwordFilled, setPasswordFilled] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [failed, setFailed] = useState(false)
  const [shake, setShake] = useState(0)
  const mood: Mood = failed
    ? "error"
    : showPassword && passwordFilled
      ? "avert"
      : focus === "password"
        ? passwordFilled
          ? "peek"
          : "watch"
        : focus
          ? "watch"
          : "idle"

  function onFail() {
    setFailed(true)
    setShake((n) => n + 1)
    window.setTimeout(() => setFailed(false), 1400)
  }

  function onSuccess(user: CurrentUser) {
    login(user)
    resetTabs()
    toast.success(`欢迎回来，${user.name}`)
    // 不在这里跳转：登录态一变，App.tsx 会按 redirect 参数跳走（只允许站内地址）
  }

  const focusProps = (name: Exclude<Focus, null>) => ({ onFocus: () => setFocus(name), onBlurCapture: () => setFocus(null) })

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* 左侧：品牌 + 互动插画，只在大屏显示 */}
      <aside className="relative hidden flex-col overflow-hidden bg-linear-to-br from-primary/15 via-primary/8 to-primary/4 lg:flex">
        <Decor />
        <Brand className="relative z-10 p-10" />
        <div className="relative z-10 flex flex-1 items-end justify-center pb-24">
          <div className="origin-bottom scale-75 xl:scale-90 2xl:scale-100">
            <LoginMascots mood={mood} shake={shake} />
          </div>
        </div>
        <p className="relative z-10 pb-6 text-center text-xs text-primary/60">
          {APP_NAME} © {new Date().getFullYear()}
        </p>
      </aside>

      {/* 右侧：表单。手机上是居中的卡片 */}
      <main className="flex items-center justify-center bg-linear-to-b from-primary/8 to-background p-6 lg:bg-none">
        <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-xl ring-1 ring-border lg:max-w-md lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0">
          <Brand className="mb-8 lg:hidden" />
          <h1 className="text-3xl font-bold tracking-tight">欢迎回来</h1>
          <p className="mt-1 text-sm text-muted-foreground">请输入您的账号信息以登录系统</p>

          <Tabs defaultValue="password" className="mt-8 gap-6" onValueChange={() => setShowPassword(false)}>
            <TabsList variant="line" className="w-full justify-start border-b p-0">
              <TabsTrigger value="password" className={tabTriggerClass}>
                账号密码登录
              </TabsTrigger>
              <TabsTrigger value="sms" className={cn(tabTriggerClass, "ml-6")}>
                手机验证码登录
              </TabsTrigger>
            </TabsList>
            {/* 两个表单叠放在同一格（forceMount + 隐藏非当前的），区域高度固定为较高的那个，切换时整块不会上下跳 */}
            <div className="grid">
              <TabsContent value="password" forceMount className="col-start-1 row-start-1 data-[state=inactive]:invisible">
                <PasswordForm
                  focusProps={focusProps}
                  showPassword={showPassword}
                  onToggleShow={() => setShowPassword((v) => !v)}
                  onPasswordChange={(v) => setPasswordFilled(v.length > 0)}
                  onFail={onFail}
                  onSuccess={onSuccess}
                />
              </TabsContent>
              <TabsContent value="sms" forceMount className="col-start-1 row-start-1 data-[state=inactive]:invisible">
                <SmsForm focusProps={focusProps} onFail={onFail} onSuccess={onSuccess} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
        <Box className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold">{APP_NAME}</span>
    </div>
  )
}

/** 背景里缓慢漂浮的圆 */
function Decor() {
  return (
    <div aria-hidden="true">
      <span className="absolute -top-24 right-0 size-80 rounded-full bg-primary/10 animate-float-slow motion-reduce:animate-none" />
      <span className="absolute top-1/3 right-16 size-36 rounded-full bg-primary/8 animate-float-slow motion-reduce:animate-none" style={{ animationDelay: "-3s" }} />
      <span className="absolute -bottom-16 -left-16 size-56 rounded-full bg-primary/10 animate-float-slow motion-reduce:animate-none" style={{ animationDelay: "-6s" }} />
    </div>
  )
}

type FormCommon = {
  focusProps: (name: Exclude<Focus, null>) => { onFocus: () => void; onBlurCapture: () => void }
  onFail: () => void
  onSuccess: (user: CurrentUser) => void
}

const Required = () => (
  <span className="text-destructive" aria-hidden="true">
    *
  </span>
)

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}

/** 输入框左侧带图标 */
function IconInput({ icon: Icon, className, ...props }: ComponentProps<typeof Input> & { icon: typeof User }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input className={cn("h-10 pl-9", className)} {...props} />
    </div>
  )
}

const passwordSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
})

function PasswordForm({
  focusProps,
  showPassword,
  onToggleShow,
  onPasswordChange,
  onFail,
  onSuccess,
}: FormCommon & { showPassword: boolean; onToggleShow: () => void; onPasswordChange: (v: string) => void }) {
  const { register, handleSubmit, control, formState } = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { username: "", password: "" } })
  const [error, setError] = useState<string | null>(null)
  const password = useWatch({ control, name: "password" })
  useEffect(() => onPasswordChange(password), [password, onPasswordChange])

  const submit = handleSubmit(async (v) => {
    setError(null)
    try {
      onSuccess(await loginWithPassword(v.username, v.password))
    } catch (e) {
      setError(e instanceof LoginError ? e.message : "登录失败，请稍后再试")
      onFail()
    }
  })

  return (
    // noValidate：不用浏览器自带的校验气泡，统一显示中文错误
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <FormError message={error} />
      <Field data-invalid={!!formState.errors.username}>
        <FieldLabel htmlFor="username">
          <Required /> 用户名
        </FieldLabel>
        <IconInput id="username" icon={User} autoComplete="username" placeholder="请输入用户名" aria-invalid={!!formState.errors.username} {...register("username")} {...focusProps("username")} />
        <FieldError errors={[formState.errors.username]} />
      </Field>
      <Field data-invalid={!!formState.errors.password}>
        <FieldLabel htmlFor="password">
          <Required /> 密码
        </FieldLabel>
        <div className="relative">
          <IconInput
            id="password"
            icon={Lock}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="请输入密码"
            className="pr-10"
            aria-invalid={!!formState.errors.password}
            {...register("password")}
            {...focusProps("password")}
          />
          <button
            type="button"
            // 按下时不抢走输入框的焦点
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggleShow}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-hidden hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showPassword ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </button>
        </div>
        <FieldError errors={[formState.errors.password]} />
      </Field>
      <SubmitButton pending={formState.isSubmitting} />
      <p className="text-center text-xs text-muted-foreground">演示账号：admin / 123456</p>
    </form>
  )
}

const smsSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
  code: z.string().regex(/^\d{6}$/, "验证码为 6 位数字"),
})

function SmsForm({ focusProps, onFail, onSuccess }: FormCommon) {
  const { register, handleSubmit, trigger, getValues, formState } = useForm({ resolver: zodResolver(smsSchema), defaultValues: { phone: "", code: "" } })
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const t = window.setTimeout(() => setCountdown((n) => n - 1), 1000)
    return () => window.clearTimeout(t)
  }, [countdown])

  async function sendCode() {
    if (!(await trigger("phone"))) return
    setSending(true)
    try {
      const r = await sendSmsCode(getValues("phone"))
      setCountdown(r.expiresIn)
      toast.success("验证码已发送（演示验证码 123456）")
    } finally {
      setSending(false)
    }
  }

  const submit = handleSubmit(async (v) => {
    setError(null)
    try {
      onSuccess(await loginWithSms(v.phone, v.code))
    } catch (e) {
      setError(e instanceof LoginError ? e.message : "登录失败，请稍后再试")
      onFail()
    }
  })

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <FormError message={error} />
      <Field data-invalid={!!formState.errors.phone}>
        <FieldLabel htmlFor="phone">
          <Required /> 手机号
        </FieldLabel>
        <IconInput id="phone" icon={Smartphone} type="tel" inputMode="numeric" autoComplete="tel" maxLength={11} placeholder="请输入手机号" aria-invalid={!!formState.errors.phone} {...register("phone")} {...focusProps("phone")} />
        <FieldError errors={[formState.errors.phone]} />
      </Field>
      <Field data-invalid={!!formState.errors.code}>
        <FieldLabel htmlFor="code">
          <Required /> 短信验证码
        </FieldLabel>
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <IconInput id="code" icon={MessageSquareText} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="请输入验证码" aria-invalid={!!formState.errors.code} {...register("code")} {...focusProps("code")} />
          </div>
          <Button type="button" variant="outline" className="h-10 w-28 shrink-0" disabled={countdown > 0 || sending} onClick={sendCode}>
            {sending ? <Loader2 className="animate-spin" /> : countdown > 0 ? `${countdown} 秒后重发` : "获取验证码"}
          </Button>
        </div>
        <FieldError errors={[formState.errors.code]} />
      </Field>
      <SubmitButton pending={formState.isSubmitting} />
    </form>
  )
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending} className="mt-1 h-11 bg-linear-to-r from-primary/90 to-primary text-base shadow-lg shadow-primary/25 hover:from-primary hover:to-primary">
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending ? "登录中…" : "登 录"}
    </Button>
  )
}
