import React, { useEffect, useState } from 'react';
import './ProjectPermissionManagement.css';
import UserProjectManagement from './UserProjectManagement';
import GrantDenyProjects from './GrantDenyProjects';

const ProjectPermissionManagement = ({ defId, users, userId }) => {
    const [activeTab, setActiveTab] = useState('grant');
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filteredUsers, setFilteredUsers] = useState([]);

    useEffect(() => { fetchInitialData(); }, [defId]);

    const fetchInitialData = async () => {
        setLoading(true); setError(null);
        try {
            const projectsUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Project/GetProjects`;
            const userURL = `${process.env.REACT_APP_API_BASE_URL}/api/UserWorkspace/GetUsersByWorkspaceId/${defId}`;

            const [projectsRes, userRes] = await Promise.all([
                fetch(projectsUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } }),
                fetch(userURL, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
            ]);

            if (!projectsRes.ok) throw new Error(`Projects API error: ${projectsRes.status}`);
            if (!userRes.ok) throw new Error(`UserWorkspace API error: ${userRes.status}`);

            let projectsData = await projectsRes.json();
            let userData = await userRes.json();

            projectsData = projectsData.projects || projectsData || [];
            userData = userData.users || userData || [];

            setProjects(projectsData);
            setFilteredUsers(userData);
        } catch (err) {
            setError(err.message); console.error('API Error:', err);
        } finally { setLoading(false); }
    };

    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="project-permission-management">
            {error && (<div className="error-message">{error}<button onClick={() => setError(null)} className="dismiss-error">×</button></div>)}

                    <div className="tabs">
                        <button className={`tab-button ${activeTab === 'grant' ? 'active' : ''}`} onClick={() => setActiveTab('grant')}>Grant Projects</button>
                        <button className={`tab-button ${activeTab === 'userProjects' ? 'active' : ''}`} onClick={() => setActiveTab('userProjects')}>User Projects</button>
                    </div>

                    <div className="tab-content-wrapper modern">
                        {activeTab === 'grant' && (<GrantDenyProjects defId={defId} filteredUsers={filteredUsers} projects={projects} loading={loading} setLoading={setLoading} />)}
                        {activeTab === 'userProjects' && (<UserProjectManagement defWorkID={defId} fetchedUsers={filteredUsers} />)}
                    </div>
        </div>
    );
};

export default ProjectPermissionManagement;

