import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveLocalOrder,
  getLocalOrders,
  addSyncOperation,
  getSyncQueue,
  clearAllLocalData,
} from '../db/indexedDB';
import { processSyncQueue } from '../services/syncQueueService';
import { mockApi } from '../api/mockApi';
import type { Order, SyncOperation } from '../types/order';

describe('Local-First Sync Engine & IndexedDB Tests', () => {
  beforeEach(async () => {
    await clearAllLocalData();
    mockApi.setOnline(true);
    mockApi.setForceConflict(null);
    mockApi.setForceError(null);
  });

  it('deve persistir um pedido localmente no IndexedDB', async () => {
    const testOrder: Order = {
      id: 'test-101',
      customerId: 'cust-test',
      customerName: 'Cliente Teste Vitest',
      status: 'pending',
      total: 500,
      updatedAt: Date.now(),
      version: 1,
    };

    await saveLocalOrder(testOrder);
    const orders = await getLocalOrders();

    expect(orders).toHaveLength(1);
    expect(orders[0].customerName).toBe('Cliente Teste Vitest');
  });

  it('deve armazenar operação na fila de sincronização quando offline', async () => {
    mockApi.setOnline(false);

    const testOp: SyncOperation = {
      id: 'op-001',
      entity: 'order',
      entityId: 'test-102',
      operation: 'create',
      payload: {
        id: 'test-102',
        customerName: 'Cliente Offline',
        status: 'pending',
        total: 1200,
      },
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await addSyncOperation(testOp);
    const queue = await getSyncQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe('pending');
  });

  it('deve processar a fila com sucesso ao retornar para Online', async () => {
    const testOp: SyncOperation = {
      id: 'op-002',
      entity: 'order',
      entityId: 'test-103',
      operation: 'create',
      payload: {
        id: 'test-103',
        customerName: 'Cliente Online Sync',
        status: 'approved',
        total: 750,
      },
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await addSyncOperation(testOp);

    mockApi.setOnline(true);
    const result = await processSyncQueue();

    expect(result.successCount).toBe(1);

    const queueAfter = await getSyncQueue();
    expect(queueAfter).toHaveLength(0);
  });

  it('deve identificar conflito 409 quando o servidor possuir versão mais recente', async () => {
    const orderId = 'ord-conflict-1';
    mockApi.setForceConflict(orderId);

    const conflictOp: SyncOperation = {
      id: 'op-003',
      entity: 'order',
      entityId: orderId,
      operation: 'update',
      payload: {
        id: orderId,
        status: 'approved',
        version: 1,
      },
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await addSyncOperation(conflictOp);
    const result = await processSyncQueue();

    expect(result.conflicts).toHaveLength(1);
    const queueAfter = await getSyncQueue();
    expect(queueAfter[0].status).toBe('conflict');
  });
});
