import { getDB } from './indexedDB';
import type { Order, OrderStatus } from '../types/order';

interface PageParams {
  page: number;
  pageSize: number;
  statusFilter?: OrderStatus | 'all';
  searchTerm?: string;
  sortBy?: 'updatedAt' | 'total' | 'customerName';
}

interface PageResult {
  orders: Order[];
  totalCount: number;
}

export async function fetchPage({
  page,
  pageSize,
  statusFilter = 'all',
  searchTerm = '',
  sortBy = 'updatedAt',
}: PageParams): Promise<PageResult> {
  const db = await getDB();
  const all: Order[] = await db.getAll('orders');

  const filtered = all.filter((o) => {
    const matchesSearch =
      !searchTerm ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'updatedAt') return b.updatedAt - a.updatedAt;
    if (sortBy === 'total') return b.total - a.total;
    if (sortBy === 'customerName') return a.customerName.localeCompare(b.customerName);
    return 0;
  });

  const start = (page - 1) * pageSize;
  const orders = filtered.slice(start, start + pageSize);

  return { orders, totalCount: filtered.length };
}

export async function getOrdersPage(params: {
  page: number;
  pageSize: number;
  status?: OrderStatus | 'all';
  search?: string;
  sortField?: 'updatedAt' | 'total' | 'customerName' | 'status';
  sortDirection?: 'asc' | 'desc';
}): Promise<Order[]> {
  const db = await getDB();
  const all: Order[] = await db.getAll('orders');

  const filtered = all.filter((o) => {
    const matchesSearch =
      !params.search ||
      o.customerName.toLowerCase().includes(params.search.toLowerCase()) ||
      o.id.toLowerCase().includes(params.search.toLowerCase());
    const matchesStatus = !params.status || params.status === 'all' || o.status === params.status;
    return matchesSearch && matchesStatus;
  });

  const sortField = params.sortField || 'updatedAt';
  const sortDirection = params.sortDirection || 'desc';

  filtered.sort((a, b) => {
    let comp = 0;
    if (sortField === 'updatedAt') comp = a.updatedAt - b.updatedAt;
    else if (sortField === 'total') comp = a.total - b.total;
    else if (sortField === 'customerName') comp = a.customerName.localeCompare(b.customerName);
    else if (sortField === 'status') comp = a.status.localeCompare(b.status);
    return sortDirection === 'asc' ? comp : -comp;
  });

  const start = (params.page - 1) * params.pageSize;
  return filtered.slice(start, start + params.pageSize);
}

export async function getOrdersCount(status?: OrderStatus | 'all', search?: string): Promise<number> {
  const db = await getDB();
  const all: Order[] = await db.getAll('orders');
  return all.filter((o) => {
    const matchesSearch =
      !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !status || status === 'all' || o.status === status;
    return matchesSearch && matchesStatus;
  }).length;
}

export async function getStatusCounts(): Promise<Record<OrderStatus, number>> {
  const db = await getDB();
  const all: Order[] = await db.getAll('orders');
  const counts: Record<OrderStatus, number> = { pending: 0, approved: 0, cancelled: 0 };
  for (const o of all) {
    if (counts[o.status] !== undefined) {
      counts[o.status]++;
    }
  }
  return counts;
}