import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, X, LogOut, Users } from 'lucide-react';
import { ROUTES } from '../../utils/constants';
import { useLogout } from '../../modules/auth/auth.hooks';

/**
 * @component Sidebar
 * @description The main navigation sidebar. Features a modern floating layout
 * on desktop and a sliding drawer mechanism on mobile devices.
 * @param {boolean} isOpen - Controls visibility on mobile screens.
 * @param {Function} onClose - Callback triggered when closing the mobile drawer.
 */
const Sidebar = ({ isOpen, onClose }) => {
  const { logout } = useLogout();

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand">
          <FileText size={24} color="var(--accent-primary)" />
          <span>LiveSync</span>
        </div>
        <button className="mobile-close-btn" onClick={onClose} aria-label="Close Sidebar">
          <X size={24} color="var(--text-primary)" />
        </button>
      </div>
      <nav className="sidebar-nav">
        <NavLink 
          to={ROUTES.DASHBOARD} 
          end
          className={({ isActive }) => isActive ? 'sidebar-nav-item active' : 'sidebar-nav-item'}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink 
          to="/profile" 
          className={({ isActive }) => isActive ? 'sidebar-nav-item active' : 'sidebar-nav-item'}
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
        <NavLink 
          to="/network" 
          className={({ isActive }) => isActive ? 'sidebar-nav-item active' : 'sidebar-nav-item'}
        >
          <Users size={20} />
          <span>Network</span>
        </NavLink>
        
        <button 
          onClick={logout} 
          className="sidebar-nav-item logout-nav-item"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', width: 'calc(100% - 1rem)', textAlign: 'left' }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>

        <div style={{ padding: '2rem 1.5rem', marginTop: 'auto' }}>
          <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Pro Tip: Use the dashboard to organize your thoughts.
            </p>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
