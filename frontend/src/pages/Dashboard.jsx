import { useEffect, useState } from 'react';
import { getInventory } from '../services/api';

function Dashboard() {
  const [machines, setMachines] = useState([]);

  useEffect(() => {
    getInventory()
      .then(res => setMachines(res.data.machines))
      .catch(() => setMachines([]));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Inventory</h1>
      <ul>
        {machines.map(m => (
          <li key={m.id}>
            {m.name} – ${m.revenue} ({m.status})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
