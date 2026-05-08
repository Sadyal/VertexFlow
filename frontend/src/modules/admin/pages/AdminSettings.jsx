import { useState, useEffect } from 'react';
import { adminApi } from '../admin.api';
import { Save, Shield, Database, Zap, Settings as SettingsIcon, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Loader from '../../../components/common/Loader';
import '../admin.css';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await adminApi.getSettings();
        if (res.success) {
          setSettings(res.data);
        }
      } catch (err) {
        showNotification('error', 'Failed to load system settings');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await adminApi.updateSettings(settings);
      if (res.success) {
        setSettings(res.data);
        showNotification('success', 'Settings saved successfully');
      }
    } catch (err) {
      showNotification('error', 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const runTask = async (action) => {
    try {
      showNotification('info', 'Executing maintenance task...');
      const res = await adminApi.runMaintenance(action);
      if (res.success) {
        showNotification('success', res.message);
      }
    } catch (err) {
      showNotification('error', 'Task failed to execute');
    }
  };

  if (isLoading) return <Loader />;
  if (!settings) return <div className="admin-error-full">Failed to load system configuration.</div>;

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>System Configuration</h1>
          <p>Manage platform-wide settings, security, and maintenance tasks.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="admin-save-btn"
        >
          {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`admin-notification ${notification.type} animate-slide-up`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="settings-container">
        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button 
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <SettingsIcon size={18} /> General
          </button>
          <button 
            className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={18} /> Security
          </button>
          <button 
            className={`settings-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Zap size={18} /> AI & Features
          </button>
          <button 
            className={`settings-tab ${activeTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('maintenance')}
          >
            <Database size={18} /> Maintenance
          </button>
        </div>

        <div className="settings-content glass-panel">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <h3>Platform Details</h3>
              <div className="settings-grid">
                <div className="settings-item">
                  <label>Platform Name</label>
                  <input 
                    type="text" 
                    value={settings.platformName} 
                    onChange={(e) => handleInputChange('platformName', e.target.value)}
                  />
                  <small>The name displayed in the browser title and login pages.</small>
                </div>
                <div className="settings-item">
                  <label>Maintenance Mode</label>
                  <div className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="maint-mode" 
                      checked={settings.maintenanceMode}
                      onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                    />
                    <label htmlFor="maint-mode"></label>
                    <span style={{ marginLeft: '10px' }}>{settings.maintenanceMode ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <small>When enabled, only admins can access the platform.</small>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <h3>Access Control</h3>
              <div className="settings-grid">
                <div className="settings-item">
                  <label>Registration Mode</label>
                  <select 
                    value={settings.registrationMode}
                    onChange={(e) => handleInputChange('registrationMode', e.target.value)}
                  >
                    <option value="open">Open (Public Registration)</option>
                    <option value="invite">Invite Only (Admin Created)</option>
                    <option value="closed">Closed (No New Users)</option>
                  </select>
                </div>
                <div className="settings-item">
                  <label>Email Verification</label>
                  <div className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="email-verif" 
                      checked={settings.requireEmailVerification}
                      onChange={(e) => handleInputChange('requireEmailVerification', e.target.checked)}
                    />
                    <label htmlFor="email-verif"></label>
                    <span style={{ marginLeft: '10px' }}>{settings.requireEmailVerification ? 'Required' : 'Optional'}</span>
                  </div>
                  <small>Requires users to verify their email before using the editor.</small>
                </div>
              </div>
            </div>
          )}

          {/* AI TAB */}
          {activeTab === 'ai' && (
            <div className="settings-section">
              <h3>AI Integration (Groq)</h3>
              <div className="settings-grid">
                <div className="settings-item">
                  <label>Default Engine Model</label>
                  <select 
                    value={settings.defaultAiModel}
                    onChange={(e) => handleInputChange('defaultAiModel', e.target.value)}
                  >
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Versatile)</option>
                    <option value="llama3-8b-8192">Llama 3 8B (Fast)</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B (Large Context)</option>
                  </select>
                </div>
                <div className="settings-item">
                  <label>Max Tokens Per Generation</label>
                  <input 
                    type="number" 
                    value={settings.maxTokensPerRequest}
                    onChange={(e) => handleInputChange('maxTokensPerRequest', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* MAINTENANCE TAB */}
          {activeTab === 'maintenance' && (
            <div className="settings-section">
              <h3>Platform Maintenance</h3>
              <div className="maintenance-actions">
                <div className="maint-card">
                  <div className="maint-info">
                    <h4>Clear Inactive Sessions</h4>
                    <p>Signs out users who haven't been active in 30 days to clear Redis and DB cache.</p>
                  </div>
                  <button onClick={() => runTask('clear_sessions')} className="btn-action">Run Task</button>
                </div>
                
                <div className="maint-card">
                  <div className="maint-info">
                    <h4>Purge Empty Documents</h4>
                    <p>Permanently deletes "Untitled" documents that have no collaborators and no content.</p>
                  </div>
                  <button onClick={() => runTask('purge_docs')} className="btn-action danger">Purge Now</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
