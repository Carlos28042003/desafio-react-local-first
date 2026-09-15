export type OrderStatus = "pending" | "approved" | "cancelled";

export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  total: number;
  updatedAt: number;
  version: number;
  isLocalOnly?: boolean;
};

export type SyncOperationType = "create" | "update" | "delete";
export type OperationStatus = "pending" | "processing" | "failed" | "conflict";

export type SyncOperation = {
  id: string;
  entity: "order";
  entityId: string;
  operation: SyncOperationType;
  payload: Partial<Order>;
  createdAt: number;
  retryCount: number;
  status: OperationStatus;
  errorMessage?: string;
};

export type ConnectionState = "online" | "offline";
export type SyncState = "synced" | "syncing" | "pending" | "failed" | "conflict";
