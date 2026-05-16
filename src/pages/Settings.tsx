import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit, Tag, Save, X, AlertTriangle, Download,
} from 'lucide-react';
import Modal from '@/components/Modal';
import Toast, { type ToastType } from '@/components/Toast';
import { db, exportToCSV } from '@/db/database';
import type { Category } from '@/types';

const defaultProductCategories = [
  'مراقبت پوست', 'مراقبت مو', 'بهداشت دهان', 'بهداشت بدن',
  'لوازم آرایشی', 'محصولات طبی', 'ویتامین و مکمل', 'لوازم بهداشتی عمومی', 'سایر',
];

const defaultExpenseCategories = [
  'اجاره', 'برق و آب', 'حقوق کارمندان', 'حمل و نقل', 'تعمیرات',
  'تبلیغات', 'مالیات', 'بیمه', 'مواد مصرفی', 'غذا و پذیرایی', 'ارتباطات', 'سایر',
];

export default function Settings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'product' | 'expense'>('product');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTo, setReassignTo] = useState('');
  const [selectedBulk, setSelectedBulk] = useState<number[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as ToastType, visible: false });

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type, visible: true });
  }, []);

  useEffect(() => {
    loadCategories();
    seedDefaultCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function seedDefaultCategories() {
    const existing = await db.categories.count();
    if (existing === 0) {
      const batch: Category[] = [
        ...defaultProductCategories.map(name => ({ name, type: 'product' as const, createdAt: new Date() })),
        ...defaultExpenseCategories.map(name => ({ name, type: 'expense' as const, createdAt: new Date() })),
      ];
      await db.categories.bulkAdd(batch);
      loadCategories();
    }
  }

  async function loadCategories() {
    const data = await db.categories.toArray();
    setCategories(data);
  }

  const filteredCategories = categories.filter(c => c.type === activeTab);

  function openAddModal() {
    setEditingCategory(null);
    setNewCategoryName('');
    setShowAddModal(true);
  }

  function openEditModal(cat: Category) {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setShowAddModal(true);
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (editingCategory?.id) {
      const oldName = editingCategory.name;
      await db.categories.update(editingCategory.id, { name: newCategoryName });
      if (activeTab === 'product') {
        await db.products.where('category').equals(oldName).modify({ category: newCategoryName });
      } else {
        await db.expenses.where('category').equals(oldName).modify({ category: newCategoryName });
      }
      showToast('کتگوری با موفقیت ویرایش شد');
    } else {
      await db.categories.add({ name: newCategoryName, type: activeTab, createdAt: new Date() });
      showToast('کتگوری جدید اضافه شد');
    }
    setShowAddModal(false);
    loadCategories();
  }

  function handleDeleteClick(cat: Category) {
    setDeleteTarget(cat);
    const others = filteredCategories.filter(c => c.id !== cat.id);
    if (others.length > 0) {
      setReassignTo(others[0].name);
      setShowReassignModal(true);
    }
  }

  async function handleDeleteWithReassign() {
    if (!deleteTarget?.id) return;
    const oldName = deleteTarget.name;
    if (activeTab === 'product') {
      await db.products.where('category').equals(oldName).modify({ category: reassignTo });
    } else {
      await db.expenses.where('category').equals(oldName).modify({ category: reassignTo });
    }
    await db.categories.delete(deleteTarget.id);
    setDeleteTarget(null);
    setShowReassignModal(false);
    showToast('کتگوری حذف و آیتم‌ها منتقل شدند');
    loadCategories();
  }

  async function handleBulkDelete() {
    if (selectedBulk.length === 0) return;
    const others = filteredCategories.filter(c => !selectedBulk.includes(c.id!));
    if (others.length === 0) {
      showToast('حداقل یک کتگوری باید باقی بماند', 'error');
      return;
    }
    const reassignTarget = others[0].name;
    for (const id of selectedBulk) {
      const cat = categories.find(c => c.id === id);
      if (!cat) continue;
      if (activeTab === 'product') {
        await db.products.where('category').equals(cat.name).modify({ category: reassignTarget });
      } else {
        await db.expenses.where('category').equals(cat.name).modify({ category: reassignTarget });
      }
      await db.categories.delete(id);
    }
    setSelectedBulk([]);
    showToast(selectedBulk.length + ' کتگوری حذف شد');
    loadCategories();
  }

  function toggleBulkSelect(id: number) {
    setSelectedBulk(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function handleExportCategories() {
    const data = filteredCategories.map(c => ({
      'نام': c.name,
      'نوع': c.type === 'product' ? 'محصول' : 'مصرف',
    }));
    exportToCSV(data, "categories-" + activeTab);
    showToast('فایل CSV دانلود شد');
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>{toast.visible && <Toast message={toast.message} type={toast.type} isVisible={true} onClose={() => setToast(t => ({ ...t, visible: false }))} />}</AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">تنظیمات و کتگوری‌ها</h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت دسته‌بندی‌های محصولات و مصارف</p>
        </div>
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleExportCategories} className="btn-secondary flex items-center gap-2"><Download size={16} /> خروجی CSV</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAddModal} className="btn-primary flex items-center gap-2"><Plus size={18} /> کتگوری جدید</motion.button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-2">
        <button onClick={() => { setActiveTab('product'); setSelectedBulk([]); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'product' ? 'gradient-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          <Tag size={14} className="inline ml-1" /> کتگوری محصولات
        </button>
        <button onClick={() => { setActiveTab('expense'); setSelectedBulk([]); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'expense' ? 'gradient-danger text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          <Tag size={14} className="inline ml-1" /> کتگوری مصارف
        </button>
      </motion.div>

      {selectedBulk.length > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-amber-700 flex items-center gap-1"><AlertTriangle size={14} /> {selectedBulk.length} کتگوری انتخاب شده</span>
          <button onClick={handleBulkDelete} className="text-sm bg-rose-500 text-white px-3 py-1 rounded-lg hover:bg-rose-600 flex items-center gap-1"><Trash2 size={14} /> حذف انتخاب‌شده‌ها</button>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-center p-4 w-12">
                  <input type="checkbox" onChange={e => { if (e.target.checked) setSelectedBulk(filteredCategories.map(c => c.id!)); else setSelectedBulk([]); }} checked={selectedBulk.length === filteredCategories.length && filteredCategories.length > 0} className="rounded" />
                </th>
                <th className="text-right p-4">نام کتگوری</th>
                <th className="text-right p-4">نوع</th>
                <th className="text-center p-4">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredCategories.map((cat, index) => (
                  <motion.tr key={cat.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.03 }} className="table-row">
                    <td className="p-4 text-center">
                      <input type="checkbox" checked={selectedBulk.includes(cat.id!)} onChange={() => toggleBulkSelect(cat.id!)} className="rounded" />
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-700">{cat.name}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-lg ${cat.type === 'product' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {cat.type === 'product' ? 'محصول' : 'مصرف'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openEditModal(cat)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors" title="ویرایش"><Edit size={14} /></motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDeleteClick(cat)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors" title="حذف"><Trash2 size={14} /></motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {filteredCategories.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">هیچ کتگوری‌ای وجود ندارد</div>
        )}
      </motion.div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingCategory ? 'ویرایش کتگوری' : 'کتگوری جدید'}>
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">نام کتگوری *</label>
            <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="input-field" placeholder="نام کتگوری را وارد کنید" required />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex items-center gap-1"><X size={14} /> انصراف</button>
            <button type="submit" className="btn-primary flex items-center gap-1"><Save size={14} /> {editingCategory ? 'بروزرسانی' : 'ذخیره'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showReassignModal} onClose={() => setShowReassignModal(false)} title="حذف و انتقال">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl">
            <AlertTriangle size={18} />
            <p className="text-sm">آیتم‌های مرتبط با «{deleteTarget?.name}» به کتگوری دیگر منتقل می‌شوند.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">انتقال به:</label>
            <select value={reassignTo} onChange={e => setReassignTo(e.target.value)} className="input-field">
              {filteredCategories.filter(c => c.id !== deleteTarget?.id).map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowReassignModal(false)} className="btn-secondary">انصراف</button>
            <button onClick={handleDeleteWithReassign} className="bg-rose-500 text-white px-4 py-2 rounded-xl hover:bg-rose-600 transition-colors flex items-center gap-1"><Trash2 size={14} /> حذف و انتقال</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
