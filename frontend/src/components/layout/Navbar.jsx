import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Sun, Moon, Menu } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { useLogout } from '../../modules/auth/auth.hooks';
import './Layout.css';

/**
 * @component Navbar
 * @description The top navigation bar. Features a modern floating pill design.
 * Handles theme toggling, user profile summary, and logout capabilities.
 * @param {Function} onMenuClick - Callback to open the mobile sidebar drawer.
 */
const Navbar = ({ onMenuClick }) => {
  const { user, userAvatar } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { logout } = useLogout();

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="mobile-menu-btn" onClick={onMenuClick} aria-label="Open Menu">
          <Menu size={24} color="var(--text-primary)" />
        </button>
      </div>
      
      <div className="navbar-right">
        <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle Theme">
          {theme === 'dark' ? <Sun size={20} color="var(--text-secondary)" /> : <Moon size={20} color="var(--text-secondary)" />}
        </button>
        
        <div className="navbar-actions">
          <Link to="/profile" className="user-profile-link">
            <div className="user-profile">
              <div className="avatar" style={{ backgroundImage: userAvatar ? `url(${userAvatar})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                {!userAvatar && getInitials(user?.name)}
              </div>
              <span className="user-name">{user?.name || 'User'}</span>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
