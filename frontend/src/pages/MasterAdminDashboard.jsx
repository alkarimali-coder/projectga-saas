import { useEffect, useState } 
from 'react';
import { getInventory } from '../services/api';

function MasterAdminDashboard() {
  const [machines, setMachines] = useState([]);

  useEffect(() => {
    getInventory()
      .then(res => setMachines(res.data.machines))
      .catch(() => setMachines([]));
  }, []);

  const totalRevenue = machines.reduce((sum, m) => sum + m.revenue, 0);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Master Admin Dashboard</h1>
      <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h2>Total Revenue: ${totalRevenue.toFixed(2)}</h2>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Machine</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Location</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Revenue</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {machines.map(m => (
            <tr key={m.id}>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{m.name}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{m.location}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>${m.revenue.toFixed(2)}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{m.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MasterAdminDashboard;
