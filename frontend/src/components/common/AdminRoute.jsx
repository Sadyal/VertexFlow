import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from './Loader';

/**
 * @component AdminRoute
 * @description Protects admin routes. Blocks standard users and redirects them to the main dashboard.
 */
const AdminRoute = () => {
  const { user, isInitializing, isAdmin } = useAuth();

  if (isInitializing) {
    return <Loader fullScreen />;
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If logged in but NOT an admin, block access
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
