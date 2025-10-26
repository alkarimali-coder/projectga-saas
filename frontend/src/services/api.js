import axios from 'axios';

const api = axios.create({
  baseURL: 'https://projectga-api.onrender.com',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = (email, password) => 
  api.post('/auth/login', new URLSearchParams({ username: email, password }));

export const getInventory = () => api.get('/inventory/');

export default api;
