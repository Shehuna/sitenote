import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkspacePermissionManagement from './WorkspacePermission/WorkspacePermissionManagement';
import Modal from './Modals/Modal';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [showWorkspacePermissionModal, setShowWorkspacePermissionModal] = useState(false);
  const navigate = useNavigate();  

const formatFileSize = (bytes) => {
  console.log('formatFileSize called with:', bytes); 
  
  if (bytes === null || bytes === undefined || bytes === 0) return '0 Bytes';
  
  try {
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const result = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    console.log('formatFileSize result:', result); 
    return result;
  } catch (error) {
    console.error('Error formatting file size:', error);
    return bytes + ' Bytes';
  }
};
const getFirstWorkspaceId = () => {
    if (dashboardData?.workspaceOverview?.allWorkspacesWithUsers?.length > 0) {
      return dashboardData.workspaceOverview.allWorkspacesWithUsers[0].id || 
             dashboardData.workspaceOverview.allWorkspacesWithUsers[0].workspaceID;
    }
    return null;
  };

 const getCurrentUser = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    return {
      id: user?.userId || '0',
      name: user?.userName || 'Admin'
    };
  };

  const closeWorkspacePermissionModal = () => {
    setShowWorkspacePermissionModal(false);
  };

  const handleWorkspacePermissionsClick = () => {
    setShowWorkspacePermissionModal(true);
  };

  const calculateStoragePercentage = (storageUsed) => {
    if (!storageUsed) return 0;
    const maxStorage = 10 * 1024 * 1024 * 1024; // 10GB
    return Math.min(Math.round((storageUsed / maxStorage) * 100), 100);
  };

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7204';
      
      const response = await fetch(`${apiBaseUrl}/api/Dashboard/GetDashboardMetrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.metrics) {
        setDashboardData(result.metrics);
      } else {
        setDashboardData(result);
      }
      
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const stats = dashboardData ? [
    { 
      label: 'Total Workspaces', 
      value: dashboardData.workspaceOverview?.totalWorkspaces?.toString() || '0', 
      change: '+12%', 
      icon: 'fas fa-building', 
      color: '#3B82F6' 
    },
    { 
      label: 'Active Users', 
      value: dashboardData.userStatistics?.activeUsers?.toString() || '0', 
      change: '+8%', 
      icon: 'fas fa-users', 
      color: '#10B981' 
    },
    { 
      label: 'Total Notes', 
      value: dashboardData.notesStatistics?.totalNotes?.toString() || '0', 
      change: '+23%', 
      icon: 'fas fa-sticky-note', 
      color: '#8B5CF6' 
    },
    { 
      label: 'Total Users', 
      value: dashboardData.userStatistics?.totalUsers?.toString() || '0', 
      change: '+15%', 
      icon: 'fas fa-user-plus', 
      color: '#F59E0B' 
    },
    { 
      label: 'Total Attachments', 
      value: dashboardData.attachments?.totalAttachments?.toString() || '0', 
      change: '+18%', 
      icon: 'fas fa-paperclip', 
      color: '#EF4444' 
    },
    { 
      label: 'Storage Used', 
      value: `${calculateStoragePercentage(dashboardData.storageUsage?.totalStorageUsed)}%`, 
      change: '+4%', 
      icon: 'fas fa-database', 
      color: '#6366F1' 
    },
  ] : [
    { label: 'Total Workspaces', value: '0', change: '+0%', icon: 'fas fa-building', color: '#3B82F6' },
    { label: 'Active Users', value: '0', change: '+0%', icon: 'fas fa-users', color: '#10B981' },
    { label: 'Total Notes', value: '0', change: '+0%', icon: 'fas fa-sticky-note', color: '#8B5CF6' },
    { label: 'Total Users', value: '0', change: '+0%', icon: 'fas fa-user-plus', color: '#F59E0B' },
    { label: 'Total Attachments', value: '0', change: '+0%', icon: 'fas fa-paperclip', color: '#EF4444' },
    { label: 'Storage Used', value: '0%', change: '+0%', icon: 'fas fa-database', color: '#6366F1' },
  ];
  


  const workspaceData = dashboardData?.workspaceOverview?.allWorkspacesWithUsers?.map((workspace, index) => {
    const topWorkspace = dashboardData?.workspaceOverview?.top10Workspaces?.find(w => w.name === workspace.name);
    return {
      name: workspace.name,
      users: workspace.usersCount || 0,
      projects: topWorkspace?.notesCount || 0,
      status: 'active'
    };
  }) || [
    { name: 'Loading...', users: 0, projects: 0, status: 'active' },
  ];

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <div className="admin-dashboard-loading">
          <i className="fas fa-spinner fa-spin fa-3x"></i>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-container">
        <div className="admin-dashboard-error">
          <div className="error-message">
            <i className="fas fa-exclamation-triangle fa-3x"></i>
            <h3>Error Loading Dashboard</h3>
            <p>{error}</p>
            <button className="admin-btn-primary" onClick={() => window.location.reload()}>
              <i className="fas fa-redo"></i> Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      

      <div className={`admin-main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <nav className="admin-navbar">
          <div className="admin-navbar-left">
            <h1>Admin Dashboard</h1>
            <div className="admin-breadcrumb">
              <span>Admin</span>
              <i className="fas fa-chevron-right" />
              <span className="admin-active">Dashboard</span>
            </div>
          </div>
          
          <div className="admin-navbar-right">
            <button className="admin-nav-btn" title="Notifications">
              <i className="fas fa-bell" />
              <span className="admin-notification-badge">3</span>
            </button>
            
            <button className="admin-nav-btn" title="Search">
              <i className="fas fa-search" />
            </button>
            
            <button 
              className="admin-nav-btn admin-home-btn" 
              onClick={() => navigate('/')}
              title="Back to Home"
            >
              <i className="fas fa-home" />
              <span>Back to Home</span>
            </button>
            
            <div className="admin-user-dropdown">
              <div className="admin-user-avatar-sm">AD</div>
              <i className="fas fa-chevron-down" />
            </div>
          </div>
        </nav>

        <div className="admin-dashboard-content">
          <div className="admin-welcome-banner">
            <div className="admin-welcome-text">
              <h2>Welcome back, Admin!</h2>
              <p>Here's what's happening with your platform today.</p>
            </div>
            <div className="admin-welcome-actions">
              <button className="admin-btn-primary">
                <i className="fas fa-plus" /> Add New Workspace
              </button>
              <button 
                className="admin-btn-secondary" 
                onClick={handleWorkspacePermissionsClick}
              >
                <i className="fas fa-user-shield" /> Workspace Permissions
              </button>
              <button className="admin-btn-secondary">
                <i className="fas fa-download" /> Generate Report
              </button>
            </div>
          </div>

          <div className="admin-stats-grid">
            {stats.map((stat, index) => (
              <div className="admin-stat-card" key={index}>
                <div className="admin-stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                  <i className={stat.icon} />
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-value">{stat.value}</div>
                  <div className="admin-stat-label">{stat.label}</div>
                </div>
                <div className={`admin-stat-change ${stat.change.startsWith('+') ? 'positive' : 'negative'}`}>
                  {stat.change}
                </div>
              </div>
            ))}
          </div>

          <div className="admin-content-grid">
            

            <div className="admin-content-card">
              <div className="admin-card-header">
                <h3><i className="fas fa-building" /> Workspace Overview</h3>
                <button className="admin-btn-text">Manage All</button>
              </div>
              <div className="admin-card-body">
                <div className="admin-workspace-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Workspace Name</th>
                        <th>Users</th>
                        <th>Notes</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspaceData.map((workspace, index) => (
                        <tr key={index}>
                          <td>
                            <div className="admin-workspace-name">
                              <div className="admin-workspace-color" style={{ backgroundColor: `hsl(${index * 60}, 70%, 60%)` }} />
                              {workspace.name}
                            </div>
                          </td>
                          <td>{workspace.users}</td>
                          <td>{workspace.projects}</td>
                          <td>
                            <span className={`admin-status-badge ${workspace.status}`}>
                              {workspace.status}
                            </span>
                          </td>
                          <td>
                            <button className="admin-table-action-btn" title="Edit">
                              <i className="fas fa-edit" />
                            </button>
                            <button className="admin-table-action-btn" title="View">
                              <i className="fas fa-eye" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="admin-content-card">
              <div className="admin-card-header">
                <h3><i className="fas fa-chart-line" /> Platform Growth</h3>
                <div className="admin-time-filter">
                  <button className="admin-time-btn active">7D</button>
                  <button className="admin-time-btn">1M</button>
                  <button className="admin-time-btn">6M</button>
                  <button className="admin-time-btn">1Y</button>
                </div>
              </div>
              <div className="admin-card-body">
                <div className="admin-chart-placeholder">
                  <div className="admin-chart-lines">
                    {[0, 1, 2, 3, 4, 5].map((line) => (
                      <div key={line} className="admin-chart-line" style={{ height: `${40 + Math.random() * 60}%` }}>
                        <div className="admin-chart-bar" />
                      </div>
                    ))}
                  </div>
                  <div className="admin-chart-labels">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                  </div>
                </div>
                <div className="admin-chart-legend">
                  <div className="admin-legend-item">
                    <div className="admin-legend-color" style={{ backgroundColor: '#3B82F6' }} />
                    <span>New Users</span>
                  </div>
                  <div className="admin-legend-item">
                    <div className="admin-legend-color" style={{ backgroundColor: '#10B981' }} />
                    <span>Active Workspaces</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-content-card">
              <div className="admin-card-header">
                <h3><i className="fas fa-server" /> System Status</h3>
                <button className="admin-btn-text">Refresh</button>
              </div>
              <div className="admin-card-body">
                <div className="admin-system-status">
                  <div className="admin-status-item">
                    <div className="admin-status-info">
                      <div className="admin-status-name">API Server</div>
                      <div className="admin-status-desc">Backend Services</div>
                    </div>
                    <div className="admin-status-indicator active">
                      <div className="admin-status-dot" />
                      <span>Online</span>
                    </div>
                  </div>
                  
                  <div className="admin-status-item">
                    <div className="admin-status-info">
                      <div className="admin-status-name">Database</div>
                      <div className="admin-status-desc">PostgreSQL 14</div>
                    </div>
                    <div className="admin-status-indicator active">
                      <div className="admin-status-dot" />
                      <span>Healthy</span>
                    </div>
                  </div>
                  
                  <div className="admin-status-item">
                    <div className="admin-status-info">
                      <div className="admin-status-name">Storage</div>
                      <div className="admin-status-desc">
                         Total: {formatFileSize(dashboardData?.storageUsage?.totalStorageUsed)}
                      </div>
                    </div>
                    <div className="admin-status-indicator warning">
                      <div className="admin-status-dot" />
                      <span>{calculateStoragePercentage(dashboardData?.storageUsage?.totalStorageUsed)}% Used</span>
                    </div>
                  </div>
                  
                  <div className="admin-status-item">
                    <div className="admin-status-info">
                      <div className="admin-status-name">Cache</div>
                      <div className="admin-status-desc">Redis Cluster</div>
                    </div>
                    <div className="admin-status-indicator active">
                      <div className="admin-status-dot" />
                      <span>Optimal</span>
                    </div>
                  </div>
                </div>
                
                <div className="admin-system-actions">
                  <button className="admin-btn-outline">
                    <i className="fas fa-redo" /> Restart Services
                  </button>
                  <button className="admin-btn-outline">
                    <i className="fas fa-file-alt" /> View Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showWorkspacePermissionModal && (
      <Modal
        isOpen={showWorkspacePermissionModal}
        onClose={closeWorkspacePermissionModal}
        title="Workspace Permissions"
        className="modal-lg" 
      >
        <WorkspacePermissionManagement 
          defId={getFirstWorkspaceId()} 
        userId={getCurrentUser().id}
        isAdminDashboard={true}
        dashboardData={dashboardData} 
        />
      </Modal>
    )}
    </div>
  );
};

export default AdminDashboard;