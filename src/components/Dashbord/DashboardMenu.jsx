import React, { useEffect, useState, useRef } from 'react'
import SettingsModal from '../Modals/SettingsModal';
import UserProfile from '../UserProfile/UserProfile';
import ChangeWorkspaceModal from '../Workspaces/ChangeWorkspaceModal';
import RequestWorkspaceModal from '../Workspaces/RequestWorkspaceModal';
import RequestWorkspaceOtpModal from '../Modals/RequestWorkspaceOtpModal'; // NEW IMPORT
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
    handleNewNoteClick,
    refreshNotes
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showChangeWorkspaceModal, setShowChangeWorkspaceModal] = useState(false);
  const [showRequestWorkspaceModal, setShowRequestWorkspaceModal] = useState(false);
  const [showRequestWorkspaceOtpModal, setShowRequestWorkspaceOtpModal] = useState(false); // NEW STATE
  const [verifiedEmail, setVerifiedEmail] = useState(''); // NEW STATE
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [userWorkspaces, setUserWorkspaces] = useState();
  const [role, setRole] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
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
      if (
        userMenuRef.current && 
        !userMenuRef.current.contains(event.target) &&
        userAvatarRef.current && 
        !userAvatarRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }
      
      if (
        viewOptionsRef.current && 
        !viewOptionsRef.current.contains(event.target) &&
        !event.target.closest('.view-options-button')
      ) {
        setShowViewOptions(false);
      }
      
      if (
        mobileMenuRef.current && 
        !mobileMenuRef.current.contains(event.target) &&
        !event.target.closest('.mobile-menu-button')
      ) {
        setShowMobileMenu(false);
      }
      
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
  
  const shouldShowSettings = () => {
    return (userRole === "Admin" || role === 1);
  };

  const handleProfileClick = () => {
    setShowUserProfileModal(true);
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  const handleSwitchWorkspaceClick = () => {
    setShowChangeWorkspaceModal(true);
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  // UPDATED: Now shows OTP modal first
  const handleRequestWorkspaceClick = () => {
    setShowRequestWorkspaceOtpModal(true); // Show OTP verification modal
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  // NEW: Handle OTP verification success
  const handleOtpVerificationSuccess = (email) => {
    setVerifiedEmail(email);
    
    // Close OTP modal and show workspace request modal
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

  const handleMobileSettings = () => {
    setShowSettingsModal(true);
    setShowUserMenu(false);
  };

  const handleMobileNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const handleMobileProfile = () => {
    setShowUserProfileModal(true);
    setShowUserMenu(false);
  };

  const handleMobileRequestWorkspace = () => {
    setShowRequestWorkspaceOtpModal(true); // Show OTP modal first
    setShowUserMenu(false);
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
          /* Mobile: User Initials Button (same as desktop) with combined dropdown */
          <div className="user-menu-container">
            <button
              ref={userAvatarRef}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="user-avatar"
              title={user.name}
            >
              {getUserInitials()}
            </button>
            
            {/* User Dropdown Menu for Mobile (includes everything) */}
            {showUserMenu && (
              <div 
                ref={userMenuRef}
                className="user-dropdown mobile-user-dropdown"
              >
                {/* User info section (same as desktop) */}
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
                
                {/* Notifications item (added from desktop separate button) */}
                <button 
                  className="dropdown-item"
                  onClick={handleMobileNotifications}
                >
                  <i className="fas fa-bell dropdown-icon" />
                  <span className="dropdown-text">Notifications</span>
                </button>
                
                {/* Settings item (added from desktop separate button) - only if user has access */}
                {shouldShowSettings() && (
                  <>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item"
                      onClick={handleMobileSettings}
                    >
                      <i className="fas fa-cog dropdown-icon" />
                      <span className="dropdown-text">Settings</span>
                    </button>
                  </>
                )}
                
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
        ) : (
          /* Desktop layout */
          <>
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
            
            <div className="user-menu-container">
              <button
                ref={userAvatarRef}
                onClick={() => setShowUserMenu(!showUserMenu)}
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
                      {/* <div className="user-workspace">{defaultUserWorkspaceName}</div> */}
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
      
      {showChangeWorkspaceModal && (
        <ChangeWorkspaceModal
          isOpen={showChangeWorkspaceModal}
          onClose={() => setShowChangeWorkspaceModal(false)}
          ownerUserID={user.id}
          onUpdateDefaultWorkspace={onUpdateDefaultWorkspace}
          onWorkspaceChanged={handleWorkspaceChanged}
        />
      )}
      
      {/* NEW: OTP Verification Modal */}
      {showRequestWorkspaceOtpModal && (
        <RequestWorkspaceOtpModal
          isOpen={showRequestWorkspaceOtpModal}
          onClose={() => setShowRequestWorkspaceOtpModal(false)}
          onVerificationSuccess={handleOtpVerificationSuccess}
          existingEmail={user.email || ''}
        />
      )}
      
      {/* Updated: Only show workspace request modal after OTP verification */}
      {showRequestWorkspaceModal && (
        <RequestWorkspaceModal
          isOpen={showRequestWorkspaceModal}
          onClose={() => setShowRequestWorkspaceModal(false)}
          ownerUserID={user.id}
          onWorkspaceAdded={handleWorkspaceRequested}
          verifiedEmail={verifiedEmail} // Pass verified email to workspace modal
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