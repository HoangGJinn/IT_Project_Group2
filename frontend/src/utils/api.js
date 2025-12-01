import axios from 'axios';

// Function to determine API URL
const getAPIURL = () => {
  // Check if accessed via ngrok FIRST (before checking env vars)
  const hostname = window.location.hostname;
  const isNgrok = /.*\.(ngrok\.io|ngrok-free\.app|ngrok\.app|ngrok-free\.dev)$/.test(hostname);
  
  // If accessed via ngrok, ALWAYS use Vite proxy (relative path)
  // This works because ngrok tunnels to localhost:3000, and Vite proxy forwards /api to localhost:5000
  if (isNgrok) {
    return '/api';
  }

  // If explicitly set in env, use it (but not for ngrok)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Default: use Vite proxy in dev or full URL in production
  return import.meta.env.DEV 
    ? '/api' 
    : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;
};

const API_URL = getAPIURL();

// Log API URL in development for debugging
if (import.meta.env.DEV) {
  const hostname = window.location.hostname;
  const isNgrok = /.*\.(ngrok\.io|ngrok-free\.app|ngrok\.app|ngrok-free\.dev)$/.test(hostname);
  console.log('🔗 API Base URL:', API_URL);
  console.log('🌐 Current Hostname:', hostname);
  console.log('🔍 Is Ngrok:', isNgrok);
  console.log('🔍 DEV Mode:', import.meta.env.DEV);
  console.log('🔍 VITE_API_URL:', import.meta.env.VITE_API_URL || 'not set');
  console.log('🔍 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || 'not set');
}

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CORS with credentials
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log request in development
    if (import.meta.env.DEV) {
      console.log('📤 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        fullURL: `${config.baseURL}${config.url}`,
        hostname: window.location.hostname
      });
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log detailed error in development
    if (import.meta.env.DEV) {
      console.error('❌ API Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown',
        data: error.response?.data,
        networkError: !error.response ? 'Network error - backend không thể truy cập được' : null
      });
    }

    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

