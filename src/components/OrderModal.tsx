import React, { useState, useEffect } from 'react';
import type { Order, OrderStatus } from '../types/order';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: Partial<Order>) => void;
  initialOrder?: Order | null;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialOrder,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [total, setTotal] = useState<number | ''>('');
  const [status, setStatus] = useState<OrderStatus>('pending');

  useEffect(() => {
    if (initialOrder) {
      setCustomerName(initialOrder.customerName);
      setCustomerId(initialOrder.customerId);
      setTotal(initialOrder.total);
      setStatus(initialOrder.status);
    } else {
      setCustomerName('');
      setCustomerId(`cust-${Math.floor(Math.random() * 1000)}`);
      setTotal('');
      setStatus('pending');
    }
  }, [initialOrder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || total === '' || Number(total) <= 0) {
      alert('Por favor, preencha o nome do cliente e um valor válido.');
      return;
    }

    onSave({
      id: initialOrder ? initialOrder.id : undefined,
      customerName,
      customerId,
      total: Number(total),
      status,
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2 className="modal-title">
          {initialOrder ? 'Editar Pedido' : 'Criar Novo Pedido'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome do Cliente *</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: Comercial Maputo Lda"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>ID do Cliente</label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Valor Total (MZN) *</label>
            <input
              type="number"
              step="0.01"
              required
              min="0"
              value={total}
              onChange={(e) => setTotal(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="form-input"
            >
              <option value="pending">Pendente</option>
              <option value="approved">Aprovado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {initialOrder ? 'Salvar Alterações' : 'Criar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
