import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function WarehouseDashboard() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/warehouse/jobs', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setJobs(res.data));
  }, []);

  const fulfillJob = (id) => {
    axios.post(`http://127.0.0.1:8000/warehouse/fulfill/${id}`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(() => setJobs(jobs.filter(j => j.id !== id)));
  };

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
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>PO</th>
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
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                <Link to={`/vendor-po/${j.id}`}>Download PO</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WarehouseDashboard;
