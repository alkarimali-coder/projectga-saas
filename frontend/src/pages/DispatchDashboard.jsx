import { useState } from 'react';
import axios from 'axios';

function DispatchDashboard() {
  const [machine, setMachine] = useState('');
  const [notes, setNotes] = useState('');

  const createJob = () => {
    axios.post('http://127.0.0.1:8000/dispatch/job', {
      machine_id: machine,
      notes: notes,
      status: "pending"
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(() => {
      setMachine('');
      setNotes('');
      alert('Job created!');
    });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dispatch Dashboard</h1>
      <div>
        <input placeholder="Machine ID" value={machine} onChange={e => setMachine(e.target.value)} />
        <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
        <button onClick={createJob}>Create Job</button>
      </div>
    </div>
  );
}

export default DispatchDashboard;
