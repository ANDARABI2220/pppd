import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import type { PageType } from '@/types';
import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import Sales from '@/pages/Sales';
import Expenses from '@/pages/Expenses';
import Customers from '@/pages/Customers';
import Suppliers from '@/pages/Suppliers';
import Purchases from '@/pages/Purchases';
import Reports from '@/pages/Reports';

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.98 },
};

export default function Layout() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'sales':
        return <Sales />;
      case 'expenses':
        return <Expenses />;
      case 'customers':
        return <Customers />;
      case 'suppliers':
        return <Suppliers />;
      case 'purchases':
        return <Purchases />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <motion.main
        animate={{ marginRight: sidebarCollapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-1 p-6 overflow-auto"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
