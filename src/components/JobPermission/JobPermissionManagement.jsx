import React, { useEffect, useState } from 'react';
import './JobPermissionManagement.css'; 
import UserJobManagement from './UserJobManagement';
import GrantDenyJobs from './GrantDenyJobs';
import CopyJobs from './CopyJobs';
import AssignUsers from './AssignUsers';

const JobPermissionManagement = ({ defId, users, userId }) => {
    const [activeTab, setActiveTab] = useState('grant');
    const [projects, setProjects] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filteredUsers, setFilteredUsers] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, [defId]);

    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);

        try {
            const projectsUrl = `${process.env.REACT_APP_API_BASE_URL}/api/SiteNote/GetUniqueProjects?userId=${userId}`;
            const jobsUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Job/GetJobs`;
            const userWorkspaceURL = `${process.env.REACT_APP_API_BASE_URL}/api/UserWorkspace/GetUserWorkspaces`;

            const [projectsRes, jobsRes, userWorkRes] = await Promise.all([
                fetch(projectsUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
                fetch(jobsUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
                fetch(userWorkspaceURL, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
            ]);

            if (!projectsRes.ok) throw new Error(`Projects API error: ${projectsRes.status}`);
            if (!jobsRes.ok) throw new Error(`Jobs API error: ${jobsRes.status}`);
            if (!userWorkRes.ok) throw new Error(`UserWorkspace API error: ${userWorkRes.status}`);

            let projectsData = await projectsRes.json();
            let jobsData = await jobsRes.json();
            let userData = await userWorkRes.json();

            projectsData = projectsData.projects || [];
            jobsData = jobsData.jobs || [];
            userData = userData.userWorkspaces || [];

            setProjects(projectsData);
            setJobs(jobsData);
            await getUserData(userData);
        } catch (err) {
            setError(err.message);
            console.error('API Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getUserData = async (userWorkspaces) => {
        const filteredUserWork = userWorkspaces.filter(userWorkspace => userWorkspace.workspaceID == defId);
        const userIds = [...new Set(filteredUserWork.map(work => work.userID))];
        const uniqueUsers = userIds.map(id => users.find(u => u.id === id)).filter(Boolean);
        setFilteredUsers(uniqueUsers);
    };

    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="settings-content">
            <div className="tabs-container">
                <div className="tabs-header">
                    <button 
                        className={`tab-button ${activeTab === 'grant' ? 'active' : ''}`}
                        onClick={() => setActiveTab('grant')}
                    >
                        Grant Job To Users
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'userJobs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('userJobs')}
                    >
                        Deny Jobs
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'copy' ? 'active' : ''}`}
                        onClick={() => setActiveTab('copy')}
                    >
                        Copy Jobs
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'assign' ? 'active' : ''}`}
                        onClick={() => setActiveTab('assign')}
                    >
                        Assign Jobs To User 
                    </button>
                </div>

                <div className="tabs-content">
                    {activeTab === 'grant' && (
                        <GrantDenyJobs 
                            defId={defId}
                            users={users}
                            filteredUsers={filteredUsers}
                            projects={projects}
                            jobs={jobs}
                            loading={loading}
                            setLoading={setLoading}
                        />
                    )}
                    {activeTab === 'userJobs' && (
                        <UserJobManagement defId={defId} users={users} />
                    )}
                    {activeTab === 'copy' && (
                        <CopyJobs 
                            filteredUsers={filteredUsers}
                            loading={loading}
                            setLoading={setLoading}
                        />
                    )}
                    {activeTab === 'assign' && (
                        <AssignUsers 
                            filteredUsers={filteredUsers}
                            projects={projects}
                            jobs={jobs}
                            loading={loading}
                            setLoading={setLoading}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobPermissionManagement;