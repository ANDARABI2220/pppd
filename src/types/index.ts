export interface Product {
  id?: number;
  name: string;
  category: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  barcode?: string;
  description?: string;
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
  paymentMethod: string;
  status: 'completed' | 'pending' | 'cancelled';
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
  totalProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  todaySales: number;
  todayExpenses: number;
}

export type PageType =
  | 'dashboard'
  | 'products'
  | 'sales'
  | 'expenses'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'reports';
