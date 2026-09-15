import React from 'react';
import type { Order, OrderStatus } from '../types/order';
import { Check, X, Clock, Edit2, Trash2, CloudOff } from 'lucide-react';

interface OrderListProps {
  orders: Order[];
  pendingOrderIds: Set<string>;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onEditOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  pendingOrderIds,
  onUpdateStatus,
  onEditOrder,
  onDeleteOrder,
}) => {
  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <p>Nenhum pedido encontrado com os filtros atuais.</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN',
    }).format(val);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-PT');
  };

  return (
    <div className="orders-table-wrapper">
      <table className="orders-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Status</th>
            <th>Total</th>
            <th>Versão</th>
            <th>Atualizado em</th>
            <th>Sincronização</th>
            <th className="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const isPendingSync = pendingOrderIds.has(order.id);

            return (
              <tr key={order.id} className={isPendingSync ? 'row-pending-sync' : ''}>
                <td className="font-mono text-sm">{order.id}</td>
                <td className="font-bold">{order.customerName}</td>
                <td>
                  <span className={`badge badge-${order.status}`}>
                    {order.status === 'pending' && <Clock size={12} />}
                    {order.status === 'approved' && <Check size={12} />}
                    {order.status === 'cancelled' && <X size={12} />}
                    {order.status.toUpperCase()}
                  </span>
                </td>
                <td className="font-semibold">{formatCurrency(order.total)}</td>
                <td>
                  <span className="version-tag">v{order.version}</span>
                </td>
                <td className="text-muted text-sm">{formatDate(order.updatedAt)}</td>
                <td>
                  {isPendingSync ? (
                    <span className="badge badge-warning text-xs">
                      <CloudOff size={12} />
                      Aguardando Sync
                    </span>
                  ) : (
                    <span className="badge badge-success text-xs">Sincronizado</span>
                  )}
                </td>
                <td className="text-right actions-cell">
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onUpdateStatus(order.id, 'approved')}
                        className="btn-icon btn-icon-success"
                        title="Aprovar pedido (Optimistic UI)"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => onUpdateStatus(order.id, 'cancelled')}
                        className="btn-icon btn-icon-danger"
                        title="Cancelar pedido"
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onEditOrder(order)}
                    className="btn-icon"
                    title="Editar pedido"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteOrder(order.id)}
                    className="btn-icon btn-icon-danger"
                    title="Excluir pedido"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
