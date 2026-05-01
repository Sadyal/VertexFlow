import axios from "axios";
import { API_ENDPOINTS } from "./constants";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000',
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response interceptor to format responses or catch global errors and handle refresh token
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If the error status is 401 and there is no originalRequest._retry flag,
    // it means the token has expired and we need to refresh it
    if (error.response?.status === 401 && originalRequest.url !== API_ENDPOINTS.LOGIN && !originalRequest._retry) {
      
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          (import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000') + API_ENDPOINTS.REFRESH_TOKEN,
          {},
          { withCredentials: true }
        );
        
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Refresh token failed (e.g. expired). Must login again.
        // Dispatching a custom event to let the app know to redirect to login
        window.dispatchEvent(new Event('auth:unauthorized'));
        
        if (refreshError.response && refreshError.response.data) {
          return Promise.reject(refreshError.response.data);
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Return a structured error object based on backend standard
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject({ success: false, message: error.message || 'Network Error' });
  }
);

export default api;
