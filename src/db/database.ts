import Dexie, { type Table } from 'dexie';
import type { Product, Customer, Supplier, Sale, Expense, Purchase } from '@/types';

export class AccountingDatabase extends Dexie {
  products!: Table<Product, number>;
  customers!: Table<Customer, number>;
  suppliers!: Table<Supplier, number>;
  sales!: Table<Sale, number>;
  expenses!: Table<Expense, number>;
  purchases!: Table<Purchase, number>;

  constructor() {
    super('HealthShopAccounting');
    this.version(1).stores({
      products: '++id, name, category, barcode, stock',
      customers: '++id, name, phone',
      suppliers: '++id, name, phone, company',
      sales: '++id, invoiceNumber, customerName, date, status',
      expenses: '++id, category, date',
      purchases: '++id, supplierName, date',
    });
  }
}

export const db = new AccountingDatabase();

export function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  const r = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${y}${m}${d}-${r}`;
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('fa-AF')} ؋`;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fa-AF', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fa-AF');
}

export function getToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function getStartOfYear(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
}
