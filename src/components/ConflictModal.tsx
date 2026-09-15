import React from 'react';
import type { Order, SyncOperation } from '../types/order';
import { ShieldAlert } from 'lucide-react';

interface ConflictModalProps {
  isOpen: boolean;
  conflictData: { operation: SyncOperation; serverOrder: Order } | null;
  onResolveServerWins: () => void;
  onResolveClientWins: () => void;
  onClose: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  conflictData,
  onResolveServerWins,
  onResolveClientWins,
  onClose,
}) => {
  if (!isOpen || !conflictData) return null;

  const { operation, serverOrder } = conflictData;
  const clientPayload = operation.payload as Partial<Order>;

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-lg">
        <div className="conflict-header">
          <ShieldAlert size={28} className="text-warning" />
          <div>
            <h2 className="modal-title">Conflito de Versão Identificado (409)</h2>
            <p className="text-sm text-muted">
              O pedido <strong>#{operation.entityId}</strong> foi alterado no servidor enquanto você estava offline.
            </p>
          </div>
        </div>

        <div className="conflict-grid">
          <div className="conflict-box local-box">
            <h3>Versão Local (Sua Alteração)</h3>
            <div className="conflict-detail">
              <p><strong>Cliente:</strong> {clientPayload.customerName || 'N/A'}</p>
              <p><strong>Status:</strong> {clientPayload.status || 'N/A'}</p>
              <p><strong>Total:</strong> MZN {clientPayload.total?.toFixed(2) || '0.00'}</p>
              <p><strong>Versão:</strong> v{clientPayload.version ?? 0}</p>
            </div>
          </div>

          <div className="conflict-box server-box">
            <h3>Versão Servidor (Atual no Backend)</h3>
            <div className="conflict-detail">
              <p><strong>Cliente:</strong> {serverOrder.customerName}</p>
              <p><strong>Status:</strong> {serverOrder.status}</p>
              <p><strong>Total:</strong> MZN {serverOrder.total.toFixed(2)}</p>
              <p><strong>Versão:</strong> v{serverOrder.version}</p>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-outline">
            Resolver depois
          </button>
          <button onClick={onResolveServerWins} className="btn btn-primary">
            Usar Servidor (Server Wins)
          </button>
          <button onClick={onResolveClientWins} className="btn btn-warning">
            Sobrescrever com Local (Client Wins)
          </button>
        </div>
      </div>
    </div>
  );
};
