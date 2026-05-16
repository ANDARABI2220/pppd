import { useEffect } from 'react';
import Layout from './components/Layout';
import { checkLowStockNotifications } from './db/database';

function App() {
  useEffect(() => {
    checkLowStockNotifications();
    const interval = setInterval(checkLowStockNotifications, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return <Layout />;
}

export default App
