import axios from 'axios';

const API_BASE_URL = 
    import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1');

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the JWT token + DEBUG LOGGING
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token');
        const role = sessionStorage.getItem('userRole');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // 🐛 API DEBUG: Log all requests with role/token info
        console.log(`[API-CLIENT] → ${config.method?.toUpperCase()} ${config.url} | Role: ${role} | Token: ${!!token}`);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


// Add a response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // 🐛 API DEBUG: Log the exact error from the server
            console.error(`[API-CLIENT] ERROR ${error.response.status}: ${error.response.data?.detail || error.message}`);
            
            if (error.response.status === 401) {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('userRole');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        } else if (error.request) {
            // 🐛 API DEBUG: No response received
            console.error('[API-CLIENT] ERROR: No response received from server. Check if backend is running at https://api.signin.mercuresolution.com');
        } else {
            console.error('[API-CLIENT] ERROR:', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
