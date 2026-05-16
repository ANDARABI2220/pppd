export interface BatchItem {
  id: string;
  quantity: number;
  expiryDate?: string;
  purchaseDate: string;
  note?: string;
}

export interface Product {
  id?: number;
  name: string;
  category: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  reorderPoint: number;
  barcode?: string;
  description?: string;
  expiryDate?: string;
  batches: BatchItem[];
  createdAt: Date;
}

export interface StockHistory {
  id?: number;
  productId: number;
  productName: string;
  quantityChange: number;
  newStock: number;
  reason: string;
  date: Date;
}

export interface Category {
  id?: number;
  name: string;
  type: 'product' | 'expense';
  createdAt: Date;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  address: string;
  balance: number;
  createdAt: Date;
}

export interface Supplier {
  id?: number;
  name: string;
  phone: string;
  address: string;
  company: string;
  balance: number;
  createdAt: Date;
}

export interface SaleItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  totalPrice: number;
}

export interface Sale {
  id?: number;
  invoiceNumber: string;
  customerName: string;
  customerId?: number;
  items: SaleItem[];
  totalAmount: number;
  discount: number;
  netAmount: number;
  costOfGoods: number;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'cancelled';
  shipmentDate?: string;
  shipmentReason?: string;
  date: Date;
  createdAt: Date;
}

export interface Expense {
  id?: number;
  category: string;
  description: string;
  amount: number;
  date: Date;
  paymentMethod: string;
  shipmentDate?: string;
  shipmentReason?: string;
  createdAt: Date;
}

export interface Purchase {
  id?: number;
  supplierId?: number;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  date: Date;
  createdAt: Date;
}

export interface PurchaseItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DashboardStats {
  totalSales: number;
  totalExpenses: number;
  totalProfit: number;
  netProfit: number;
  costOfGoods: number;
  totalProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  todaySales: number;
  todayExpenses: number;
}

export interface AppSettings {
  id?: number;
  key: string;
  value: string;
}

export type PageType =
  | 'dashboard'
  | 'products'
  | 'sales'
  | 'expenses'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'reports'
  | 'settings';
