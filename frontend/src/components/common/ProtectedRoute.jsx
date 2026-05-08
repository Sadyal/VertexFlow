import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';

import Loader from './Loader';

const ProtectedRoute = () => {
  const { isAuthenticated, isInitializing, isAdmin } = useContext(AuthContext);

  if (isInitializing) {
    return <Loader fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // If Admin is trying to access normal user routes, redirect to Admin Panel
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
