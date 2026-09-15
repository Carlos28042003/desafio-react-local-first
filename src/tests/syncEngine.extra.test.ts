import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processSyncQueue } from '../services/syncQueueService'
import { addOperation, getPendingOperations, getOperationById } from '../db/indexedDB'
import { useSyncStore } from '../store/syncStore'
import * as mockApi from '../api/mockApi'
import type { SyncOperation } from '../types/order'

function makeOperation(overrides: Partial<SyncOperation> = {}): SyncOperation {
  return {
    id: crypto.randomUUID(),
    entity: 'order',
    entityId: crypto.randomUUID(),
    operation: 'update',
    payload: { status: 'approved', version: 1 } as any,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'pending',
    ...overrides,
  }
}

beforeEach(() => {
  useSyncStore.setState({
    status: 'online',
    pendingCount: 0,
    failedCount: 0,
    conflicts: [],
    isPaused: false,
  })
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Recuperar operações após reload da página', () => {
  it('operações persistidas continuam na fila após "reload"', async () => {
    const op = makeOperation()
    await addOperation(op)

    const persisted = await getPendingOperations()
    expect(persisted.some((o) => o.id === op.id)).toBe(true)
  })
})

describe('Retry automático após falha temporária', () => {
  it('agenda nova tentativa com retryCount incrementado após erro 500', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const op = makeOperation()
    await addOperation(op)

    vi.spyOn(mockApi, 'callMockApi').mockResolvedValueOnce({ status: 500 } as any)

    await processSyncQueue()

    const updated = await getOperationById(op.id)
    expect(updated?.retryCount).toBe(1)
    expect(updated?.status).toBe('pending')
  })

  it('marca como failed definitivamente após exceder o limite de retries', async () => {
    const op = makeOperation({ retryCount: 5 })
    await addOperation(op)

    vi.spyOn(mockApi, 'callMockApi').mockResolvedValue({ status: 500 } as any)

    await processSyncQueue()

    const updated = await getOperationById(op.id)
    expect(updated?.status).toBe('failed')
  })
})

describe('Tratar timeout e perda de conexão', () => {
  it('trata AbortError (timeout) como falha reagendável, não como sucesso silencioso', async () => {
    const op = makeOperation()
    await addOperation(op)

    vi.spyOn(mockApi, 'callMockApi').mockImplementation(
      () => new Promise((_, reject) => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    )

    await processSyncQueue()

    const updated = await getOperationById(op.id)
    expect(updated?.status).not.toBe('processing')
    expect(['pending', 'failed']).toContain(updated?.status)
  })

  it('pausa a fila quando a conexão cai no meio da sincronização', async () => {
    const op = makeOperation()
    await addOperation(op)

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    vi.spyOn(mockApi, 'callMockApi').mockRejectedValue(new TypeError('Network request failed'))

    await processSyncQueue()

    expect(useSyncStore.getState().status).toBe('offline')

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })
})

describe('Prevenir operações duplicadas', () => {
  it('duas chamadas concorrentes a processSyncQueue não processam a mesma operação duas vezes', async () => {
    const op = makeOperation()
    await addOperation(op)

    const spy = vi.spyOn(mockApi, 'callMockApi').mockResolvedValue({ status: 200 } as any)

    await Promise.all([processSyncQueue(), processSyncQueue()])

    const callsForOp = spy.mock.calls.filter(([passedOp]) => (passedOp as any).id === op.id)
    expect(callsForOp.length).toBe(1)
  })
})

describe('Recuperação graciosa após erro', () => {
  it('uma operação com falha não impede as demais de serem sincronizadas', async () => {
    const failing = makeOperation()
    const succeeding = makeOperation()
    await addOperation(failing)
    await addOperation(succeeding)

    vi.spyOn(mockApi, 'callMockApi').mockImplementation(async (op: any) => {
      if (op.id === failing.id) return { status: 500 } as any
      return { status: 200 } as any
    })

    await processSyncQueue()

    const remaining = await getPendingOperations()
    expect(remaining.some((o) => o.id === succeeding.id)).toBe(false)
    expect(remaining.some((o) => o.id === failing.id)).toBe(true)
  })
})