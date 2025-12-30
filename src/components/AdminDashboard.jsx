import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { id: 'workspaces', label: 'Workspaces', icon: 'fas fa-building' },
    { id: 'users', label: 'Users', icon: 'fas fa-users' },
    { id: 'projects', label: 'Projects', icon: 'fas fa-project-diagram' },
    { id: 'jobs', label: 'Jobs', icon: 'fas fa-tasks' },
    { id: 'resources', label: 'Resources', icon: 'fas fa-boxes' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog' },
  ];

  const stats = [
    { label: 'Total Workspaces', value: '24', change: '+12%', icon: 'fas fa-building', color: '#3B82F6' },
    { label: 'Active Users', value: '1,248', change: '+8%', icon: 'fas fa-users', color: '#10B981' },
    { label: 'Projects', value: '156', change: '+23%', icon: 'fas fa-project-diagram', color: '#8B5CF6' },
    { label: 'Active Jobs', value: '89', change: '-5%', icon: 'fas fa-tasks', color: '#F59E0B' },
    { label: 'Resources', value: '342', change: '+15%', icon: 'fas fa-boxes', color: '#EF4444' },
    { label: 'Storage Used', value: '78%', change: '+4%', icon: 'fas fa-database', color: '#6366F1' },
  ];

  const recentActivities = [
    { user: 'John Doe', action: 'created a new project', time: '5 min ago', icon: 'fas fa-plus-circle', color: '#10B981' },
    { user: 'Jane Smith', action: 'updated workspace settings', time: '12 min ago', icon: 'fas fa-cog', color: '#3B82F6' },
    { user: 'Mike Johnson', action: 'completed job #245', time: '25 min ago', icon: 'fas fa-check-circle', color: '#8B5CF6' },
    { user: 'Sarah Williams', action: 'added new resource', time: '1 hour ago', icon: 'fas fa-box', color: '#F59E0B' },
    { user: 'Admin', action: 'updated system settings', time: '2 hours ago', icon: 'fas fa-shield-alt', color: '#EF4444' },
  ];

  const workspaceData = [
    { name: 'Development', users: 24, projects: 15, status: 'active' },
    { name: 'Design', users: 18, projects: 8, status: 'active' },
    { name: 'Marketing', users: 32, projects: 12, status: 'active' },
    { name: 'Finance', users: 14, projects: 6, status: 'active' },
    { name: 'Testing', users: 8, projects: 4, status: 'inactive' },
  ];

  return (
    <div className="admin-dashboard-container">
      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="admin-sidebar-header">
          <h3>{sidebarCollapsed ? 'AD' : 'Admin Panel'}</h3>
          <button 
            className="admin-sidebar-toggle" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`} />
          </button>
        </div>
        
        <div className="admin-sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`admin-menu-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => setActiveMenu(item.id)}
              title={sidebarCollapsed ? item.label : ''}
            >
              <i className={item.icon} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>
        
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">AD</div>
            {!sidebarCollapsed && (
              <div className="admin-user-details">
                <div className="admin-user-name">Admin User</div>
                <div className="admin-user-role">Administrator</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`admin-main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Navbar */}
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

        {/* Main Dashboard Content */}
        <div className="admin-dashboard-content">
          {/* Welcome Banner */}
          <div className="admin-welcome-banner">
            <div className="admin-welcome-text">
              <h2>Welcome back, Admin!</h2>
              <p>Here's what's happening with your platform today.</p>
            </div>
            <div className="admin-welcome-actions">
              <button className="admin-btn-primary">
                <i className="fas fa-plus" /> Add New Workspace
              </button>
              <button className="admin-btn-secondary">
                <i className="fas fa-download" /> Generate Report
              </button>
            </div>
          </div>

          {/* Stats Cards */}
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

          {/* Charts and Tables */}
          <div className="admin-content-grid">
            {/* Recent Activity */}
            <div className="admin-content-card">
              <div className="admin-card-header">
                <h3><i className="fas fa-history" /> Recent Activity</h3>
                <button className="admin-btn-text">View All</button>
              </div>
              <div className="admin-card-body">
                <div className="admin-activity-list">
                  {recentActivities.map((activity, index) => (
                    <div className="admin-activity-item" key={index}>
                      <div className="admin-activity-icon" style={{ color: activity.color }}>
                        <i className={activity.icon} />
                      </div>
                      <div className="admin-activity-details">
                        <div className="admin-activity-text">
                          <strong>{activity.user}</strong> {activity.action}
                        </div>
                        <div className="admin-activity-time">{activity.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Workspace Overview */}
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
                        <th>Projects</th>
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

            {/* Quick Stats Chart */}
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

            {/* System Status */}
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
                      <div className="admin-status-desc">S3 Bucket</div>
                    </div>
                    <div className="admin-status-indicator warning">
                      <div className="admin-status-dot" />
                      <span>78% Used</span>
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
    </div>
  );
};

export default AdminDashboard;