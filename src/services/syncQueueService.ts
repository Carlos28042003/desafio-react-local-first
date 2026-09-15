import { getSyncQueue, removeSyncOperation, updateSyncOperation, saveLocalOrder } from '../db/indexedDB';
import * as apiMod from '../api/mockApi';
import { useSyncStore } from '../store/syncStore';
import type { SyncOperation } from '../types/order';

export interface SyncResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  conflicts: Array<{ operation: SyncOperation; serverOrder: any }>;
}

const MAX_RETRIES = 5;

let isProcessing = false;

export async function processSyncQueue(): Promise<SyncResult> {
  const result: SyncResult = {
    totalProcessed: 0,
    successCount: 0,
    failedCount: 0,
    conflicts: [],
  };

  if (isProcessing) {
    return result;
  }

  isProcessing = true;

  try {
    const queue = await getSyncQueue();
    const pendingOps = queue.filter((op) => op.status === 'pending' || op.status === 'failed');
    result.totalProcessed = pendingOps.length;

    if (!apiMod.mockApi.isOnline()) {
      return result;
    }

    for (const op of pendingOps) {
      try {
        op.status = 'processing';
        await updateSyncOperation(op);

        const res = await apiMod.callMockApi(op) as any;

        if (res.success || res.status === 200) {
          if (res.order) {
            await saveLocalOrder(res.order);
          }
          await removeSyncOperation(op.id);
          result.successCount++;
        } else if (res.status && res.status !== 200) {
          op.retryCount = (op.retryCount || 0) + 1;
          op.status = op.retryCount >= MAX_RETRIES ? 'failed' : 'pending';
          op.errorMessage = `Server responded with status ${res.status}`;
          await updateSyncOperation(op);
          result.failedCount++;
        }
      } catch (err: any) {
        if (
          err instanceof TypeError ||
          err?.name === 'AbortError' ||
          !navigator.onLine
        ) {
          op.retryCount = (op.retryCount || 0) + 1;
          op.status = op.retryCount >= MAX_RETRIES ? 'failed' : 'pending';
          op.errorMessage = err?.message || 'Erro de rede.';
          await updateSyncOperation(op);
          result.failedCount++;

          useSyncStore.getState().setStatus('offline');
          break;
        }

        if (err?.status === 409) {
          op.status = 'conflict';
          op.errorMessage = err.message || 'Conflito de versão no servidor.';
          await updateSyncOperation(op);
          result.failedCount++;
          result.conflicts.push({
            operation: op,
            serverOrder: err.serverOrder,
          });
        } else {
          op.retryCount = (op.retryCount || 0) + 1;
          op.status = op.retryCount >= MAX_RETRIES ? 'failed' : 'pending';
          op.errorMessage = err?.message || 'Erro desconhecido ao sincronizar.';
          await updateSyncOperation(op);
          result.failedCount++;
        }
      }
    }
  } finally {
    isProcessing = false;
  }

  return result;
}
