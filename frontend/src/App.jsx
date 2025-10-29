import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import InventoryDashboard from './pages/InventoryDashboard';
import WarehouseDashboard from './pages/WarehouseDashboard';
import DispatchDashboard from './pages/DispatchDashboard';

function App() {
  const token = localStorage.getItem('token');
  if (!token) return <Login />;

  return (
    <Router>
      <nav style={{ padding: '1rem', background: '#333', color: 'white', display: 'flex', gap: '1rem' }}>
        <Link to="/inventory" style={{ color: 'white' }}>Inventory</Link>
        <Link to="/warehouse" style={{ color: 'white' }}>Warehouse</Link>
        <Link to="/dispatch" style={{ color: 'white' }}>Dispatch</Link>
      </nav>
      <Routes>
        <Route path="/inventory" element={<InventoryDashboard />} />
        <Route path="/warehouse" element={<WarehouseDashboard />} />
        <Route path="/dispatch" element={<DispatchDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
