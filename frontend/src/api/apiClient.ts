import axios from 'axios';

const API_BASE_URL = 
    import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1');

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // 🍪 Send HttpOnly cookies automatically
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor
api.interceptors.request.use(
    (config) => {
        const role = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
        // 🐛 API DEBUG: Log all requests
        console.log(`[API-CLIENT] → ${config.method?.toUpperCase()} ${config.url} | Role: ${role}`);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle errors and silent token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response) {
            console.error(`[API-CLIENT] ERROR ${error.response.status}: ${error.response.data?.detail || error.message}`);
            
            // 🔄 Attempt silent token refresh on 401 if not already retried and not on auth endpoints
            if (error.response.status === 401 && !originalRequest._retry && !originalRequest.url.includes('auth/login') && !originalRequest.url.includes('auth/refresh')) {
                originalRequest._retry = true;
                try {
                    await api.post('auth/refresh');
                    return api(originalRequest);
                } catch (refreshErr) {
                    console.warn('[AUTH] Token refresh failed, redirecting to login');
                    sessionStorage.clear();
                    localStorage.clear();
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                }
            } else if (error.response.status === 401 && !originalRequest.url.includes('auth/login')) {
                sessionStorage.clear();
                localStorage.clear();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
