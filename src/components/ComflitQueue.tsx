import { useSyncStore, type ConflictItem } from '../store/syncStore'
import { ConflictModal } from './ConflictModal'
import { updateOperation, deleteOperation } from '../db/indexedDB'
import { useOrdersStore } from '../store/orderStore'
import type { Order, SyncOperation } from '../types/order'

export function ConflictQueue() {
  const { conflicts, resolveConflict } = useSyncStore()
  const upsertLocal = useOrdersStore((s) => s.upsertLocal)

  if (conflicts.length === 0) return null

  const current = conflicts[0]

  async function applyResolution(conflict: ConflictItem, strategy: 'server' | 'client') {
    const winning = strategy === 'server' ? (conflict.serverData as Order) : (conflict.localData as Order)

    if (strategy === 'server') {
      await deleteOperation(conflict.operationId)
      upsertLocal(winning)
    } else {
      await updateOperation(conflict.operationId, {
        status: 'pending',
        retryCount: 0,
        payload: { ...(conflict.localData as object), version: conflict.serverVersion },
      })
    }

    resolveConflict(conflict.operationId)
  }

  const conflictData = {
    operation: {
      id: current.operationId,
      entity: 'order' as const,
      entityId: current.entityId,
      operation: 'update' as const,
      payload: current.localData as Partial<Order>,
      createdAt: current.createdAt,
      retryCount: 0,
      status: 'conflict' as const,
    } satisfies SyncOperation,
    serverOrder: current.serverData as Order,
  }

  return (
    <div className="conflict-queue">
      {conflicts.length > 1 && (
        <div className="conflict-queue-badge">
          {conflicts.length} conflitos pendentes — resolvendo 1 de {conflicts.length}
        </div>
      )}
      <ConflictModal
        isOpen={true}
        conflictData={conflictData}
        onResolveServerWins={() => applyResolution(current, 'server')}
        onResolveClientWins={() => applyResolution(current, 'client')}
        onClose={() => resolveConflict(current.operationId)}
      />
    </div>
  )
}
