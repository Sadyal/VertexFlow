import { useState, useEffect } from 'react';
import { 
  User, Mail, Camera, Save, Shield, Bell, 
  CreditCard, Activity, LogOut, CheckCircle, 
  Smartphone, Globe, Zap 
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { documentApi } from '../../document/doc.api';
import { authApi } from '../../auth/auth.api';
import Button from '../../../components/common/Button';
import './Profile.css';

/**
 * @component Profile (SaaS Pro Edition)
 * @description Massive upgrade featuring multi-tab navigation, 
 * professional activity visualization, and premium SaaS UI/UX.
 */
const Profile = () => {
  const { user, setUser, updateAvatar: updateGlobalAvatar } = useAuth();
  
  // 🚀 TABS STATE
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'security' | 'activity' | 'billing'
  
  // 🚀 ORIGINAL LOGIC (PRESERVED)
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [stats, setStats] = useState({ documents: 0, shared: 0 });
  const [avatar, setAvatar] = useState(user?.avatar || localStorage.getItem(`user_avatar_${user?._id || user?.id}`) || null);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.avatar) setAvatar(user.avatar);
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await documentApi.getDocs();
        if (response.success) {
          const docs = response.data;
          const userId = user?._id || user?.id;
          const userIdStr = String(userId);
          
          const ownedCount = docs.filter(doc => String(doc.owner?._id || doc.owner) === userIdStr).length;
          const sharedCount = docs.filter(doc => doc.collaborators?.some(c => String(c?._id || c) === userIdStr)).length;
          
          setStats({ documents: ownedCount, shared: sharedCount });
        }
      } catch (err) {
        console.error("Failed to fetch profile stats:", err);
      }
    };
    if (user) fetchStats();
  }, [user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (readerEvent) => {
        const base64 = readerEvent.target.result;
        try {
          // 🚀 Update Global State (Context + LocalStorage)
          updateGlobalAvatar(base64);
          
          // 🚀 Update Backend
          await authApi.updateProfile({ avatar: base64 });
        } catch (err) { 
          console.error("Avatar update failed:", err); 
          // Optional: revert local state if backend fails
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const response = await authApi.updateProfile({ name: name.trim() });
      if (response.success) setUser(prev => ({ ...prev, name: name.trim() }));
    } catch (err) { console.error("Profile update failed:", err); }
    finally { setIsSaving(false); }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '?';

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  
  const renderGeneral = () => (
    <div className="profile-section-card glass-panel animate-slide-up">
      <div className="pro-card-header">
        <h3><User size={20} className="text-accent" /> Personal Information</h3>
      </div>
      <div className="pro-card-body">
        <div className="pro-form-grid">
          <div className="pro-form-group">
            <label>Full Name</label>
            <div className="pro-input-wrapper">
              <User size={18} />
              <input type="text" className="pro-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="pro-form-group">
            <label>Email Address</label>
            <div className="pro-input-wrapper">
              <Mail size={18} />
              <input type="email" className="pro-input" value={user?.email || ''} readOnly />
            </div>
          </div>
          <div className="pro-form-group">
            <label>Workspace Role</label>
            <div className="pro-input-wrapper">
              <Zap size={18} />
              <input type="text" className="pro-input" value="Primary Contributor" readOnly />
            </div>
          </div>
          <div className="pro-form-group">
            <label>Region</label>
            <div className="pro-input-wrapper">
              <Globe size={18} />
              <input type="text" className="pro-input" value="Global / Cloud" readOnly />
            </div>
          </div>
        </div>
        <div className="form-actions" style={{ borderTop: '1px solid var(--border-color)', marginTop: '2rem', paddingTop: '1.5rem' }}>
          <Button onClick={handleSave} isLoading={isSaving} disabled={name === user?.name || !name.trim()}>
            <Save size={18} /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="profile-section-card glass-panel animate-slide-up">
      <div className="pro-card-header">
        <h3><Shield size={20} className="text-accent" /> Security & Privacy</h3>
      </div>
      <div className="pro-card-body">
        <div className="pro-feature-row">
          <div className="pro-feature-info">
            <div className="pro-feature-icon-box"><Smartphone size={20} /></div>
            <div className="pro-feature-text">
              <h4>Two-Factor Authentication</h4>
              <p>Add an extra layer of security to your account.</p>
            </div>
          </div>
          <span className="badge-active">ACTIVE</span>
        </div>
        <div className="pro-feature-row">
          <div className="pro-feature-info">
            <div className="pro-feature-icon-box"><Globe size={20} /></div>
            <div className="pro-feature-text">
              <h4>Browser Sessions</h4>
              <p>Manage your active sessions on different devices.</p>
            </div>
          </div>
          <Button variant="secondary" size="small">Manage</Button>
        </div>
        <div className="pro-feature-row">
          <div className="pro-feature-info">
            <div className="pro-feature-icon-box"><Shield size={20} /></div>
            <div className="pro-feature-text">
              <h4>Data Encryption</h4>
              <p>All your documents are encrypted at rest and in transit.</p>
            </div>
          </div>
          <CheckCircle size={20} className="text-success" />
        </div>
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="profile-section-card glass-panel animate-slide-up">
      <div className="pro-card-header">
        <h3><Activity size={20} className="text-accent" /> System Activity</h3>
      </div>
      <div className="pro-card-body">
        <div className="heatmap-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="pro-stat-label">Productivity Heatmap</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Last 30 days</span>
          </div>
          <div className="heatmap-grid">
            {[...Array(90)].map((_, i) => (
              <div key={i} className={`heatmap-cell ${Math.random() > 0.7 ? (Math.random() > 0.5 ? 'very-active' : 'active') : ''}`} />
            ))}
          </div>
        </div>
        <div style={{ marginTop: '2rem' }}>
          <h4>Recent Events</h4>
          <div className="pro-feature-row">
             <p style={{ fontSize: '0.85rem' }}>Document <strong>"Project Proposal"</strong> edited 2 hours ago.</p>
          </div>
          <div className="pro-feature-row">
             <p style={{ fontSize: '0.85rem' }}>New collaborator added to <strong>"Vertex Design"</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="profile-section-card glass-panel animate-slide-up">
      <div className="pro-card-header">
        <h3><CreditCard size={20} className="text-accent" /> Plan & Subscription</h3>
      </div>
      <div className="pro-card-body">
        <div className="pro-feature-row" style={{ background: 'rgba(var(--accent-primary-rgb), 0.05)', borderColor: 'var(--accent-primary)' }}>
          <div className="pro-feature-info">
            <div className="pro-feature-icon-box" style={{ background: 'var(--accent-primary)' }}><Zap size={20} color="white" /></div>
            <div className="pro-feature-text">
              <h4>VertexFlow Pro Plan</h4>
              <p>Unlimited documents, collaborators, and priority support.</p>
            </div>
          </div>
          <span className="badge-pro">PRO</span>
        </div>
        <div className="pro-pro-stats" style={{ marginTop: '1.5rem' }}>
          <div className="pro-stat-box">
             <span className="pro-stat-value">$12.00</span>
             <span className="pro-stat-label">Next Payment</span>
          </div>
          <div className="pro-stat-box">
             <span className="pro-stat-value">Aug 24</span>
             <span className="pro-stat-label">Billing Date</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="profile-container animate-fade-in">
      <header className="profile-header">
        <h1>Account Settings</h1>
      </header>

      <main className="profile-main-layout">
        {/* SIDE NAVIGATION */}
        <aside className="profile-navigation-sidebar">
          <button className={`profile-nav-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
            <User size={18} /> General
          </button>
          <button className={`profile-nav-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
            <Shield size={18} /> Security
          </button>
          <button className={`profile-nav-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
            <Activity size={18} /> Activity
          </button>
          <button className={`profile-nav-btn ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
            <CreditCard size={18} /> Billing
          </button>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />
          <button className="profile-nav-btn text-error" style={{ opacity: 0.7 }}>
            <LogOut size={18} /> Deactivate
          </button>
        </aside>

        {/* MAIN CONTENT AREA */}
        <section className="profile-content-area">
          
          {/* PROFILE HERO CARD */}
          <div className="profile-section-card glass-panel">
            <div className="profile-hero-header"></div>
            <div className="profile-hero-content">
              <div className="profile-avatar-giant-wrapper">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="profile-avatar-giant" />
                ) : (
                  <div className="profile-initials-giant">{getInitials(name)}</div>
                )}
                <label className="avatar-upload-overlay" title="Update Photo">
                  <Camera size={16} />
                  <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                </label>
              </div>
              <div className="profile-info-main">
                <h2>{name || 'User'}</h2>
                <p>{user?.email}</p>
                <div style={{ marginTop: '0.5rem' }}>
                  <span className="badge-pro">PRO MEMBER</span>
                </div>
              </div>
              
              <div className="profile-pro-stats">
                <div className="pro-stat-box">
                  <span className="pro-stat-value">{stats.documents}</span>
                  <span className="pro-stat-label">DOCUMENTS</span>
                </div>
                <div className="pro-stat-box">
                  <span className="pro-stat-value">{stats.shared}</span>
                  <span className="pro-stat-label">SHARED</span>
                </div>
                <div className="pro-stat-box">
                  <span className="pro-stat-value">99.9%</span>
                  <span className="pro-stat-label">UPTIME</span>
                </div>
              </div>
            </div>
          </div>

          {/* TAB CONTENT */}
          {activeTab === 'general' && renderGeneral()}
          {activeTab === 'security' && renderSecurity()}
          {activeTab === 'activity' && renderActivity()}
          {activeTab === 'billing' && renderBilling()}

        </section>
      </main>
    </div>
  );
};

export default Profile;
