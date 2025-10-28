import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import WarehouseDashboard from './pages/WarehouseDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/warehouse" element={<WarehouseDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
