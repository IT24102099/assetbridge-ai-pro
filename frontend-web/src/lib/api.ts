import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5206/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('assetbridge_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized vs 403 Forbidden
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 Unauthorized: Invalid or expired session -> clear tokens and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('assetbridge_token');
      localStorage.removeItem('assetbridge_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // 403 Forbidden (or other errors): User is authenticated but lacks authorization ->
    // Keep JWT/session intact, do NOT redirect to login, let calling component display error message
    return Promise.reject(error);
  }
);

export default apiClient;
