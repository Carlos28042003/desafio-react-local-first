import { create } from 'zustand'
import type { Order } from '../types/order'
import { getOrdersPage, getOrdersCount, getStatusCounts } from '../db/pagination'

interface QueryParams {
  page: number
  pageSize: number
  status: Order['status'] | 'all'
  search: string
  sortField: 'updatedAt' | 'total' | 'customerName' | 'status'
  sortDirection: 'asc' | 'desc'
}

interface OrdersState {
  items: Order[]
  totalCount: number
  statusCounts: Record<Order['status'], number>
  loading: boolean
  error: string | null

  fetchPage: (params: QueryParams) => Promise<void>

  upsertLocal: (order: Order) => void
  removeLocal: (id: string) => void
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  items: [],
  totalCount: 0,
  statusCounts: { pending: 0, approved: 0, cancelled: 0 },
  loading: false,
  error: null,

  fetchPage: async (params) => {
    set({ loading: true, error: null })
    try {
      const [page, count, counts] = await Promise.all([
        getOrdersPage(params),
        getOrdersCount(params.status, params.search),
        getStatusCounts(),
      ])
      set({ items: page, totalCount: count, statusCounts: counts, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Erro ao carregar pedidos' })
    }
  },

  upsertLocal: (order) => {
    const items = get().items
    const idx = items.findIndex((o) => o.id === order.id)
    if (idx === -1) {
      set({ items: [order, ...items] })
    } else {
      const next = items.slice()
      next[idx] = order
      set({ items: next })
    }
  },

  removeLocal: (id) => {
    set({ items: get().items.filter((o) => o.id !== id) })
  },
}))