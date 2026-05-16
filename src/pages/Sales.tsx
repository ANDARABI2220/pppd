import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Eye, Trash2, ShoppingCart, Minus, X, Download, Edit, Truck,
} from 'lucide-react';
import Modal from '@/components/Modal';
import DeleteConfirm from '@/components/DeleteConfirm';
import EmptyState from '@/components/EmptyState';
import Toast, { type ToastType } from '@/components/Toast';
import { db, formatCurrency, formatDate, generateInvoiceNumber, exportToCSV, addStockHistory } from '@/db/database';
import type { Sale, SaleItem, Product, Customer } from '@/types';

const paymentMethods = ['نقدی', 'کارتی', 'حواله بانکی', 'نسیه'];

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as ToastType, visible: false });

  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [shipmentDate, setShipmentDate] = useState('');
  const [shipmentReason, setShipmentReason] = useState('');

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    setToast({ message: msg, type, visible: true });
  }, []);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [s, p, c] = await Promise.all([
      db.sales.orderBy('id').reverse().toArray(),
      db.products.toArray(),
      db.customers.toArray(),
    ]);
    setSales(s); setProducts(p); setCustomers(c);
  }

  function resetForm() {
    setCustomerName(''); setCustomerId(''); setItems([]); setDiscount(0);
    setPaymentMethod(paymentMethods[0]); setSelectedProductId(''); setQuantity(1);
    setShipmentDate(''); setShipmentReason(''); setEditingSale(null);
  }
  function openAddModal() {
    resetForm();
    setShowModal(true);
  }
  function openEditModal(sale: Sale) {
    setEditingSale(sale); setCustomerName(sale.customerName); setCustomerId(sale.customerId || '');
    setItems([...sale.items]); setDiscount(sale.discount); setPaymentMethod(sale.paymentMethod);
    setShipmentDate(sale.shipmentDate || ''); setShipmentReason(sale.shipmentReason || '');
    setShowModal(true);
  }

  function addItem() {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const existing = items.find(i => i.productId === product.id!);
    if (existing) {
      setItems(items.map(i =>
        i.productId === product.id!
          ? { ...i, quantity: i.quantity + quantity, totalPrice: (i.quantity + quantity) * i.unitPrice }
          : i
      ));
    } else {
      setItems([...items, {
        productId: product.id!,
        productName: product.name,
        quantity,
        unitPrice: product.salePrice,
        purchasePrice: product.purchasePrice,
        totalPrice: quantity * product.salePrice,
      }]);
    }
    setSelectedProductId('');
    setQuantity(1);
  }

  function removeItem(productId: number) {
    setItems(items.filter(i => i.productId !== productId));
  }

  function updateItemQuantity(productId: number, newQty: number) {
    if (newQty < 1) return;
    setItems(items.map(i =>
      i.productId === productId
        ? { ...i, quantity: newQty, totalPrice: newQty * i.unitPrice }
        : i
    ));
  }

  const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const netAmount = totalAmount - discount;

  const costOfGoods = items.reduce((sum, i) => {
    const p = products.find(x => x.id === i.productId);
    return sum + (p ? p.purchasePrice * i.quantity : 0);
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;

    if (editingSale?.id) {
      for (const oldItem of editingSale.items) {
        const product = await db.products.get(oldItem.productId);
        if (product?.id) {
          await db.products.update(product.id, { stock: product.stock + oldItem.quantity });
          await addStockHistory(product.id, product.name, oldItem.quantity, product.stock + oldItem.quantity, '\u0628\u0631\u06af\u0634\u062a \u0627\u0632 \u0648\u06cc\u0631\u0627\u06cc\u0634 \u0641\u0627\u06a9\u062a\u0648\u0631');
        }
      }
      for (const item of items) {
        const product = await db.products.get(item.productId);
        if (product?.id) {
          const newStock = Math.max(0, product.stock - item.quantity);
          await db.products.update(product.id, { stock: newStock });
          await addStockHistory(product.id, product.name, -item.quantity, newStock, '\u0641\u0631\u0648\u0634 (\u0648\u06cc\u0631\u0627\u06cc\u0634)');
        }
      }
      await db.sales.update(editingSale.id, {
        customerName: customerName || '\u0645\u0634\u062a\u0631\u06cc \u0639\u0645\u0648\u0645\u06cc', customerId: customerId || undefined, items, totalAmount, discount, netAmount, paymentMethod, costOfGoods, shipmentDate: shipmentDate || undefined, shipmentReason: shipmentReason || undefined,
      });
      showToast('\u0641\u0627\u06a9\u062a\u0648\u0631 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u0634\u062f');
    } else {
      const sale: Omit<Sale, 'id'> = {
        invoiceNumber: generateInvoiceNumber(),
        customerName: customerName || '\u0645\u0634\u062a\u0631\u06cc \u0639\u0645\u0648\u0645\u06cc',
        customerId: customerId || undefined,
        items, totalAmount, discount, netAmount, paymentMethod, costOfGoods,
        shipmentDate: shipmentDate || undefined, shipmentReason: shipmentReason || undefined,
        status: 'completed', date: new Date(), createdAt: new Date(),
      };
      await db.sales.add(sale as Sale);
      for (const item of items) {
        const product = await db.products.get(item.productId);
        if (product?.id) {
          const newStock = Math.max(0, product.stock - item.quantity);
          await db.products.update(product.id, { stock: newStock });
          await addStockHistory(product.id, product.name, -item.quantity, newStock, '\u0641\u0631\u0648\u0634');
        }
      }
      showToast('\u0641\u0631\u0648\u0634 \u062c\u062f\u06cc\u062f \u062b\u0628\u062a \u0634\u062f');
    }
    setShowModal(false); loadData();
  }

  async function handleDelete() {
    if (deleteTarget?.id) {
      for (const item of deleteTarget.items) {
        const product = await db.products.get(item.productId);
        if (product?.id) {
          const newStock = product.stock + item.quantity;
          await db.products.update(product.id, { stock: newStock });
          await addStockHistory(product.id, product.name, item.quantity, newStock, '\u0628\u0631\u06af\u0634\u062a \u0627\u0632 \u062d\u0630\u0641 \u0641\u0627\u06a9\u062a\u0648\u0631');
        }
      }
      await db.sales.delete(deleteTarget.id);
      setDeleteTarget(null); showToast('\u0641\u0627\u06a9\u062a\u0648\u0631 \u062d\u0630\u0641 \u0634\u062f'); loadData();
    }
  }

  function handleExport() {
    exportToCSV(filtered.map(s => ({ '\u0634\u0645\u0627\u0631\u0647 \u0641\u0627\u06a9\u062a\u0648\u0631': s.invoiceNumber, '\u0645\u0634\u062a\u0631\u06cc': s.customerName, '\u062a\u0627\u0631\u06cc\u062e': formatDate(s.date), '\u0645\u0628\u0644\u063a \u06a9\u0644': s.totalAmount, '\u062a\u062e\u0641\u06cc\u0641': s.discount, '\u0645\u0628\u0644\u063a \u062e\u0627\u0644\u0635': s.netAmount, '\u067e\u0631\u062f\u0627\u062e\u062a': s.paymentMethod, '\u0648\u0636\u0639\u06cc\u062a': s.status })), 'sales');
    showToast('\u0641\u0627\u06cc\u0644 CSV \u062f\u0627\u0646\u0644\u0648\u062f \u0634\u062f');
  }

  function viewDetail(sale: Sale) {
    setSelectedSale(sale);
    setShowDetailModal(true);
  }

  const filtered = sales.filter(s =>
    s.invoiceNumber.includes(searchQuery) ||
    s.customerName.includes(searchQuery)
  );

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed': return { text: 'تکمیل شده', cls: 'bg-emerald-50 text-emerald-600' };
      case 'pending': return { text: 'در انتظار', cls: 'bg-amber-50 text-amber-600' };
      case 'cancelled': return { text: 'لغو شده', cls: 'bg-rose-50 text-rose-600' };
      default: return { text: status, cls: 'bg-slate-50 text-slate-600' };
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>{toast.visible && <Toast message={toast.message} type={toast.type} isVisible={true} onClose={() => setToast(t => ({...t, visible: false}))} />}</AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">فروش (دخل)</h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت فاکتورهای فروش</p>
        </div>
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleExport} className="btn-secondary flex items-center gap-2"><Download size={18} /> خروجی CSV</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAddModal} className="btn-primary flex items-center gap-2"><Plus size={18} /> فروش جدید</motion.button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="جستجو بر اساس شماره فاکتور یا نام مشتری..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-field pr-10" />
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="فروشی ثبت نشده"
          description="هنوز فاکتور فروشی ثبت نشده است"
          action={{ label: 'ثبت فروش جدید', onClick: openAddModal }}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right p-4">شماره فاکتور</th>
                  <th className="text-right p-4">مشتری</th>
                  <th className="text-right p-4">تاریخ</th>
                  <th className="text-right p-4">مبلغ کل</th>
                  <th className="text-right p-4">تخفیف</th>
                  <th className="text-right p-4">مبلغ خالص</th>
                  <th className="text-right p-4">پرداخت</th>
                  <th className="text-right p-4">وضعیت</th>
                  <th className="text-center p-4">عملیات</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((sale, index) => {
                    const status = statusLabel(sale.status);
                    return (
                      <motion.tr
                        key={sale.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.03 }}
                        className="table-row"
                      >
                        <td className="p-4 text-sm font-mono text-slate-700">{sale.invoiceNumber}</td>
                        <td className="p-4 text-sm text-slate-600">{sale.customerName}</td>
                        <td className="p-4 text-sm text-slate-600">{formatDate(sale.date)}</td>
                        <td className="p-4 text-sm text-slate-600">{formatCurrency(sale.totalAmount)}</td>
                        <td className="p-4 text-sm text-rose-500">{formatCurrency(sale.discount)}</td>
                        <td className="p-4 text-sm font-medium text-emerald-600">{formatCurrency(sale.netAmount)}</td>
                        <td className="p-4 text-sm text-slate-600">{sale.paymentMethod}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-lg ${status.cls}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => viewDetail(sale)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors" title="مشاهده"><Eye size={14} /></motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openEditModal(sale)} className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center transition-colors" title="ویرایش"><Edit size={14} /></motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setDeleteTarget(sale)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors" title="حذف"><Trash2 size={14} /></motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSale ? 'ویرایش فاکتور' : 'فروش جدید'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">مشتری ثبت‌شده</label>
              <select value={customerId} onChange={e => { setCustomerId(e.target.value ? Number(e.target.value) : ''); const c = customers.find(x => x.id === Number(e.target.value)); if (c) setCustomerName(c.name); }} className="input-field">
                <option value="">انتخاب مشتری (اختیاری)</option>
                {customers.map(c => (<option key={c.id} value={c.id}>{c.name} - {c.phone || ''}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام مشتری</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="input-field" placeholder="مشتری عمومی" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">روش پرداخت</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input-field">
                {paymentMethods.map(m => (<option key={m} value={m}>{m}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Truck size={14} /> تاریخ حمل</label>
              <input type="date" value={shipmentDate} onChange={e => setShipmentDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">دلیل حمل</label>
              <input type="text" value={shipmentReason} onChange={e => setShipmentReason(e.target.value)} className="input-field" placeholder="اختیاری" />
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">افزودن محصول</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
                className="input-field flex-1"
              >
                <option value="">انتخاب محصول...</option>
                {products.filter(p => p.stock > 0).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {formatCurrency(p.salePrice)} (موجودی: {p.stock})
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className="input-field w-24"
                min="1"
                placeholder="تعداد"
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={addItem}
                className="btn-primary whitespace-nowrap"
              >
                <Plus size={16} />
              </motion.button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-right p-3 text-xs">محصول</th>
                    <th className="text-right p-3 text-xs">تعداد</th>
                    <th className="text-right p-3 text-xs">قیمت واحد</th>
                    <th className="text-right p-3 text-xs">جمع</th>
                    <th className="text-center p-3 text-xs">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.productId} className="table-row">
                      <td className="p-3 text-sm">{item.productName}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                            className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm w-8 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-sm font-medium text-emerald-600">{formatCurrency(item.totalPrice)}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="w-6 h-6 rounded bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 mx-auto"
                        >
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">جمع کل:</span>
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">تخفیف:</span>
              <input
                type="number"
                value={discount || ''}
                onChange={e => setDiscount(Number(e.target.value))}
                className="w-32 px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm text-left"
                min="0"
              />
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-emerald-200 pt-2">
              <span className="text-emerald-700">مبلغ قابل پرداخت:</span>
              <span className="text-emerald-700">{formatCurrency(netAmount)}</span>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn-primary" disabled={items.length === 0}>
              ثبت فروش
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`فاکتور ${selectedSale?.invoiceNumber || ''}`}
        size="lg"
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">مشتری:</span>
                <span className="font-medium mr-2">{selectedSale.customerName}</span>
              </div>
              <div>
                <span className="text-slate-500">تاریخ:</span>
                <span className="font-medium mr-2">{formatDate(selectedSale.date)}</span>
              </div>
              <div>
                <span className="text-slate-500">روش پرداخت:</span>
                <span className="font-medium mr-2">{selectedSale.paymentMethod}</span>
              </div>
              <div>
                <span className="text-slate-500">وضعیت:</span>
                <span className={`mr-2 text-xs px-2 py-1 rounded-lg ${statusLabel(selectedSale.status).cls}`}>
                  {statusLabel(selectedSale.status).text}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-right p-3 text-xs">محصول</th>
                    <th className="text-right p-3 text-xs">تعداد</th>
                    <th className="text-right p-3 text-xs">قیمت واحد</th>
                    <th className="text-right p-3 text-xs">جمع</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((item, i) => (
                    <tr key={i} className="table-row">
                      <td className="p-3 text-sm">{item.productName}</td>
                      <td className="p-3 text-sm">{item.quantity}</td>
                      <td className="p-3 text-sm">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-sm font-medium">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>جمع کل:</span>
                <span>{formatCurrency(selectedSale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-rose-500">
                <span>تخفیف:</span>
                <span>{formatCurrency(selectedSale.discount)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-2 text-emerald-700">
                <span>مبلغ خالص:</span>
                <span>{formatCurrency(selectedSale.netAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف فاکتور"
        message={`آیا مطمئن هستید که می‌خواهید فاکتور "${deleteTarget?.invoiceNumber}" را حذف کنید؟`}
      />
    </div>
  );
}
