import { create } from 'zustand'

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'synced' | 'failed' | 'conflict'

export interface ConflictItem {
  operationId: string
  entityId: string
  localVersion: number
  serverVersion: number
  localData: unknown
  serverData: unknown
  createdAt: number
}

interface SyncState {
  status: SyncStatus
  pendingCount: number
  failedCount: number
  conflicts: ConflictItem[]
  isPaused: boolean

  setStatus: (status: SyncStatus) => void
  setPendingCount: (n: number) => void
  setFailedCount: (n: number) => void

  enqueueConflict: (conflict: ConflictItem) => void
  resolveConflict: (operationId: string) => void

  pause: () => void
  resume: () => void
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  pendingCount: 0,
  failedCount: 0,
  conflicts: [],
  isPaused: false,

  setStatus: (status) => set({ status }),
  setPendingCount: (n) => set({ pendingCount: n }),
  setFailedCount: (n) => set({ failedCount: n }),

  enqueueConflict: (conflict) =>
    set((state) => ({
      conflicts: state.conflicts.some((c) => c.operationId === conflict.operationId)
        ? state.conflicts
        : [...state.conflicts, conflict],
      status: 'conflict',
    })),

  resolveConflict: (operationId) => {
    const remaining = get().conflicts.filter((c) => c.operationId !== operationId)
    set({
      conflicts: remaining,
      status: remaining.length > 0 ? 'conflict' : get().pendingCount > 0 ? 'syncing' : 'synced',
    })
  },

  pause: () => set({ isPaused: true }),
  resume: () => set({ isPaused: false }),
}))

export function getSyncStatusMessage(state: {
  status: SyncStatus
  pendingCount: number
  failedCount: number
}): string {
  switch (state.status) {
    case 'offline':
      return state.pendingCount > 0
        ? `Offline — ${state.pendingCount} alterações aguardando sincronização`
        : 'Offline'
    case 'syncing':
      return 'Sincronizando...'
    case 'synced':
      return 'Tudo sincronizado'
    case 'failed':
      return `${state.failedCount} alterações não foram sincronizadas`
    case 'conflict':
      return 'Conflito pendente de resolução'
    case 'online':
    default:
      return 'Online'
  }
}