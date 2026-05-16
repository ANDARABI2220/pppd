import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Users,
  Truck,
  BarChart3,
  ShoppingBag,
  Heart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { PageType } from '@/types';

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems: { id: PageType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'products', label: 'محصولات و موجودی', icon: Package },
  { id: 'sales', label: 'فروش (دخل)', icon: ShoppingCart },
  { id: 'purchases', label: 'خرید از تأمین‌کننده', icon: ShoppingBag },
  { id: 'expenses', label: 'مصارف (خرج)', icon: Receipt },
  { id: 'customers', label: 'مشتریان', icon: Users },
  { id: 'suppliers', label: 'تأمین‌کنندگان', icon: Truck },
  { id: 'reports', label: 'گزارش‌ها', icon: BarChart3 },
];

export default function Sidebar({ currentPage, onNavigate, collapsed, onToggle }: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen bg-white border-l border-slate-200 flex flex-col shadow-sm fixed right-0 top-0 z-40"
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-100">
        <motion.div
          animate={{ opacity: collapsed ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="whitespace-nowrap">
              <h1 className="font-bold text-sm text-slate-800">لوازم بهداشتی</h1>
              <p className="text-xs text-slate-500">سیستم حسابداری</p>
            </div>
          )}
        </motion.div>
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <motion.button
              key={item.id}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              onClick={() => onNavigate(item.id)}
              className={`w-full sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
              {isActive && !collapsed && (
                <motion.div
                  layoutId="activeIndicator"
                  className="mr-auto w-2 h-2 rounded-full bg-emerald-500"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border-t border-slate-100"
        >
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-emerald-700 font-medium">سیستم حسابداری آفلاین</p>
            <p className="text-xs text-emerald-500 mt-1">نسخه ۱.۰.۰</p>
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
}
