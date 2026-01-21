import React, { useState, useEffect, useMemo, useRef } from 'react';
import './UserJobManagement.css';

const UserJobManagement = ({ defWorkID, fetchedUsers }) => {
    const [userJobsData, setUserJobsData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedJobs, setSelectedJobs] = useState({});
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const containerRef = useRef(null);

    // Check for mobile screen size
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch jobs for all users when component mounts or users change
    useEffect(() => {
        if (fetchedUsers && fetchedUsers.length > 0 && defWorkID) {
            fetchAllUsersJobs();
        }
    }, [fetchedUsers, defWorkID]);

    // Fetch jobs for all users
    const fetchAllUsersJobs = async () => {
        setLoading(true);
        setError(null);

        try {
            const userJobsPromises = fetchedUsers.map(async (user) => {
                try {
                    const response = await fetch(
                        `${process.env.REACT_APP_API_BASE_URL}/api/SiteNote/SearchJobs?userId=${user.userId}`
                    );
                    
                    if (!response.ok) {
                        throw new Error(`Failed to fetch jobs for user ${user.userId}: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    // Filter jobs by default workspace ID
                    const workspaceJobs = data.results?.filter(job => 
                        job.workspaceId === defWorkID
                    ) || [];
                    
                    return {
                        userId: user.userId,
                        userName: user.userName,
                        fname: user.fname,
                        lname: user.lname,
                        email: user.email,
                        jobs: workspaceJobs,
                        loading: false,
                        error: null
                    };
                } catch (err) {
                    console.error(`Error fetching jobs for user ${user.userId}:`, err);
                    return {
                        userId: user.userId,
                        userName: user.userName,
                        fname: user.fname,
                        lname: user.lname,
                        email: user.email,
                        jobs: [],
                        loading: false,
                        error: err.message
                    };
                }
            });

            const results = await Promise.all(userJobsPromises);
            
            // Convert array to object keyed by userId
            const userJobsObject = results.reduce((acc, userData) => {
                acc[userData.userId] = userData;
                return acc;
            }, {});
            
            setUserJobsData(userJobsObject);
            
        } catch (err) {
            setError(err.message);
            console.error('Error fetching all users jobs:', err);
        } finally {
            setLoading(false);
        }
    };

    // Refresh job data for all users
    const refreshData = async () => {
        await fetchAllUsersJobs();
    };

    // Refresh job data for a specific user
    const refreshUserJobs = async (userId) => {
        try {
            setUserJobsData(prev => ({
                ...prev,
                [userId]: { ...prev[userId], loading: true }
            }));

            const response = await fetch(
                `${process.env.REACT_APP_API_BASE_URL}/api/SiteNote/SearchJobs?userId=${userId}`
            );
            
            if (!response.ok) {
                throw new Error(`Failed to fetch jobs for user ${userId}: ${response.status}`);
            }
            
            const data = await response.json();
            
            const workspaceJobs = data.results?.filter(job => 
                job.workspaceId === defWorkID
            ) || [];
            
            setUserJobsData(prev => ({
                ...prev,
                [userId]: {
                    ...prev[userId],
                    jobs: workspaceJobs,
                    loading: false,
                    error: null
                }
            }));
            
        } catch (err) {
            console.error(`Error refreshing jobs for user ${userId}:`, err);
            setUserJobsData(prev => ({
                ...prev,
                [userId]: {
                    ...prev[userId],
                    loading: false,
                    error: err.message
                }
            }));
        }
    };

    // Handle checkbox selection
    const handleCheckboxChange = (userId, jobId) => {
        setSelectedJobs(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [jobId]: !prev[userId]?.[jobId]
            }
        }));
    };

    // Handle select all for a specific user
    const handleSelectAllForUser = (userId, jobs) => {
        const allSelected = jobs.every(job => selectedJobs[userId]?.[job.jobId]);
        
        setSelectedJobs(prev => ({
            ...prev,
            [userId]: jobs.reduce((acc, job) => {
                acc[job.jobId] = !allSelected;
                return acc;
            }, {})
        }));
    };

    // Handle deny permission for selected jobs of a specific user
    const handleDenyPermissionForUser = async (userId) => {
        const userSelectedJobs = selectedJobs[userId] || {};
        const selectedJobIds = Object.keys(userSelectedJobs).filter(jobId => userSelectedJobs[jobId]);
        
        if (selectedJobIds.length === 0) {
            alert('Please select at least one job to deny permission.');
            return;
        }

        if (!window.confirm(`Are you sure you want to deny permission for ${selectedJobIds.length} job(s) for this user?`)) {
            return;
        }

        const user = JSON.parse(localStorage.getItem('user'));
        
        try {
            const deletePromises = selectedJobIds.map(async (jobId) => {
                const userJobsResponse = await fetch(
                    `${process.env.REACT_APP_API_BASE_URL}/api/UserJobAuth/GetUserJobsByUserId/${userId}`,
                    {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    }
                );

                if (!userJobsResponse.ok) {
                    throw new Error('Failed to fetch user job IDs');
                }

                const userJobsData = await userJobsResponse.json();
                const userJobs = userJobsData.userJobs || userJobsData.data || [];
                
                const userJob = userJobs.find(job => job.jobId == jobId);
                
                if (!userJob) {
                    throw new Error(`No permission found for job ${jobId}`);
                }

                const response = await fetch(
                    `${process.env.REACT_APP_API_BASE_URL}/api/UserJobAuth/DeleteUserJob/${userJob.userJobId || userJob.id}`, 
                    {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
                return response.ok;
            });

            const results = await Promise.all(deletePromises);
            const allSuccessful = results.every(result => result);
            
            if (allSuccessful) {
                setSelectedJobs(prev => {
                    const newSelected = { ...prev };
                    delete newSelected[userId];
                    return newSelected;
                });
                
                await refreshUserJobs(userId);
                alert(`Successfully denied permission for ${selectedJobIds.length} job(s)`);
            } else {
                throw new Error('Failed to deny permission for some jobs');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error denying permissions:', err);
            alert('Error denying permissions. Please try again.');
        }
    };

    // Filter users based on search term
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return fetchedUsers || [];

        const searchLower = searchTerm.toLowerCase();
        
        return (fetchedUsers || []).filter(user => {
            const userMatches = user.userName?.toLowerCase().includes(searchLower) ||
                              user.email?.toLowerCase().includes(searchLower) ||
                              `${user.fname} ${user.lname}`.toLowerCase().includes(searchLower);

            const userJobs = userJobsData[user.userId]?.jobs || [];
            const jobMatches = userJobs.some(job => 
                job.jobName?.toLowerCase().includes(searchLower) ||
                job.projectName?.toLowerCase().includes(searchLower) ||
                job.workspaceName?.toLowerCase().includes(searchLower)
            );

            return userMatches || jobMatches;
        });
    }, [searchTerm, fetchedUsers, userJobsData]);

    // Get jobs to display for a user
    const getJobsToDisplayForUser = (userId) => {
        const userData = userJobsData[userId];
        if (!userData) return [];

        const userJobs = userData.jobs || [];
        
        if (!searchTerm) {
            return userJobs;
        }

        const searchLower = searchTerm.toLowerCase();
        const user = fetchedUsers?.find(u => u.userId === userId);
        
        const userMatches = user?.userName?.toLowerCase().includes(searchLower) ||
                           user?.email?.toLowerCase().includes(searchLower) ||
                           `${user?.fname} ${user?.lname}`.toLowerCase().includes(searchLower);

        if (userMatches) {
            return userJobs;
        } else {
            return userJobs.filter(job => 
                job.jobName?.toLowerCase().includes(searchLower) ||
                job.projectName?.toLowerCase().includes(searchLower) ||
                job.workspaceName?.toLowerCase().includes(searchLower)
            );
        }
    };

    // Check if all jobs are selected for a user
    const areAllJobsSelectedForUser = (userId, jobs) => {
        if (!jobs.length) return false;
        return jobs.every(job => selectedJobs[userId]?.[job.jobId]);
    };

    // Check if any jobs are selected for a user
    const areAnyJobsSelectedForUser = (userId, jobs) => {
        if (!jobs.length) return false;
        return jobs.some(job => selectedJobs[userId]?.[job.jobId]);
    };

    // Get job count for a user
    const getUserJobCount = (userId) => {
        return userJobsData[userId]?.jobs?.length || 0;
    };

    // Calculate dynamic max height for the component
    const getContainerHeight = () => {
        if (isMobile) {
            return '350px';
        }
        return '450px';
    };

    if (loading) return (
        <div className="loading-message" style={{ padding: '20px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin"></i> Loading user job data...
        </div>
    );
    
    if (error) return (
        <div className="error-message" style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>
            <i className="fas fa-exclamation-triangle"></i> Error: {error}
        </div>
    );

    return (
        <div 
            ref={containerRef}
            className="user-job-management"
            style={{ 
                padding: isMobile ? '10px' : '15px',
                maxHeight: getContainerHeight(),
                overflowY: 'auto',
                boxSizing: 'border-box'
            }}
        >
            
            {/* Controls */}
            <div className="user-job-controls">
                <div className="search-bar" style={{ flex: 1 }}>
                    <i className="fas fa-search" style={{ fontSize: isMobile ? '12px' : '14px' }}></i>
                    <input
                        type="text"
                        placeholder="Search users or job names..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            padding: isMobile ? '6px 6px 6px 24px' : '8px 8px 8px 30px',
                            fontSize: isMobile ? '12px' : '13px'
                        }}
                    />
                </div>
               
            </div>

            {/* Users List */}
            <div className="users-list" style={{ gap: isMobile ? '10px' : '15px' }}>
                {filteredUsers.map(user => {
                    const userData = userJobsData[user.userId];
                    const jobsToDisplay = getJobsToDisplayForUser(user.userId);
                    
                    if (jobsToDisplay.length === 0) return null;

                    const allSelected = areAllJobsSelectedForUser(user.userId, jobsToDisplay);
                    const anySelected = areAnyJobsSelectedForUser(user.userId, jobsToDisplay);
                    const selectedCount = anySelected ? Object.values(selectedJobs[user.userId] || {}).filter(Boolean).length : 0;
                    const totalJobCount = getUserJobCount(user.userId);

                    return (
                        <div 
                            key={user.userId} 
                            className="user-card"
                            style={{ 
                                padding: isMobile ? '12px' : '15px',
                                marginBottom: isMobile ? '8px' : '0'
                            }}
                        >
                            <div className="user-info">
                                <div className="user-main-info">
                                    <h3 className="user-name" style={{ fontSize: isMobile ? '14px' : '16px' }}>
                                        {user.fname} {user.lname}
                                    </h3>
                                    
                                </div>
                                
                            </div>

                            {userData?.loading ? (
                                <div className="loading-jobs" style={{ padding: isMobile ? '20px 10px' : '30px 15px' }}>
                                    <i className="fas fa-spinner fa-spin"></i> Loading jobs...
                                </div>
                            ) : userData?.error ? (
                                <div className="error-jobs" style={{ padding: isMobile ? '20px 10px' : '30px 15px', fontSize: isMobile ? '12px' : '13px' }}>
                                    <i className="fas fa-exclamation-triangle"></i> Error: {userData.error}
                                </div>
                            ) : (
                                <div className="user-jobs-section" style={{ padding: isMobile ? '12px 0 0 0' : '15px 0 0 0' }}>
                                    <div className="jobs-section-header" style={{ 
                                        flexDirection: isMobile ? 'column' : 'row',
                                        alignItems: isMobile ? 'flex-start' : 'center',
                                        gap: isMobile ? '8px' : '0',
                                        marginBottom: isMobile ? '10px' : '12px'
                                    }}>
                                        <h4 className="jobs-section-title" style={{ fontSize: isMobile ? '13px' : '14px' }}>
                                            Job Permissions ({jobsToDisplay.length})
                                            {anySelected && <span className="selected-count"> - {selectedCount} selected</span>}
                                        </h4>
                                        <div className="bulk-actions" style={{ 
                                            width: isMobile ? '100%' : 'auto',
                                            justifyContent: isMobile ? 'space-between' : 'flex-end'
                                        }}>
                                            <label className="select-all-checkbox" style={{ fontSize: isMobile ? '12px' : '13px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    onChange={() => handleSelectAllForUser(user.userId, jobsToDisplay)}
                                                />
                                                Select All
                                            </label>
                                            {anySelected && (
                                                <button 
                                                    onClick={() => handleDenyPermissionForUser(user.userId)}
                                                    className="deny-selected-btn"
                                                    title="Deny Permission for Selected Jobs"
                                                    style={{
                                                        padding: isMobile ? '4px 8px' : '6px 10px',
                                                        fontSize: isMobile ? '11px' : '12px'
                                                    }}
                                                >
                                                    <i className="fas fa-ban"></i>
                                                    {isMobile ? `Deny (${selectedCount})` : `Deny Selected (${selectedCount})`}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div 
                                        className="jobs-list" 
                                        style={{ 
                                            maxHeight: isMobile ? '200px' : '250px',
                                            gap: isMobile ? '6px' : '8px'
                                        }}
                                    >
                                        {jobsToDisplay.map(job => {
                                            const isSelected = selectedJobs[user.userId]?.[job.jobId] || false;
                                            
                                            return (
                                                <div 
                                                    key={job.jobId} 
                                                    className="job-item"
                                                    style={{ 
                                                        padding: isMobile ? '8px' : '10px',
                                                        fontSize: isMobile ? '12px' : '13px'
                                                    }}
                                                >
                                                    <div className="job-info">
                                                        <label className="job-checkbox" style={{ gap: isMobile ? '6px' : '8px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => handleCheckboxChange(user.userId, job.jobId)}
                                                            />
                                                            <div className="job-details">
                                                                <span className="job-name" style={{ fontSize: isMobile ? '12px' : '13px' }}>
                                                                    {job.jobName}
                                                                </span>
                                                                <div 
                                                                    className="job-meta" 
                                                                    style={{ 
                                                                        flexDirection: isMobile ? 'column' : 'row',
                                                                        gap: isMobile ? '4px' : '8px',
                                                                        fontSize: isMobile ? '10px' : '11px'
                                                                    }}
                                                                >
                                                                    
                                                                    <span className="project">Project: {job.projectName}</span>
                                                                    {!isMobile && (
                                                                        <span className="workspace">Workspace: {job.workspaceName}</span>
                                                                    )}
                                                                </div>
                                                               
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredUsers.length === 0 && (
                <div 
                    className="no-results" 
                    style={{ 
                        padding: isMobile ? '30px 15px' : '40px 20px',
                        fontSize: isMobile ? '13px' : '14px'
                    }}
                >
                    <i className="fas fa-search" style={{ fontSize: isMobile ? '36px' : '48px' }}></i>
                    <h3 style={{ fontSize: isMobile ? '16px' : '18px' }}>
                        No users or jobs found
                    </h3>
                    <p>
                        {searchTerm ? 
                            `No users or jobs match your search criteria "${searchTerm}"` :
                            'No users with job permissions found in this workspace'
                        }
                    </p>
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="clear-search-btn"
                            style={{
                                padding: isMobile ? '6px 12px' : '8px 16px',
                                fontSize: isMobile ? '12px' : '13px'
                            }}
                        >
                            Clear Search
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserJobManagement;