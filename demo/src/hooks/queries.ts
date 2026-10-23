// 查询 hooks：页面不直接写 useQuery，queryKey 和请求函数按资源封装在这里
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "@/mock/api"
import type { UserStatus } from "@/mock/data"

export const useUsers = (q: api.UserQuery) =>
  useQuery({ queryKey: ["users", q], queryFn: () => api.fetchUsers(q), placeholderData: keepPreviousData })

export function useDeleteUsers() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.deleteUsers, onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }) })
}

export function useSetUsersStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: UserStatus }) => api.setUsersStatus(ids, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })
}

export const useRoles = () => useQuery({ queryKey: ["roles"], queryFn: api.fetchRoles })

export function useUpdateRolePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) => api.updateRolePermissions(id, permissions),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  })
}

export const useOrders = (q: api.OrderQuery) =>
  useQuery({ queryKey: ["orders", q], queryFn: () => api.fetchOrders(q), placeholderData: keepPreviousData })

export const useOrderStatusCounts = () => useQuery({ queryKey: ["orders", "counts"], queryFn: api.fetchOrderStatusCounts })

export function useShipOrder() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.shipOrder, onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }) })
}

export const useDashboard = (days: 7 | 30) => useQuery({ queryKey: ["dashboard", days], queryFn: () => api.fetchDashboard(days) })

export const useSettings = () => useQuery({ queryKey: ["settings"], queryFn: api.fetchSettings })

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.saveSettings, onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }) })
}
