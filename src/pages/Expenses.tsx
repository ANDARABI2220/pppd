import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Receipt, Download, Truck } from 'lucide-react';
import Modal from '@/components/Modal';
import DeleteConfirm from '@/components/DeleteConfirm';
import EmptyState from '@/components/EmptyState';
import Toast, { type ToastType } from '@/components/Toast';
import { db, formatCurrency, formatDate, exportToCSV } from '@/db/database';
import type { Expense, Category } from '@/types';

const defaultCats = ['اجاره','برق و آب','حقوق کارمندان','حمل و نقل','تعمیرات','تبلیغات','مالیات','بیمه','مواد مصرفی','غذا و پذیرایی','ارتباطات','سایر'];
const paymentMethods = ['نقدی', 'کارتی', 'حواله بانکی', 'چک'];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cats, setCats] = useState<string[]>(defaultCats);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as ToastType, visible: false });

  const [category, setCategory] = useState(defaultCats[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [shipmentDate, setShipmentDate] = useState('');
  const [shipmentReason, setShipmentReason] = useState('');

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    setToast({ message: msg, type, visible: true });
  }, []);

  useEffect(() => { loadExpenses(); loadCats(); }, []);

  async function loadExpenses() {
    setExpenses(await db.expenses.orderBy('id').reverse().toArray());
  }
  async function loadCats() {
    const c = await db.categories.where('type').equals('expense').toArray();
    if (c.length > 0) setCats([...c.map((x: Category) => x.name), ...defaultCats.filter(d => !c.find((x: Category) => x.name === d))]);
  }

  function openAddModal() {
    setEditingExpense(null); setCategory(cats[0]); setDescription(''); setAmount(0);
    setDate(new Date().toISOString().split('T')[0]); setPaymentMethod(paymentMethods[0]);
    setShipmentDate(''); setShipmentReason('');
    setShowModal(true);
  }
  function openEditModal(expense: Expense) {
    setEditingExpense(expense); setCategory(expense.category); setDescription(expense.description);
    setAmount(expense.amount); setDate(new Date(expense.date).toISOString().split('T')[0]);
    setPaymentMethod(expense.paymentMethod);
    setShipmentDate(expense.shipmentDate || ''); setShipmentReason(expense.shipmentReason || '');
    setShowModal(true);
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;
    const data = { category, description, amount, date: new Date(date), paymentMethod, shipmentDate: shipmentDate || undefined, shipmentReason: shipmentReason || undefined };
    if (editingExpense?.id) {
      await db.expenses.update(editingExpense.id, data);
      showToast('مصرف بروزرسانی شد');
    } else {
      await db.expenses.add({ ...data, createdAt: new Date() });
      showToast('مصرف جدید ثبت شد');
    }
    setShowModal(false); loadExpenses();
  }
  async function handleDelete() {
    if (deleteTarget?.id) {
      await db.expenses.delete(deleteTarget.id);
      setDeleteTarget(null); showToast('مصرف حذف شد'); loadExpenses();
    }
  }
  function handleExport() {
    exportToCSV(filtered.map(e => ({ 'دسته‌بندی': e.category, 'شرح': e.description, 'مبلغ': e.amount, 'تاریخ': formatDate(e.date), 'پرداخت': e.paymentMethod })), 'expenses');
    showToast('فایل CSV دانلود شد');
  }

  const filtered = expenses.filter(e => {
    const s = e.description.includes(searchQuery) || e.category.includes(searchQuery);
    const c = !filterCategory || e.category === filterCategory;
    return s && c;
  });
  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <AnimatePresence>{toast.visible && <Toast message={toast.message} type={toast.type} isVisible={true} onClose={() => setToast(t => ({...t, visible: false}))} />}</AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">مصارف (خرج)</h1>
          <p className="text-sm text-slate-500 mt-1">ثبت و مدیریت مصارف دوکان</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-rose-50 px-4 py-2 rounded-xl">
            <span className="text-sm text-rose-600 font-medium">مجموع: {formatCurrency(totalFiltered)}</span>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleExport} className="btn-secondary flex items-center gap-2"><Download size={18} /> خروجی CSV</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAddModal} className="btn-primary flex items-center gap-2"><Plus size={18} /> ثبت مصرف</motion.button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="جستجوی مصرف..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-field pr-10" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field sm:w-48">
          <option value="">همه دسته‌بندی‌ها</option>
          {cats.map(c => (<option key={c} value={c}>{c}</option>))}
        </select>
      </motion.div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="مصرفی ثبت نشده"
          description="هنوز مصرفی ثبت نشده یا نتیجه‌ای برای جستجوی شما وجود ندارد"
          action={{ label: 'ثبت مصرف جدید', onClick: openAddModal }}
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
                  <th className="text-right p-4">دسته‌بندی</th>
                  <th className="text-right p-4">شرح</th>
                  <th className="text-right p-4">مبلغ</th>
                  <th className="text-right p-4">تاریخ</th>
                  <th className="text-right p-4">روش پرداخت</th>
                  <th className="text-center p-4">عملیات</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((expense, index) => (
                    <motion.tr
                      key={expense.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                          {expense.category}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-700">{expense.description}</td>
                      <td className="p-4 text-sm font-medium text-rose-600">{formatCurrency(expense.amount)}</td>
                      <td className="p-4 text-sm text-slate-600">{formatDate(expense.date)}</td>
                      <td className="p-4 text-sm text-slate-600">{expense.paymentMethod}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openEditModal(expense)}
                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                          >
                            <Edit size={14} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setDeleteTarget(expense)}
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingExpense ? 'ویرایش مصرف' : 'ثبت مصرف جدید'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">دسته‌بندی</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input-field">
              {cats.map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">شرح *</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="input-field" placeholder="شرح مصرف را وارد کنید" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ (؋) *</label>
              <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="input-field" min="1" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">روش پرداخت</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input-field">
              {paymentMethods.map(m => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Truck size={14} /> تاریخ حمل</label>
              <input type="date" value={shipmentDate} onChange={e => setShipmentDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">دلیل حمل</label>
              <input type="text" value={shipmentReason} onChange={e => setShipmentReason(e.target.value)} className="input-field" placeholder="اختیاری" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">{editingExpense ? 'بروزرسانی' : 'ذخیره'}</button>
          </div>
        </form>
      </Modal>

      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف مصرف"
        message={`آیا مطمئن هستید که می‌خواهید این مصرف را حذف کنید؟`}
      />
    </div>
  );
}
