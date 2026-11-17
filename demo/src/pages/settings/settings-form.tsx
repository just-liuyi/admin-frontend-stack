import { useEffect, useMemo, type ReactNode } from "react"
import { Controller, useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { toast } from "sonner"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardFooter } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useSaveSettings, useSettings, type Settings } from "./settings-api"

/**
 * 一个设置分类的表单外壳：读取设置、只保存本分类的字段、取消 / 保存按钮、把"有没有未保存修改"报告给页面。
 * 每个分类单独保存：分类多了以后，一个大表单一起提交既慢又容易互相影响。
 */
export function SettingsForm<T extends FieldValues>({
  title,
  description,
  schema,
  pick,
  onDirtyChange,
  children,
}: {
  title: string
  description: string
  schema: z.ZodType<T, T>
  /** 从全部设置里取出本分类的字段（定义在组件外面，引用保持不变） */
  pick: (s: Settings) => T
  onDirtyChange: (dirty: boolean) => void
  children: (form: UseFormReturn<T>) => ReactNode
}) {
  const { data, isPending, isError, refetch } = useSettings()
  const save = useSaveSettings()
  const values = useMemo(() => (data ? pick(data) : undefined), [data, pick])
  // values：接口数据回来（或保存后重新拉取）时自动填入表单，并把"已修改"状态清零
  const form = useForm<T>({ resolver: zodResolver(schema), values })
  const dirty = form.formState.isDirty

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  if (isError)
    return (
      <Card className="items-center gap-3 py-16 text-center">
        <p className="text-sm text-destructive">设置加载失败，请检查网络后重试</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw /> 重试
        </Button>
      </Card>
    )

  return (
    // noValidate：不用浏览器自带的校验气泡，统一显示 Zod 的中文错误
    <form noValidate onSubmit={form.handleSubmit((v) => save.mutate(v as Partial<Settings>, { onSuccess: () => toast.success(`「${title}」已保存`) }))}>
      <Card className="gap-0 py-0">
        <div className="border-b px-6 py-5">
          <h2 className="text-base font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="p-6">{isPending ? <Skeleton className="h-40 w-full" /> : children(form)}</div>
        <CardFooter className="justify-end gap-2 border-t py-4">
          {dirty ? <span className="mr-auto text-sm text-warning">有未保存的修改</span> : null}
          <Button type="button" variant="outline" disabled={!dirty || save.isPending} onClick={() => form.reset(values)}>
            取消
          </Button>
          <Button type="submit" disabled={!dirty || save.isPending}>
            {save.isPending ? "保存中…" : "保存"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

/** 字段网格：宽屏两列、超宽屏三列，输入框不会被拉得过长；col-span-full 的字段独占一行 */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <FieldGroup className="grid gap-x-6 gap-y-5 md:grid-cols-2 2xl:grid-cols-3">{children}</FieldGroup>
}

type FieldProps<T extends FieldValues> = { form: UseFormReturn<T>; name: Path<T>; label: string; description?: string; className?: string }

export function TextField<T extends FieldValues>({ form, name, label, description, className, type = "text", number }: FieldProps<T> & { type?: string; number?: boolean }) {
  const { error } = form.getFieldState(name, form.formState)
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} type={number ? "number" : type} inputMode={number ? "numeric" : undefined} aria-invalid={!!error} {...form.register(name, number ? { valueAsNumber: true } : undefined)} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={[error]} />
    </Field>
  )
}

export function TextareaField<T extends FieldValues>({ form, name, label, description }: FieldProps<T>) {
  const { error } = form.getFieldState(name, form.formState)
  return (
    <Field data-invalid={!!error} className="col-span-full">
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Textarea id={name} rows={3} aria-invalid={!!error} {...form.register(name)} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={[error]} />
    </Field>
  )
}

export function SelectField<T extends FieldValues>({ form, name, label, description, options }: FieldProps<T> & { options: { value: string; label: string }[] }) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={name} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
        </Field>
      )}
    />
  )
}

/**
 * 开关字段：和输入框同一种结构（标题在上、控件在下、说明在最下），放进同一行时三者都能对齐。
 * 控件行固定为输入框的高度（radix-nova 的 Input 是 h-8，换风格时跟着改），旁边写"已开启 / 已关闭"。
 * ⚠️ 不要把开关做成带边框的卡片和输入框混排：顶部、高度、边框都对不齐，整行显得杂乱。
 */
export function SwitchField<T extends FieldValues>({ form, name, label, description, className }: FieldProps<T>) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Field className={className}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <div className="flex h-8 items-center gap-2">
            <Switch id={name} checked={!!field.value} onCheckedChange={field.onChange} />
            <span className="text-sm text-muted-foreground">{field.value ? "已开启" : "已关闭"}</span>
          </div>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
        </Field>
      )}
    />
  )
}