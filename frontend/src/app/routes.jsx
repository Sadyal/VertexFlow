import { Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import ProtectedRoute from '../components/common/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import Loader from '../components/common/Loader';

// ==========================================
// LAZY LOADING STRATEGY — ALL routes are lazy
// Initial bundle ships zero page-level code
// ==========================================

// Auth (small pages, eagerly loaded for ultra-fast initial auth flow)
import Login from '../modules/auth/pages/Login';
import Register from '../modules/auth/pages/Register';
const VerifyEmail = lazy(() => import('../modules/auth/pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('../modules/auth/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../modules/auth/pages/ResetPassword'));

// Eagerly loaded core views for instantaneous (0ms) route transitions
import Home from '../pages/Home';
import Dashboard from '../modules/document/pages/Dashboard';
import Network from '../modules/network/pages/Network';
import Profile from '../modules/user/pages/Profile';
import SocialHub from '../modules/social/pages/SocialHub.jsx';

// Code-split heavy views to preserve tiny initial load bundle sizes
const Editor = lazy(() => import('../modules/document/pages/Editor'));

// Admin (Code Split & Strictly Isolated)
import AdminRoute from '../components/common/AdminRoute';
const AdminLayout = lazy(() => import('../modules/admin/layout/AdminLayout'));
const AdminDashboard = lazy(() => import('../modules/admin/pages/AdminDashboard'));
const AdminUsers = lazy(() => import('../modules/admin/pages/AdminUsers'));
const AdminDocs = lazy(() => import('../modules/admin/pages/AdminDocs'));
const AdminAnalytics = lazy(() => import('../modules/admin/pages/AdminAnalytics'));
const AdminSettings = lazy(() => import('../modules/admin/pages/AdminSettings'));
const AdminSocial = lazy(() => import('../modules/admin/pages/AdminSocial'));


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
            <Route path="/profile" element={<Profile />} />
            <Route path="/network" element={<Network />} />
            <Route path="/social" element={<SocialHub />} />
          </Route>
          {/* Isolated dedicated full-screen editor layout */}
          <Route path="/docs/:id" element={<Editor />} />
        </Route>

        {/* 🛡️ ADMIN ROUTES (Strictly Isolated & Lazy Loaded) */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="documents" element={<AdminDocs />} />
            <Route path="social" element={<AdminSocial />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

