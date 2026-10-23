import { useState } from "react"
import { Plus, ShieldCheck, Users } from "lucide-react"
import { toast } from "sonner"

import { ErrorState, PageHeader } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useRoles, useUpdateRolePermissions } from "@/hooks/queries"
import { permissionGroups } from "@/mock/data"
import { cn } from "@/lib/utils"

export default function RolesPage() {
  const { data: roles, isPending, isError, refetch } = useRoles()
  const [activeId, setActiveId] = useState("r2")
  const active = roles?.find((r) => r.id === activeId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="角色权限"
        description="为不同岗位分配可访问的功能，用户通过角色获得权限"
        action={
          <Button onClick={() => toast.info("演示：新建角色")}>
            <Plus /> 新建角色
          </Button>
        }
      />
      {isError ? (
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <Card className="gap-0 py-2">
            <ul className="flex flex-col gap-1 px-2" aria-label="角色列表">
              {isPending
                ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)
                : roles.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(r.id)}
                        aria-current={r.id === activeId ? "true" : undefined}
                        className={cn(
                          "flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left outline-hidden transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                          r.id === activeId && "bg-primary/10 hover:bg-primary/10 dark:bg-primary/20",
                        )}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {r.name}
                          {r.builtIn ? <Badge variant="secondary">内置</Badge> : null}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3" aria-hidden="true" /> {r.userCount} 位用户 · {r.permissions.length} 项权限
                        </span>
                      </button>
                    </li>
                  ))}
            </ul>
          </Card>
          {active ? <PermissionEditor key={active.id} role={active} /> : <Skeleton className="h-96 w-full" />}
        </div>
      )}
    </div>
  )
}

function PermissionEditor({ role }: { role: { id: string; name: string; description: string; permissions: string[]; builtIn: boolean } }) {
  const [checked, setChecked] = useState(() => new Set(role.permissions))
  const save = useUpdateRolePermissions()
  const dirty = checked.size !== role.permissions.length || role.permissions.some((p) => !checked.has(p))
  const toggle = (key: string, on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" /> {role.name}
        </CardTitle>
        <CardDescription>{role.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {permissionGroups.map((g) => {
          const keys = g.items.map((i) => i.key as string)
          const n = keys.filter((k) => checked.has(k)).length
          return (
            <fieldset key={g.key} className="flex flex-col gap-3" disabled={role.builtIn}>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`g-${g.key}`}
                  checked={n === keys.length ? true : n > 0 ? "indeterminate" : false}
                  onCheckedChange={(v) => keys.forEach((k) => toggle(k, v === true))}
                  disabled={role.builtIn}
                />
                <Label htmlFor={`g-${g.key}`} className="font-medium">
                  {g.label}
                </Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {n}/{keys.length}
                </span>
              </div>
              <div className="grid gap-3 pl-6 sm:grid-cols-2 xl:grid-cols-4">
                {g.items.map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <Checkbox id={item.key} checked={checked.has(item.key)} onCheckedChange={(v) => toggle(item.key, v === true)} disabled={role.builtIn} />
                    <Label htmlFor={item.key} className="font-normal">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>
          )
        })}
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        {role.builtIn ? (
          <span className="mr-auto text-sm text-muted-foreground">内置角色的权限不可修改</span>
        ) : dirty ? (
          <span className="mr-auto text-sm text-warning">有未保存的修改</span>
        ) : null}
        <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => setChecked(new Set(role.permissions))}>
          撤销
        </Button>
        <Button
          disabled={!dirty || save.isPending || role.builtIn}
          onClick={() => save.mutate({ id: role.id, permissions: [...checked] }, { onSuccess: () => toast.success(`已保存"${role.name}"的权限`) })}
        >
          {save.isPending ? "保存中…" : "保存权限"}
        </Button>
      </CardFooter>
    </Card>
  )
}
