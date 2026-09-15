import { processSyncQueue } from './syncQueueService'
import { useOrdersStore } from '../store/orderStore'
import { useUIStore } from '../store/uiStore'

type Message =
  | { type: 'ORDER_CHANGED' }
  | { type: 'SYNC_TRIGGERED' }

const CHANNEL_NAME = 'orders-app-sync'
let channel: BroadcastChannel | null = null

export function initBroadcastChannel(): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}

  channel = new BroadcastChannel(CHANNEL_NAME)

  channel.onmessage = (event: MessageEvent<Message>) => {
    const { statusFilter, searchTerm, sortField, sortDirection, currentPage, pageSize } =
      useUIStore.getState()

    if (event.data.type === 'ORDER_CHANGED') {
      useOrdersStore
        .getState()
        .fetchPage({ page: currentPage, pageSize, status: statusFilter, search: searchTerm, sortField, sortDirection })
    }
    if (event.data.type === 'SYNC_TRIGGERED') {
      processSyncQueue()
    }
  }

  return () => channel?.close()
}

export function broadcastOrderChanged() {
  channel?.postMessage({ type: 'ORDER_CHANGED' } satisfies Message)
}

export function broadcastSyncTriggered() {
  channel?.postMessage({ type: 'SYNC_TRIGGERED' } satisfies Message)
}