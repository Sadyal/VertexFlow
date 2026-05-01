import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from '../components/common/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import Loader from '../components/common/Loader';

// Lazy load pages for performance
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../modules/auth/pages/Login'));
const Register = lazy(() => import('../modules/auth/pages/Register'));
import Dashboard from '../modules/document/pages/Dashboard';
import Network from '../modules/network/pages/Network';
const Editor = lazy(() => import('../modules/document/pages/Editor'));
const Profile = lazy(() => import('../modules/user/pages/Profile'));
const VerifyEmail = lazy(() => import('../modules/auth/pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('../modules/auth/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../modules/auth/pages/ResetPassword'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<Loader fullScreen />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/docs/:id" element={<Editor />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/network" element={<Network />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
