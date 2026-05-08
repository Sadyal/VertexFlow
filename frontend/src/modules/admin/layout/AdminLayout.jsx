import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import '../admin.css';
import { useAuth } from '../../../context/AuthContext';

const AdminLayout = () => {
  const { user } = useAuth();

  return (
    <div className="admin-layout animate-fade-in">
      <AdminSidebar />
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-search">
            {/* Global Admin Search Placeholder */}
          </div>
          <div className="topbar-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Admin Session:</span>
            <span style={{ fontWeight: '600' }}>{user?.email}</span>
          </div>
        </header>
        <main className="admin-content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
