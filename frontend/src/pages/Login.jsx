import { useState } from 'react';
import axios from 'axios';

function Login({ setToken }) {
  const [username, setUsername] = useState('admin@coam.com');
  const [password, setPassword] = useState('admin12');

  const handleLogin = () => {
    axios.post('http://127.0.0.1:8000/auth/login', new URLSearchParams({
      username, password
    })).then(res => {
      setToken(res.data.access_token);
    }).catch(err => alert('Login failed: ' + err.message));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Login</h1>
      <input value={username} onChange={e => setUsername(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Login;
