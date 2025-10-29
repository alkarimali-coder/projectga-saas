import { useEffect, useState } from 'react';
import axios from 'axios';

function WarehouseDashboard({ token }) {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/warehouse/jobs', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setJobs(res.data))
      .catch(err => setError(err.message));
  }, [token]);

  const fulfillJob = (id) => {
    axios.post(`http://127.0.0.1:8000/warehouse/fulfill/${id}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => setJobs(jobs.filter(j => j.id !== id)));
  };

  if (error) return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Warehouse Dashboard</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Job ID</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Machine</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Notes</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(j => (
            <tr key={j.id}>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.id}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.machine_id}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.notes}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                <button onClick={() => fulfillJob(j.id)}>Fulfill</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WarehouseDashboard;
