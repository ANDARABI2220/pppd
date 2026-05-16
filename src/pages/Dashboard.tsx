import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Receipt, TrendingUp, Package, AlertTriangle, Users, DollarSign, RefreshCw, ShoppingBag, Sparkles,
} from 'lucide-react';
import Toast, { type ToastType } from '@/components/Toast';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import StatCard from '@/components/StatCard';
import { db, formatCurrency, formatDate, getToday, getStartOfMonth, addStockHistory, getAppSetting, setAppSetting } from '@/db/database';
import type { Sale, Expense, Product } from '@/types';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as ToastType, visible: false });

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    setToast({ message: msg, type, visible: true });
  }, []);

  useEffect(() => { loadData(); checkWelcome(); }, []);

  async function loadData() {
    const [s, e, p, c] = await Promise.all([
      db.sales.toArray(), db.expenses.toArray(), db.products.toArray(), db.customers.count(),
    ]);
    setSales(s); setExpenses(e); setProducts(p); setCustomerCount(c);
  }
  async function checkWelcome() {
    const welcomed = await getAppSetting('welcomed');
    if (!welcomed) { setShowWelcome(true); await setAppSetting('welcomed', 'true'); }
  }
  async function quickRestock(product: Product) {
    if (!product.id) return;
    const qty = product.reorderPoint || product.minStock || 10;
    const newStock = product.stock + qty;
    await db.products.update(product.id, { stock: newStock });
    await addStockHistory(product.id, product.name, qty, newStock, '\u062e\u0631\u06cc\u062f \u0645\u062c\u062f\u062f \u0633\u0631\u06cc\u0639');
    await db.expenses.add({ category: '\u062e\u0631\u06cc\u062f \u0645\u062c\u062f\u062f', description: `\u062e\u0631\u06cc\u062f ${qty} ${product.unit} ${product.name}`, amount: qty * product.purchasePrice, date: new Date(), paymentMethod: '\u0646\u0642\u062f\u06cc', createdAt: new Date() });
    showToast(`${qty} ${product.unit} ${product.name} \u0628\u0647 \u0627\u0646\u0628\u0627\u0631 \u0627\u0636\u0627\u0641\u0647 \u0634\u062f`);
    loadData();
  }

  const today = getToday();
  const monthStart = getStartOfMonth();

  const completedSales = sales.filter(s => s.status === 'completed');
  const totalSales = completedSales.reduce((sum, s) => sum + s.netAmount, 0);
  const totalCOGS = completedSales.reduce((sum, s) => sum + (s.costOfGoods || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalSales - totalCOGS - totalExpenses;
  const lowStockProducts = products.filter(p => p.stock <= (p.reorderPoint || p.minStock));

  const todaySales = sales
    .filter(s => new Date(s.date) >= today && s.status === 'completed')
    .reduce((sum, s) => sum + s.netAmount, 0);
  const todayExpenses = expenses
    .filter(e => new Date(e.date) >= today)
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlySales = sales
    .filter(s => new Date(s.date) >= monthStart && s.status === 'completed')
    .reduce((sum, s) => sum + s.netAmount, 0);
  const monthlyExpensesTotal = expenses
    .filter(e => new Date(e.date) >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const daySales = sales
      .filter(s => {
        const d = new Date(s.date);
        return d >= date && d < nextDay && s.status === 'completed';
      })
      .reduce((sum, s) => sum + s.netAmount, 0);

    const dayExpenses = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d >= date && d < nextDay;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      name: date.toLocaleDateString('fa-AF', { weekday: 'short' }),
      فروش: daySales,
      مصارف: dayExpenses,
    };
  });

  const expenseByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name,
    value,
  }));

  const topProducts = [...products]
    .sort((a, b) => b.stock * b.salePrice - a.stock * a.salePrice)
    .slice(0, 5)
    .map(p => ({
      name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
      موجودی: p.stock,
      ارزش: p.stock * p.salePrice,
    }));

  const recentSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  const recentExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      <AnimatePresence>{toast.visible && <Toast message={toast.message} type={toast.type} isVisible={true} onClose={() => setToast(t => ({...t, visible: false}))} />}</AnimatePresence>

      <AnimatePresence>
        {showWelcome && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-gradient-to-l from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8" />
                <div>
                  <h2 className="text-xl font-bold">خوش آمدید به سیستم حسابداری!</h2>
                  <p className="text-emerald-100 text-sm mt-1">سیستم حسابداری کامل برای دوکان لوازم بهداشتی شما آماده است</p>
                </div>
              </div>
              <button onClick={() => setShowWelcome(false)} className="text-white/70 hover:text-white text-xl">&times;</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">داشبورد</h1>
          <p className="text-sm text-slate-500 mt-1">نمای کلی سیستم حسابداری</p>
        </div>
        <div className="text-sm text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200">
          {new Date().toLocaleDateString('fa-AF', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="مجموع فروش" value={formatCurrency(totalSales)} icon={ShoppingCart} gradient="gradient-primary" delay={0} subtitle={`امروز: ${formatCurrency(todaySales)}`} />
        <StatCard title="مجموع مصارف" value={formatCurrency(totalExpenses)} icon={Receipt} gradient="gradient-danger" delay={0.1} subtitle={`امروز: ${formatCurrency(todayExpenses)}`} />
        <StatCard title="سود خالص (پس از COGS)" value={formatCurrency(netProfit)} icon={TrendingUp} gradient="gradient-info" delay={0.2} subtitle={`قیمت خرید: ${formatCurrency(totalCOGS)}`} />
        <StatCard title="محصولات" value={products.length.toLocaleString('fa-AF')} icon={Package} gradient="gradient-warning" delay={0.3} subtitle={`${lowStockProducts.length.toLocaleString('fa-AF')} محصول کم‌موجودی`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard title="مشتریان" value={customerCount.toLocaleString('fa-AF')} icon={Users} gradient="gradient-info" delay={0.4} />
        <StatCard title="فروش ماهانه" value={formatCurrency(monthlySales)} icon={DollarSign} gradient="gradient-primary" delay={0.5} subtitle={`مصارف ماهانه: ${formatCurrency(monthlyExpensesTotal)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">فروش و مصارف - ۷ روز اخیر</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={last7Days}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontFamily: 'Vazirmatn',
                }}
              />
              <Area type="monotone" dataKey="فروش" stroke="#10b981" fill="url(#salesGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="مصارف" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">مصارف بر اساس دسته‌بندی</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontFamily: 'Vazirmatn',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-slate-400 text-sm">
              هنوز مصارفی ثبت نشده
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">محصولات برتر بر اساس ارزش موجودی</h3>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontFamily: 'Vazirmatn',
                  }}
                />
                <Bar dataKey="ارزش" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-slate-400 text-sm">
              هنوز محصولی ثبت نشده
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">محصولات کم‌موجودی</h3>
            <span className="text-xs bg-rose-100 text-rose-600 px-2 py-1 rounded-lg font-medium">{lowStockProducts.length.toLocaleString('fa-AF')} محصول</span>
          </div>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {lowStockProducts.map((product, index) => (
                <motion.div key={product.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + index * 0.05 }} className={`flex items-center gap-3 p-3 rounded-xl ${product.stock === 0 ? 'bg-rose-100' : 'bg-amber-50'}`}>
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${product.stock === 0 ? 'text-rose-500' : 'text-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{product.name}</p>
                    <p className="text-xs text-slate-500">موجودی: {product.stock.toLocaleString('fa-AF')} {product.unit} | حد سفارش: {(product.reorderPoint || product.minStock).toLocaleString('fa-AF')}</p>
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => quickRestock(product)} className="flex items-center gap-1 text-xs bg-emerald-500 text-white px-2 py-1 rounded-lg hover:bg-emerald-600 transition-colors" title="خرید مجدد">
                    <RefreshCw size={12} /> خرید
                  </motion.button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">تمام محصولات موجودی کافی دارند</div>
          )}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">فعالیت‌های اخیر</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-emerald-600 mb-2">آخرین فروش‌ها</h4>
            {recentSales.length > 0 ? (
              <div className="space-y-2">
                {recentSales.map(s => (
                  <div key={s.id} className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                    <ShoppingBag className="w-4 h-4 text-emerald-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{s.customerName} - {s.invoiceNumber}</p>
                      <p className="text-xs text-slate-400">{formatDate(s.date)}</p>
                    </div>
                    <span className="text-xs font-medium text-emerald-600">{formatCurrency(s.netAmount)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400">هنوز فروشی ثبت نشده</p>}
          </div>
          <div>
            <h4 className="text-xs font-medium text-rose-600 mb-2">آخرین مصارف</h4>
            {recentExpenses.length > 0 ? (
              <div className="space-y-2">
                {recentExpenses.map(e => (
                  <div key={e.id} className="flex items-center gap-2 p-2 bg-rose-50 rounded-lg">
                    <Receipt className="w-4 h-4 text-rose-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{e.description}</p>
                      <p className="text-xs text-slate-400">{formatDate(e.date)} - {e.category}</p>
                    </div>
                    <span className="text-xs font-medium text-rose-600">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400">هنوز مصرفی ثبت نشده</p>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
