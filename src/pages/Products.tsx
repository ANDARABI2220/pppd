import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
} from 'lucide-react';
import Modal from '@/components/Modal';
import DeleteConfirm from '@/components/DeleteConfirm';
import EmptyState from '@/components/EmptyState';
import { db, formatCurrency } from '@/db/database';
import type { Product } from '@/types';

const categories = [
  'مراقبت پوست',
  'مراقبت مو',
  'بهداشت دهان',
  'بهداشت بدن',
  'لوازم آرایشی',
  'محصولات طبی',
  'ویتامین و مکمل',
  'لوازم بهداشتی عمومی',
  'سایر',
];

const units = ['عدد', 'بسته', 'جعبه', 'شیشه', 'تیوب', 'قوطی', 'کیلوگرم', 'لیتر'];

const emptyProduct: Omit<Product, 'id' | 'createdAt'> = {
  name: '',
  category: categories[0],
  unit: units[0],
  purchasePrice: 0,
  salePrice: 0,
  stock: 0,
  minStock: 5,
  barcode: '',
  description: '',
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const data = await db.products.toArray();
    setProducts(data);
  }

  function openAddModal() {
    setEditingProduct(null);
    setForm(emptyProduct);
    setShowModal(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      category: product.category,
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      stock: product.stock,
      minStock: product.minStock,
      barcode: product.barcode || '',
      description: product.description || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingProduct?.id) {
      await db.products.update(editingProduct.id, { ...form });
    } else {
      await db.products.add({ ...form, createdAt: new Date() });
    }
    setShowModal(false);
    loadProducts();
  }

  async function handleDelete() {
    if (deleteTarget?.id) {
      await db.products.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadProducts();
    }
  }

  const filtered = products.filter(p => {
    const matchesSearch =
      p.name.includes(searchQuery) ||
      p.barcode?.includes(searchQuery) ||
      p.category.includes(searchQuery);
    const matchesCategory = !filterCategory || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">محصولات و موجودی</h1>
          <p className="text-sm text-slate-500 mt-1">
            مدیریت محصولات و کنترل موجودی انبار
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          افزودن محصول
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="جستجوی محصول..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field pr-10"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="input-field sm:w-48"
        >
          <option value="">همه دسته‌بندی‌ها</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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
                  <th className="text-right p-4">واحد</th>
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
                      <td className="p-4 text-sm text-slate-600">{product.stock.toLocaleString('fa-AF')}</td>
                      <td className="p-4 text-sm text-slate-600">{product.unit}</td>
                      <td className="p-4">
                        {product.stock <= product.minStock ? (
                          <span className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-lg w-fit">
                            <AlertTriangle size={12} />
                            کم‌موجودی
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                            موجود
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openEditModal(product)}
                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                          >
                            <Edit size={14} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setDeleteTarget(product)}
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
        title={editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام محصول *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="نام محصول را وارد کنید"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">دسته‌بندی</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="input-field"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">قیمت خرید (؋)</label>
              <input
                type="number"
                value={form.purchasePrice || ''}
                onChange={e => setForm({ ...form, purchasePrice: Number(e.target.value) })}
                className="input-field"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">قیمت فروش (؋)</label>
              <input
                type="number"
                value={form.salePrice || ''}
                onChange={e => setForm({ ...form, salePrice: Number(e.target.value) })}
                className="input-field"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">موجودی</label>
              <input
                type="number"
                value={form.stock || ''}
                onChange={e => setForm({ ...form, stock: Number(e.target.value) })}
                className="input-field"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">حداقل موجودی</label>
              <input
                type="number"
                value={form.minStock || ''}
                onChange={e => setForm({ ...form, minStock: Number(e.target.value) })}
                className="input-field"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">واحد</label>
              <select
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="input-field"
              >
                {units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">بارکد</label>
              <input
                type="text"
                value={form.barcode}
                onChange={e => setForm({ ...form, barcode: e.target.value })}
                className="input-field"
                placeholder="اختیاری"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="input-field min-h-[80px] resize-none"
              placeholder="توضیحات اختیاری"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn-primary">
              {editingProduct ? 'بروزرسانی' : 'ذخیره'}
            </button>
          </div>
        </form>
      </Modal>

      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف محصول"
        message={`آیا مطمئن هستید که می‌خواهید "${deleteTarget?.name}" را حذف کنید؟`}
      />
    </div>
  );
}
