import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  ShoppingBag,
  Minus,
  X,
} from 'lucide-react';
import Modal from '@/components/Modal';
import DeleteConfirm from '@/components/DeleteConfirm';
import EmptyState from '@/components/EmptyState';
import { db, formatCurrency, formatDate } from '@/db/database';
import type { Purchase, PurchaseItem, Product, Supplier } from '@/types';

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);

  const [supplierName, setSupplierName] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [pu, pr, su] = await Promise.all([
      db.purchases.orderBy('id').reverse().toArray(),
      db.products.toArray(),
      db.suppliers.toArray(),
    ]);
    setPurchases(pu);
    setProducts(pr);
    setSuppliers(su);
  }

  function openAddModal() {
    setSupplierName('');
    setItems([]);
    setSelectedProductId('');
    setQuantity(1);
    setUnitPrice(0);
    setShowModal(true);
  }

  function addItem() {
    if (!selectedProductId || unitPrice <= 0) return;
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
        unitPrice,
        totalPrice: quantity * unitPrice,
      }]);
    }
    setSelectedProductId('');
    setQuantity(1);
    setUnitPrice(0);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;

    const purchase: Omit<Purchase, 'id'> = {
      supplierName: supplierName || 'تأمین‌کننده عمومی',
      items,
      totalAmount,
      date: new Date(),
      createdAt: new Date(),
    };

    await db.purchases.add(purchase as Purchase);

    for (const item of items) {
      const product = await db.products.get(item.productId);
      if (product?.id) {
        await db.products.update(product.id, {
          stock: product.stock + item.quantity,
          purchasePrice: item.unitPrice,
        });
      }
    }

    setShowModal(false);
    loadData();
  }

  async function handleDelete() {
    if (deleteTarget?.id) {
      await db.purchases.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    }
  }

  function viewDetail(purchase: Purchase) {
    setSelectedPurchase(purchase);
    setShowDetailModal(true);
  }

  function handleProductSelect(id: number | '') {
    setSelectedProductId(id);
    if (id) {
      const product = products.find(p => p.id === id);
      if (product) setUnitPrice(product.purchasePrice);
    }
  }

  const filtered = purchases.filter(p =>
    p.supplierName.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">خرید از تأمین‌کننده</h1>
          <p className="text-sm text-slate-500 mt-1">ثبت و مدیریت خریدها</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          خرید جدید
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="جستجو بر اساس نام تأمین‌کننده..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field pr-10"
          />
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="خریدی ثبت نشده"
          description="هنوز خریدی از تأمین‌کننده ثبت نشده است"
          action={{ label: 'ثبت خرید جدید', onClick: openAddModal }}
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
                  <th className="text-right p-4">تأمین‌کننده</th>
                  <th className="text-right p-4">تعداد اقلام</th>
                  <th className="text-right p-4">مبلغ کل</th>
                  <th className="text-right p-4">تاریخ</th>
                  <th className="text-center p-4">عملیات</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((purchase, index) => (
                    <motion.tr
                      key={purchase.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4 text-sm text-slate-700 font-medium">{purchase.supplierName}</td>
                      <td className="p-4 text-sm text-slate-600">{purchase.items.length} قلم</td>
                      <td className="p-4 text-sm font-medium text-amber-600">{formatCurrency(purchase.totalAmount)}</td>
                      <td className="p-4 text-sm text-slate-600">{formatDate(purchase.date)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => viewDetail(purchase)}
                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                          >
                            <Eye size={14} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setDeleteTarget(purchase)}
                            className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors"
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="ثبت خرید جدید"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تأمین‌کننده</label>
            <select
              value={supplierName}
              onChange={e => setSupplierName(e.target.value)}
              className="input-field"
            >
              <option value="">انتخاب تأمین‌کننده...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.name}>{s.name} {s.company ? `(${s.company})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">افزودن محصول</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedProductId}
                onChange={e => handleProductSelect(e.target.value ? Number(e.target.value) : '')}
                className="input-field flex-1"
              >
                <option value="">انتخاب محصول...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
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
              <input
                type="number"
                value={unitPrice || ''}
                onChange={e => setUnitPrice(Number(e.target.value))}
                className="input-field w-32"
                min="0"
                placeholder="قیمت واحد"
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
                      <td className="p-3 text-sm font-medium text-amber-600">{formatCurrency(item.totalPrice)}</td>
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

          <div className="bg-amber-50 rounded-xl p-4">
            <div className="flex justify-between text-sm font-bold text-amber-700">
              <span>مجموع خرید:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn-primary" disabled={items.length === 0}>
              ثبت خرید
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`جزئیات خرید از ${selectedPurchase?.supplierName || ''}`}
        size="lg"
      >
        {selectedPurchase && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">تأمین‌کننده:</span>
                <span className="font-medium mr-2">{selectedPurchase.supplierName}</span>
              </div>
              <div>
                <span className="text-slate-500">تاریخ:</span>
                <span className="font-medium mr-2">{formatDate(selectedPurchase.date)}</span>
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
                  {selectedPurchase.items.map((item, i) => (
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

            <div className="bg-amber-50 rounded-xl p-4">
              <div className="flex justify-between font-bold text-amber-700">
                <span>مجموع:</span>
                <span>{formatCurrency(selectedPurchase.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف خرید"
        message="آیا مطمئن هستید که می‌خواهید این خرید را حذف کنید؟"
      />
    </div>
  );
}
