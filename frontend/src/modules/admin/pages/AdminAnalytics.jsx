import { useEffect, useState } from 'react';
import { adminApi } from '../admin.api';
import { Activity, MousePointerClick, Zap, Server } from 'lucide-react';
import Loader from '../../../components/common/Loader';
import '../admin.css';

const AdminAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminApi.getDashboardStats();
        if (data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) return (
    <div className="admin-page-loading">
      <Loader />
      <p>Analyzing platform data streams...</p>
    </div>
  );

  // Calculate totals
  const totalApiCalls = stats?.analytics?.reduce((sum, day) => sum + (day.apiCalls || 0), 0) || 0;
  const totalVisits = stats?.analytics?.reduce((sum, day) => sum + (day.visits || 0), 0) || 0;
  
  // Find busiest day
  let busiestDay = { date: 'N/A', apiCalls: 0 };
  if (stats?.analytics?.length > 0) {
    busiestDay = stats.analytics.reduce((max, day) => (day.apiCalls > max.apiCalls ? day : max), stats.analytics[0]);
  }

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-header">
        <h1>Advanced Analytics</h1>
        <p>Deep dive into platform usage metrics and traffic analysis.</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card glass-panel">
          <div className="stat-card-header">
            <span className="stat-title">7-Day API Traffic</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)' }}>
              <Server size={20} />
            </div>
          </div>
          <div className="stat-value">{totalApiCalls.toLocaleString()}</div>
          <div className="stat-trend trend-neutral">Total requests processed</div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-card-header">
            <span className="stat-title">Tracked Visits</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>
              <MousePointerClick size={20} />
            </div>
          </div>
          <div className="stat-value">{totalVisits.toLocaleString()}</div>
          <div className="stat-trend trend-neutral">Unique page loads tracked</div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-card-header">
            <span className="stat-title">Peak Traffic Day</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <Zap size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>
            {busiestDay.date !== 'N/A' ? new Date(busiestDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'N/A'}
          </div>
          <div className="stat-trend trend-up">{busiestDay.apiCalls.toLocaleString()} calls</div>
        </div>
      </div>

      <div className="admin-table-container glass-panel">
        <div className="panel-header" style={{ padding: '1.5rem 1.5rem 0 1.5rem' }}>
          <h3 className="panel-title">Raw Traffic Log (Last 7 Days)</h3>
        </div>
        <table className="admin-table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Total API Calls</th>
              <th>Tracked Visits</th>
              <th>AI Features Used</th>
              <th>Server Load Impact</th>
            </tr>
          </thead>
          <tbody>
            {stats?.analytics?.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No analytics data collected yet.
                </td>
              </tr>
            ) : (
              // Map in reverse so newest is on top
              [...(stats?.analytics || [])].reverse().map((day, idx) => {
                const calls = day.apiCalls || 0;
                let loadStatus = 'Low';
                let loadColor = 'var(--success)';
                
                if (calls > 1000) { loadStatus = 'High'; loadColor = 'var(--error)'; }
                else if (calls > 300) { loadStatus = 'Moderate'; loadColor = 'var(--warning)'; }

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: '500' }}>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{calls.toLocaleString()}</td>
                    <td>{day.visits || 0}</td>
                    <td>{day.featureUsage?.aiCopilot || 0} times</td>
                    <td>
                      <span style={{ 
                        color: loadColor, 
                        background: `${loadColor}20`, 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: '600' 
                      }}>
                        {loadStatus}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAnalytics;
