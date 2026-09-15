import { create } from 'zustand'
import type { Order } from '../types/order'
 
type ModalMode = 'create' | 'edit' | 'view' | null
 
type SortField = 'updatedAt' | 'total' | 'customerName' | 'status'
type SortDirection = 'asc' | 'desc'
 
interface UIState {
  modalMode: ModalMode
  editingOrder: Order | null
 
  searchTerm: string
  statusFilter: Order['status'] | 'all'
  sortField: SortField
  sortDirection: SortDirection
 
  currentPage: number
  pageSize: number
 
  openCreateModal: () => void
  openEditModal: (order: Order) => void
  openViewModal: (order: Order) => void
  closeModal: () => void
 
  setSearchTerm: (term: string) => void
  setStatusFilter: (status: Order['status'] | 'all') => void
  setSort: (field: SortField) => void
 
  setPage: (page: number) => void
  resetPagination: () => void
}
 
export const useUIStore = create<UIState>((set, get) => ({
  modalMode: null,
  editingOrder: null,
 
  searchTerm: '',
  statusFilter: 'all',
  sortField: 'updatedAt',
  sortDirection: 'desc',
 
  currentPage: 1,
  pageSize: 50,
 
  openCreateModal: () => set({ modalMode: 'create', editingOrder: null }),
  openEditModal: (order) => set({ modalMode: 'edit', editingOrder: order }),
  openViewModal: (order) => set({ modalMode: 'view', editingOrder: order }),
  closeModal: () => set({ modalMode: null, editingOrder: null }),
 
  setSearchTerm: (term) => set({ searchTerm: term, currentPage: 1 }),
  setStatusFilter: (status) => set({ statusFilter: status, currentPage: 1 }),
  setSort: (field) => {
    const { sortField, sortDirection } = get()
    if (field === sortField) {
      set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc', currentPage: 1 })
    } else {
      set({ sortField: field, sortDirection: 'asc', currentPage: 1 })
    }
  },
 
  setPage: (page) => set({ currentPage: page }),
  resetPagination: () => set({ currentPage: 1 }),
}))
 
