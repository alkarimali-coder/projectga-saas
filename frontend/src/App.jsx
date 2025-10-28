import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import WarehouseDashboard from './pages/WarehouseDashboard';
import DispatchDashboard from './pages/DispatcherDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import MasterAdminDashboard from './pages/MasterAdminDashboard';
import FieldTechDashboard from './pages/FieldTechDashboard';
import LocationOwnerDashboard from './pages/LocationOwnerDashboard';

function App() {
  return (
    <Router>
      <nav style={{ padding: '1rem', background: '#333', color: 'white', display: 'flex', gap: '1rem' }}>
        <Link to="/super-admin" style={{ color: 'white' }}>Super Admin</Link>
        <Link to="/master-admin" style={{ color: 'white' }}>Master Admin</Link>
        <Link to="/dispatch" style={{ color: 'white' }}>Dispatch</Link>
        <Link to="/warehouse" style={{ color: 'white' }}>Warehouse</Link>
        <Link to="/field-tech" style={{ color: 'white' }}>Field Tech</Link>
        <Link to="/location-owner" style={{ color: 'white' }}>Location Owner</Link>
      </nav>
      <Routes>
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/master-admin" element={<MasterAdminDashboard />} />
        <Route path="/dispatch" element={<DispatchDashboard />} />
        <Route path="/warehouse" element={<WarehouseDashboard />} />
        <Route path="/field-tech" element={<FieldTechDashboard />} />
        <Route path="/location-owner" element={<LocationOwnerDashboard />} />
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
