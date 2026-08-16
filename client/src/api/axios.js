import axios from 'axios';
import toast from 'react-hot-toast';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000, // 10s timeout for stability
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Scenario: Server Unreachable (Network Error)
    if (!error.response || error.code === 'ERR_NETWORK') {
      toast.error('Connection Lost: Server is unreachable. Logging out...');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return Promise.reject(error);
    }

    // 2. Scenario: Session Expired (401)
    if (error.response?.status === 401) {
      toast.error('Session Expired: Please login again.');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // 3. Scenario: Maintenance / Server Error (503 / 504)
    if (error.response?.status === 503 || error.response?.status === 504) {
      toast.error('Server under maintenance or gateway timeout. Logging out...');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
