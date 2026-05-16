import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Users, Phone, MapPin } from 'lucide-react';
import Modal from '@/components/Modal';
import DeleteConfirm from '@/components/DeleteConfirm';
import EmptyState from '@/components/EmptyState';
import { db, formatCurrency } from '@/db/database';
import type { Customer } from '@/types';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const data = await db.customers.toArray();
    setCustomers(data);
  }

  function openAddModal() {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setBalance(0);
    setShowModal(true);
  }

  function openEditModal(customer: Customer) {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone);
    setAddress(customer.address);
    setBalance(customer.balance);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const data = { name, phone, address, balance };

    if (editingCustomer?.id) {
      await db.customers.update(editingCustomer.id, data);
    } else {
      await db.customers.add({ ...data, createdAt: new Date() });
    }
    setShowModal(false);
    loadCustomers();
  }

  async function handleDelete() {
    if (deleteTarget?.id) {
      await db.customers.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadCustomers();
    }
  }

  const filtered = customers.filter(c =>
    c.name.includes(searchQuery) || c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">مشتریان</h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت اطلاعات مشتریان</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          افزودن مشتری
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
            placeholder="جستجوی مشتری..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field pr-10"
          />
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="مشتری یافت نشد"
          description="هنوز مشتری ثبت نشده یا نتیجه‌ای برای جستجوی شما وجود ندارد"
          action={{ label: 'افزودن مشتری', onClick: openAddModal }}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {filtered.map((customer, index) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{customer.name}</h3>
                      {customer.phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                          <Phone size={10} />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => openEditModal(customer)}
                      className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                    >
                      <Edit size={12} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDeleteTarget(customer)}
                      className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors"
                    >
                      <Trash2 size={12} />
                    </motion.button>
                  </div>
                </div>

                {customer.address && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                    <MapPin size={10} />
                    <span>{customer.address}</span>
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">مانده حساب:</span>
                  <span className={`text-sm font-bold ${customer.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(customer.balance)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCustomer ? 'ویرایش مشتری' : 'افزودن مشتری جدید'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">نام مشتری *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-field"
              placeholder="نام مشتری را وارد کنید"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">شماره تماس</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="input-field"
              placeholder="0700000000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">آدرس</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="input-field"
              placeholder="آدرس مشتری"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مانده حساب (؋)</label>
            <input
              type="number"
              value={balance || ''}
              onChange={e => setBalance(Number(e.target.value))}
              className="input-field"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn-primary">
              {editingCustomer ? 'بروزرسانی' : 'ذخیره'}
            </button>
          </div>
        </form>
      </Modal>

      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف مشتری"
        message={`آیا مطمئن هستید که می‌خواهید "${deleteTarget?.name}" را حذف کنید؟`}
      />
    </div>
  );
}
