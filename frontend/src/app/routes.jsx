import { Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import ProtectedRoute from '../components/common/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import Loader from '../components/common/Loader';

// ==========================================
// LAZY LOADING STRATEGY — ALL routes are lazy
// Initial bundle ships zero page-level code
// ==========================================

// Auth (small pages, but still lazy to minimise entry chunk)
const Login = lazy(() => import('../modules/auth/pages/Login'));
const Register = lazy(() => import('../modules/auth/pages/Register'));
const VerifyEmail = lazy(() => import('../modules/auth/pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('../modules/auth/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../modules/auth/pages/ResetPassword'));

// App pages
const Home = lazy(() => import('../pages/Home'));
const Dashboard = lazy(() => import('../modules/document/pages/Dashboard'));
const Network = lazy(() => import('../modules/network/pages/Network'));
const Editor = lazy(() => import('../modules/document/pages/Editor'));
const Profile = lazy(() => import('../modules/user/pages/Profile'));
const SocialHub = lazy(() => import('../modules/social/pages/SocialHub.jsx'));

// Admin (Code Split)
import AdminRoute from '../components/common/AdminRoute';
const AdminLayout = lazy(() => import('../modules/admin/layout/AdminLayout'));
const AdminDashboard = lazy(() => import('../modules/admin/pages/AdminDashboard'));
const AdminUsers = lazy(() => import('../modules/admin/pages/AdminUsers'));
const AdminDocs = lazy(() => import('../modules/admin/pages/AdminDocs'));
const AdminAnalytics = lazy(() => import('../modules/admin/pages/AdminAnalytics'));
const AdminSettings = lazy(() => import('../modules/admin/pages/AdminSettings'));


const AppRoutes = () => {
  const location = useLocation();

  // 🚀 Performance: Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
            <Route path="/social" element={<SocialHub />} />
          </Route>
        </Route>

        {/* 🛡️ ADMIN ROUTES (Strictly Isolated & Lazy Loaded) */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="documents" element={<AdminDocs />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

