import { useEffect, useState } from 'react';

function FieldTechDashboard() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    // Mock data until API is ready
    setJobs([
      { id: 1, machine: "M001", location: "Store A", task: "Replace coin mech", status: "Assigned" },
      { id: 2, machine: "M003", location: "Store C", task: "Clean bill validator", status: "In Progress" },
    ]);
  }, []);

  const handlePhotoUpload = (jobId) => {
    alert(`Photo uploaded for job ${jobId}`);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Field Tech Dashboard</h1>
      <div style={{ background: '#d1fae5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h2>Today's Jobs: {jobs.length}</h2>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Job ID</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Machine</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Location</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Task</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Status</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(j => (
            <tr key={j.id}>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.id}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.machine}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.location}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.task}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{j.status}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                <button onClick={() => handlePhotoUpload(j.id)}>Upload Photo</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FieldTechDashboard;
