import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';
import './Layout.css';

const MainLayout = () => {
  const { isOnline } = useNetworkStatus();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="layout-container">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className="main-area">
        {!isOnline && (
          <div className="offline-banner">
            <WifiOff size={16} /> You are currently offline. Changes will be saved locally.
          </div>
        )}
        <Navbar onMenuClick={toggleMobileMenu} />
        <main className="content-wrapper">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
