import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import '../admin.css';
import { useAuth } from '../../../context/AuthContext';
import { Menu } from 'lucide-react';

const AdminLayout = () => {
  const { user } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="admin-layout animate-fade-in">
      {/* Sidebar overlay for mobile background click-to-close */}
      {isMobileSidebarOpen && (
        <div 
          className="admin-sidebar-overlay" 
          onClick={() => setIsMobileSidebarOpen(false)} 
        />
      )}
      
      <AdminSidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
      />
      
      <div className="admin-main">
        <header className="admin-topbar">
          <button 
            className="admin-mobile-menu-btn"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open Admin Menu"
            style={{ 
              display: 'none', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              color: 'var(--text-primary)',
              padding: '0.5rem'
            }}
          >
            <Menu size={24} />
          </button>
          
          <div className="topbar-search">
            {/* Global Admin Search Placeholder */}
          </div>
          <div className="topbar-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="admin-session-text" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Admin Session:</span>
            <span className="admin-session-email" style={{ fontWeight: '600' }}>{user?.email}</span>
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
