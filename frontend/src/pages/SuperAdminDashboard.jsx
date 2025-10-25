import { useEffect, useState } from 'react';

function SuperAdminDashboard() {
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    // Mock data until API is ready
    setTenants([
      { id: 1, name: "ML001", revenue: 5239.25, machines: 12 },
      { id: 2, name: "ML002", revenue: 4120.00, machines: 8 },
    ]);
  }, []);

  const totalRevenue = tenants.reduce((sum, t) => sum + t.revenue, 0);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Super Admin Dashboard</h1>
      <div style={{ background: '#e0f2fe', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h2>Total Revenue: ${totalRevenue.toFixed(2)}</h2>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Tenant</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Revenue</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Machines</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map(t => (
            <tr key={t.id}>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{t.name}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>${t.revenue.toFixed(2)}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{t.machines}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SuperAdminDashboard;
