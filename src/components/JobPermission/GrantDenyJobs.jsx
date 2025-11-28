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
        ).filter(user => !selectedUsers.some(selected => selected.id === user.id));
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
                        `${API_URL}/api/UserJobAuth/GetUserJobsByUserId/${selectedUser.id}`,
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
                    } else {
                        console.log(`User ${selectedUser.userName} does not have permission for job ID: ${selectedJob}`);
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

                const failedDeletions = results.filter(result => 
                    result.status === 'rejected'
                ).length;

                if (successfulDeletions > 0) {
                    toast.success(`Permissions denied for ${successfulDeletions} user(s)`);
                }

                if (failedDeletions > 0) {
                    toast.error(`Failed to deny permissions for ${failedDeletions} user(s)`);
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
        if (!selectedUsers.some(selected => selected.id === user.id)) {
            setSelectedUsers(prev => [...prev, user]);
        }
        setSearchTerm('');
        setShowDropdown(false);
    };

    const handleRemoveUser = (userId) => {
        setSelectedUsers(prev => prev.filter(user => user.id !== userId));
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
            handleRemoveUser(selectedUsers[selectedUsers.length - 1].id);
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
        <div className="tab-content">
            <div className="settings-form">
                <div className="form-group">
                    <label>Select Users:</label>
                    <div className="user-selection-container">
                        <div className="search-input-container">
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setShowDropdown(searchTerm.length > 0)}
                                className="user-search-input"
                            />
                            
                            {showDropdown && searchResults.length > 0 && (
                                <div className="user-dropdown">
                                    {searchResults.map(user => (
                                        <div
                                            key={user.id}
                                            className="dropdown-item"
                                            onClick={() => handleSelectUser(user)}
                                        >
                                            <div className="user-info">
                                                <span className="user-name">{user.userName}</span>
                                                {user.email && (
                                                    <span className="user-email">{user.email}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="selected-users-container">
                            {selectedUsers.map(user => (
                                <div key={user.id} className="user-tag">
                                    <span className="user-tag-name">
                                        {user.userName}
                                    </span>
                                    <button
                                        type="button"
                                        className="remove-user-btn"
                                        onClick={() => handleRemoveUser(user.id)}
                                        title="Remove user"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="selection-info">
                            {selectedUsers.length === 0 ? (
                                <span className="info-text">No users selected</span>
                            ) : (
                                <span className="info-text">
                                    {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label>Project:</label>
                    <select
                        value={selectedProject}
                        onChange={handleProjectChange}
                    >
                        <option value="">Select Project</option>
                        {projects.map(project => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Job:</label>
                    <select
                        value={selectedJob}
                        onChange={(e) => setSelectedJob(e.target.value)}
                        disabled={!selectedProject || loadingJobs}
                    >
                        <option value="">Select Job</option>
                        {loadingJobs ? (
                            <option value="" disabled>Loading jobs...</option>
                        ) : (
                            jobs
                                .filter(job => job.status == 1 || job.status === undefined) // Only active jobs or jobs without status
                                .map(job => (
                                    <option key={getJobId(job)} value={getJobId(job)}>
                                        {getJobDisplayName(job)}
                                    </option>
                                ))
                        )}
                    </select>
                    {loadingJobs && (
                        <div className="loading-indicator">Loading jobs...</div>
                    )}
                    {!loadingJobs && selectedProject && jobs.length === 0 && (
                        <div className="no-jobs-message">No jobs available for this project</div>
                    )}
                </div>
            </div>

            <div className="settings-action-buttons">
                <button 
                    className="btn-primary" 
                    onClick={handleGrantPermission} 
                    disabled={selectedUsers.length === 0 || !selectedProject || !selectedJob || loading || loadingJobs}
                >
                    {loading ? 'Granting...' : `Grant to ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`}
                </button>
                <button 
                    className="btn-danger" 
                    onClick={handleDenyPermission} 
                    disabled={selectedUsers.length === 0 || !selectedProject || !selectedJob || loading || loadingJobs}
                >
                    {loading ? 'Denying...' : `Deny to ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`}
                </button>
            </div>
        </div>
    );
};

export default GrantDenyJobs;

