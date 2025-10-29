import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import MasterAdminDashboard from './pages/MasterAdminDashboard';
import DispatcherDashboard from './pages/DispatcherDashboard';
import WarehouseDashboard from './pages/WarehouseDashboard';
import FieldTechDashboard from './pages/FieldTechDashboard';
import LocationOwnerDashboard from './pages/LocationOwnerDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/master-admin" element={<MasterAdminDashboard />} />
          <Route path="/dispatcher" element={<DispatcherDashboard />} />
          <Route path="/warehouse" element={<WarehouseDashboard />} />
          <Route path="/field-tech" element={<FieldTechDashboard />} />
          <Route path="/location-owner" element={<LocationOwnerDashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
