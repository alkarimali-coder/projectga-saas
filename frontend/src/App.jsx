import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import WarehouseDashboard from './pages/WarehouseDashboard';

function App() {
  const token = localStorage.getItem('token');
  if (!token) return <Login />;

  return (
    <Router>
      <nav style={{ padding: '1rem', background: '#333', color: 'white' }}>
        <Link to="/warehouse" style={{ color: 'white', marginRight: '1rem' }}>Warehouse</Link>
      </nav>
      <Routes>
        <Route path="/warehouse" element={<WarehouseDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
