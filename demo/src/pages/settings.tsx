import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { ErrorState, PageHeader } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useSaveSettings, useSettings } from "@/hooks/queries"

const schema = z.object({
  siteName: z.string().trim().min(2, "名称至少 2 个字").max(30, "名称不超过 30 个字"),
  supportEmail: z.email("邮箱格式不正确"),
  orderAutoCloseMinutes: z.number({ error: "请输入数字" }).int("请输入整数").min(5, "不少于 5 分钟").max(1440, "不超过 1440 分钟"),
  allowRegister: z.boolean(),
  emailNotify: z.boolean(),
  announcement: z.string().max(200, "公告不超过 200 字"),
})
type FormValues = z.infer<typeof schema>

export default function SettingsPage() {
  const { data, isPending, isError, refetch } = useSettings()
  const save = useSaveSettings()
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })
  const { register, control, handleSubmit, reset, formState } = form

  useEffect(() => {
    if (data) reset(data)
  }, [data, reset])

  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="系统设置" description="站点基本信息与业务规则，修改后立即生效" />
      {isPending ? (
        <Skeleton className="h-[30rem] w-full max-w-3xl" />
      ) : (
        // noValidate：关掉浏览器自带校验气泡，统一显示 Zod 的中文错误
        <form noValidate className="flex max-w-3xl flex-col gap-6" onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: () => toast.success("设置已保存") }))}>
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>显示在登录页和邮件里</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field data-invalid={!!formState.errors.siteName}>
                  <FieldLabel htmlFor="siteName">站点名称</FieldLabel>
                  <Input id="siteName" aria-invalid={!!formState.errors.siteName} {...register("siteName")} />
                  <FieldError errors={[formState.errors.siteName]} />
                </Field>
                <Field data-invalid={!!formState.errors.supportEmail}>
                  <FieldLabel htmlFor="supportEmail">客服邮箱</FieldLabel>
                  <Input id="supportEmail" type="email" aria-invalid={!!formState.errors.supportEmail} {...register("supportEmail")} />
                  <FieldError errors={[formState.errors.supportEmail]} />
                </Field>
                <Field className="md:col-span-2" data-invalid={!!formState.errors.announcement}>
                  <FieldLabel htmlFor="announcement">后台公告</FieldLabel>
                  <Textarea id="announcement" rows={3} {...register("announcement")} />
                  <FieldDescription>显示在所有管理员的仪表盘顶部，留空则不显示</FieldDescription>
                  <FieldError errors={[formState.errors.announcement]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>业务规则</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={!!formState.errors.orderAutoCloseMinutes} className="max-w-xs">
                  <FieldLabel htmlFor="autoClose">未付款订单自动关闭（分钟）</FieldLabel>
                  <Input id="autoClose" type="number" inputMode="numeric" aria-invalid={!!formState.errors.orderAutoCloseMinutes} {...register("orderAutoCloseMinutes", { valueAsNumber: true })} />
                  <FieldError errors={[formState.errors.orderAutoCloseMinutes]} />
                </Field>
                <Controller
                  control={control}
                  name="allowRegister"
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldLabel htmlFor="allowRegister">开放用户自助注册</FieldLabel>
                        <FieldDescription>关闭后只能由管理员创建账号</FieldDescription>
                      </FieldContent>
                      <Switch id="allowRegister" checked={field.value} onCheckedChange={field.onChange} />
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="emailNotify"
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldLabel htmlFor="emailNotify">新订单邮件提醒</FieldLabel>
                        <FieldDescription>有新订单时发送邮件到客服邮箱</FieldDescription>
                      </FieldContent>
                      <Switch id="emailNotify" checked={field.value} onCheckedChange={field.onChange} />
                    </Field>
                  )}
                />
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t">
              <Button type="button" variant="outline" disabled={!formState.isDirty || save.isPending} onClick={() => reset(data)}>
                取消
              </Button>
              <Button type="submit" disabled={!formState.isDirty || save.isPending}>
                {save.isPending ? "保存中…" : "保存设置"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  )
}
