import api from '../../utils/axios';
import { API_ENDPOINTS } from '../../utils/constants';

export const userApi = {
  /**
   * ⚡ Get Recent Activity Logs
   */
  getActivity: async () => {
    try {
      const response = await api.get(`${API_ENDPOINTS.USER}/activity`);
      return response.data;
    } catch (err) {
      return err || { success: false, message: "Network error" };
    }
  },

  /**
   * ⚡ Get Activity Heatmap Data
   */
  getHeatmap: async () => {
    try {
      const response = await api.get(`${API_ENDPOINTS.USER}/heatmap`);
      return response.data;
    } catch (err) {
      return err || { success: false, message: "Network error" };
    }
  },
  /**
   * ⚡ Log Custom Activity (e.g. Download)
   */
  logActivity: async (action, details) => {
    try {
      const response = await api.post(`${API_ENDPOINTS.USER}/log`, { action, details });
      return response.data;
    } catch (err) {
      return err || { success: false, message: "Network error" };
    }
  },
};
