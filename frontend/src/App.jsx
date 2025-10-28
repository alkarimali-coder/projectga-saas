import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function App() {
  return (
    <Router>
      <nav style={{ padding: '1rem', background: 'red', color: 'white' }}>
        <Link to="/test" style={{ color: 'white' }}>TEST LINK</Link>
      </nav>
      <Routes>
        <Route path="/test" element={<h1>TEST PAGE WORKS!</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
