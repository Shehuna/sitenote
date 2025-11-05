import React, { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast';
import './JobPermissionManagement.css'; 
const JobPermissionManagement = ({defId, users}) => {
    const [selectedUsers, setSelectedUsers] = useState([]); 
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedJob, setSelectedJob] = useState('');
    const [databases, setDatabases] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState(1);
    const [projects, setProjects] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));
    const API_URL = process.env.REACT_APP_API_BASE_URL;

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        
        return filteredUsers.filter(user => 
            user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        ).filter(user => !selectedUsers.some(selected => selected.id === user.id));
    }, [searchTerm, filteredUsers, selectedUsers]);

    useEffect(() => {
        fetchInitialData();
    }, [defId]);

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
                                userId: selectedUser.id,
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
            if (usersAlreadyHavePermission.length > 0) {
                console.log('Users who already had permission:', 
                    usersAlreadyHavePermission.map(u => ({ userName: u.userName, userId: u.id }))
                );
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
        setError(error.message);
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
        setError(error.message);
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

    useEffect(() => {
        const handleClickOutside = () => {
            setShowDropdown(false);
        };

        if (showDropdown) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showDropdown]);

    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);

        try {
            const projectsUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Project/GetProjects`;
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

    return (
        <div className="settings-content">
            <div className="settings-form">
                {/* User Selection - Replaced select with searchable input */}
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
                            
                            {/* Dropdown Results */}
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

                        {/* Selected Users Tags */}
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
                        onChange={(e) => setSelectedProject(e.target.value)}
                    >
                        <option value="">Select Project</option>
                        {projects.filter(project => (project.status === 1 && project.workspaceId == defId))
                            .map(project => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Job:</label>
                    <select
                        value={selectedJob}
                        onChange={(e) => setSelectedJob(e.target.value)}
                        disabled={!selectedProject}
                    >
                        <option value="">Select Job</option>
                        {jobs.filter(job => (job.status == 1 && job.projectId === parseInt(selectedProject))).map(job => (
                            <option key={job.id} value={job.id}>{job.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="settings-action-buttons">
                <button 
                    className="btn-primary" 
                    onClick={handleGrantPermission} 
                    disabled={selectedUsers.length === 0 || !selectedProject || !selectedJob || loading}
                >
                    {loading ? 'Granting...' : `Grant to ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`}
                </button>
                <button 
                    className="btn-danger" 
                    onClick={handleDenyPermission} 
                    disabled={selectedUsers.length === 0 || !selectedProject || !selectedJob}
                >
                    Deny to {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''}
                </button>
            </div>
        </div>
    );
};

export default JobPermissionManagement;