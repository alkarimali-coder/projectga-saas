import { useState } from 'react';
import ModalForm from '../components/ModalForm';

function SuperAdminDashboard() {
  const [tenants, setTenants] = useState([
    { id: 1, name: "ML001", revenue: 5239.25, machines: 12 }
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [license, setLicense] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setTenants([...tenants, { id: tenants.length + 1, name: license, revenue: 0, machines: 0 }]);
    setModalOpen(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Super Admin Dashboard</h1>
      <button onClick={() => setModalOpen(true)}>Add License</button>
      <ModalForm isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New License" onSubmit={handleSubmit}>
        <input placeholder="License Name" value={license} onChange={e => setLicense(e.target.value)} style={{ width: '100%', marginBottom: '1rem' }} />
      </ModalForm>
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
