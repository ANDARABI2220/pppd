import Dexie, { type Table } from 'dexie';
import type { Product, Customer, Supplier, Sale, Expense, Purchase, StockHistory, Category, AppSettings } from '@/types';

export class AccountingDatabase extends Dexie {
  products!: Table<Product, number>;
  customers!: Table<Customer, number>;
  suppliers!: Table<Supplier, number>;
  sales!: Table<Sale, number>;
  expenses!: Table<Expense, number>;
  purchases!: Table<Purchase, number>;
  stockHistory!: Table<StockHistory, number>;
  categories!: Table<Category, number>;
  appSettings!: Table<AppSettings, number>;

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
    this.version(2).stores({
      products: '++id, name, category, barcode, stock',
      customers: '++id, name, phone',
      suppliers: '++id, name, phone, company',
      sales: '++id, invoiceNumber, customerName, date, status',
      expenses: '++id, category, date',
      purchases: '++id, supplierName, date',
      stockHistory: '++id, productId, date',
      categories: '++id, name, type',
      appSettings: '++id, key',
    }).upgrade(tx => {
      return tx.table('products').toCollection().modify(product => {
        if (!product.reorderPoint) product.reorderPoint = product.minStock || 5;
        if (!product.batches) product.batches = [];
      });
    });
  }
}

export const db = new AccountingDatabase();

export async function addStockHistory(
  productId: number,
  productName: string,
  quantityChange: number,
  newStock: number,
  reason: string
) {
  await db.stockHistory.add({
    productId,
    productName,
    quantityChange,
    newStock,
    reason,
    date: new Date(),
  });
}

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

export function exportToCSV(data: Record<string, string | number>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    '\uFEFF' + headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function checkLowStockNotifications() {
  if (!('Notification' in window)) return;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const products = await db.products.toArray();
  const lowStock = products.filter(p => p.stock <= p.reorderPoint);
  if (lowStock.length > 0) {
    new Notification('هشدار موجودی کم', {
      body: `${lowStock.length} محصول نیاز به سفارش مجدد دارد`,
      icon: '/vite.svg',
    });
  }
}

export async function getAppSetting(key: string): Promise<string | null> {
  const setting = await db.appSettings.where('key').equals(key).first();
  return setting?.value ?? null;
}

export async function setAppSetting(key: string, value: string) {
  const existing = await db.appSettings.where('key').equals(key).first();
  if (existing?.id) {
    await db.appSettings.update(existing.id, { value });
  } else {
    await db.appSettings.add({ key, value });
  }
}
