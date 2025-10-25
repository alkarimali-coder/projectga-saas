import { useEffect, useState } from 'react';

function DispatcherDashboard() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    // Mock data until API is ready
    setJobs([
      { id: 1, machine: "M001", location: "Store A", tech: "John", status: "Pending" },
      { id: 2, machine: "M002", location: "Store B", tech: "Jane", status: "In Progress" },
    ]);
  }, []);

  const pendingJobs = jobs.filter(j => j.status === "Pending").length;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dispatcher Dashboard</h1>
      <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h2>Pending Jobs: {pendingJobs}</h2>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Job ID</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Machine</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Location</th>
            <th style={{ padding: '0.5rem', border: '1 Succeedpx solid #ddd' }}>Tech</th>
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
