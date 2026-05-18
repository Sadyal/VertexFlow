import { useState, useEffect, useMemo } from 'react';
import { 
  User, Mail, Camera, Save, Shield, Bell, 
  CreditCard, Activity, LogOut, CheckCircle, 
  Smartphone, Globe, Zap, Info, MapPin
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { documentApi } from '../../document/doc.api';
import { authApi } from '../../auth/auth.api';
import { userApi } from '../user.api';
import Button from '../../../components/common/Button';
import './Profile.css';

/**
 * @component Profile (SaaS Pro Edition)
 * @description Massive upgrade featuring multi-tab navigation, 
 * professional activity visualization, and premium SaaS UI/UX.
 */
const Profile = () => {
  const { user, userAvatar, setUser, updateAvatar: updateGlobalAvatar } = useAuth();
  
  // 🚀 TABS STATE
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'activity'
  
  // 🚀 ORIGINAL LOGIC (PRESERVED)
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [stats, setStats] = useState({ documents: 0, shared: 0 });
  const [activityLogs, setActivityLogs] = useState([]);
  const [heatmapStats, setHeatmapStats] = useState([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  
  // 📸 Lightweight browser Blob URL for instant memory-efficient previews
  const [localPreview, setLocalPreview] = useState(null);

  // ⚡ PERFORMANCE FIX: Map raw heatmap stats to the grid
  const heatmapData = useMemo(() => {
    const data = [];
    const months = [];
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    
    // 🚀 Adjust start to the previous Sunday to align rows correctly
    const startOffset = startOfYear.getDay();
    const startDate = new Date(startOfYear);
    startDate.setDate(startDate.getDate() - startOffset);

    // 🚀 Fill 53 weeks (371 days) to ensure full year coverage
    const totalDays = 53 * 7;
    let lastMonth = -1;

    for (let i = 0; i < totalDays; i++) {
      const current = new Date(startDate);
      current.setDate(current.getDate() + i);
      const dateStr = current.toISOString().split('T')[0];
      const dayStat = heatmapStats.find(s => s._id === dateStr);
      
      const currentMonth = current.getMonth();
      if (currentMonth !== lastMonth && current.getFullYear() === today.getFullYear()) {
        months.push({
          colIndex: Math.floor(i / 7),
          name: current.toLocaleString('default', { month: 'short' })
        });
        lastMonth = currentMonth;
      }

      data.push({
        date: dateStr,
        val: !!dayStat,
        count: dayStat ? dayStat.count : 0,
        intensity: dayStat ? (dayStat.count > 15 ? 4 : dayStat.count > 10 ? 3 : dayStat.count > 5 ? 2 : 1) : 0,
        isCurrentYear: current.getFullYear() === today.getFullYear()
      });
    }
    return { cells: data, labels: months, totalCols: 53 };
  }, [heatmapStats]);

  // Removed state-syncing effect to prevent cascading renders (initialized from context)

  useEffect(() => {
    const fetchStats = async () => {
      setIsStatsLoading(true);
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
      } finally {
        setIsStatsLoading(false);
      }
    };
    if (user) fetchStats();
  }, [user]);

  // 🚀 FETCH ACTIVITY LOGS
  useEffect(() => {
    const fetchActivity = async () => {
      setIsActivityLoading(true);
      try {
        const [logRes, heatRes] = await Promise.all([
          userApi.getActivity(),
          userApi.getHeatmap()
        ]);
        
        if (logRes.success) setActivityLogs(logRes.data.activities);
        if (heatRes.success) setHeatmapStats(heatRes.data.heatmap);
      } catch (err) {
        console.error("Failed to fetch activity data:", err);
      } finally {
        setIsActivityLoading(false);
      }
    };
    if (user) fetchActivity();
  }, [user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // 🚀 Use an instant lightweight Object URL for local browser preview.
      // Takes 0 bytes of memory or network overhead, avoiding loading heavy Base64 strings.
      const objectUrl = URL.createObjectURL(file);
      setLocalPreview(objectUrl);

      const reader = new FileReader();
      reader.onload = async (readerEvent) => {
        const base64 = readerEvent.target.result;
        try {
          // 🚀 Update Backend with the Base64 image
          const response = await authApi.updateProfile({ avatar: base64 });
          if (response.success && response.data?.user?.avatar) {
            // Overwrite and save the clean optimized Cloudinary URL in global state & IndexedDB
            updateGlobalAvatar(response.data.user.avatar);
          }
        } catch (err) { 
          console.error("Avatar update failed:", err); 
        } finally {
          // Clean up the object URL after the operation completes to free browser memory
          URL.revokeObjectURL(objectUrl);
          setLocalPreview(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const response = await authApi.updateProfile({ 
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim()
      });
      if (response.success) {
        setUser(prev => ({ 
          ...prev, 
          name: name.trim(),
          bio: bio.trim(),
          location: location.trim()
        }));
      }
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
          <div className="pro-form-group" style={{ gridColumn: 'span 2' }}>
            <label>Bio</label>
            <div className="pro-input-wrapper" style={{ alignItems: 'flex-start', paddingTop: '10px' }}>
              <Info size={18} style={{ marginTop: '5px' }} />
              <textarea 
                className="pro-input" 
                value={bio} 
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                style={{ resize: 'none', background: 'transparent', border: 'none', width: '100%', outline: 'none', color: 'inherit', fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <div className="pro-form-group">
            <label>Location</label>
            <div className="pro-input-wrapper">
              <MapPin size={18} />
              <input 
                type="text" 
                className="pro-input" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                placeholder="City, Country"
              />
            </div>
          </div>
        </div>
        <div className="form-actions" style={{ borderTop: '1px solid var(--border-color)', marginTop: '2rem', paddingTop: '1.5rem' }}>
          <Button onClick={handleSave} isLoading={isSaving} disabled={name === user?.name && bio === user?.bio && location === user?.location || !name.trim()}>
            <Save size={18} /> Save Changes
          </Button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="pro-stat-label">Productivity Heatmap</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Jan {new Date().getFullYear()} - Dec {new Date().getFullYear()}</span>
          </div>
          
          <div className="heatmap-outer-wrapper">
            <div className="heatmap-weekdays">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            <div className="heatmap-wrapper">
              <div className="heatmap-months">
                {heatmapData.labels.map((m, i) => (
                  <span key={i} className="month-label" style={{ left: `${(m.colIndex / heatmapData.totalCols) * 100}%` }}>
                    {m.name}
                  </span>
                ))}
              </div>
              <div className="heatmap-grid-standard">
                {heatmapData.cells.map((cell, i) => (
                  <div 
                    key={i} 
                    className={`heatmap-cell intensity-${cell.intensity} ${!cell.isCurrentYear ? 'is-empty' : ''}`} 
                    title={cell.isCurrentYear ? `${cell.date}: ${cell.count} actions` : ''}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="heatmap-legend">
            <span>Less</span>
            <div className="heatmap-cell" />
            <div className="heatmap-cell intensity-1" />
            <div className="heatmap-cell intensity-2" />
            <div className="heatmap-cell intensity-3" />
            <div className="heatmap-cell intensity-4" />
            <span>More</span>
          </div>
        </div>

        <div style={{ marginTop: '2.5rem' }}>
          <div className="section-header-compact">
             <h4>Recent Activity</h4>
             <span className="activity-count-badge">{activityLogs.length} Events</span>
          </div>
          
          <div className="activity-timeline">
            {isActivityLoading ? (
              <>
                <div className="skeleton-line" style={{ height: '60px', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }}></div>
                <div className="skeleton-line" style={{ height: '60px', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }}></div>
                <div className="skeleton-line" style={{ height: '60px', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }}></div>
              </>
            ) : activityLogs.length > 0 ? (
              activityLogs.map((log, index) => (
                <div key={log._id || index} className="timeline-item animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="timeline-marker">
                    <div className={`marker-dot ${log.action.includes('DOC') ? 'bg-accent' : 'bg-success'}`} />
                    {index !== activityLogs.length - 1 && <div className="marker-line" />}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="action-tag">{log.action.replace('_', ' ')}</span>
                      <span className="timestamp">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="action-detail">{log.details || 'No additional details provided'}</p>
                    <span className="date-subtle">{new Date(log.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-mini glass-panel">
                <Activity size={32} className="text-muted" style={{ opacity: 0.3 }} />
                <p>No activity recorded yet. Start editing documents to see your progress!</p>
              </div>
            )}
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
          <button className={`profile-nav-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
            <Activity size={18} /> Activity
          </button>
        </aside>

        {/* MAIN CONTENT AREA */}
        <section className="profile-content-area">
          
          {/* PROFILE HERO CARD */}
          <div className="profile-section-card glass-panel">
            <div className="profile-hero-header"></div>
            <div className="profile-hero-content">
              <div className="profile-avatar-giant-wrapper">
                {localPreview || userAvatar ? (
                  <img src={localPreview || userAvatar} alt="Profile" className="profile-avatar-giant" />
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
                <p className="profile-email">{user?.email}</p>
                {bio && <p className="profile-bio-preview">{bio}</p>}
                {location && <p className="profile-location-preview"><MapPin size={14} /> {location}</p>}
                <div style={{ marginTop: '0.5rem' }}>
                  <span className="badge-pro">PRO MEMBER</span>
                </div>
              </div>
              
              <div className="profile-pro-stats">
                {isStatsLoading ? (
                  <>
                    <div className="pro-stat-box skeleton-box" style={{ minHeight: '90px' }}></div>
                    <div className="pro-stat-box skeleton-box" style={{ minHeight: '90px' }}></div>
                    <div className="pro-stat-box skeleton-box" style={{ minHeight: '90px' }}></div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>

          {/* TAB CONTENT */}
          {activeTab === 'general' && renderGeneral()}
          {activeTab === 'activity' && renderActivity()}

        </section>
      </main>
    </div>
  );
};

export default Profile;
