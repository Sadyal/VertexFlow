import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { authApi } from './auth.api';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { fetchUser } = useContext(AuthContext);

  const login = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(credentials);
      if (response.success) {
        await fetchUser(); // Updates the global context
        return true;
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
};

export const useRegister = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { fetchUser } = useContext(AuthContext);

  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.register(userData);
      if (response.success) {
        return true;
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { register, isLoading, error };
};

export const useLogout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useContext(AuthContext);

  const logout = async () => {
    // 🚀 Optimistic Logout: Clear local state immediately for instant UI response
    setUser(null);
    setIsLoading(true);
    
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout background error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { logout, isLoading };
};

export const useVerifyEmail = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { fetchUser } = useContext(AuthContext);

  const verify = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.verifyEmail(data);
      if (response.success) {
        await fetchUser();
        return true;
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Invalid or expired OTP.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { verify, isLoading, error };
};

export const useSendVerifyOtp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendOtp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.sendVerifyOtp();
      return response.success;
    } catch (err) {
      setError(err.message || 'Failed to send verification OTP.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { sendOtp, isLoading, error };
};

export const useSendResetOtp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendOtp = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.sendResetOtp(data);
      return response.success;
    } catch (err) {
      setError(err.message || 'Failed to send reset OTP. User may not exist.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { sendOtp, isLoading, error };
};

export const useResetPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const reset = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.resetPassword(data);
      return response.success;
    } catch (err) {
      setError(err.message || 'Password reset failed. Invalid OTP or password too short.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { reset, isLoading, error };
};
