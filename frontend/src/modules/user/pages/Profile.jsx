import { useState, useEffect } from 'react';
import { User, Mail, Camera, Save } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { documentApi } from '../../document/doc.api';
import { authApi } from '../../auth/auth.api';
import Button from '../../../components/common/Button';
import './Profile.css';

/**
 * @component Profile
 * @description User profile management page with global avatar sync and real-time document stats.
 */
const Profile = () => {
  const { user, setUser, updateAvatar: updateGlobalAvatar } = useAuth();
  
  // Local state for UI feedback
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [stats, setStats] = useState({ documents: 0, shared: 0 });
  const [avatar, setAvatar] = useState(user?.avatar || localStorage.getItem(`user_avatar_${user?._id || user?.id}`) || null);

  // Sync local name state when user data arrives
  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.avatar) setAvatar(user.avatar);
  }, [user]);

  // ==========================================
  // DATA FETCHING
  // ==========================================
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await documentApi.getDocs();
        if (response.success) {
          const docs = response.data;
          const userId = user?._id || user?.id;
          const userIdStr = String(userId);
          
          // Documents owned by the user
          const ownedCount = docs.filter(doc => {
            const ownerId = String(doc.owner?._id || doc.owner);
            return ownerId === userIdStr;
          }).length;

          // Documents shared with the user (where user is a collaborator)
          const sharedCount = docs.filter(doc => {
            return doc.collaborators?.some(c => String(c?._id || c) === userIdStr);
          }).length;
          
          setStats({
            documents: ownedCount,
            shared: sharedCount
          });
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
          // 1. Update local UI
          setAvatar(base64);
          updateGlobalAvatar(base64);
          
          // 2. Save to DB
          await authApi.updateProfile({ avatar: base64 });
          
          // 3. Update global user state
          setUser(prev => ({ ...prev, avatar: base64 }));
        } catch (err) {
          console.error("Failed to update avatar in DB:", err);
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
      if (response.success) {
        // Update global state
        setUser(prev => ({ ...prev, name: name.trim() }));
      }
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="profile-container animate-fade-in">
      <div className="profile-header">
        <h1>Account Settings</h1>
      </div>

      <div className="profile-content">
        {/* Profile Identity Card */}
        <div className="profile-card glass-panel">
          <div className="avatar-section">
            <div className="avatar-wrapper">
              {avatar ? (
                <img src={avatar} alt="Profile" className="profile-avatar-large" />
              ) : (
                <div className="profile-initials-large">
                  {getInitials(name)}
                </div>
              )}
              <label className="avatar-edit-btn" title="Change Avatar">
                <Camera size={18} />
                <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div className="profile-identity">
              <h2>{name || 'User'}</h2>
              <p>{user?.email}</p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-value">{stats.documents}</span>
              <span className="stat-label">DOCUMENTS</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">{stats.shared}</span>
              <span className="stat-label">SHARED</span>
            </div>
          </div>
        </div>

        {/* Personal Information Form */}
        <div className="profile-form-section glass-panel">
          <h3>Personal Information</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <User size={18} />
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input type="email" value={user?.email || ''} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Button 
              onClick={handleSave} 
              isLoading={isSaving} 
              disabled={name === user?.name || !name.trim()}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <Save size={18} /> Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
