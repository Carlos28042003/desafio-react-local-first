import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Order, OrderStatus, SyncOperation, SyncState } from './types/order';
import {
  getLocalOrders,
  saveLocalOrder,
  deleteLocalOrder,
  getSyncQueue,
  addSyncOperation,
  saveLocalOrdersBulk,
  removeSyncOperation,
} from './db/indexedDB';
import { fetchPage } from './db/pagination';
import { mockApi } from './api/mockApi';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { processSyncQueue } from './services/syncQueueService';

import { Header } from './components/Header';
import { OrderFilterBar } from './components/OrderFilterBar';
import { OrderList } from './components/OrderList';
import { OrderModal } from './components/OrderModal';
import { ConflictModal } from './components/ConflictModal';

export function App() {
  const isOnlineNetwork = useOnlineStatus();
  const [forcedOffline, setForcedOffline] = useState(false);

  const isOnline = isOnlineNetwork && !forcedOffline;

  const [orders, setOrders] = useState<Order[]>([]);
  const PAGE_SIZE = 50;
  const page = 1;
  const [syncQueue, setSyncQueue] = useState<SyncOperation[]>([]);
  const [syncState, setSyncState] = useState<SyncState>('synced');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'total' | 'customerName'>('updatedAt');

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [conflictItem, setConflictItem] = useState<{
    operation: SyncOperation;
    serverOrder: Order;
  } | null>(null);

  useEffect(() => {
    mockApi.setOnline(isOnline);
  }, [isOnline]);

  const refreshData = useCallback(async () => {
    try {
      const { orders: pageOrders } = await fetchPage({
        page,
        pageSize: PAGE_SIZE,
        statusFilter,
        searchTerm,
        sortBy,
      });

      const queue = await getSyncQueue();
      setOrders(pageOrders);
      setSyncQueue(queue);

      if (queue.length > 0) {
        const hasConflict = queue.some((op) => op.status === 'conflict');
        const hasFailed = queue.some((op) => op.status === 'failed');
        if (hasConflict) setSyncState('conflict');
        else if (hasFailed) setSyncState('failed');
        else setSyncState('pending');
      } else {
        setSyncState('synced');
      }
    } catch (err) {
      console.error('Erro ao carregar dados do IndexedDB:', err);
    }
  }, [page, statusFilter, searchTerm, sortBy]);

  useEffect(() => {
    async function initApp() {
      const local = await getLocalOrders();
      if (local.length === 0 && isOnline) {
        try {
          const apiOrders = await mockApi.fetchOrders();
          await saveLocalOrdersBulk(apiOrders);
        } catch (e) {
          console.error('Erro ao buscar pedidos da API inicial:', e);
        }
      }
      refreshData();
    }
    initApp();
  }, [isOnline, refreshData]);

  const handleTriggerSync = useCallback(async () => {
    if (!isOnline) return;
    setSyncState('syncing');

    const res = await processSyncQueue();
    await refreshData();

    if (res.conflicts.length > 0) {
      setConflictItem(res.conflicts[0]);
      setSyncState('conflict');
    } else if (res.failedCount > 0) {
      setSyncState('failed');
    } else {
      setSyncState('synced');
    }
  }, [isOnline, refreshData]);

  const isSyncingRef = useRef(false);
  const wasOnlineRef = useRef(isOnline);

  useEffect(() => {
    const justCameOnline = !wasOnlineRef.current && isOnline;
    wasOnlineRef.current = isOnline;
    if (isOnline && syncQueue.length > 0 && justCameOnline && !isSyncingRef.current) {
      isSyncingRef.current = true;
      handleTriggerSync().finally(() => {
        isSyncingRef.current = false;
      });
    }
  }, [isOnline, syncQueue.length, handleTriggerSync]);

  async function handleSaveOrder(orderData: Partial<Order>) {
    const isEdit = !!orderData.id;
    const orderId = orderData.id || `ord-${Date.now()}`;
    const now = Date.now();

    const existing = orders.find((o) => o.id === orderId);

    const updatedOrder: Order = {
      id: orderId,
      customerId: orderData.customerId || 'cust-1',
      customerName: orderData.customerName || 'Cliente Sem Nome',
      status: orderData.status || 'pending',
      total: orderData.total || 0,
      updatedAt: now,
      version: existing ? existing.version + 1 : 1,
    };

    await saveLocalOrder(updatedOrder);

    const syncOp: SyncOperation = {
      id: `op-${Date.now()}`,
      entity: 'order',
      entityId: orderId,
      operation: isEdit ? 'update' : 'create',
      payload: updatedOrder,
      createdAt: now,
      retryCount: 0,
      status: 'pending',
    };

    await addSyncOperation(syncOp);
    await refreshData();

    if (isOnline) {
      handleTriggerSync();
    }
  }

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const updatedOrder: Order = {
      ...target,
      status: newStatus,
      updatedAt: Date.now(),
    };

    await saveLocalOrder(updatedOrder);

    const syncOp: SyncOperation = {
      id: `op-${Date.now()}`,
      entity: 'order',
      entityId: orderId,
      operation: 'update',
      payload: updatedOrder,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await addSyncOperation(syncOp);
    await refreshData();

    if (isOnline) {
      handleTriggerSync();
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Deseja realmente excluir este pedido?')) return;

    await deleteLocalOrder(orderId);

    const syncOp: SyncOperation = {
      id: `op-${Date.now()}`,
      entity: 'order',
      entityId: orderId,
      operation: 'delete',
      payload: { id: orderId },
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await addSyncOperation(syncOp);
    await refreshData();

    if (isOnline) {
      handleTriggerSync();
    }
  };

  const handleResolveServerWins = async () => {
    if (!conflictItem) return;
    await saveLocalOrder(conflictItem.serverOrder);
    await removeSyncOperation(conflictItem.operation.id);
    setConflictItem(null);
    await refreshData();
  };

  const handleResolveClientWins = async () => {
    if (!conflictItem) return;
    const newVersion = conflictItem.serverOrder.version + 1;
    const clientPayload = conflictItem.operation.payload as Order;
    const updatedClientOrder: Order = {
      ...clientPayload,
      version: newVersion,
      updatedAt: Date.now(),
    };

    await saveLocalOrder(updatedClientOrder);
    await removeSyncOperation(conflictItem.operation.id);

    const newOp: SyncOperation = {
      id: `op-res-${Date.now()}`,
      entity: 'order',
      entityId: updatedClientOrder.id,
      operation: 'update',
      payload: updatedClientOrder,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await addSyncOperation(newOp);
    setConflictItem(null);
    await refreshData();
    handleTriggerSync();
  };

  const handleResetData = async () => {
    if (confirm('Resetar banco de dados local e servidor para o estado original?')) {
      indexedDB.deleteDatabase('FidliOrdersDB');
      mockApi.resetServerData();
      window.location.reload();
    }
  };

  const pendingOrderIds = useMemo(
    () => new Set(syncQueue.map((op) => op.entityId)),
    [syncQueue]
  );

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const matchesSearch =
          o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'updatedAt') return b.updatedAt - a.updatedAt;
        if (sortBy === 'total') return b.total - a.total;
        if (sortBy === 'customerName') return a.customerName.localeCompare(b.customerName);
        return 0;
      });
  }, [orders, searchTerm, statusFilter, sortBy]);

  return (
    <div className="app-container">
      <Header
        connectionState={isOnline ? 'online' : 'offline'}
        syncState={syncState}
        pendingOpsCount={syncQueue.length}
        onToggleConnection={() => setForcedOffline(!forcedOffline)}
        onTriggerSync={handleTriggerSync}
        onSimulateConflict={() => {
          if (orders.length > 0) {
            mockApi.setForceConflict(orders[0].id);
            alert(`Conflito 409 ativado para o pedido #${orders[0].id}. Edite ou aprove este pedido para acionar o conflito.`);
          }
        }}
        onResetData={handleResetData}
      />

      <main className="main-content">
        <OrderFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onOpenCreateModal={() => {
            setEditingOrder(null);
            setIsOrderModalOpen(true);
          }}
          totalOrdersCount={orders.length}
        />

        <OrderList
          orders={filteredOrders}
          pendingOrderIds={pendingOrderIds}
          onUpdateStatus={handleUpdateStatus}
          onEditOrder={(order) => {
            setEditingOrder(order);
            setIsOrderModalOpen(true);
          }}
          onDeleteOrder={handleDeleteOrder}
        />
      </main>

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSave={handleSaveOrder}
        initialOrder={editingOrder}
      />

      <ConflictModal
        isOpen={!!conflictItem}
        conflictData={conflictItem}
        onResolveServerWins={handleResolveServerWins}
        onResolveClientWins={handleResolveClientWins}
        onClose={() => setConflictItem(null)}
      />
    </div>
  );
}
export default App;
