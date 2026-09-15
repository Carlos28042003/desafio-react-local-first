import { openDB, type IDBPDatabase } from 'idb';
import type { Order, SyncOperation } from '../types/order';

const DB_NAME = 'FidliOrdersDB';
const DB_VERSION = 1;

const STORES = {
  ORDERS: 'orders',
  SYNC_QUEUE: 'syncQueue',
};

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.ORDERS)) {
          const orderStore = db.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
          orderStore.createIndex('status', 'status');
          orderStore.createIndex('updatedAt', 'updatedAt');
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('createdAt', 'createdAt');
          syncStore.createIndex('status', 'status');
        }
      },
    });
  }
  return dbPromise;
}

export async function getLocalOrders(): Promise<Order[]> {
  const db = await getDB();
  return db.getAll(STORES.ORDERS);
}

export async function getLocalOrderById(id: string): Promise<Order | undefined> {
  const db = await getDB();
  return db.get(STORES.ORDERS, id);
}

export async function saveLocalOrder(order: Order): Promise<void> {
  const db = await getDB();
  await db.put(STORES.ORDERS, order);
}

export async function saveLocalOrdersBulk(orders: Order[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.ORDERS, 'readwrite');
  for (const order of orders) {
    await tx.store.put(order);
  }
  await tx.done;
}

export async function deleteLocalOrder(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORES.ORDERS, id);
}

export async function getSyncQueue(): Promise<SyncOperation[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORES.SYNC_QUEUE, 'createdAt');
}

export async function addSyncOperation(op: SyncOperation): Promise<void> {
  const db = await getDB();
  await db.put(STORES.SYNC_QUEUE, op);
}

export async function updateSyncOperation(
  opOrId: SyncOperation | string,
  updates?: Partial<SyncOperation>
): Promise<void> {
  const db = await getDB();
  if (typeof opOrId === 'string') {
    const existing = await db.get(STORES.SYNC_QUEUE, opOrId);
    if (existing) {
      await db.put(STORES.SYNC_QUEUE, { ...existing, ...updates });
    }
  } else {
    await db.put(STORES.SYNC_QUEUE, opOrId);
  }
}

export async function removeSyncOperation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORES.SYNC_QUEUE, id);
}

export async function clearAllLocalData(): Promise<void> {
  const db = await getDB();
  await db.clear(STORES.ORDERS);
  await db.clear(STORES.SYNC_QUEUE);
}

export const addOperation = addSyncOperation;
export const updateOperation = updateSyncOperation;
export const deleteOperation = removeSyncOperation;

export async function getPendingOperations(): Promise<SyncOperation[]> {
  const all = await getSyncQueue();
  return all.filter((op) => op.status === 'pending' || op.status === 'failed');
}

export async function getOperationById(id: string): Promise<SyncOperation | undefined> {
  const db = await getDB();
  return db.get(STORES.SYNC_QUEUE, id);
}
