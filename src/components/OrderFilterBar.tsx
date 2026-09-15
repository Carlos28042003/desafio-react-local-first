import React from 'react';
import { Search, Plus } from 'lucide-react';
import type { OrderStatus } from '../types/order';

interface OrderFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: OrderStatus | 'all';
  onStatusFilterChange: (status: OrderStatus | 'all') => void;
  sortBy: 'updatedAt' | 'total' | 'customerName';
  onSortChange: (sort: 'updatedAt' | 'total' | 'customerName') => void;
  onOpenCreateModal: () => void;
  totalOrdersCount: number;
}

export const OrderFilterBar: React.FC<OrderFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  onOpenCreateModal,
  totalOrdersCount,
}) => {
  return (
    <div className="filter-bar">
      <div className="search-box">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Pesquisar por cliente ou ID..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-search"
        />
      </div>

      <div className="filter-group">
        <span className="filter-label">Status:</span>
        <button
          className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => onStatusFilterChange('all')}
        >
          Todos ({totalOrdersCount})
        </button>
        <button
          className={`filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => onStatusFilterChange('pending')}
        >
          Pendente
        </button>
        <button
          className={`filter-tab ${statusFilter === 'approved' ? 'active' : ''}`}
          onClick={() => onStatusFilterChange('approved')}
        >
          Aprovado
        </button>
        <button
          className={`filter-tab ${statusFilter === 'cancelled' ? 'active' : ''}`}
          onClick={() => onStatusFilterChange('cancelled')}
        >
          Cancelado
        </button>
      </div>

      <div className="sort-group">
        <label htmlFor="sort-select" className="filter-label">
          Ordenar:
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
          className="select-sort"
        >
          <option value="updatedAt">Mais recente</option>
          <option value="total">Valor total</option>
          <option value="customerName">Nome do cliente</option>
        </select>

        <button onClick={onOpenCreateModal} className="btn btn-primary btn-add">
          <Plus size={16} />
          <span>Novo Pedido</span>
        </button>
      </div>
    </div>
  );
};
