import { useState } from 'react';
import { login } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('admin@coam.com');
  const [password, setPassword] = useState('admin12');
  const { login: setLogin } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await login(email, password);
      setLogin(res.data.access_token);
      const payload = JSON.parse(atob(res.data.access_token.split('.')[1]));
      const role = payload.role;
      const routes = {
        super_admin: '/super-admin',
        ml_admin: '/master-admin',
        dispatcher: '/dispatcher',
        warehouse: '/warehouse',
        tech: '/field-tech',
        location_owner: '/location-owner',
      };
      window.location.href = routes[role] || '/dashboard';
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ padding: '2rem' }}>
      <h2>Login</h2>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
