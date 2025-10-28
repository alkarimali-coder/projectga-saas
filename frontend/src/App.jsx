import { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/inventory/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setInventory(res.data));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>INVENTORY TEST</h1>
      <pre>{JSON.stringify(inventory, null, 2)}</pre>
    </div>
  );
}

export default App;
