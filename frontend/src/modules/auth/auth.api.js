import api from '../../utils/axios';
import { API_ENDPOINTS } from '../../utils/constants';

export const authApi = {
  login: async (credentials) => {
    const response = await api.post(API_ENDPOINTS.LOGIN, credentials);
    return response.data; // Assumes standard { success, data, message }
  },

  register: async (userData) => {
    const response = await api.post(API_ENDPOINTS.REGISTER, userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post(API_ENDPOINTS.LOGOUT);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get(API_ENDPOINTS.ME);
    return response.data;
  },

  sendVerifyOtp: async () => {
    const response = await api.post(API_ENDPOINTS.SEND_VERIFY_OTP);
    return response.data;
  },

  verifyEmail: async (data) => {
    // data: { email, otp }
    const response = await api.post(API_ENDPOINTS.VERIFY_EMAIL, data);
    return response.data;
  },

  sendResetOtp: async (data) => {
    // data: { email }
    const response = await api.post(API_ENDPOINTS.SEND_RESET_OTP, data);
    return response.data;
  },

  resetPassword: async (data) => {
    // data: { email, otp, newPassword }
    const response = await api.post(API_ENDPOINTS.RESET_PASSWORD, data);
    return response.data;
  },

  updateProfile: async (data) => {
    // data: { name, avatar }
    const response = await api.patch(`${API_ENDPOINTS.AUTH}/update-profile`, data);
    return response.data;
  }
};
