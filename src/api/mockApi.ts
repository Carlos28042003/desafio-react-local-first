import type { Order, SyncOperation } from '../types/order';

const INITIAL_SERVER_ORDERS: Order[] = [
  {
    id: 'ord-101',
    customerId: 'cust-1',
    customerName: 'Empresa Alfa Ltda',
    status: 'approved',
    total: 1250.50,
    updatedAt: Date.now() - 3600000,
    version: 1,
  },
  {
    id: 'ord-102',
    customerId: 'cust-2',
    customerName: 'Supermercado Progresso',
    status: 'pending',
    total: 3400.00,
    updatedAt: Date.now() - 7200000,
    version: 2,
  },
  {
    id: 'ord-103',
    customerId: 'cust-3',
    customerName: 'Farmácia Central',
    status: 'cancelled',
    total: 890.20,
    updatedAt: Date.now() - 10800000,
    version: 1,
  },
];

class MockApi {
  private serverOrders: Map<string, Order> = new Map();
  private isOnlineState: boolean = true;
  private simulateDelayMs: number = 300;
  private forceConflictForId: string | null = null;
  private forceError: '401' | '500' | 'timeout' | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const stored = localStorage.getItem('mock_server_orders');
    if (stored) {
      try {
        const parsed: Order[] = JSON.parse(stored);
        parsed.forEach((o) => this.serverOrders.set(o.id, o));
        return;
      } catch (e) {
        console.error('Erro ao ler mock storage:', e);
      }
    }
    INITIAL_SERVER_ORDERS.forEach((o) => this.serverOrders.set(o.id, o));
    this.saveToStorage();
  }

  private saveToStorage() {
    localStorage.setItem(
      'mock_server_orders',
      JSON.stringify(Array.from(this.serverOrders.values()))
    );
  }

  public setOnline(online: boolean) {
    this.isOnlineState = online;
  }

  public isOnline(): boolean {
    return this.isOnlineState;
  }

  public setForceConflict(orderId: string | null) {
    this.forceConflictForId = orderId;
  }

  public setForceError(errorType: '401' | '500' | 'timeout' | null) {
    this.forceError = errorType;
  }

  private async delay() {
    await new Promise((res) => setTimeout(res, this.simulateDelayMs));
  }

  private checkNetwork() {
    if (!this.isOnlineState) {
      throw new Error('Network Error: Dispositivo desconectado da internet.');
    }
    if (this.forceError === '401') {
      throw { status: 401, message: '401 Unauthorized: Sessão expirada.' };
    }
    if (this.forceError === '500') {
      throw { status: 500, message: '500 Internal Server Error: Falha no servidor.' };
    }
    if (this.forceError === 'timeout') {
      throw { status: 0, message: 'Timeout: Servidor não respondeu a tempo.' };
    }
  }

  public async fetchOrders(): Promise<Order[]> {
    await this.delay();
    this.checkNetwork();
    return Array.from(this.serverOrders.values());
  }

  public async syncOperation(op: SyncOperation): Promise<{ success: boolean; order?: Order }> {
    await this.delay();
    this.checkNetwork();

    const { operation, entityId, payload } = op;
    const existingServerOrder = this.serverOrders.get(entityId);

    if (this.forceConflictForId === entityId) {
      this.forceConflictForId = null;
      if (existingServerOrder) {
        existingServerOrder.version += 5;
        existingServerOrder.status = 'cancelled';
        existingServerOrder.updatedAt = Date.now();
        this.saveToStorage();
      }
      throw {
        status: 409,
        message: '409 Conflict: O pedido foi alterado no servidor por outro usuário.',
        serverOrder: existingServerOrder,
      };
    }

    if (operation === 'create') {
      const newOrder: Order = {
        id: entityId,
        customerId: payload.customerId || 'cust-unk',
        customerName: payload.customerName || 'Cliente sem nome',
        status: payload.status || 'pending',
        total: payload.total || 0,
        updatedAt: Date.now(),
        version: 1,
      };
      this.serverOrders.set(entityId, newOrder);
      this.saveToStorage();
      return { success: true, order: newOrder };
    }

    if (operation === 'update') {
      if (!existingServerOrder) {
        throw { status: 404, message: '404 Not Found: Pedido não existe no servidor.' };
      }

      const clientVersion = (payload.version ?? 0);
      if (clientVersion < existingServerOrder.version) {
        throw {
          status: 409,
          message: `409 Conflict: Versão local (${clientVersion}) defasada da versão servidor (${existingServerOrder.version}).`,
          serverOrder: existingServerOrder,
        };
      }

      const updatedOrder: Order = {
        ...existingServerOrder,
        ...payload,
        id: entityId,
        version: existingServerOrder.version + 1,
        updatedAt: Date.now(),
      };

      this.serverOrders.set(entityId, updatedOrder);
      this.saveToStorage();
      return { success: true, order: updatedOrder };
    }

    if (operation === 'delete') {
      this.serverOrders.delete(entityId);
      this.saveToStorage();
      return { success: true };
    }

    throw new Error(`Operação desconhecida: ${operation}`);
  }

  public resetServerData() {
    localStorage.removeItem('mock_server_orders');
    this.serverOrders.clear();
    INITIAL_SERVER_ORDERS.forEach((o) => this.serverOrders.set(o.id, o));
    this.saveToStorage();
  }
}

export const mockApi = new MockApi();

export async function callMockApi(op: SyncOperation): Promise<{ success: boolean; order?: Order }> {
  return mockApi.syncOperation(op);
}
