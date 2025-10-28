import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import WarehouseDashboard from './pages/WarehouseDashboard';
import VendorPODownload from './pages/VendorPODownload';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/warehouse" element={<WarehouseDashboard />} />
        <Route path="/vendor-po/:jobId" element={<VendorPODownload />} />
      </Routes>
    </Router>
  );
}

export default App;
