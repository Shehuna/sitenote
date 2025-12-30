import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import UserProfile from '../UserProfile/UserProfile';
import ChangeWorkspaceModal from '../Workspaces/ChangeWorkspaceModal';
import RequestWorkspaceModal from '../Workspaces/RequestWorkspaceModal';
import RequestWorkspaceOtpModal from '../Modals/RequestWorkspaceOtpModal';
import Modal from '../Modals/Modal';

import './DashboardMenu.css';
import ProjectManagement from '../Projects/ProjectManagement';
import JobManagment from '../Jobs/JobManagment';
import UserManagement from '../Users/UserManagement';
import JobPermissionManagement from '../JobPermission/JobPermissionManagement';
import JobStatusManagement from '../JobStatus/JobStatusManagement';
import WorkspaceManagement from '../Workspaces/WorkspaceManagement';

const DashboardMenu = ({
    defaultUserWorkspaceID,
    defaultUserWorkspaceName,
    onUpdateDefaultWorkspace,
    userid,
    onLogout,
    userRole,
    searchTerm,
    setSearchTerm,
    searchColumn,
    setSearchColumn,
    viewMode,
    setViewMode,
    handleRefresh,
    handleNewNoteClick,
    defWorkName
}) => {
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showChangeWorkspaceModal, setShowChangeWorkspaceModal] = useState(false);
  const [showRequestWorkspaceModal, setShowRequestWorkspaceModal] = useState(false);
  const [showRequestWorkspaceOtpModal, setShowRequestWorkspaceOtpModal] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [userWorkspaces, setUserWorkspaces] = useState();
  const [role, setRole] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  // State for active settings component
  const [activeSettingsComponent, setActiveSettingsComponent] = useState(null);
  const [settingsModalTitle, setSettingsModalTitle] = useState('Settings');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [isMobile, setIsMobile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const userMenuRef = useRef(null);
  const userAvatarRef = useRef(null);
  const viewOptionsRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const searchRef = useRef(null);
  const settingsMenuRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const mobileSettingsButtonRef = useRef(null);

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close user menu when clicking outside
      if (
        userMenuRef.current && 
        !userMenuRef.current.contains(event.target) &&
        userAvatarRef.current && 
        !userAvatarRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }
      
      // Close settings menu when clicking outside (desktop)
      if (
        settingsMenuRef.current && 
        !settingsMenuRef.current.contains(event.target) &&
        settingsButtonRef.current && 
        !settingsButtonRef.current.contains(event.target)
      ) {
        setShowSettingsMenu(false);
      }
      
      // Close view options when clicking outside
      if (
        viewOptionsRef.current && 
        !viewOptionsRef.current.contains(event.target) &&
        !event.target.closest('.view-options-button')
      ) {
        setShowViewOptions(false);
      }
      
      // Close mobile menu when clicking outside
      if (
        mobileMenuRef.current && 
        !mobileMenuRef.current.contains(event.target) &&
        !event.target.closest('.mobile-menu-button')
      ) {
        setShowMobileMenu(false);
      }
      
      // Close mobile search when clicking outside
      if (
        isMobile && 
        showSearch && 
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        !event.target.closest('.mobile-search-toggle')
      ) {
        setShowSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile, showSearch]);

  const getUserDetails = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    return {
      name: user?.userName || 'User',
      email: user?.email || 'user@example.com',
      id: user?.userId || userid
    };
  };

  const getUserInitials = () => {
    const user = getUserDetails();
    const nameParts = user.name.trim().split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  useEffect(() => {
    if (showUserMenu) {
      setShowNotifications(false);
      setShowSettingsMenu(false);
    }
    if (showSettingsMenu) {
      setShowUserMenu(false);
      setShowNotifications(false);
    }
    if (showNotifications) {
      setShowUserMenu(false);
      setShowSettingsMenu(false);
    }
  }, [showUserMenu, showSettingsMenu, showNotifications]);

  const fetchUserWorkspaceRole = async () => {
    setIsRoleLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}/UserWorkspace/GetWorkspacesByUserId/${userid}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const userWorkspaces = data.userWorkspaces || data || [];
        setUserWorkspaces(userWorkspaces);

        const workspace = userWorkspaces.find(
          (ws) =>
            (ws.workspaceID &&
              ws.workspaceID.toString() ===
                defaultUserWorkspaceID.toString()) ||
            (ws.workspaceId &&
              ws.workspaceId.toString() ===
                defaultUserWorkspaceID.toString()) ||
            (ws.id && ws.id.toString() === defaultUserWorkspaceID.toString())
        );

        const newRole = workspace?.role || null;
        setRole(newRole);
      } else {
        console.error("API response not OK:", response.status);
      }
    } catch (error) {
      console.error("Error:", error);
      setRole(null);
    } finally {
      setIsRoleLoading(false);
    }
  };
  
  useEffect(() => {
    if (userid && defaultUserWorkspaceID) {
      fetchUserWorkspaceRole();
    }
  }, [userid, defaultUserWorkspaceID]);
  
  const user = getUserDetails();
  
  const shouldShowSettings = () => {
    return (userRole === "Admin" || role === 1);
  };

  const handleProfileClick = () => {
    setShowUserProfileModal(true);
    setShowUserMenu(false);
    setShowMobileMenu(false);
    setShowSettingsMenu(false);
  };

  const handleSwitchWorkspaceClick = () => {
    setShowChangeWorkspaceModal(true);
    setShowUserMenu(false);
    setShowMobileMenu(false);
    setShowSettingsMenu(false);
  };

  const handleRequestWorkspaceClick = () => {
    setShowRequestWorkspaceOtpModal(true);
    setShowUserMenu(false);
    setShowMobileMenu(false);
    setShowSettingsMenu(false);
  };

  const handleOtpVerificationSuccess = (email) => {
    setVerifiedEmail(email);
    setShowRequestWorkspaceOtpModal(false);
    setTimeout(() => {
      setShowRequestWorkspaceModal(true);
    }, 300);
  };

  const handleWorkspaceChanged = (workspaceId, workspaceName) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      user.defaultWorkspaceName = workspaceName;
      localStorage.setItem("user", JSON.stringify(user));
    }
    window.location.reload();
  };

  const handleWorkspaceRequested = () => {
    console.log('Workspace requested successfully');
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchTerm("");
    }
  };

  const handleMobileViewChange = (mode) => {
    setViewMode(mode);
    setShowViewOptions(false);
  };

  // Function to handle Admin Dashboard click
  const handleAdminDashboardClick = () => {
    // Close settings menu
    setShowSettingsMenu(false);
    setShowUserMenu(false);
    // Navigate to admin dashboard
    navigate('/admin-dashboard');
  };

  // Settings menu items handler
  const handleSettingsMenuItemClick = (menuId) => {
    let component = null;
    let title = 'Settings';
    
    switch(menuId) {
      case 'projectManagement':
        component = <ProjectManagement 
          workspaceId={defaultUserWorkspaceID}
        />;
        title = 'Project Management';
        break;
      case 'jobManagement':
        component = <JobManagment 
          defWorkId={defaultUserWorkspaceID}
        />;
        title = 'Job Management';
        break;
      case 'userManagement':
        if (userRole !== "User") {
          component = <UserManagement 
            workspaceId={defaultUserWorkspaceID}
          />;
          title = 'User Management';
        }
        break;
      case 'jobPermissions':
        component = <JobPermissionManagement 
          defId={defaultUserWorkspaceID}
          //users={users} 
          userId={userid}
          
        />;
        title = 'Job Permissions';
        break;
      case 'jobStatus':
        component = <JobStatusManagement 
          defId={defaultUserWorkspaceID}
        />;
        title = 'Job Status Update';
        break;
      case 'workspaceSettings':
        component = <WorkspaceManagement 
          onUpdateDefaultWorkspace={onUpdateDefaultWorkspace} 
          userRole={userRole}
          workspaceRole={role}
          defWorkId={defaultUserWorkspaceID}
          defWorkName={defWorkName}
        />;
        title = 'Workspace Settings';
        break;
      case 'adminDashboard':
        // Handle admin dashboard navigation
        handleAdminDashboardClick();
        return; // Return early since we're navigating, not opening a modal
      default:
        break;
    }
    
    if (component) {
      setActiveSettingsComponent(component);
      setSettingsModalTitle(title);
      setShowSettingsModal(true);
      setShowSettingsMenu(false);
    }
  };

  const toggleSettingsMenu = () => {
    setShowSettingsMenu(!showSettingsMenu);
    setShowUserMenu(false);
    setShowNotifications(false);
  };

  // Function to close settings modal and reset component
  const closeSettingsModal = () => {
    setShowSettingsModal(false);
    setActiveSettingsComponent(null);
    setSettingsModalTitle('Settings');
  };

  const handleMobileSettings = () => {
    setActiveSettingsComponent(
      <div className="mobile-settings-default">
        <h3>Settings</h3>
        <p>Select an option from the settings menu</p>
      </div>
    );
    setSettingsModalTitle('Settings');
    setShowSettingsModal(true);
    setShowUserMenu(false);
    setShowSettingsMenu(false);
  };

  const handleMobileNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
    setShowSettingsMenu(false);
  };

  const handleMobileRequestWorkspace = () => {
    setShowRequestWorkspaceOtpModal(true);
    setShowUserMenu(false);
    setShowSettingsMenu(false);
  };
  
  // Toggle mobile settings menu
  const toggleMobileSettingsMenu = () => {
    setShowSettingsMenu(!showSettingsMenu);
    setShowUserMenu(false);
    setShowNotifications(false);
  };
  
  return (
    <div className="dashboard-menu">
      <div className="menu-left">
        <i className="fas fa-clipboard-list menu-icon" />
        {!isMobile && <span className="menu-title">Site Notes: {defaultUserWorkspaceName }</span>}
      </div>

      <div className="menu-middle">
        {isMobile ? (
          <>
            <button 
              className={`mobile-search-toggle ${showSearch ? 'active' : ''}`}
              onClick={toggleSearch}
              title="Search"
            >
              <i className="fas fa-search" />
            </button>
            
            {showSearch && (
              <div ref={searchRef} className="search-container active">
                <div className="search-box-wrapper">
                  <input
                    id="searchInput"
                    type="text"
                    placeholder={
                      searchColumn
                        ? `Search by ${searchColumn}...`
                        : "Search notes..."
                    }
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                    }}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                      }}
                      className="clear-search-btn"
                      title="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <button
              onClick={handleNewNoteClick}
              className="new-note-btn"
              title="New Note"
            >
              <i className="fas fa-plus" />
            </button>
            
            <div style={{ position: 'relative' }}>
              <button
                className="view-options-button"
                onClick={() => setShowViewOptions(!showViewOptions)}
                title="View Options"
              >
                ...
              </button>
              
              {showViewOptions && (
                <div ref={viewOptionsRef} className="view-options-dropdown">
                  <div className="mobile-view-modes">
                    <button
                      onClick={() => handleMobileViewChange("table")}
                      className={`mobile-view-btn ${viewMode === "table" ? "active" : ""}`}
                      title="Table View"
                    >
                      <i className="fas fa-table" />
                    </button>
                    <button
                      onClick={() => handleMobileViewChange("cards")}
                      className={`mobile-view-btn ${viewMode === "cards" ? "active" : ""}`}
                      title="Card View"
                    >
                      <i className="fas fa-th" />
                    </button>
                    <button
                      onClick={() => handleMobileViewChange("stacked")}
                      className={`mobile-view-btn ${viewMode === "stacked" ? "active" : ""}`}
                      title="Stacked View"
                    >
                      <i className="fas fa-layer-group" />
                    </button>
                    <button
                      onClick={handleRefresh}
                      className={`mobile-view-btn ${viewMode === "stacked" ? "active" : ""}`}
                      title="Refresh"
                    >
                      <i className="fas fa-refresh" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="search-container">
              <div className="search-box-wrapper">
                <input
                  id="searchInput"
                  type="text"
                  placeholder={
                    searchColumn
                      ? `Search by ${searchColumn}...`
                      : "Search notes..."
                  }
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  className="search-input"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                    }}
                    className="clear-search-btn"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              {searchColumn && (
                <span className="search-hint">
                  Searching in: {searchColumn}
                  <button
                    onClick={() => {
                      setSearchColumn("");
                      setSearchTerm("");
                    }}
                    className="clear-group-btn"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            <div className="view-toggle-container">
              <button
                onClick={() => setViewMode("table")}
                className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                title="Table View"
              >
                <i className="fas fa-table" />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`view-toggle-btn ${viewMode === "cards" ? "active" : ""}`}
                title="Card View"
              >
                <i className="fas fa-th" />
              </button>
              <button
                onClick={() => setViewMode("stacked")}
                className={`view-toggle-btn ${viewMode === "stacked" ? "active" : ""}`}
                title="Stacked View"
              >
                <i className="fas fa-layer-group" />
              </button>
              <button
                onClick={handleRefresh}
                className='refresh-btn'
                title="refresh"
              >
                <i className="fas fa-refresh" />
              </button>
            </div>

            <button
              onClick={handleNewNoteClick}
              className="new-note-btn"
            >
              <i className="fas fa-plus-circle" /> New Note
            </button>
          </>
        )}
      </div>

      <div className="menu-right">
        {isMobile ? (
          /* Mobile Layout - Show separate settings button */
          <>
            {/* Settings Button for Mobile (only if user has access) */}
            {shouldShowSettings() && (
              <div className="mobile-settings-container" style={{ position: 'relative' }}>
                <button
                  ref={mobileSettingsButtonRef}
                  onClick={toggleMobileSettingsMenu}
                  className="mobile-settings-button"
                  title="Settings"
                >
                  <i className="fas fa-cog" />
                </button>
                
                {/* Settings Dropdown for Mobile */}
                {showSettingsMenu && (
                  <div 
                    ref={settingsMenuRef}
                    className="settings-dropdown mobile-settings-dropdown"
                  >
                    <div className="settings-dropdown-header">
                     
                      <span>Settings</span>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleSettingsMenuItemClick('projectManagement')}
                    >
                      <i className="fas fa-project-diagram dropdown-icon" />
                      <span className="dropdown-text">Project Management</span>
                    </button>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleSettingsMenuItemClick('jobManagement')}
                    >
                      <i className="fas fa-tasks dropdown-icon" />
                      <span className="dropdown-text">Job Management</span>
                    </button>
                    
                    {userRole !== "User" && (
                      <button 
                        className="dropdown-item"
                        onClick={() => handleSettingsMenuItemClick('userManagement')}
                      >
                        <i className="fas fa-user-plus dropdown-icon" />
                        <span className="dropdown-text">User Management</span>
                      </button>
                    )}
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleSettingsMenuItemClick('jobPermissions')}
                    >
                      <i className="fas fa-user-shield dropdown-icon" />
                      <span className="dropdown-text">Job Permissions</span>
                    </button>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleSettingsMenuItemClick('jobStatus')}
                    >
                      <i className="fas fa-sync-alt dropdown-icon" />
                      <span className="dropdown-text">Job Status Update</span>
                    </button>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleSettingsMenuItemClick('workspaceSettings')}
                    >
                      <i className="fas fa-building dropdown-icon" />
                      <span className="dropdown-text">Workspace Settings</span>
                    </button>
                    
                    {/* Add Admin Dashboard item for mobile */}
                    {userRole === 'Admin' && (
                      <button 
                      className="dropdown-item admin-dashboard-item"
                      onClick={() => handleSettingsMenuItemClick('adminDashboard')}
                    >
                      <i className="fas fa-tachometer-alt dropdown-icon" />
                      <span className="dropdown-text">Admin Dashboard</span>
                    </button>
                    )}
                    
                  </div>
                )}
              </div>
            )}
            
            {/* User Menu for Mobile */}
            <div className="user-menu-container mobile-user-menu-container">
              <button
                ref={userAvatarRef}
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowSettingsMenu(false);
                  setShowNotifications(false);
                }}
                className="user-avatar mobile-user-avatar"
                title={user.name}
              >
                {getUserInitials()}
              </button>
              
              {/* User Dropdown for Mobile */}
              {showUserMenu && (
                <div 
                  ref={userMenuRef}
                  className="user-dropdown mobile-user-dropdown"
                >
                  <div className="user-info-section">
                    <div className="user-avatar-large">
                      {getUserInitials()}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                      <div className="user-workspace">{defaultUserWorkspaceName}</div> 
                    </div>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  {/* Notifications item */}
                  <button 
                    className="dropdown-item"
                    onClick={handleMobileNotifications}
                  >
                    <i className="fas fa-bell dropdown-icon" />
                    <span className="dropdown-text">Notifications</span>
                  </button>
                  
                  <div className="dropdown-divider"></div>
                  
                  {/* Profile item */}
                  <button 
                    className="dropdown-item"
                    onClick={handleProfileClick}
                  >
                    <i className="fas fa-user-circle dropdown-icon" />
                    <span className="dropdown-text">Profile</span>
                  </button>
                  
                  <div className="dropdown-divider"></div>
                  
                  {/* Request Workspace item */}
                  <button 
                    className="dropdown-item"
                    onClick={handleMobileRequestWorkspace}
                  >
                    <i className="fas fa-plus-square dropdown-icon" />
                    <span className="dropdown-text">Request Workspace</span>
                  </button>
                  
                  <div className="dropdown-divider"></div>
                  
                  {/* Switch Workspace item */}
                  <button 
                    className="dropdown-item"
                    onClick={handleSwitchWorkspaceClick}
                  >
                    <i className="fas fa-exchange-alt dropdown-icon" />
                    <span className="dropdown-text">Switch Workspace</span>
                  </button>
                  
                  <div className="dropdown-divider"></div>
                  
                  {/* Logout item */}
                  <button 
                    className="dropdown-item logout-item"
                    onClick={() => {
                      onLogout();
                      setShowUserMenu(false);
                    }}
                  >
                    <i className="fas fa-sign-out-alt dropdown-icon" />
                    <span className="dropdown-text">Log out</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Desktop layout */
          <>
            <button 
              className="notifications-button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
                setShowSettingsMenu(false);
              }}
              title="Notifications"
            >
              <i className="fas fa-bell" />
            </button>
            
            {shouldShowSettings() && (
              <div className="settings-menu-container" style={{ position: 'relative' }}>
                <button
                  ref={settingsButtonRef}
                  onClick={toggleSettingsMenu}
                  className="settings-button"
                  title="Settings"
                >
                  <i className="fas fa-cog" />
                </button>
                
                {/* Settings Dropdown Menu */}
                {showSettingsMenu && (
                  <div 
                    ref={settingsMenuRef}
                    className="settings-dropdown"
                  >
                    <div className="settings-dropdown-header">
                      
                      <span>Settings</span>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleSettingsMenuItemClick('projectManagement')}
                    >
                      <i className="fas fa-project-diagram dropdown-icon" />
                      <span className="dropdown-text">Project Management</span>
                    </button>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleSettingsMenuItemClick('jobManagement')}
                    >
                      <i className="fas fa-tasks dropdown-icon" />
                      <span className="dropdown-text">Job Management</span>
                    </button>
                    
                    {userRole !== "User" && (
                      <button 
                        className="dropdown-item"
                        onClick={() => handleSettingsMenuItemClick('userManagement')}
                      >
                        <i className="fas fa-user-plus dropdown-icon" />
                        <span className="dropdown-text">User Management</span>
                      </button>
                    )}
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleSettingsMenuItemClick('jobPermissions')}
                    >
                      <i className="fas fa-user-shield dropdown-icon" />
                      <span className="dropdown-text">Job Permissions</span>
                    </button>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleSettingsMenuItemClick('jobStatus')}
                    >
                      <i className="fas fa-sync-alt dropdown-icon" />
                      <span className="dropdown-text">Job Status Update</span>
                    </button>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleSettingsMenuItemClick('workspaceSettings')}
                    >
                      <i className="fas fa-building dropdown-icon" />
                      <span className="dropdown-text">Workspace Settings</span>
                    </button>
                    
                    {/* Add Admin Dashboard item */}
                    {userRole === 'Admin' && (
                      <button 
                      className="dropdown-item admin-dashboard-item"
                      onClick={() => handleSettingsMenuItemClick('adminDashboard')}
                    >
                      <i className="fas fa-tachometer-alt dropdown-icon" />
                      <span className="dropdown-text">Admin Dashboard</span>
                    </button>
                    )}
                    
                  </div>
                )}
              </div>
            )}
            
            <div className="user-menu-container">
              <button
                ref={userAvatarRef}
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowSettingsMenu(false);
                  setShowNotifications(false);
                }}
                className="user-avatar"
                title={user.name}
              >
                {getUserInitials()}
              </button>
              
              {showUserMenu && (
                <div 
                  ref={userMenuRef}
                  className="user-dropdown"
                >
                  <div className="user-info-section">
                    <div className="user-avatar-large">
                      {getUserInitials()}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleProfileClick}
                  >
                    <i className="fas fa-user-circle dropdown-icon" />
                    <span className="dropdown-text">Profile</span>
                  </button>
                  <div className="dropdown-divider"></div>

                  <button 
                    className="dropdown-item"
                    onClick={handleRequestWorkspaceClick}
                  >
                    <i className="fas fa-plus-square dropdown-icon" />
                    <span className="dropdown-text">Request Workspace</span>
                  </button>
                                    
                  <div className="dropdown-divider"></div>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleSwitchWorkspaceClick}
                  >
                    <i className="fas fa-exchange-alt dropdown-icon" />
                    <span className="dropdown-text">Switch Workspace</span>
                  </button>

                  <div className="dropdown-divider"></div>
                  
                  <button 
                    className="dropdown-item logout-item"
                    onClick={() => {
                      onLogout();
                      setShowUserMenu(false);
                    }}
                  >
                    <i className="fas fa-sign-out-alt dropdown-icon" />
                    <span className="dropdown-text">Log out</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={closeSettingsModal}
        title={settingsModalTitle}
        className="modal-sm"
      >
        {activeSettingsComponent}
      </Modal>
      
      {/* Other modals */}
      {showChangeWorkspaceModal && (
        <ChangeWorkspaceModal
          isOpen={showChangeWorkspaceModal}
          onClose={() => setShowChangeWorkspaceModal(false)}
          ownerUserID={user.id}
          onUpdateDefaultWorkspace={onUpdateDefaultWorkspace}
          onWorkspaceChanged={handleWorkspaceChanged}
        />
      )}
      
      {showRequestWorkspaceOtpModal && (
        <RequestWorkspaceOtpModal
          isOpen={showRequestWorkspaceOtpModal}
          onClose={() => setShowRequestWorkspaceOtpModal(false)}
          onVerificationSuccess={handleOtpVerificationSuccess}
          existingEmail={user.email || ''}
        />
      )}
      
      {showRequestWorkspaceModal && (
        <RequestWorkspaceModal
          isOpen={showRequestWorkspaceModal}
          onClose={() => setShowRequestWorkspaceModal(false)}
          ownerUserID={user.id}
          onWorkspaceAdded={handleWorkspaceRequested}
          verifiedEmail={verifiedEmail}
        />
      )}
      
      {showUserProfileModal && (
        <div className="modal-overlay" onClick={() => setShowUserProfileModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Profile</h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowUserProfileModal(false)}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="modal-body">
              <UserProfile userid={userid} />
            </div>
          </div>
        </div>
      )}
      
      {showNotifications && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <button 
              className="close-notifications"
              onClick={() => setShowNotifications(false)}
            >
              <i className="fas fa-times" />
            </button>
          </div>
          <div className="notifications-list">
            <div className="notification-item">
              <i className="fas fa-info-circle" />
              <span>No new notifications</span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default DashboardMenu;