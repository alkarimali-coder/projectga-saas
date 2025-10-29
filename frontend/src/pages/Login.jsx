import { useState } from 'react';
import axios from 'axios';

function Login({ setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    axios.post('http://127.0.0.1:8000/auth/login', new URLSearchParams({
      username, password
    })).then(res => {
      localStorage.setItem('token', res.data.access_token);
      setToken(res.data.access_token);
    });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Login</h1>
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Login;
