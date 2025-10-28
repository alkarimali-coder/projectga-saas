import { useState } from 'react';
import ModalForm from '../components/ModalForm';

function DispatcherDashboard() {
  const [jobs, setJobs] = useState([
    { id: 1, machine: "M001", location: "Store A", tech: "John", status: "Pending" }
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [machine, setMachine] = useState('');
  const [location, setLocation] = useState('');
  const [tech, setTech] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setJobs([...jobs, { id: jobs.length + 1, machine, location, tech, status: "Pending" }]);
    setModalOpen(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dispatcher Dashboard</h1>
      <button onClick={() => setModalOpen(true)}>Create Job</button>
      <ModalForm isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Dispatch Job">
        <input placeholder="Machine" value={machine} onChange={e => setMachine(e.target.value)} />
        <input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
        <input placeholder="Tech" value={tech} onChange={e => setTech(e.target.value)} />
      </ModalForm>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Job ID</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Machine</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Location</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Tech</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(j => (
            <tr key={j.id}>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.id}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.machine}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.location}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.tech}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DispatcherDashboard;
