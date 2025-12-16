import React, { useEffect, useState } from 'react'
import SettingsModal from '../Modals/SettingsModal';
import './DashboardMenu.css';

const DashboardMenu = ({
    defaultUserWorkspaceID,
    defaultUserWorkspaceName,
    onUpdateDefaultWorkspace,
    fetchProjectAndJobs,
    workspaces,
    userid,
    onLogout
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [userWorkspaces, setUserWorkspaces] = useState();
  const [role, setRole] = useState(null);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true);

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;
 
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

  // Track when workspace name is loading
  useEffect(() => {
    if (defaultUserWorkspaceID && !defaultUserWorkspaceName) {
      setIsWorkspaceLoading(true);
    } else {
      setIsWorkspaceLoading(false);
    }
  }, [defaultUserWorkspaceID, defaultUserWorkspaceName]);
  
  return (
    <div className="dashboard-menu">
      <h1>
        <i className="fas fa-clipboard-list" /> 
        Site Notes Dashboard: {JSON.parse(localStorage.getItem("user"))?.userName}
      </h1>

      <div className="workspace-header">
        <div className="workspace-name">
          {isWorkspaceLoading ? (
            <div className="horizontal-loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : (
            defaultUserWorkspaceName
          )}
        </div>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="settings-button"
        >
          <i className="fas fa-sliders-h" />
        </button>
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
    </div>
  )
}

export default DashboardMenu