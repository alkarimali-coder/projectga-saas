import { useState } from 'react';
import ModalForm from '../components/ModalForm';

function LocationOwnerDashboard() {
  const [revenues, setRevenues] = useState([
    { id: 1, location: "Store A", amount: 1239.25, verified: false }
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setRevenues([...revenues, { id: revenues.length + 1, location: "Store A", amount: parseFloat(amount), verified: false }]);
    setModalOpen(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Location Owner Dashboard</h1>
      <button onClick={() => setModalOpen(true)}>Log Revenue</button>
      <ModalForm isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Revenue">
        <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
      </ModalForm>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Location</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Amount</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Verified</th>
          </tr>
        </thead>
        <tbody>
          {revenues.map(r => (
            <tr key={r.id}>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{r.location}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>${r.amount.toFixed(2)}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{r.verified ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LocationOwnerDashboard;
