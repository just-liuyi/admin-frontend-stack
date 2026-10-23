import { useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState, type SortingState } from "@tanstack/react-table"
import { ArrowUpDown, Ban, CircleCheck, MoreHorizontal, Pencil, Plus, Search, Trash2, UserX } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, ErrorState, formatDateTime, PageHeader, Pagination, TableSkeleton, UserStatusBadge } from "@/components/common"
import { UserAvatar } from "@/components/user-avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDeleteUsers, useRoles, useSetUsersStatus, useUsers } from "@/hooks/queries"
import type { User, UserStatus } from "@/mock/data"

const emptyRows: User[] = []

export default function UsersPage() {
  // 筛选和分页同步到 URL：刷新、分享链接后状态不丢
  const [params, setParams] = useSearchParams()
  const keyword = params.get("q") ?? ""
  const status = (params.get("status") ?? "all") as UserStatus | "all"
  const roleId = params.get("role") ?? "all"
  const page = Number(params.get("page") ?? 0)
  const pageSize = Number(params.get("size") ?? 10)
  const update = (patch: Record<string, string | number | null>, resetPage = true) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries({ ...patch, ...(resetPage ? { page: null } : {}) })) {
        if (v === null || v === "" || v === "all") next.delete(k)
        else next.set(k, String(v))
      }
      return next
    })

  const [keywordInput, setKeywordInput] = useState(keyword)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pendingDelete, setPendingDelete] = useState<User[] | null>(null)

  const query = { page, pageSize, keyword, status, roleId, sort: sorting[0] }
  const { data, isPending, isError, refetch, isPlaceholderData } = useUsers(query)
  const { data: roles } = useRoles()
  const roleName = useMemo(() => new Map(roles?.map((r) => [r.id, r.name])), [roles])
  const remove = useDeleteUsers()
  const setStatus = useSetUsersStatus()

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="全选本页"
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => <Checkbox aria-label={`选择 ${row.original.name}`} checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} />,
      },
      {
        accessorKey: "name",
        header: "用户",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <UserAvatar name={row.original.name} variant="colorful" />
            <div className="grid min-w-0 leading-tight">
              <span className="truncate font-medium">{row.original.name}</span>
              <span className="truncate text-xs text-muted-foreground">{row.original.email}</span>
            </div>
          </div>
        ),
      },
      { accessorKey: "phone", header: "手机号", meta: { className: "hidden lg:table-cell tabular-nums" } },
      { accessorKey: "roleId", header: "角色", cell: ({ getValue }) => roleName.get(getValue<string>()) ?? "—" },
      { accessorKey: "status", header: "状态", cell: ({ getValue }) => <UserStatusBadge status={getValue<UserStatus>()} /> },
      {
        accessorKey: "createdAt",
        enableSorting: true,
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-2.5" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            注册时间 <ArrowUpDown />
          </Button>
        ),
        cell: ({ getValue }) => <span className="text-muted-foreground tabular-nums">{formatDateTime(getValue<string>())}</span>,
        meta: { className: "hidden md:table-cell" },
      },
      {
        accessorKey: "lastLoginAt",
        header: "最近登录",
        cell: ({ getValue }) => <span className="text-muted-foreground tabular-nums">{formatDateTime(getValue<string | null>())}</span>,
        meta: { className: "hidden xl:table-cell" },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">操作</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon-sm" aria-label={`编辑 ${row.original.name}`} onClick={() => toast.info(`演示：编辑 ${row.original.name}`)}>
              <Pencil />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="更多操作">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {row.original.status === "disabled" ? (
                  <DropdownMenuItem onSelect={() => changeStatus([row.original], "active")}>
                    <CircleCheck /> 启用
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => changeStatus([row.original], "disabled")}>
                    <Ban /> 禁用
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete([row.original])}>
                  <Trash2 /> 删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roleName],
  )

  const table = useReactTable({
    data: data?.rows ?? emptyRows,
    columns,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: data?.total ?? 0,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
  })
  const selected = table.getSelectedRowModel().rows.map((r) => r.original)

  function changeStatus(list: User[], next: UserStatus) {
    setStatus.mutate(
      { ids: list.map((u) => u.id), status: next },
      {
        onSuccess: () => {
          toast.success(`已${next === "disabled" ? "禁用" : "启用"} ${list.length} 个用户`)
          setRowSelection({})
        },
      },
    )
  }

  const filtered = keyword !== "" || status !== "all" || roleId !== "all"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="用户列表"
        description="管理系统内的账号、角色与登录状态"
        action={
          <Button onClick={() => toast.info("演示：打开新增用户表单")}>
            <Plus /> 新增用户
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="relative w-full sm:w-64"
          onSubmit={(e) => {
            e.preventDefault()
            update({ q: keywordInput })
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onBlur={() => keywordInput !== keyword && update({ q: keywordInput })}
            placeholder="搜索姓名、邮箱、手机号"
            className="pl-8"
            aria-label="搜索用户"
          />
        </form>
        <Select value={status} onValueChange={(v) => update({ status: v })}>
          <SelectTrigger className="w-28" aria-label="状态筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">正常</SelectItem>
            <SelectItem value="pending">待激活</SelectItem>
            <SelectItem value="disabled">已禁用</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleId} onValueChange={(v) => update({ role: v })}>
          <SelectTrigger className="w-32" aria-label="角色筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            {roles?.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered ? (
          <Button
            variant="ghost"
            onClick={() => {
              setKeywordInput("")
              update({ q: null, status: null, role: null })
            }}
          >
            重置
          </Button>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-primary/5 px-3 py-2 text-sm">
          <span>
            已选 <span className="font-medium tabular-nums">{selected.length}</span> 项
          </span>
          <Button variant="outline" size="sm" onClick={() => changeStatus(selected, "disabled")}>
            <Ban /> 批量禁用
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setPendingDelete(selected)}>
            <Trash2 /> 批量删除
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setRowSelection({})}>
            取消选择
          </Button>
        </div>
      ) : null}

      <Card className="gap-0 overflow-hidden py-0">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          <TableSkeleton cols={5} />
        ) : data.rows.length === 0 ? (
          <EmptyState
            icon={UserX}
            title={filtered ? "没有符合条件的用户" : "暂无用户"}
            description={filtered ? "换个关键词，或清除筛选条件再试试" : "新增第一个用户后会显示在这里"}
            action={
              filtered ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setKeywordInput("")
                    update({ q: null, status: null, role: null })
                  }}
                >
                  清除筛选
                </Button>
              ) : null
            }
          />
        ) : (
          <Table className={isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} className={(h.column.columnDef.meta as { className?: string } | undefined)?.className}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={(cell.column.columnDef.meta as { className?: string } | undefined)?.className}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {data && data.total > 0 ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={data.total}
          onPageChange={(p) => {
            setRowSelection({})
            update({ page: p || null }, false)
          }}
          onPageSizeChange={(s) => update({ size: s === 10 ? null : s })}
        />
      ) : null}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              删除 {pendingDelete?.length === 1 ? `用户"${pendingDelete[0].name}"` : `${pendingDelete?.length ?? 0} 个用户`}？
            </AlertDialogTitle>
            <AlertDialogDescription>删除后这些账号将无法登录，其历史订单会保留。此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const list = pendingDelete ?? []
                remove.mutate(
                  list.map((u) => u.id),
                  {
                    onSuccess: () => {
                      toast.success(`已删除 ${list.length} 个用户`)
                      setRowSelection({})
                    },
                  },
                )
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
