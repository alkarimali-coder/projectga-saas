import { useEffect, useState } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('http://127.0.0.1:8000/inventory/', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setUser({ token, inventory: res.data }));
    }
  }, []);

  if (!user) return <Login setUser={setUser} />;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome, {user.token.sub || 'User'}</h1>
      <pre>{JSON.stringify(user.inventory, null, 2)}</pre>
    </div>
  );
}

export default App;
