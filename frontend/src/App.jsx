import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import WarehouseDashboard from './pages/WarehouseDashboard';
import { useState } from 'react';

function App() {
  const [token] = useState(localStorage.getItem('token'));

  if (!token) return <Login />;

  return (
    <Router>
      <nav style={{ padding: '1rem', background: '#333', color: 'white', display: 'flex', gap: '1rem' }}>
        <Link to="/warehouse" style={{ color: 'white' }}>Warehouse</Link>
        <Link to="/dispatch" style={{ color: 'white' }}>Dispatch</Link>
        <Link to="/field-tech" style={{ color: 'white' }}>Field Tech</Link>
        <Link to="/super-admin" style={{ color: 'white' }}>Super Admin</Link>
      </nav>
      <Routes>
        <Route path="/warehouse" element={<WarehouseDashboard />} />
        <Route path="/dispatch" element={<h2 style={{ padding: '2rem' }}>Dispatch Dashboard</h2>} />
        <Route path="/field-tech" element={<h2 style={{ padding: '2rem' }}>Field Tech Dashboard</h2>} />
        <Route path="/super-admin" element={<h2 style={{ padding: '2rem' }}>Super Admin Dashboard</h2>} />
      </Routes>
    </Router>
  );
}

export default App;
