import { useState } from 'react';
import ModalForm from '../components/ModalForm';

function MasterAdminDashboard() {
  const [machines, setMachines] = useState([
    { id: 1, name: "M001", location: "Store A", revenue: 239.25, status: "Active" }
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Invite sent to:', email);
    setModalOpen(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Master Admin Dashboard</h1>
      <button onClick={() => setModalOpen(true)}>Invite User</button>
      <ModalForm isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Invite User">
        <input placeholder="User Email" value={email} onChange={e => setEmail(e.target.value)} />
      </ModalForm>
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
