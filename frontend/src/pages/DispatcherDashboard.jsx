import { useState } from 'react';
import ModalForm from '../components/ModalForm';

function DispatcherDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [machine, setMachine] = useState('');
  const [location, setLocation] = useState('');
  const [tech, setTech] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Job created:', { machine, location, tech });
    setModalOpen(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dispatcher Dashboard</h1>
      <button onClick={() => setModalOpen(true)}>Create Job</button>
      <ModalForm isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Dispatch Job" onSubmit={handleSubmit}>
        <input placeholder="Machine" value={machine} onChange={e => setMachine(e.target.value)} />
        <input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
        <input placeholder="Tech" value={tech} onChange={e => setTech(e.target.value)} />
      </ModalForm>
    </div>
  );
}

export default DispatcherDashboard;
