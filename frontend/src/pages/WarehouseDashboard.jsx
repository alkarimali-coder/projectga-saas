import { useEffect, useState } from 'react';

function WarehouseDashboard() {
  const [parts, setParts] = useState([]);

  useEffect(() => {
    // Mock data until API is ready
    setParts([
      { id: 1, name: "Coin Mech", stock: 5, min: 10 },
      { id: 2, name: "Bill Validator", stock: 8, min: 5 },
      { id: 3, name: "Touch Panel", stock: 2, min: 3 },
    ]);
  }, []);

  const lowStock = parts.filter(p => p.stock < p.min).length;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Warehouse Dashboard</h1>
      <div style={{ background: '#fecaca', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h2>Low Stock Items: {lowStock}</h2>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Part</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Current Stock</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Min Required</th>
          </tr>
        </thead>
        <tbody>
          {parts.map(p => (
            <tr key={p.id} style={{ background: p.stock < p.min ? '#fee2e2' : 'white' }}>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{p.name}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{p.stock}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{p.min}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WarehouseDashboard;
