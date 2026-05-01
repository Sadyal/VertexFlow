export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  EDITOR: (id) => `/docs/${id}`,
  PROFILE: '/profile',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password'
};

export const API_ENDPOINTS = {
  REGISTER: '/api/auth/register',
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
  REFRESH_TOKEN: '/api/auth/refresh-token',
  SEND_VERIFY_OTP: '/api/auth/send-verify-otp',
  VERIFY_EMAIL: '/api/auth/verify-email',
  SEND_RESET_OTP: '/api/auth/send-reset-otp',
  RESET_PASSWORD: '/api/auth/reset-password',
  AUTH: '/api/auth',
  DOCS: '/api/docs',
};
