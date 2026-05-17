import { useEffect } from 'react';
import { adminApi } from '../admin.api';
import { useAdminData } from '../admin.hooks';
import { Users, FileText, Activity, ServerCrash, Clock, Zap, Database, Heart, MessageCircle } from "lucide-react";
import Loader from "../../../components/common/Loader";
import "../admin.css";

const AdminDashboard = () => {
  const { data: stats, isLoading, error, fetchData } = useAdminData(
    adminApi.getDashboardStats, 
    'dashboardStats'
  );

  useEffect(() => {
    document.title = 'Admin Intelligence | VertexFlow';
    fetchData();
  }, [fetchData]);

  if (isLoading && !stats) return (
    <div className="admin-page-loading">
      <Loader />
      <p>Fetching platform intelligence...</p>
    </div>
  );
  
  if (error && !stats) return <div className="admin-error-full">{error}</div>;

  // Use fallback values if stats is not yet loaded (but since we show loader if !stats, this is safe)
  const { users = {}, documents = {}, social = {}, analytics = [] } = stats || {};

  // Find max for chart scaling
  const maxCalls = Math.max(...analytics.map(d => d.apiCalls || 0), 100);

  return (
    <div className="admin-page animate-fade-in">
      {/* PRO BADGE */}
      <div className="pro-badge">PRO OVERSIGHT</div>
      
      <div className="admin-header">
        <h1>Infrastructure Intelligence</h1>
        <p>Real-time oversight of platform health, users, and documents.</p>
      </div>

      <div className="stat-grid">
        {/* USERS CARD */}
        <div className="stat-card glass-panel animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="stat-card-header">
            <span className="stat-title">Active Intelligence</span>
            <div className="stat-icon-wrapper blue"><Users size={20} /></div>
          </div>
          <div className="stat-value-row">
            <div className="stat-value">{users.total || 0}</div>
            <div className="stat-growth up">+12%</div>
          </div>
          <div className="stat-progress-bg">
            <div className="stat-progress-fill blue" style={{ width: '70%' }}></div>
          </div>
          <div className="status-indicator">
            <div className="dot pulse"></div>
            <span>{users.verified || 0} Verified Nodes</span>
          </div>
        </div>

        {/* DOCUMENTS CARD */}
        <div className="stat-card glass-panel animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="stat-card-header">
            <span className="stat-title">Data Assets</span>
            <div className="stat-icon-wrapper purple"><FileText size={20} /></div>
          </div>
          <div className="stat-value-row">
            <div className="stat-value">{documents.total || 0}</div>
            <div className="stat-growth up">+5%</div>
          </div>
          <div className="stat-progress-bg">
            <div className="stat-progress-fill purple" style={{ width: '45%' }}></div>
          </div>
          <div className="status-indicator">
            <div className="dot pulse"></div>
            <span>{documents.totalCollaborations || 0} Active Syncs</span>
          </div>
        </div>

        {/* SYSTEM STATUS CARD */}
        <div className="stat-card glass-panel animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="stat-card-header">
            <span className="stat-title">System Load</span>
            <div className="stat-icon-wrapper green"><Activity size={20} /></div>
          </div>
          <div className="stat-value-row">
            <div className="stat-value">Optimal</div>
          </div>
          <div className="stat-progress-bg">
            <div className="stat-progress-fill green" style={{ width: '22%' }}></div>
          </div>
          <div className="status-indicator">
            <div className="dot pulse"></div>
            <span>Latency: 14ms (Avg)</span>
          </div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        {/* CHART SECTION */}
        <div className="glass-panel chart-section animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="panel-header-row">
            <div className="panel-header-text">
              <h3 className="panel-title">Infrastructure Traffic</h3>
              <p className="panel-subtitle">API Requests processed over the last 7 days</p>
            </div>
            <div className="chart-legend-badge">Traffic</div>
          </div>
          
          <div className="pro-chart-container">
            <div className="chart-y-axis">
              <span>{maxCalls}</span>
              <span>{Math.floor(maxCalls / 2)}</span>
              <span>0</span>
            </div>
            <div className="pro-chart-grid">
              {analytics.map((day, idx) => (
                <div key={idx} className="pro-chart-column">
                  <div className="pro-chart-bar-wrapper">
                    <div 
                      className="pro-chart-bar animate-grow" 
                      style={{ 
                        height: `${(day.apiCalls / maxCalls) * 100}%`,
                        animationDelay: `${0.5 + (idx * 0.1)}s`
                      }}
                    >
                      <div className="pro-chart-tooltip">{day.apiCalls} reqs</div>
                    </div>
                  </div>
                  <span className="pro-chart-label">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SIDE PANELS */}
        <div className="side-panels">
          {/* COMMUNITY ENGAGEMENT PANEL */}
          <div className="glass-panel health-panel animate-slide-in-up" style={{ animationDelay: '0.5s', marginBottom: '1.5rem' }}>
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Community Engagement
            </h3>
            <div className="health-list">
              <div className="health-item">
                <div className="health-icon-bg blue"><Users size={16} /></div>
                <div className="health-info">
                  <span className="health-name">Thoughts & Posts</span>
                  <span className="health-status">Total platform ideas</span>
                </div>
                <span className="health-latency" style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                  {social.totalPosts || 0}
                </span>
              </div>
              <div className="health-item">
                <div className="health-icon-bg purple"><Heart size={16} /></div>
                <div className="health-info">
                  <span className="health-name">Total Likes</span>
                  <span className="health-status">Community support</span>
                </div>
                <span className="health-latency" style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                  {social.totalLikes || 0}
                </span>
              </div>
              <div className="health-item">
                <div className="health-icon-bg green"><MessageCircle size={16} /></div>
                <div className="health-info">
                  <span className="health-name">Thread Comments</span>
                  <span className="health-status">Conversations sparked</span>
                </div>
                <span className="health-latency" style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                  {social.totalComments || 0}
                </span>
              </div>
            </div>
          </div>

          {/* NODE HEALTH PANEL */}
          <div className="glass-panel health-panel animate-slide-in-up" style={{ animationDelay: '0.6s' }}>
            <h3 className="panel-title">Node Health</h3>
            <div className="health-list">
              <div className="health-item">
                <div className="health-icon-bg green"><Database size={16} /></div>
                <div className="health-info">
                  <span className="health-name">MongoDB Cluster</span>
                  <span className="health-status">Healthy</span>
                </div>
                <span className="health-latency">12ms</span>
              </div>
              <div className="health-item">
                <div className="health-icon-bg blue"><Zap size={16} /></div>
                <div className="health-info">
                  <span className="health-name">Redis Engine</span>
                  <span className="health-status">Optimal</span>
                </div>
                <span className="health-latency">4ms</span>
              </div>
              <div className="health-item">
                <div className="health-icon-bg purple"><Clock size={16} /></div>
                <div className="health-info">
                  <span className="health-name">Socket Sync</span>
                  <span className="health-status">Stable</span>
                </div>
                <span className="health-latency">22ms</span>
              </div>
            </div>

            <div className="health-footer">
              <div className="uptime-info">
                <span>99.98% Uptime</span>
                <div className="uptime-bar">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="uptime-tick green"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
