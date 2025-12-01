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
            const projectsUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Project/GetProjectsByUserJobPermission/${userId}/${defId}`;
            const userURL = `${process.env.REACT_APP_API_BASE_URL}/api/UserWorkspace/GetUsersByWorkspaceId/${defId}`;
            const jobURL = `${process.env.REACT_APP_API_BASE_URL}/api/SiteNote/SearchJobs?userId=${userId}`;

            const [projectsRes, userRes, jobRes] = await Promise.all([
                fetch(projectsUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
                fetch(userURL, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
                fetch(jobURL, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
            ]);

            if (!projectsRes.ok) throw new Error(`Projects API error: ${projectsRes.status}`);
            if (!userRes.ok) throw new Error(`UserWorkspace API error: ${userRes.status}`);
            if (!jobRes.ok) throw new Error(`UserWorkspace API error: ${jobRes.status}`);

            let projectsData = await projectsRes.json();
            let userData = await userRes.json();
            let jobData = await jobRes.json();

            projectsData = projectsData.projects || [];
            userData = userData.users || [];
            jobData = jobData.results || [];

            setProjects(projectsData);
            setFilteredUsers(userData);
            setJobs(jobData)
            
        } catch (err) {
            setError(err.message);
            console.error('API Error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="job-permission-management">
            
            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError(null)} className="dismiss-error">×</button>
                </div>
            )}

            <div className="tabs">
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

            <div className="tab-content-wrapper">
                {activeTab === 'grant' && (
                    <GrantDenyJobs 
                        defId={defId}
                        users={users}
                        filteredUsers={filteredUsers}
                        projects={projects}
                        loading={loading}
                        setLoading={setLoading}
                    />
                )}
                {activeTab === 'userJobs' && (
                    <UserJobManagement defWorkID={defId}  />
                )}
                {activeTab === 'copy' && (
                    <CopyJobs 
                        filteredUsers={filteredUsers}
                        loading={loading}
                        setLoading={setLoading}
                        defWorkId={defId}
                    />
                )}
                {activeTab === 'assign' && (
                    <AssignUsers 
                        filteredUsers={filteredUsers}
                        projects={projects}
                        jobs={jobs}
                        loading={loading}
                        setLoading={setLoading}
                        defId={defId}
                    />
                )}
            </div>
        </div>
    );
};

export default JobPermissionManagement;