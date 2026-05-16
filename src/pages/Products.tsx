import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit, Trash2, Package, AlertTriangle, Download, History, Calendar, Filter,
} from 'lucide-react';
import Modal from '@/components/Modal';
import DeleteConfirm from '@/components/DeleteConfirm';
import EmptyState from '@/components/EmptyState';
import Toast, { type ToastType } from '@/components/Toast';
import { db, formatCurrency, formatDate, exportToCSV, addStockHistory } from '@/db/database';
import type { Product, Category, StockHistory, BatchItem } from '@/types';

const units = ['عدد', 'بسته', 'جعبه', 'شیشه', 'تیوب', 'قوطی', 'کیلوگرم', 'لیتر'];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStock, setFilterStock] = useState<'all'|'low'|'out'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<StockHistory[]>([]);
  const [historyName, setHistoryName] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' as ToastType, visible: false });
  const [name, setName] = useState('');
  const [fCat, setFCat] = useState('');
  const [fUnit, setFUnit] = useState(units[0]);
  const [fPurchase, setFPurchase] = useState(0);
  const [fSale, setFSale] = useState(0);
  const [fStock, setFStock] = useState(0);
  const [fMinStock, setFMinStock] = useState(5);
  const [fReorder, setFReorder] = useState(5);
  const [fBarcode, setFBarcode] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fExpiry, setFExpiry] = useState('');
  const [fBatchNote, setFBatchNote] = useState('');

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    setToast({ message: msg, type, visible: true });
  }, []);

  useEffect(() => { loadProducts(); loadCats(); }, []);

  async function loadProducts() {
    setProducts(await db.products.toArray());
  }
  async function loadCats() {
    const c = await db.categories.where('type').equals('product').toArray();
    setCats(c.map((x: Category) => x.name));
  }
  function resetForm() {
    setName(''); setFCat(''); setFUnit(units[0]); setFPurchase(0); setFSale(0);
    setFStock(0); setFMinStock(5); setFReorder(5); setFBarcode(''); setFDesc(''); setFExpiry(''); setFBatchNote('');
  }
  function openAddModal() {
    setEditingProduct(null); resetForm(); setFCat(cats[0] || '');
    setShowModal(true);
  }
  function openEditModal(product: Product) {
    setEditingProduct(product);
    setName(product.name); setFCat(product.category); setFUnit(product.unit);
    setFPurchase(product.purchasePrice); setFSale(product.salePrice);
    setFStock(product.stock); setFMinStock(product.minStock);
    setFReorder(product.reorderPoint || product.minStock);
    setFBarcode(product.barcode || ''); setFDesc(product.description || '');
    setFExpiry(product.expiryDate || '');
    setShowModal(true);
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const batches: BatchItem[] = [];
    if (fStock > 0 && !editingProduct) {
      batches.push({ id: Date.now().toString(), quantity: fStock, expiryDate: fExpiry || undefined, purchaseDate: new Date().toISOString().split('T')[0], note: fBatchNote || undefined });
    }
    const data = { name, category: fCat || cats[0] || 'سایر', unit: fUnit, purchasePrice: fPurchase, salePrice: fSale, stock: fStock, minStock: fMinStock, reorderPoint: fReorder, barcode: fBarcode, description: fDesc, expiryDate: fExpiry, batches: editingProduct?.batches || batches };
    if (editingProduct?.id) {
      const oldStock = editingProduct.stock;
      await db.products.update(editingProduct.id, data);
      if (oldStock !== fStock) await addStockHistory(editingProduct.id, name, fStock - oldStock, fStock, 'ویرایش محصول');
      showToast('محصول بروزرسانی شد');
    } else {
      const id = await db.products.add({ ...data, createdAt: new Date() } as Product);
      if (fStock > 0) await addStockHistory(id as number, name, fStock, fStock, 'موجودی اولیه');
      showToast('محصول جدید اضافه شد');
    }
    setShowModal(false); loadProducts();
  }
  async function handleDelete() {
    if (deleteTarget?.id) {
      await db.products.delete(deleteTarget.id);
      setDeleteTarget(null); showToast('محصول حذف شد'); loadProducts();
    }
  }
  async function viewHistory(p: Product) {
    if (!p.id) return;
    setHistoryData(await db.stockHistory.where('productId').equals(p.id).reverse().toArray());
    setHistoryName(p.name); setShowHistory(true);
  }
  function handleExport() {
    exportToCSV(filtered.map(p => ({ 'نام': p.name, 'دسته‌بندی': p.category, 'قیمت خرید': p.purchasePrice, 'قیمت فروش': p.salePrice, 'موجودی': p.stock, 'حد سفارش': p.reorderPoint || p.minStock, 'واحد': p.unit, 'انقضا': p.expiryDate || '-', 'بارکد': p.barcode || '-' })), 'products');
    showToast('فایل CSV دانلود شد');
  }
  const isExpiringSoon = (d?: string) => { if (!d) return false; const diff = new Date(d).getTime() - Date.now(); return diff > 0 && diff < 30*24*60*60*1000; };
  const isExpired = (d?: string) => { if (!d) return false; return new Date(d).getTime() < Date.now(); };

  const filtered = products.filter(p => {
    const s = p.name.includes(searchQuery) || p.barcode?.includes(searchQuery) || p.category.includes(searchQuery);
    const c = !filterCategory || p.category === filterCategory;
    const st = filterStock === 'all' || (filterStock === 'low' && p.stock <= (p.reorderPoint || p.minStock) && p.stock > 0) || (filterStock === 'out' && p.stock === 0);
    const pr = (!priceMin || p.salePrice >= Number(priceMin)) && (!priceMax || p.salePrice <= Number(priceMax));
    return s && c && st && pr;
  });

  return (
    <div className="space-y-6">
      <AnimatePresence>{toast.visible && <Toast message={toast.message} type={toast.type} isVisible={true} onClose={() => setToast(t => ({...t, visible: false}))} />}</AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">محصولات و موجودی</h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت محصولات و کنترل موجودی انبار</p>
        </div>
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download size={18} /> خروجی CSV
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> افزودن محصول
          </motion.button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="جستجوی محصول..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-field pr-10" />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field sm:w-48">
            <option value="">همه دسته‌بندی‌ها</option>
            {cats.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
          <select value={filterStock} onChange={e => setFilterStock(e.target.value as 'all'|'low'|'out')} className="input-field sm:w-40">
            <option value="all">همه وضعیت‌ها</option>
            <option value="low">کم‌موجودی</option>
            <option value="out">اتمام شده</option>
          </select>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-1">
            <Filter size={16} /> فیلتر
          </motion.button>
        </div>
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl">
              <span className="text-sm text-slate-600">محدوده قیمت:</span>
              <input type="number" placeholder="از" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="input-field w-28" min="0" />
              <span className="text-slate-400">تا</span>
              <input type="number" placeholder="تا" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="input-field w-28" min="0" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="محصولی یافت نشد"
          description="هنوز محصولی ثبت نشده یا نتیجه‌ای برای جستجوی شما وجود ندارد"
          action={{ label: 'افزودن محصول', onClick: openAddModal }}
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
                  <th className="text-right p-4">نام محصول</th>
                  <th className="text-right p-4">دسته‌بندی</th>
                  <th className="text-right p-4">قیمت خرید</th>
                  <th className="text-right p-4">قیمت فروش</th>
                  <th className="text-right p-4">موجودی</th>
                  <th className="text-right p-4">انقضا</th>
                  <th className="text-right p-4">وضعیت</th>
                  <th className="text-center p-4">عملیات</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((product, index) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-800">{product.name}</p>
                            {product.barcode && (
                              <p className="text-xs text-slate-400">{product.barcode}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{product.category}</td>
                      <td className="p-4 text-sm text-slate-600">{formatCurrency(product.purchasePrice)}</td>
                      <td className="p-4 text-sm font-medium text-emerald-600">{formatCurrency(product.salePrice)}</td>
                      <td className="p-4 text-sm text-slate-600">{product.stock.toLocaleString('fa-AF')} {product.unit}</td>
                      <td className="p-4 text-sm">
                        {product.expiryDate ? (
                          isExpired(product.expiryDate) ? (
                            <span className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-lg w-fit"><Calendar size={12} /> منقضی شده</span>
                          ) : isExpiringSoon(product.expiryDate) ? (
                            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg w-fit"><Calendar size={12} /> نزدیک انقضا</span>
                          ) : (
                            <span className="text-slate-500">{product.expiryDate}</span>
                          )
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-4">
                        {product.stock === 0 ? (
                          <span className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-lg w-fit"><AlertTriangle size={12} /> تمام شده</span>
                        ) : product.stock <= (product.reorderPoint || product.minStock) ? (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg w-fit"><AlertTriangle size={12} /> کم‌موجودی</span>
                        ) : (
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">موجود</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => viewHistory(product)} className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center transition-colors" title="تاریخچه"><History size={14} /></motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openEditModal(product)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors" title="ویرایش"><Edit size={14} /></motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setDeleteTarget(product)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors" title="حذف"><Trash2 size={14} /></motion.button>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام محصول *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="نام محصول را وارد کنید" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">دسته‌بندی</label>
              <select value={fCat} onChange={e => setFCat(e.target.value)} className="input-field">
                {cats.map(c => (<option key={c} value={c}>{c}</option>))}
                <option value="سایر">سایر</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">قیمت خرید (؋)</label>
              <input type="number" value={fPurchase || ''} onChange={e => setFPurchase(Number(e.target.value))} className="input-field" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">قیمت فروش (؋)</label>
              <input type="number" value={fSale || ''} onChange={e => setFSale(Number(e.target.value))} className="input-field" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">موجودی</label>
              <input type="number" value={fStock || ''} onChange={e => setFStock(Number(e.target.value))} className="input-field" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">حداقل موجودی</label>
              <input type="number" value={fMinStock || ''} onChange={e => setFMinStock(Number(e.target.value))} className="input-field" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">حد سفارش مجدد</label>
              <input type="number" value={fReorder || ''} onChange={e => setFReorder(Number(e.target.value))} className="input-field" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">واحد</label>
              <select value={fUnit} onChange={e => setFUnit(e.target.value)} className="input-field">
                {units.map(u => (<option key={u} value={u}>{u}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ انقضا</label>
              <input type="date" value={fExpiry} onChange={e => setFExpiry(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">بارکد</label>
              <input type="text" value={fBarcode} onChange={e => setFBarcode(e.target.value)} className="input-field" placeholder="اختیاری" />
            </div>
          </div>
          {!editingProduct && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت بچ</label>
              <input type="text" value={fBatchNote} onChange={e => setFBatchNote(e.target.value)} className="input-field" placeholder="مثلاً: بچ وارداتی اردیبهشت" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
            <textarea value={fDesc} onChange={e => setFDesc(e.target.value)} className="input-field min-h-[80px] resize-none" placeholder="توضیحات اختیاری" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">{editingProduct ? 'بروزرسانی' : 'ذخیره'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title={`تاریخچه موجودی: ${historyName}`} size="lg">
        {historyData.length === 0 ? (
          <p className="text-center text-slate-500 py-8">هنوز تاریخچه‌ای ثبت نشده</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {historyData.map((h, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-700">{h.reason}</p>
                  <p className="text-xs text-slate-400">{formatDate(h.date)}</p>
                </div>
                <div className="text-left">
                  <span className={`text-sm font-bold ${h.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {h.quantityChange > 0 ? '+' : ''}{h.quantityChange}
                  </span>
                  <p className="text-xs text-slate-400">موجودی: {h.newStock}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Modal>

      <DeleteConfirm isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="حذف محصول" message={`آیا مطمئن هستید که می‌خواهید "${deleteTarget?.name}" را حذف کنید؟`} />
    </div>
  );
}
