import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { db, formatCurrency } from '@/db/database';
import type { Sale, Expense } from '@/types';

type ReportPeriod = 'daily' | 'monthly' | 'yearly';

export default function Reports() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [s, e] = await Promise.all([
      db.sales.toArray(),
      db.expenses.toArray(),
    ]);
    setSales(s);
    setExpenses(e);
  }

  const filteredSales = sales.filter(s => {
    const d = new Date(s.date);
    return d >= new Date(startDate) && d <= new Date(endDate + 'T23:59:59') && s.status === 'completed';
  });

  const filteredExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d >= new Date(startDate) && d <= new Date(endDate + 'T23:59:59');
  });

  const totalSales = filteredSales.reduce((sum, s) => sum + s.netAmount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalProfit = totalSales - totalExpenses;
  const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : '0';

  function getChartData() {
    const dataMap = new Map<string, { فروش: number; مصارف: number; سود: number }>();

    const getKey = (date: Date) => {
      switch (period) {
        case 'daily':
          return date.toLocaleDateString('fa-AF');
        case 'monthly':
          return date.toLocaleDateString('fa-AF', { year: 'numeric', month: 'long' });
        case 'yearly':
          return date.toLocaleDateString('fa-AF', { year: 'numeric' });
      }
    };

    filteredSales.forEach(s => {
      const key = getKey(new Date(s.date));
      const existing = dataMap.get(key) || { فروش: 0, مصارف: 0, سود: 0 };
      existing['فروش'] += s.netAmount;
      dataMap.set(key, existing);
    });

    filteredExpenses.forEach(e => {
      const key = getKey(new Date(e.date));
      const existing = dataMap.get(key) || { فروش: 0, مصارف: 0, سود: 0 };
      existing['مصارف'] += e.amount;
      dataMap.set(key, existing);
    });

    dataMap.forEach((value) => {
      value['سود'] = value['فروش'] - value['مصارف'];
    });

    return Array.from(dataMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => {
        const dateA = new Date(a.name);
        const dateB = new Date(b.name);
        return dateA.getTime() - dateB.getTime();
      });
  }

  function getExpenseCategoryData() {
    const categoryMap = new Map<string, number>();
    filteredExpenses.forEach(e => {
      categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
    });
    return Array.from(categoryMap.entries())
      .map(([name, مبلغ]) => ({ name, مبلغ }))
      .sort((a, b) => b['مبلغ'] - a['مبلغ']);
  }

  function getTopProductsData() {
    const productMap = new Map<string, { quantity: number; revenue: number }>();
    filteredSales.forEach(s => {
      s.items.forEach(item => {
        const existing = productMap.get(item.productName) || { quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
        productMap.set(item.productName, existing);
      });
    });
    return Array.from(productMap.entries())
      .map(([name, data]) => ({ name: name.length > 12 ? name.slice(0, 12) + '...' : name, تعداد: data.quantity, درآمد: data.revenue }))
      .sort((a, b) => b['درآمد'] - a['درآمد'])
      .slice(0, 10);
  }

  const chartData = getChartData();
  const expenseCategoryData = getExpenseCategoryData();
  const topProductsData = getTopProductsData();

  function exportReport() {
    const report = {
      period: { start: startDate, end: endDate },
      summary: {
        totalSales,
        totalExpenses,
        totalProfit,
        profitMargin: profitMargin + '%',
        salesCount: filteredSales.length,
      },
      sales: filteredSales.map(s => ({
        invoice: s.invoiceNumber,
        customer: s.customerName,
        amount: s.netAmount,
        date: new Date(s.date).toLocaleDateString('fa-AF'),
      })),
      expenses: filteredExpenses.map(e => ({
        category: e.category,
        description: e.description,
        amount: e.amount,
        date: new Date(e.date).toLocaleDateString('fa-AF'),
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${startDate}-to-${endDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">گزارش‌ها</h1>
          <p className="text-sm text-slate-500 mt-1">گزارش‌های مالی و تحلیل عملکرد</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={exportReport}
          className="btn-primary flex items-center gap-2"
        >
          <Download size={18} />
          دانلود گزارش
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-700">فیلتر گزارش</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="input-field"
            />
            <span className="text-sm text-slate-400">تا</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex gap-2">
            {([
              { id: 'daily' as ReportPeriod, label: 'روزانه' },
              { id: 'monthly' as ReportPeriod, label: 'ماهانه' },
              { id: 'yearly' as ReportPeriod, label: 'سالانه' },
            ]).map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  period === p.id
                    ? 'gradient-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-slate-500">مجموع فروش</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{formatCurrency(totalSales)}</p>
          <p className="text-xs text-slate-400 mt-1">{filteredSales.length.toLocaleString('fa-AF')} فاکتور</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 gradient-danger rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-slate-500">مجموع مصارف</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-slate-400 mt-1">{filteredExpenses.length.toLocaleString('fa-AF')} مورد</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 ${totalProfit >= 0 ? 'gradient-primary' : 'gradient-danger'} rounded-xl flex items-center justify-center`}>
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-slate-500">سود خالص</span>
          </div>
          <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(totalProfit)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 gradient-info rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-slate-500">حاشیه سود</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{profitMargin}%</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">روند فروش و مصارف</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
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
                <Legend />
                <Line type="monotone" dataKey="فروش" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="مصارف" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="سود" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
              داده‌ای برای نمایش وجود ندارد
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">مصارف بر اساس دسته‌بندی</h3>
          {expenseCategoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expenseCategoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={100} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontFamily: 'Vazirmatn',
                  }}
                />
                <Bar dataKey="مبلغ" fill="#ef4444" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
              داده‌ای برای نمایش وجود ندارد
            </div>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
      >
        <h3 className="text-sm font-semibold text-slate-700 mb-4">پرفروش‌ترین محصولات</h3>
        {topProductsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProductsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontFamily: 'Vazirmatn',
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="تعداد" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="right" dataKey="درآمد" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
            داده‌ای برای نمایش وجود ندارد
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">جدول فروش‌ها</h3>
        </div>
        {filteredSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right p-4">شماره فاکتور</th>
                  <th className="text-right p-4">مشتری</th>
                  <th className="text-right p-4">تاریخ</th>
                  <th className="text-right p-4">مبلغ</th>
                  <th className="text-right p-4">پرداخت</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.slice(0, 20).map(sale => (
                  <tr key={sale.id} className="table-row">
                    <td className="p-4 text-sm font-mono text-slate-700">{sale.invoiceNumber}</td>
                    <td className="p-4 text-sm text-slate-600">{sale.customerName}</td>
                    <td className="p-4 text-sm text-slate-600">
                      {new Date(sale.date).toLocaleDateString('fa-AF')}
                    </td>
                    <td className="p-4 text-sm font-medium text-emerald-600">{formatCurrency(sale.netAmount)}</td>
                    <td className="p-4 text-sm text-slate-600">{sale.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-400">فاکتوری در این بازه زمانی وجود ندارد</div>
        )}
      </motion.div>
    </div>
  );
}
