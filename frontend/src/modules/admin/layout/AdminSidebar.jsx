import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut,
  ShieldAlert
} from 'lucide-react';

const AdminSidebar = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
    { path: '/admin/users', icon: Users, label: 'User Management' },
    { path: '/admin/documents', icon: FileText, label: 'Documents' },
    { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/admin/settings', icon: Settings, label: 'System Settings' }
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <div className="admin-brand">
          <ShieldAlert size={24} color="var(--accent-primary)" />
          <span>VertexFlow</span>
          <span className="admin-badge">Admin</span>
        </div>
      </div>

      <nav className="admin-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} className="admin-nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={handleLogout}
            className="admin-nav-link" 
            style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <LogOut size={20} className="admin-nav-icon" color="var(--error)" />
            <span style={{ color: 'var(--error)' }}>Exit Admin</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
