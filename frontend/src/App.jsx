import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Machines from "./pages/Machines";

function App() {
  return (
    <Router>
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">COAM Core</h1>
        <nav className="space-x-4">
          <Link to="/" className="hover:underline">
            Dashboard
          </Link>
          <Link to="/machines" className="hover:underline">
            Machines
          </Link>
        </nav>
      </header>

      <main className="p-6 bg-gray-50 min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/machines" element={<Machines />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
