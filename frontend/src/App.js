import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [email, setEmail] = useState('admin@coam.com');
  const [password, setPassword] = useState('admin123');
  const [message, setMessage] = useState('');
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post('http://127.0.0.1:8000/auth/login', 
        new URLSearchParams({username: email, password}), 
        {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}
      );
      
      const machinesRes = await axios.get('http://127.0.0.1:8000/inventory');
      setMachines(machinesRes.data);
      setMessage(`✅ Logged in as ${res.data.user.role} (${res.data.user.master_license})`);
    } catch (err) {
      setMessage('❌ ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{padding: '20px', maxWidth: '1000px', margin: '0 auto'}}>
      <h1 style={{color: '#007bff'}}>🎰 PROJECTGA Multi-Tenant COAM SaaS</h1>
      
      {!machines.length ? (
        <div style={{border: '1px solid #ccc', padding: '20px', borderRadius: '8px'}}>
          <h2>🔐 Login</h2>
          <input 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            style={{width: '200px', margin: '5px', padding: '8px'}} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={{width: '200px', margin: '5px', padding: '8px'}} 
          />
          <br/>
          <button 
            onClick={login} 
            disabled={loading}
            style={{padding: '10px 20px', background: loading ? '#6c757d' : '#007bff', color: 'white', border: 'none', borderRadius: '5px'}}
          >
            {loading ? 'Logging in...' : '🚀 Login'}
          </button>
          <p style={{color: message.includes('✅') ? 'green' : 'red', marginTop: '10px'}}>{message}</p>
        </div>
      ) : (
        <div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
            <h2>📊 Inventory Dashboard (ML001)</h2>
            <button onClick={() => {setMachines([]); setMessage('');}}>Logout</button>
          </div>
          <p><strong>Total Machines:</strong> {machines.length} | <strong>Revenue:</strong> ${machines.reduce((sum, m) => sum + m.revenue, 0).toFixed(2)}</p>
          <table border="1" style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead style={{background: '#007bff', color: 'white'}}>
              <tr><th>ID</th><th>Location</th><th>Type</th><th>Status</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {machines.map(m => (
                <tr key={m.id}>
                  <td>{m.id}</td><td>{m.location}</td><td>{m.type}</td><td>{m.status}</td><td>${m.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
