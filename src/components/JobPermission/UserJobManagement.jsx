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
            const response = await fetch(
                `${process.env.REACT_APP_API_BASE_URL}/api/UserWorkspace/GetUsersByWorkspaceId/${defWorkID}`
            );
            
            if (!response.ok) {
                throw new Error(`Failed to fetch workspace users: ${response.status}`);
            }
            
            const data = await response.json();
            const users = data.users || [];
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
            const response = await fetch(
                `${process.env.REACT_APP_API_BASE_URL}/api/UserJobAuth/GetUserJobDetails`
            );
            
            if (!response.ok) {
                throw new Error(`Failed to fetch user job data: ${response.status}`);
            }
            
            const data = await response.json();
            const allUserJobs = data.data || data.userJobs || data || [];
            
            // Extract user IDs from workspace users
            const workspaceUserIds = workspaceUsersList.map(user => user.userId);
            
            // Filter user job data to only include users from the workspace
            const filteredUserJobs = allUserJobs.filter(item => 
                workspaceUserIds.includes(item.userId)
            );
            
            setUserJobData(filteredUserJobs);
            
        } catch (err) {
            setError(err.message);
            console.error('User Job Data API Error:', err);
        }
    };

    // Group user job data by user
    const usersWithJobs = useMemo(() => {
        const groupedByUser = {};
        
        userJobData.forEach(item => {
            if (!groupedByUser[item.userId]) {
                const workspaceUser = workspaceUsers.find(user => user.userId === item.userId);
                
                groupedByUser[item.userId] = {
                    userInfo: {
                        id: item.userId,
                        fname: item.fname || workspaceUser?.fname,
                        lname: item.lname || workspaceUser?.lname,
                        userName: item.userName || workspaceUser?.userName,
                        email: item.email || workspaceUser?.email,
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
                setSelectedJobs(prev => {
                    const newSelected = { ...prev };
                    delete newSelected[userId];
                    return newSelected;
                });
                
                await fetchWorkspaceUsers();
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
            
            const userMatches = user.userName?.toLowerCase().includes(searchLower) ||
                              user.email?.toLowerCase().includes(searchLower) ||
                              `${user.fname} ${user.lname}`.toLowerCase().includes(searchLower);

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
            return userJobsList;
        }

        const searchLower = searchTerm.toLowerCase();
        const user = userGroup.userInfo;
        
        const userMatches = user.userName?.toLowerCase().includes(searchLower) ||
                           user.email?.toLowerCase().includes(searchLower) ||
                           `${user.fname} ${user.lname}`.toLowerCase().includes(searchLower);

        if (userMatches) {
            return userJobsList;
        } else {
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

    if (loading) return <div className="loading-message">Loading workspace user data...</div>;
    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="user-job-management" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            maxHeight: '400px',
            overflow: 'hidden',
            padding: '0 8px' // Added padding to prevent edge issues
        }}>
           
            {/* Compact Controls - Fixed Width Search */}
            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '12px',
                flexShrink: 0,
                padding: '0 4px', // Added padding
                justifyContent: 'center' // Center the search box
            }}>
                <div style={{ 
                    position: 'relative', 
                    width: '95%', // Fixed width to prevent overflow
                    maxWidth: '300px' // Maximum width limit
                }}>
                    <i className="fas fa-search" style={{ 
                        position: 'absolute', 
                        left: '8px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        color: '#999',
                        fontSize: '12px'
                    }}></i>
                    <input
                        type="text"
                        placeholder="Search users or jobs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', // Takes full width of container
                            padding: '6px 6px 6px 24px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px',
                            height: '32px',
                            boxSizing: 'border-box' // Ensures padding doesn't affect width
                        }}
                    />
                </div>
            </div>

            {/* Users List - Compact */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '0 4px' // Added padding
            }}>
                {filteredUsers.map(userGroup => {
                    const user = userGroup.userInfo;
                    const jobsToDisplay = getJobsToDisplayForUser(userGroup);
                    
                    if (jobsToDisplay.length === 0) return null;

                    const allSelected = areAllJobsSelectedForUser(user.id, jobsToDisplay);
                    const anySelected = areAnyJobsSelectedForUser(user.id, jobsToDisplay);
                    const selectedCount = anySelected ? Object.values(selectedJobs[user.id] || {}).filter(Boolean).length : 0;

                    return (
                        <div key={user.id} style={{
                            border: '1px solid #e1e5e9',
                            borderRadius: '4px',
                            padding: '8px',
                            background: 'white'
                        }}>
                            {/* User Header - Compact */}
                            <div style={{ 
                                marginBottom: '8px',
                                paddingBottom: '6px',
                                borderBottom: '1px solid #f0f0f0'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ 
                                        margin: '0', 
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#333'
                                    }}>
                                        {user.fname} {user.lname}
                                    </h4>
                                    <span style={{ 
                                        fontSize: '10px',
                                        color: '#666'
                                    }}>
                                        {jobsToDisplay.length} job{jobsToDisplay.length !== 1 ? 's' : ''}
                                        {anySelected && ` • ${selectedCount} selected`}
                                    </span>
                                </div>
                                <div style={{ 
                                    fontSize: '10px',
                                    color: '#666',
                                    marginTop: '2px'
                                }}>
                                    {user.email}
                                </div>
                            </div>

                            {/* Bulk Actions - Compact */}
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '6px'
                            }}>
                                <label style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={() => handleSelectAllForUser(user.id, jobsToDisplay)}
                                        style={{ 
                                            width: '12px',
                                            height: '12px'
                                        }}
                                    />
                                    Select All
                                </label>
                                {anySelected && (
                                    <button 
                                        onClick={() => handleDenyPermissionForUser(user.id)}
                                        style={{
                                            padding: '4px 8px',
                                            background: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            fontSize: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <i className="fas fa-ban" style={{ fontSize: '8px' }}></i>
                                        Deny ({selectedCount})
                                    </button>
                                )}
                            </div>

                            {/* Jobs List - Compact with Larger Font */}
                            <div style={{ 
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                maxHeight: '120px',
                                overflowY: 'auto'
                            }}>
                                {jobsToDisplay.map(job => {
                                    const isSelected = selectedJobs[user.id]?.[job.userJobId] || false;
                                    
                                    return (
                                        <label key={job.userJobId} style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '6px',
                                            padding: '5px 6px', // Slightly increased padding
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? '#f8f9fa' : 'transparent',
                                            border: '1px solid #f0f0f0',
                                            fontSize: '12px' // Increased from 11px to 12px
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleCheckboxChange(user.id, job.userJobId)}
                                                style={{ 
                                                    marginTop: '2px',
                                                    width: '12px',
                                                    height: '12px',
                                                    flexShrink: 0
                                                }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ 
                                                    fontWeight: '500',
                                                    marginBottom: '2px',
                                                    lineHeight: '1.3', // Slightly increased line height
                                                    fontSize: '12px' // Increased job name font size
                                                }}>
                                                    {job.jobName}
                                                </div>
                                                <div style={{ 
                                                    fontSize: '10px', // Increased from 9px to 10px
                                                    color: '#666',
                                                    lineHeight: '1.2'
                                                }}>
                                                    ID: {job.jobId} • Project: {job.projectId}
                                                </div>
                                                {job.jobDescription && (
                                                    <div style={{ 
                                                        fontSize: '10px', // Increased from 9px to 10px
                                                        color: '#666',
                                                        marginTop: '2px', // Slightly increased margin
                                                        lineHeight: '1.2'
                                                    }}>
                                                        {job.jobDescription}
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {filteredUsers.filter(userGroup => getJobsToDisplayForUser(userGroup).length > 0).length === 0 && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '20px 12px',
                        color: '#666'
                    }}>
                        {searchTerm ? (
                            <>
                                <i className="fas fa-search" style={{ 
                                    fontSize: '20px', 
                                    marginBottom: '8px',
                                    opacity: 0.5
                                }}></i>
                                <h4 style={{ 
                                    margin: '0 0 6px 0',
                                    fontSize: '12px',
                                    color: '#333'
                                }}>No users or jobs found</h4>
                                <p style={{ 
                                    margin: '0 0 10px 0',
                                    fontSize: '11px'
                                }}>No matches for "{searchTerm}"</p>
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    style={{
                                        padding: '4px 12px',
                                        background: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '10px'
                                    }}
                                >
                                    Clear Search
                                </button>
                            </>
                        ) : (
                            <>
                                <i className="fas fa-users" style={{ 
                                    fontSize: '20px', 
                                    marginBottom: '8px',
                                    opacity: 0.5
                                }}></i>
                                <h4 style={{ 
                                    margin: '0 0 6px 0',
                                    fontSize: '12px',
                                    color: '#333'
                                }}>No users with job permissions</h4>
                                <p style={{ 
                                    margin: '0',
                                    fontSize: '11px'
                                }}>
                                    No users in workspace have job permissions assigned.
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserJobManagement;