import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';

const GrantDenyJobs = ({ filteredUsers, projects, loading, setLoading }) => {
    const [selectedUsers, setSelectedUsers] = useState([]); 
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedJob, setSelectedJob] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));
    const API_URL = process.env.REACT_APP_API_BASE_URL;

    // Fetch jobs when selectedProject changes
    useEffect(() => {
        const fetchJobs = async () => {
            if (!selectedProject) {
                setJobs([]);
                setSelectedJob('');
                return;
            }

            setLoadingJobs(true);
            try {
                console.log('Fetching jobs for user:', user.id, 'and project:', selectedProject);

                const response = await fetch(
                    `${API_URL}/api/UserJobAuth/GetJobsByUserAndProject/${user.id}/${selectedProject}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    }
                );

                console.log('Response status:', response.status);
                console.log('Response ok:', response.ok);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API Error Response:', errorText);
                    throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('API Response data:', data);

                // Handle different possible response structures
                let jobsArray = [];

                if (Array.isArray(data)) {
                    jobsArray = data;
                } else if (data.jobs && Array.isArray(data.jobs)) {
                    jobsArray = data.jobs;
                } else if (data.userJobs && Array.isArray(data.userJobs)) {
                    jobsArray = data.userJobs;
                } else if (data.data && Array.isArray(data.data)) {
                    jobsArray = data.data;
                } else {
                    console.warn('Unexpected API response structure:', data);
                    jobsArray = [];
                }

                console.log('Processed jobs array:', jobsArray);
                setJobs(jobsArray);

            } catch (error) {
                console.error('Error fetching jobs:', error);
                toast.error(`Failed to load jobs: ${error.message}`);
                setJobs([]);
            } finally {
                setLoadingJobs(false);
            }
        };

        fetchJobs();
    }, [selectedProject, user?.id, API_URL]);

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        
        return filteredUsers.filter(user => 
            user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        ).filter(user => !selectedUsers.some(selected => selected.userId === user.userId)); // FIXED: Changed selected.id to selected.userId
    }, [searchTerm, filteredUsers, selectedUsers]);

    const handleGrantPermission = async () => {
        if (selectedUsers.length === 0) {
            toast.error('Please select at least one user');
            return;
        }

        if (!selectedJob) {
            toast.error('Please select a job');
            return;
        }

        setLoading(true);
        try {
            const grantPromises = [];
            const usersAlreadyHavePermission = [];
            const usersToGrantPermission = [];

            for (const selectedUser of selectedUsers) {
                try {
                    const userJobsResponse = await fetch(
                        `${API_URL}/api/UserJobAuth/GetUserJobsByUserId/${selectedUser.userId}`,
                        {
                            method: 'GET',
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );

                    if (!userJobsResponse.ok) {
                        console.warn(`Failed to fetch jobs for user ${selectedUser.userName}`);
                        continue;
                    }

                    const userJobsData = await userJobsResponse.json();
                    const userJobs = userJobsData.userJobs || [];

                    const existingPermission = userJobs.find(job => job.jobId == selectedJob);

                    if (existingPermission) {
                        usersAlreadyHavePermission.push(selectedUser);
                        console.log(`User ${selectedUser.userName} already has permission for job ID: ${selectedJob}`);
                    } else {
                        usersToGrantPermission.push(selectedUser);
                        grantPromises.push(
                            fetch(`${API_URL}/api/UserJobAuth/AddUserJob`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userId: selectedUser.userId,
                                    jobId: selectedJob,
                                    userIDScreen: user.id
                                })
                            }).then(response => {
                                if (!response.ok) {
                                    throw new Error(`Failed to grant permission for user ${selectedUser.userName}`);
                                }
                                return { user: selectedUser, success: true };
                            })
                        );
                    }
                } catch (error) {
                    console.error(`Error checking permission for user ${selectedUser.userName}:`, error);
                }
            }

            if (usersAlreadyHavePermission.length > 0) {
                const userNames = usersAlreadyHavePermission.map(u => u.userName).join(', ');
                toast.error(`${usersAlreadyHavePermission.length} user(s) already have permission: ${userNames}`);
            }

            if (grantPromises.length > 0) {
                const results = await Promise.allSettled(grantPromises);
                
                const successfulGrants = results.filter(result => 
                    result.status === 'fulfilled' && result.value.success
                ).length;

                const failedGrants = results.filter(result => 
                    result.status === 'rejected'
                ).length;

                if (successfulGrants > 0) {
                    toast.success(`Job granted successfully to ${successfulGrants} user(s)`);
                }

                if (failedGrants > 0) {
                    toast.error(`Failed to grant permission for ${failedGrants} user(s)`);
                }
            } else {
                if (usersAlreadyHavePermission.length === selectedUsers.length) {
                    toast.info('All selected users already have permission for this job');
                } else {
                    toast.info('No permissions were granted');
                }
            }
            if (grantPromises.length > 0) {
                resetForm();
            }
        } catch (error) {
            toast.error('Error granting job permissions');
            console.error('Grant permission error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDenyPermission = async () => {
        if (selectedUsers.length === 0) {
            toast.error('Please select at least one user');
            return;
        }

        if (!selectedJob) {
            toast.error('Please select a job');
            return;
        }

        setLoading(true);
        try {
            const deletionPromises = [];

            for (const selectedUser of selectedUsers) {
                try {
                    const userJobsResponse = await fetch(
                        `${API_URL}/api/UserJobAuth/GetUserJobsByUserId/${selectedUser.userId}`, // FIXED: Changed selectedUser.id to selectedUser.userId
                        {
                            method: 'GET',
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );

                    if (!userJobsResponse.ok) {
                        console.warn(`Failed to fetch jobs for user ${selectedUser.userName}`);
                        continue;
                    }

                    const userJobsData = await userJobsResponse.json();
                    const userJobs = userJobsData.userJobs || [];

                    const jobPermission = userJobs.find(job => job.jobId == selectedJob);

                    if (jobPermission) {
                        deletionPromises.push(
                            fetch(`${API_URL}/api/UserJobAuth/DeleteUserJob/${jobPermission.id}`, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' }
                            }).then(response => {
                                if (!response.ok) {
                                    throw new Error(`Failed to delete permission for user ${selectedUser.userName}`);
                                }
                                return { user: selectedUser, success: true };
                            })
                        );
                    }
                } catch (error) {
                    console.error(`Error processing user ${selectedUser.userName}:`, error);
                }
            }

            if (deletionPromises.length > 0) {
                const results = await Promise.allSettled(deletionPromises);
                
                const successfulDeletions = results.filter(result => 
                    result.status === 'fulfilled' && result.value.success
                ).length;

                if (successfulDeletions > 0) {
                    toast.success(`Permissions denied for ${successfulDeletions} user(s)`);
                }
            } else {
                toast.info('None of the selected users had permissions for this job');
            }
            resetForm();
        } catch (error) {
            toast.error('Error denying job permissions');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedUsers([]);
        setSelectedProject('');
        setSelectedJob('');
        setSearchTerm('');
        setShowDropdown(false);
        setJobs([]);
    };

    const handleSelectUser = (user) => {
        if (!selectedUsers.some(selected => selected.userId === user.userId)) { // FIXED: Changed selected.id to selected.userId
            setSelectedUsers(prev => [...prev, user]);
        }
        setSearchTerm('');
        setShowDropdown(false);
    };

    const handleRemoveUser = (userId) => {
        setSelectedUsers(prev => prev.filter(user => user.userId !== userId)); // FIXED: Changed user.id to user.userId
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setShowDropdown(value.length > 0);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim() && searchResults.length > 0) {
            handleSelectUser(searchResults[0]);
        } else if (e.key === 'Backspace' && searchTerm === '' && selectedUsers.length > 0) {
            handleRemoveUser(selectedUsers[selectedUsers.length - 1].userId); // FIXED: Changed .id to .userId
        }
    };

    const handleProjectChange = (e) => {
        const projectId = e.target.value;
        setSelectedProject(projectId);
        setSelectedJob(''); // Reset job when project changes
    };

    // Safe job display name function
    const getJobDisplayName = (job) => {
        return job.name || job.text || job.jobName || `Job ${job.id}`;
    };

    // Safe job ID function
    const getJobId = (job) => {
        return job.id || job.jobId;
    };

    return (
        <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '400px' }}>
            <div className="settings-form" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* User Selection - Compact */}
                <div className="form-group" style={{ marginBottom: '0' }}>
                    <label style={{ fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Select Users:</label>
                    <div className="user-selection-container">
                        <div className="search-input-container" style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setShowDropdown(searchTerm.length > 0)}
                                style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    fontSize: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    height: '32px'
                                }}
                            />
                            
                            {showDropdown && searchResults.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    zIndex: 10,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    marginTop: '2px'
                                }}>
                                    {searchResults.map(user => (
                                        <div
                                            key={user.userId} // FIXED: Changed user.id to user.userId
                                            style={{
                                                padding: '6px 8px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f5f5f5',
                                                fontSize: '11px'
                                            }}
                                            onClick={() => handleSelectUser(user)}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '500' }}>{user.userName}</span>
                                                {user.email && (
                                                    <span style={{ fontSize: '10px', color: '#666' }}>{user.email}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px',
                            marginBottom: '4px',
                            minHeight: '28px',
                            maxHeight: '56px',
                            overflowY: 'auto',
                            padding: '2px'
                        }}>
                            {selectedUsers.map(user => (
                                <div key={user.userId} style={{ // FIXED: Changed user.id to user.userId
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#e3f2fd',
                                    border: '1px solid #bbdefb',
                                    borderRadius: '12px',
                                    padding: '2px 6px',
                                    fontSize: '11px'
                                }}>
                                    <span style={{ color: '#1976d2', marginRight: '4px' }}>
                                        {user.userName}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveUser(user.userId)} // FIXED: Changed user.id to user.userId
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#1976d2',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            padding: '0',
                                            width: '12px',
                                            height: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '50%'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ fontSize: '11px', color: '#666' }}>
                            {selectedUsers.length === 0 ? (
                                <span>No users selected</span>
                            ) : (
                                <span>
                                    {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Project Selection - Compact */}
                <div className="form-group" style={{ marginBottom: '0' }}>
                    <label style={{ fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Project:</label>
                    <select
                        value={selectedProject}
                        onChange={handleProjectChange}
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            height: '32px'
                        }}
                    >
                        <option value="">Select Project</option>
                        {projects.map(project => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                    </select>
                </div>

                {/* Job Selection - Compact */}
                <div className="form-group" style={{ marginBottom: '0' }}>
                    <label style={{ fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Job:</label>
                    <select
                        value={selectedJob}
                        onChange={(e) => setSelectedJob(e.target.value)}
                        disabled={!selectedProject || loadingJobs}
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            height: '32px'
                        }}
                    >
                        <option value="">Select Job</option>
                        {loadingJobs ? (
                            <option value="" disabled>Loading jobs...</option>
                        ) : (
                            jobs
                                .filter(job => job.status == 1 || job.status === undefined)
                                .map(job => (
                                    <option key={getJobId(job)} value={getJobId(job)}>
                                        {getJobDisplayName(job)}
                                    </option>
                                ))
                        )}
                    </select>
                    {loadingJobs && (
                        <div style={{ fontSize: '11px', marginTop: '2px' }}>Loading jobs...</div>
                    )}
                </div>
            </div>

            {/* Action Buttons - Compact */}
            <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #eee',
                flexShrink: 0,
                display: 'flex',
                gap: '8px'
            }}>
                <button
                    onClick={handleGrantPermission} 
                    disabled={selectedUsers.length === 0 || !selectedProject || !selectedJob || loading || loadingJobs}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: selectedUsers.length > 0 && selectedProject && selectedJob ? '#1976d2' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (selectedUsers.length > 0 && selectedProject && selectedJob && !loading) ? 'pointer' : 'not-allowed',
                        fontSize: '12px',
                        fontWeight: '500',
                        height: '32px',
                        margin: '12px'
                    }}
                >
                    {loading ? 'Granting...' : `Grant (${selectedUsers.length})`}
                </button>
                <button
                    onClick={handleDenyPermission} 
                    disabled={selectedUsers.length === 0 || !selectedProject || !selectedJob || loading || loadingJobs}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: selectedUsers.length > 0 && selectedProject && selectedJob ? '#dc3545' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (selectedUsers.length > 0 && selectedProject && selectedJob && !loading) ? 'pointer' : 'not-allowed',
                        fontSize: '12px',
                        fontWeight: '500',
                        height: '32px',
                         margin: '12px'
                    }}
                >
                    {loading ? 'Denying...' : `Deny (${selectedUsers.length})`}
                </button>
            </div>
        </div>
    );
};

export default GrantDenyJobs;

