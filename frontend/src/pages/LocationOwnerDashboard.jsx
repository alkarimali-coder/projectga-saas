import { useEffect, useState } from 'react';

function LocationOwnerDashboard() {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    // Mock data until API is ready
    setLocations([
      { id: 1, name: "Store A", revenue: 1239.25, machines: 3 },
      { id: 2, name: "Store B", revenue: 980.00, machines: 2 },
    ]);
  }, []);

  const totalRevenue = locations.reduce((sum, l) => sum + l.revenue, 0);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Location Owner Dashboard</h1>
      <div style={{ background: '#e0e7ff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h2>Total Revenue: ${totalRevenue.toFixed(2)}</h2>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Location</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Revenue</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Machines</th>
          </tr>
        </thead>
        <tbody>
          {locations.map(l => (
            <tr key={l.id}>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{l.name}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>${l.revenue.toFixed(2)}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{l.machines}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LocationOwnerDashboard;
