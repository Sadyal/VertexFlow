import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';

import Loader from './Loader';

const ProtectedRoute = () => {
  const { isAuthenticated, isInitializing } = useContext(AuthContext);

  if (isInitializing) {
    return <Loader fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
