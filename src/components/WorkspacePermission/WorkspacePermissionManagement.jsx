import React, { useEffect, useState } from 'react';
import './WorkspacePermissionManagement.css';
import UserWorkspaceManagement from './UserWorkspaceManagement';
import GrantDenyWorkspaces from './GrantDenyWorkspaces';

const WorkspacePermissionManagement = ({ defId, users, userId }) => {
    const [activeTab, setActiveTab] = useState('grant');
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filteredUsers, setFilteredUsers] = useState([]);

    useEffect(() => { fetchInitialData(); }, [defId]);

   /*  const fetchInitialData = async () => {
        setLoading(true); setError(null);
        try {
            const API_URL = process.env.REACT_APP_API_BASE_URL;
            const workspacesUrl = `${API_URL}/api/Workspace/GetWorkspace`;
            const userURL = `https://localhost:7204/api/UserWorkspace/GetUsersByWorkspaceId/${defId}`;

            const [wsRes, userRes] = await Promise.all([
                fetch(workspacesUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } }),
                fetch(userURL, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
            ]);

            if (!wsRes.ok) throw new Error(`Workspace API error: ${wsRes.status}`);
            if (!userRes.ok) throw new Error(`UserWorkspacePermission API error: ${userRes.status}`);

            let wsData = await wsRes.json();
            let userData = await userRes.json();

            wsData = wsData.workspaces || wsData || [];
            // normalize user list response
            userData = userData.users || userData.userWorkspaces || userData.userWorkspacePermissions || userData || [];
            setWorkspaces(wsData);
            const normalizedUsers = Array.isArray(userData) ? userData : [];
            setFilteredUsers(normalizedUsers);
        } catch (err) {
            setError(err.message); console.error('API Error:', err);
        } finally { setLoading(false); }
    };*/
    const fetchInitialData = async () => {
        setLoading(true); 
        setError(null);
        try {
            const API_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7204';
            const workspacesUrl = `${API_URL}/api/Workspace/GetWorkspace`;
            
            let userData = [];
            
            const wsRes = await fetch(workspacesUrl, { 
                method: 'GET', 
                headers: { 'Content-Type': 'application/json' } 
            });

            if (!wsRes.ok) throw new Error(`Workspace API error: ${wsRes.status}`);
            
            let wsData = await wsRes.json();
            wsData = wsData.workspaces || wsData || [];
            setWorkspaces(wsData);

            if (defId) {
                const userURL = `${API_URL}/api/UserWorkspace/GetUsersByWorkspaceId/${defId}`;
                const userRes = await fetch(userURL, { 
                    method: 'GET', 
                    headers: { 'Content-Type': 'application/json' } 
                });

                if (!userRes.ok) throw new Error(`UserWorkspacePermission API error: ${userRes.status}`);

                userData = await userRes.json();
                userData = userData.users || userData.userWorkspaces || userData.userWorkspacePermissions || userData || [];
            }

            const normalizedUsers = Array.isArray(userData) ? userData : [];
            setFilteredUsers(normalizedUsers);
        } catch (err) {
            setError(err.message); 
            console.error('API Error:', err);
        } finally { 
            setLoading(false); 
        }
    };

    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="workspace-permission-management">
            {error && (<div className="error-message">{error}<button onClick={() => setError(null)} className="dismiss-error">×</button></div>)}

            <div className="tabs">
                <button className={`tab-button ${activeTab === 'grant' ? 'active' : ''}`} onClick={() => setActiveTab('grant')}>Grant Workspaces</button>
                <button className={`tab-button ${activeTab === 'userWorkspaces' ? 'active' : ''}`} onClick={() => setActiveTab('userWorkspaces')}>User Workspaces</button>
            </div>

            <div className="tab-content-wrapper modern">
                {activeTab === 'grant' && (<GrantDenyWorkspaces defId={defId} filteredUsers={filteredUsers} workspaces={workspaces} loading={loading} setLoading={setLoading} />)}
                {activeTab === 'userWorkspaces' && (<UserWorkspaceManagement defWorkID={defId} fetchedUsers={filteredUsers} />)}
            </div>
        </div>
    );
};

export default WorkspacePermissionManagement;
