import React, { useEffect, useState, useRef } from 'react'
import SettingsModal from '../Modals/SettingsModal';
import UserProfile from '../UserProfile/UserProfile';
import ChangeWorkspaceModal from '../Workspaces/ChangeWorkspaceModal';
import RequestWorkspaceModal from '../Workspaces/RequestWorkspaceModal'; // Import the new component
import './DashboardMenu.css';

const DashboardMenu = ({
    defaultUserWorkspaceID,
    defaultUserWorkspaceName,
    onUpdateDefaultWorkspace,
    fetchProjectAndJobs,
    workspaces,
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
    handleNewNoteClick
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showChangeWorkspaceModal, setShowChangeWorkspaceModal] = useState(false);
  const [showRequestWorkspaceModal, setShowRequestWorkspaceModal] = useState(false); // New state
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [userWorkspaces, setUserWorkspaces] = useState();
  const [role, setRole] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Mobile states
  const [isMobile, setIsMobile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const userMenuRef = useRef(null);
  const userAvatarRef = useRef(null);
  const viewOptionsRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const searchRef = useRef(null);

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close user menu
      if (
        userMenuRef.current && 
        !userMenuRef.current.contains(event.target) &&
        userAvatarRef.current && 
        !userAvatarRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }
      
      // Close view options
      if (
        viewOptionsRef.current && 
        !viewOptionsRef.current.contains(event.target) &&
        !event.target.closest('.view-options-button')
      ) {
        setShowViewOptions(false);
      }
      
      // Close mobile menu
      if (
        mobileMenuRef.current && 
        !mobileMenuRef.current.contains(event.target) &&
        !event.target.closest('.mobile-menu-button')
      ) {
        setShowMobileMenu(false);
      }
      
      // Close search if clicking outside on mobile
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

  // Get user details from localStorage
  const getUserDetails = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    return {
      name: user?.userName || 'User',
      email: user?.email || 'user@example.com',
      id: user?.userId || userid
    };
  };

  // Get user initials
  const getUserInitials = () => {
    const user = getUserDetails();
    const nameParts = user.name.trim().split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  // Close other menus when user menu opens
  useEffect(() => {
    if (showUserMenu) {
      setShowNotifications(false);
    }
  }, [showUserMenu]);

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
  
  // Check if user is admin or has role 1
  const shouldShowSettings = () => {
    return (userRole === "Admin" || role === 1);
  };
  
  // Handler for profile button click
  const handleProfileClick = () => {
    setShowUserProfileModal(true);
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  // Handler for switch workspace button click
  const handleSwitchWorkspaceClick = () => {
    setShowChangeWorkspaceModal(true);
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  // Handler for request workspace button click
  const handleRequestWorkspaceClick = () => {
    setShowRequestWorkspaceModal(true);
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  // Handler for when workspace is changed
  const handleWorkspaceChanged = (workspaceId, workspaceName) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      user.defaultWorkspaceName = workspaceName;
      localStorage.setItem("user", JSON.stringify(user));
    }
    window.location.reload();
  };

  // Handler for when workspace request is completed
  const handleWorkspaceRequested = () => {
    // You can add any refresh logic here if needed
    console.log('Workspace requested successfully');
  };

  // Toggle search on mobile
  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchTerm(""); // Clear search when closing
    }
  };

  // Handle view mode change on mobile
  const handleMobileViewChange = (mode) => {
    setViewMode(mode);
    setShowViewOptions(false);
  };

  // Mobile menu handlers
  const handleMobileSettings = () => {
    setShowSettingsModal(true);
    setShowMobileMenu(false);
  };

  const handleMobileNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowMobileMenu(false);
  };

  const handleMobileProfile = () => {
    setShowUserProfileModal(true);
    setShowMobileMenu(false);
  };

  const handleMobileRequestWorkspace = () => {
    setShowRequestWorkspaceModal(true);
    setShowMobileMenu(false);
  };
  
  return (
    <div className="dashboard-menu">
      {/* Left side: Icon only on mobile */}
      <div className="menu-left">
        <i className="fas fa-clipboard-list menu-icon" />
        {!isMobile && <span className="menu-title">Site Notes</span>}
      </div>

      {/* Middle: Different layout for mobile */}
      <div className="menu-middle">
        {isMobile ? (
          <>
            {/* Search toggle button on mobile */}
            <button 
              className={`mobile-search-toggle ${showSearch ? 'active' : ''}`}
              onClick={toggleSearch}
              title="Search"
            >
              <i className="fas fa-search" />
            </button>
            
            {/* Search box - only shown when active on mobile */}
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
            
            {/* New Note button - plus sign only on mobile */}
            <button
              onClick={handleNewNoteClick}
              className="new-note-btn"
              title="New Note"
            >
              <i className="fas fa-plus" />
            </button>
            
            {/* View Options Button (...) */}
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
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Desktop layout */
          <>
            {/* Search box */}
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

            {/* View toggle buttons */}
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
            </div>

            {/* New Note button */}
            <button
              onClick={handleNewNoteClick}
              className="new-note-btn"
            >
              <i className="fas fa-plus-circle" /> New Note
            </button>
          </>
        )}
      </div>

      {/* Right side: Different layout for mobile */}
      <div className="menu-right">
        {isMobile ? (
          /* Mobile: Single Menu Button (...) */
          <div style={{ position: 'relative' }}>
            <button
              className="mobile-menu-button"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              title="Menu"
            >
              ...
            </button>
            
            {showMobileMenu && (
              <div ref={mobileMenuRef} className="mobile-menu-dropdown">
                <button 
                  className="mobile-menu-item"
                  onClick={handleMobileNotifications}
                >
                  <i className="fas fa-bell" /> Notifications
                </button>
                
                {/* Hide Settings in mobile menu if user is admin or role 1 */}
                {shouldShowSettings() && (
                  <button 
                    className="mobile-menu-item"
                    onClick={handleMobileSettings}
                  >
                    <i className="fas fa-cog" /> Settings
                  </button>
                )}
                
                <div className="mobile-menu-divider"></div>
                
                <button 
                  className="mobile-menu-item"
                  onClick={handleMobileProfile}
                >
                  <i className="fas fa-user-circle" /> Profile
                </button>
                
                <button 
                  className="mobile-menu-item"
                  onClick={handleSwitchWorkspaceClick}
                >
                  <i className="fas fa-exchange-alt" /> Switch Workspace
                </button>

                {/* Request Workspace item in mobile menu */}
                <button 
                  className="mobile-menu-item"
                  onClick={handleMobileRequestWorkspace}
                >
                  <i className="fas fa-plus-square" /> Request Workspace
                </button>
                
                <div className="mobile-menu-divider"></div>
                
                <button 
                  className="mobile-menu-item logout-item"
                  onClick={() => {
                    onLogout();
                    setShowMobileMenu(false);
                  }}
                >
                  <i className="fas fa-sign-out-alt" /> Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Desktop layout */
          <>
            {/* Notifications Bell */}
            <button 
              className="notifications-button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              title="Notifications"
            >
              <i className="fas fa-bell" />
            </button>
            
            {/* Settings Gear - Hide if user is admin or role 1 */}
            {shouldShowSettings() && (
              <button
                onClick={() => {
                  setShowSettingsModal(true);
                  setShowUserMenu(false);
                }}
                className="settings-button"
                title="Settings"
              >
                <i className="fas fa-cog" />
              </button>
            )}
            
            {/* User Initials with Dropdown */}
            <div className="user-menu-container">
              <button
                ref={userAvatarRef}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="user-avatar"
                title={user.name}
              >
                {getUserInitials()}
              </button>
              
              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div 
                  ref={userMenuRef}
                  className="user-dropdown"
                >
                  {/* User info section */}
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
                  
                  {/* Menu items */}
                  <button 
                    className="dropdown-item"
                    onClick={handleProfileClick}
                  >
                    <i className="fas fa-user-circle dropdown-icon" />
                    <span className="dropdown-text">Profile</span>
                  </button>
                  <div className="dropdown-divider"></div>

                  {/* Request Workspace item - added below Profile */}
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
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onLogout={onLogout}
          defWorkID={defaultUserWorkspaceID}
          defWorkName={defaultUserWorkspaceName}
          onUpdateDefaultWorkspace={onUpdateDefaultWorkspace}
          role={role}
          userWorkspaces={workspaces}
          updateProjectsAndJobs={fetchProjectAndJobs}
        />
      )}
      
      {/* Change Workspace Modal */}
      {showChangeWorkspaceModal && (
        <ChangeWorkspaceModal
          isOpen={showChangeWorkspaceModal}
          onClose={() => setShowChangeWorkspaceModal(false)}
          ownerUserID={user.id}
          onUpdateDefaultWorkspace={onUpdateDefaultWorkspace}
          onWorkspaceChanged={handleWorkspaceChanged}
        />
      )}
      
      {/* Request Workspace Modal */}
      {showRequestWorkspaceModal && (
        <RequestWorkspaceModal
          isOpen={showRequestWorkspaceModal}
          onClose={() => setShowRequestWorkspaceModal(false)}
          ownerUserID={user.id}
          onWorkspaceAdded={handleWorkspaceRequested}
        />
      )}
      
      {/* User Profile Modal */}
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
      
      {/* Notifications dropdown (optional) */}
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