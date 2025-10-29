import { useEffect, useState } from 'react';
import axios from 'axios';

function InventoryDashboard() {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/inventory/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setInventory(res.data));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Inventory Dashboard</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>ID</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Name</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map(item => (
            <tr key={item.id}>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{item.id}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{item.name}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>${item.revenue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryDashboard;
