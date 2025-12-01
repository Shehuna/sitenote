import React, { useState, useEffect, useMemo } from 'react';
import './UserJobManagement.css';

const UserJobManagement = ({ defWorkID }) => {
    const [userJobData, setUserJobData] = useState([]);
    const [workspaceUsers, setWorkspaceUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedJobs, setSelectedJobs] = useState({}); // { userId: { userJobId: true } }

    useEffect(() => {
        if (defWorkID) {
            fetchWorkspaceUsers();
        }
    }, [defWorkID]);

    // Fetch users from the workspace
    const fetchWorkspaceUsers = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('Fetching workspace users for ID:', defWorkID);
            const response = await fetch(
                `${process.env.REACT_APP_API_BASE_URL}/api/UserWorkspace/GetUsersByWorkspaceId/${defWorkID}`
            );
            
            if (!response.ok) {
                throw new Error(`Failed to fetch workspace users: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Workspace Users API Response:', data);
            
            // Extract users from the API response
            const users = data.users || [];
            console.log('Extracted workspace users:', users);
            setWorkspaceUsers(users);
            
            // After getting workspace users, fetch their job data
            await fetchUserJobData(users);
            
        } catch (err) {
            setError(err.message);
            console.error('Workspace Users API Error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch user job data for workspace users
    const fetchUserJobData = async (workspaceUsersList) => {
        try {
            console.log('Fetching user job data for workspace users:', workspaceUsersList);
            const response = await fetch(
                `${process.env.REACT_APP_API_BASE_URL}/api/UserJobAuth/GetUserJobDetails`
            );
            
            if (!response.ok) {
                throw new Error(`Failed to fetch user job data: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('User Job Data API Response:', data);
            
            // Handle different response structures
            const allUserJobs = data.data || data.userJobs || data || [];
            console.log('All user jobs from API:', allUserJobs);
            
            // Extract user IDs from workspace users
            const workspaceUserIds = workspaceUsersList.map(user => user.userId);
            console.log('Workspace User IDs to filter by:', workspaceUserIds);
            
            // Filter user job data to only include users from the workspace
            const filteredUserJobs = allUserJobs.filter(item => 
                workspaceUserIds.includes(item.userId)
            );
            
            console.log('Filtered User Jobs (workspace users only):', filteredUserJobs);
            setUserJobData(filteredUserJobs);
            
        } catch (err) {
            setError(err.message);
            console.error('User Job Data API Error:', err);
        }
    };

    // Refresh both workspace users and job data
    const refreshData = async () => {
        await fetchWorkspaceUsers();
    };

    // Group user job data by user
    const usersWithJobs = useMemo(() => {
        const groupedByUser = {};
        
        userJobData.forEach(item => {
            if (!groupedByUser[item.userId]) {
                // Find the workspace user info to get additional details
                const workspaceUser = workspaceUsers.find(user => user.userId === item.userId);
                
                groupedByUser[item.userId] = {
                    userInfo: {
                        id: item.userId,
                        fname: item.fname || workspaceUser?.fname,
                        lname: item.lname || workspaceUser?.lname,
                        userName: item.userName || workspaceUser?.userName,
                        email: item.email || workspaceUser?.email,
                        role: item.role,
                        status: item.status,
                        workspaceRole: workspaceUser?.roleInWorkspace,
                        workspaceStatus: workspaceUser?.statusInWorkspace,
                        joinedAt: workspaceUser?.joinedAt
                    },
                    jobs: []
                };
            }
            
            groupedByUser[item.userId].jobs.push({
                userJobId: item.userJobId,
                jobId: item.jobId,
                jobName: item.jobName,
                jobDescription: item.jobDescription,
                projectId: item.projectId,
                jobStatus: item.jobStatus,
                jobOwnerId: item.jobOwnerId,
                timestamp: item.timestamp,
                userIDScreen: item.userIDScreen
            });
        });
        
        return Object.values(groupedByUser);
    }, [userJobData, workspaceUsers]);

    // Handle checkbox selection
    const handleCheckboxChange = (userId, userJobId) => {
        setSelectedJobs(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [userJobId]: !prev[userId]?.[userJobId]
            }
        }));
    };

    // Handle select all for a specific user
    const handleSelectAllForUser = (userId, jobs) => {
        const allSelected = jobs.every(job => selectedJobs[userId]?.[job.userJobId]);
        
        setSelectedJobs(prev => ({
            ...prev,
            [userId]: jobs.reduce((acc, job) => {
                acc[job.userJobId] = !allSelected;
                return acc;
            }, {})
        }));
    };

    // Handle deny permission for selected jobs of a specific user
    const handleDenyPermissionForUser = async (userId) => {
        const userSelectedJobs = selectedJobs[userId] || {};
        const selectedUserJobIds = Object.keys(userSelectedJobs).filter(userJobId => userSelectedJobs[userJobId]);
        
        if (selectedUserJobIds.length === 0) {
            alert('Please select at least one job to deny permission.');
            return;
        }

        if (!window.confirm(`Are you sure you want to deny permission for ${selectedUserJobIds.length} job(s) for this user?`)) {
            return;
        }

        try {
            const denyPromises = selectedUserJobIds.map(async (userJobId) => {
                const response = await fetch(
                    `${process.env.REACT_APP_API_BASE_URL}/api/UserJobAuth/DeleteUserJob/${userJobId}`, 
                    {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    }
                );
                return response.ok;
            });

            const results = await Promise.all(denyPromises);
            const allSuccessful = results.every(result => result);
            
            if (allSuccessful) {
                // Clear selections for this user
                setSelectedJobs(prev => {
                    const newSelected = { ...prev };
                    delete newSelected[userId];
                    return newSelected;
                });
                
                // Refresh the data
                await refreshData();
                alert(`Successfully denied permission for ${selectedUserJobIds.length} job(s)`);
            } else {
                throw new Error('Failed to deny permission for some jobs');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error denying permissions:', err);
            alert('Error denying permissions. Please try again.');
        }
    };

    // Enhanced filtering logic
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return usersWithJobs;

        const searchLower = searchTerm.toLowerCase();
        
        return usersWithJobs.filter(userGroup => {
            const user = userGroup.userInfo;
            
            // Check user fields
            const userMatches = user.userName?.toLowerCase().includes(searchLower) ||
                              user.email?.toLowerCase().includes(searchLower) ||
                              `${user.fname} ${user.lname}`.toLowerCase().includes(searchLower);

            // Check if any of user's jobs match the search
            const jobMatches = userGroup.jobs.some(job => 
                job.jobName?.toLowerCase().includes(searchLower) ||
                job.jobDescription?.toLowerCase().includes(searchLower)
            );

            return userMatches || jobMatches;
        });
    }, [usersWithJobs, searchTerm]);

    // Function to determine which jobs to show for each user
    const getJobsToDisplayForUser = (userGroup) => {
        const userJobsList = userGroup.jobs;
        
        if (!searchTerm) {
            // No search term - show all jobs
            return userJobsList;
        }

        const searchLower = searchTerm.toLowerCase();
        const user = userGroup.userInfo;
        
        // Check if user matches the search
        const userMatches = user.userName?.toLowerCase().includes(searchLower) ||
                           user.email?.toLowerCase().includes(searchLower) ||
                           `${user.fname} ${user.lname}`.toLowerCase().includes(searchLower);

        if (userMatches) {
            // User matches search - show ALL their jobs
            return userJobsList;
        } else {
            // User doesn't match search, but might have matching jobs - show only matching jobs
            return userJobsList.filter(job => 
                job.jobName?.toLowerCase().includes(searchLower) ||
                job.jobDescription?.toLowerCase().includes(searchLower)
            );
        }
    };

    // Check if all jobs are selected for a user
    const areAllJobsSelectedForUser = (userId, jobs) => {
        if (!jobs.length) return false;
        return jobs.every(job => selectedJobs[userId]?.[job.userJobId]);
    };

    // Check if any jobs are selected for a user
    const areAnyJobsSelectedForUser = (userId, jobs) => {
        if (!jobs.length) return false;
        return jobs.some(job => selectedJobs[userId]?.[job.userJobId]);
    };

    // Get workspace role badge
    const getWorkspaceRoleBadge = (role) => {
        const roleMap = {
            1: { text: 'Admin', class: 'role-admin' },
            2: { text: 'Manager', class: 'role-manager' },
            3: { text: 'Member', class: 'role-member' },
            4: { text: 'Viewer', class: 'role-viewer' }
        };
        
        const roleInfo = roleMap[role] || { text: 'Unknown', class: 'role-unknown' };
        return <span className={`role-badge ${roleInfo.class}`}>{roleInfo.text}</span>;
    };

    // Get workspace status badge
    const getWorkspaceStatusBadge = (status) => {
        const statusMap = {
            1: { text: 'Active', class: 'status-active' },
            2: { text: 'Inactive', class: 'status-inactive' },
            0: { text: 'Pending', class: 'status-pending' }
        };
        
        const statusInfo = statusMap[status] || { text: 'Unknown', class: 'status-unknown' };
        return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.text}</span>;
    };

    if (loading) return <div className="loading-message">Loading workspace user data...</div>;
    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="user-job-management">
            <div className="user-job-header">
                <h2>User Job Permissions</h2>
                <p>Manage job permissions for users in this workspace </p>
               
            </div>

            {/* Controls */}
            <div className="user-job-controls">
                <div className="search-bar">
                    <i className="fas fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search users or job names..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={refreshData}
                    className="refresh-btn"
                    title="Refresh Data"
                >
                    <i className="fas fa-sync-alt"></i> Refresh
                </button>
            </div>

            {/* Users List */}
            <div className="users-list">
                {filteredUsers.map(userGroup => {
                    const user = userGroup.userInfo;
                    const jobsToDisplay = getJobsToDisplayForUser(userGroup);
                    
                    // Don't show users with no jobs to display
                    if (jobsToDisplay.length === 0) return null;

                    const allSelected = areAllJobsSelectedForUser(user.id, jobsToDisplay);
                    const anySelected = areAnyJobsSelectedForUser(user.id, jobsToDisplay);
                    const selectedCount = anySelected ? Object.values(selectedJobs[user.id] || {}).filter(Boolean).length : 0;

                    return (
                        <div key={user.id} className="user-card">
                            <div className="user-info">
                                <div className="user-main-info">
                                    <h3 className="user-name">{user.fname} {user.lname}</h3>
                                </div>
                                
                            </div>

                            <div className="user-jobs-section">
                                <div className="jobs-section-header">
                                    <h4 className="jobs-section-title">
                                        Job Permissions ({jobsToDisplay.length} job{jobsToDisplay.length !== 1 ? 's' : ''})
                                        {anySelected && <span className="selected-count"> - {selectedCount} selected</span>}
                                    </h4>
                                    <div className="bulk-actions">
                                        <label className="select-all-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={() => handleSelectAllForUser(user.id, jobsToDisplay)}
                                            />
                                            Select All
                                        </label>
                                        {anySelected && (
                                            <button 
                                                onClick={() => handleDenyPermissionForUser(user.id)}
                                                className="deny-selected-btn"
                                                title="Deny Permission for Selected Jobs"
                                            >
                                                <i className="fas fa-ban"></i>
                                                Deny Selected ({selectedCount})
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="jobs-list">
                                    {jobsToDisplay.map(job => {
                                        const isSelected = selectedJobs[user.id]?.[job.userJobId] || false;
                                        
                                        return (
                                            <div key={job.userJobId} className="job-item">
                                                <div className="job-info">
                                                    <label className="job-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleCheckboxChange(user.id, job.userJobId)}
                                                        />
                                                        <div className="job-details">
                                                            <span className="job-name">{job.jobName}</span>
                                                            {job.jobDescription && (
                                                                <span className="job-description">{job.jobDescription}</span>
                                                            )}
                                                            <div className="job-meta">
                                                                <span className="job-id">Job ID: {job.jobId}</span>
                                                                <span className="project-id">Project ID: {job.projectId}</span>
                                                                
                                                            </div>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredUsers.filter(userGroup => getJobsToDisplayForUser(userGroup).length > 0).length === 0 && (
                <div className="no-results">
                    {searchTerm ? (
                        <>
                            <i className="fas fa-search"></i>
                            <h3>No users or jobs found</h3>
                            <p>No users or jobs match your search criteria "{searchTerm}"</p>
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="clear-search-btn"
                            >
                                Clear Search
                            </button>
                        </>
                    ) : (
                        <>
                            <i className="fas fa-users"></i>
                            <h3>No users with job permissions</h3>
                            <p>
                                There are currently no users in workspace {defWorkID} with job permissions assigned.
                                {workspaceUsers.length > 0 && ` ${workspaceUsers.length} user${workspaceUsers.length !== 1 ? 's' : ''} found in workspace.`}
                            </p>
                            
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserJobManagement;

