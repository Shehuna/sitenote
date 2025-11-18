import React, { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast';
import './JobPermissionManagement.css'; 
import UserJobManagement from './UserJobManagement'; // Import the UserJobManagement component

const JobPermissionManagement = ({defId, users, userId}) => {
    const [activeTab, setActiveTab] = useState('grant'); // 'grant', 'userJobs', 'copy', 'assign'
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

    // Copy Jobs specific states
    const [sourceUser, setSourceUser] = useState('');
    const [targetUsers, setTargetUsers] = useState([]);
    const [copySearchTerm, setCopySearchTerm] = useState('');
    const [showCopyDropdown, setShowCopyDropdown] = useState(false);

    // Assign User specific states
    const [assignUser, setAssignUser] = useState('');
    const [assignedJobs, setAssignedJobs] = useState([]);

    const user = JSON.parse(localStorage.getItem('user'));
    const API_URL = process.env.REACT_APP_API_BASE_URL;

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        
        return filteredUsers.filter(user => 
            user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        ).filter(user => !selectedUsers.some(selected => selected.id === user.id));
    }, [searchTerm, filteredUsers, selectedUsers]);

    const copySearchResults = useMemo(() => {
        if (!copySearchTerm.trim()) return [];
        
        return filteredUsers.filter(user => 
            user.userName.toLowerCase().includes(copySearchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(copySearchTerm.toLowerCase())
        ).filter(user => !targetUsers.some(selected => selected.id === user.id) && user.id !== sourceUser);
    }, [copySearchTerm, filteredUsers, targetUsers, sourceUser]);

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

    const handleCopyJobs = async () => {
        if (!sourceUser) {
            toast.error('Please select a source user');
            return;
        }

        if (targetUsers.length === 0) {
            toast.error('Please select at least one target user');
            return;
        }

        setLoading(true);
        try {
            // Get source user's jobs
            const sourceJobsResponse = await fetch(
                `${API_URL}/api/UserJobAuth/GetUserJobsByUserId/${sourceUser}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            if (!sourceJobsResponse.ok) {
                throw new Error('Failed to fetch source user jobs');
            }

            const sourceJobsData = await sourceJobsResponse.json();
            const sourceJobs = sourceJobsData.userJobs || [];

            if (sourceJobs.length === 0) {
                toast.info('Source user has no jobs to copy');
                return;
            }

            // Copy jobs to target users
            const copyPromises = [];
            const successfulCopies = [];
            const failedCopies = [];

            for (const targetUser of targetUsers) {
                try {
                    // Get target user's current jobs to avoid duplicates
                    const targetJobsResponse = await fetch(
                        `${API_URL}/api/UserJobAuth/GetUserJobsByUserId/${targetUser.id}`,
                        {
                            method: 'GET',
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );

                    if (!targetJobsResponse.ok) {
                        failedCopies.push(targetUser.userName);
                        continue;
                    }

                    const targetJobsData = await targetJobsResponse.json();
                    const targetJobs = targetJobsData.userJobs || [];

                    // Filter out jobs that target user already has
                    const jobsToCopy = sourceJobs.filter(sourceJob => 
                        !targetJobs.some(targetJob => targetJob.jobId === sourceJob.jobId)
                    );

                    // Add new jobs
                    for (const job of jobsToCopy) {
                        const copyPromise = fetch(`${API_URL}/api/UserJobAuth/AddUserJob`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: targetUser.id,
                                jobId: job.jobId,
                                userIDScreen: user.id
                            })
                        });

                        copyPromises.push(copyPromise);
                    }

                    successfulCopies.push({
                        user: targetUser.userName,
                        jobsCount: jobsToCopy.length
                    });
                } catch (error) {
                    failedCopies.push(targetUser.userName);
                    console.error(`Error copying jobs to user ${targetUser.userName}:`, error);
                }
            }

            if (copyPromises.length > 0) {
                await Promise.allSettled(copyPromises);
            }

            if (successfulCopies.length > 0) {
                const successMessage = successfulCopies.map(s => 
                    `${s.user} (${s.jobsCount} jobs)`
                ).join(', ');
                toast.success(`Jobs copied successfully to: ${successMessage}`);
            }

            if (failedCopies.length > 0) {
                toast.error(`Failed to copy jobs to: ${failedCopies.join(', ')}`);
            }

            resetCopyForm();
        } catch (error) {
            setError(error.message);
            toast.error('Error copying jobs');
            console.error('Copy jobs error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignUser = async () => {
        if (!assignUser) {
            toast.error('Please select a user');
            return;
        }

        if (assignedJobs.length === 0) {
            toast.error('Please select at least one job');
            return;
        }

        setLoading(true);
        try {
            const assignPromises = [];
            const jobsAlreadyAssigned = [];
            const jobsToAssign = [];

            // Check which jobs are already assigned
            const userJobsResponse = await fetch(
                `${API_URL}/api/UserJobAuth/GetUserJobsByUserId/${assignUser}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            if (!userJobsResponse.ok) {
                throw new Error('Failed to fetch user jobs');
            }

            const userJobsData = await userJobsResponse.json();
            const userJobs = userJobsData.userJobs || [];

            for (const job of assignedJobs) {
                const existingPermission = userJobs.find(userJob => userJob.jobId == job.id);

                if (existingPermission) {
                    jobsAlreadyAssigned.push(job.name);
                } else {
                    jobsToAssign.push(job);
                    assignPromises.push(
                        fetch(`${API_URL}/api/UserJobAuth/AddUserJob`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: assignUser,
                                jobId: job.id,
                                userIDScreen: user.id
                            })
                        })
                    );
                }
            }

            if (jobsAlreadyAssigned.length > 0) {
                toast.error(`User already has these jobs: ${jobsAlreadyAssigned.join(', ')}`);
            }

            if (assignPromises.length > 0) {
                const results = await Promise.allSettled(assignPromises);
                const successfulAssignments = results.filter(result => result.status === 'fulfilled').length;
                
                if (successfulAssignments > 0) {
                    toast.success(`Successfully assigned ${successfulAssignments} job(s) to user`);
                }
            }

            resetAssignForm();
        } catch (error) {
            setError(error.message);
            toast.error('Error assigning jobs to user');
            console.error('Assign user error:', error);
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

    const resetCopyForm = () => {
        setSourceUser('');
        setTargetUsers([]);
        setCopySearchTerm('');
        setShowCopyDropdown(false);
    };

    const resetAssignForm = () => {
        setAssignUser('');
        setAssignedJobs([]);
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

    const handleSelectTargetUser = (user) => {
        if (!targetUsers.some(selected => selected.id === user.id)) {
            setTargetUsers(prev => [...prev, user]);
        }
        setCopySearchTerm('');
        setShowCopyDropdown(false);
    };

    const handleRemoveTargetUser = (userId) => {
        setTargetUsers(prev => prev.filter(user => user.id !== userId));
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setShowDropdown(value.length > 0);
    };

    const handleCopySearchChange = (e) => {
        const value = e.target.value;
        setCopySearchTerm(value);
        setShowCopyDropdown(value.length > 0);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim() && searchResults.length > 0) {
            handleSelectUser(searchResults[0]);
        } else if (e.key === 'Backspace' && searchTerm === '' && selectedUsers.length > 0) {
            handleRemoveUser(selectedUsers[selectedUsers.length - 1].id);
        }
    };

    const handleCopyKeyDown = (e) => {
        if (e.key === 'Enter' && copySearchTerm.trim() && copySearchResults.length > 0) {
            handleSelectTargetUser(copySearchResults[0]);
        } else if (e.key === 'Backspace' && copySearchTerm === '' && targetUsers.length > 0) {
            handleRemoveTargetUser(targetUsers[targetUsers.length - 1].id);
        }
    };

    useEffect(() => {
        const handleClickOutside = () => {
            setShowDropdown(false);
            setShowCopyDropdown(false);
        };

        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

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

    const renderGrantTab = () => (
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
                        onChange={(e) => setSelectedProject(e.target.value)}
                    >
                        <option value="">Select Project</option>
                        {projects.map(project => (
                            <option key={project.id} value={project.id}>{project.text}</option>
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
                    disabled={selectedUsers.length === 0 || !selectedProject || !selectedJob || loading}
                >
                    {loading ? 'Denying...' : `Deny to ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`}
                </button>
            </div>
        </div>
    );

    const renderUserJobsTab = () => (
        <div className="tab-content">
            <UserJobManagement defId={defId} users={users} />
        </div>
    );

    const renderCopyTab = () => (
        <div className="tab-content">
            <div className="settings-form">
                <div className="form-group">
                    <label>Source User:</label>
                    <select
                        value={sourceUser}
                        onChange={(e) => setSourceUser(e.target.value)}
                    >
                        <option value="">Select Source User</option>
                        {filteredUsers.map(user => (
                            <option key={user.id} value={user.id}>{user.userName}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Target Users:</label>
                    <div className="user-selection-container">
                        <div className="search-input-container">
                            <input
                                type="text"
                                placeholder="Search target users by name or email..."
                                value={copySearchTerm}
                                onChange={handleCopySearchChange}
                                onKeyDown={handleCopyKeyDown}
                                onFocus={() => setShowCopyDropdown(copySearchTerm.length > 0)}
                                className="user-search-input"
                            />
                            
                            {showCopyDropdown && copySearchResults.length > 0 && (
                                <div className="user-dropdown">
                                    {copySearchResults.map(user => (
                                        <div
                                            key={user.id}
                                            className="dropdown-item"
                                            onClick={() => handleSelectTargetUser(user)}
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
                            {targetUsers.map(user => (
                                <div key={user.id} className="user-tag">
                                    <span className="user-tag-name">
                                        {user.userName}
                                    </span>
                                    <button
                                        type="button"
                                        className="remove-user-btn"
                                        onClick={() => handleRemoveTargetUser(user.id)}
                                        title="Remove user"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="selection-info">
                            {targetUsers.length === 0 ? (
                                <span className="info-text">No target users selected</span>
                            ) : (
                                <span className="info-text">
                                    {targetUsers.length} target user{targetUsers.length !== 1 ? 's' : ''} selected
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-action-buttons">
                <button 
                    className="btn-primary" 
                    onClick={handleCopyJobs} 
                    disabled={!sourceUser || targetUsers.length === 0 || loading}
                >
                    {loading ? 'Copying...' : `Copy Jobs to ${targetUsers.length} User${targetUsers.length !== 1 ? 's' : ''}`}
                </button>
            </div>
        </div>
    );

    const renderAssignTab = () => (
        <div className="tab-content">
            <div className="settings-form">
                <div className="form-group">
                    <label>Select User:</label>
                    <select
                        value={assignUser}
                        onChange={(e) => setAssignUser(e.target.value)}
                    >
                        <option value="">Select User</option>
                        {filteredUsers.map(user => (
                            <option key={user.id} value={user.id}>{user.userName}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Select Jobs to Assign:</label>
                    <div className="jobs-selection-container">
                        {projects.map(project => (
                            <div key={project.id} className="project-jobs-group">
                                <h4 className="project-name">{project.name}</h4>
                                <div className="jobs-list">
                                    {jobs
                                        .filter(job => job.projectId === project.id && job.status === 1)
                                        .map(job => (
                                            <label key={job.id} className="job-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={assignedJobs.some(assigned => assigned.id === job.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setAssignedJobs(prev => [...prev, job]);
                                                        } else {
                                                            setAssignedJobs(prev => prev.filter(j => j.id !== job.id));
                                                        }
                                                    }}
                                                />
                                                <span className="job-name">{job.name}</span>
                                            </label>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="selection-info">
                    {assignedJobs.length === 0 ? (
                        <span className="info-text">No jobs selected</span>
                    ) : (
                        <span className="info-text">
                            {assignedJobs.length} job{assignedJobs.length !== 1 ? 's' : ''} selected
                        </span>
                    )}
                </div>
            </div>

            <div className="settings-action-buttons">
                <button 
                    className="btn-primary" 
                    onClick={handleAssignUser} 
                    disabled={!assignUser || assignedJobs.length === 0 || loading}
                >
                    {loading ? 'Assigning...' : `Assign ${assignedJobs.length} Job${assignedJobs.length !== 1 ? 's' : ''} to User`}
                </button>
            </div>
        </div>
    );

    return (
        <div className="settings-content">
            <div className="tabs-container">
                <div className="tabs-header">
                    <button 
                        className={`tab-button ${activeTab === 'grant' ? 'active' : ''}`}
                        onClick={() => setActiveTab('grant')}
                    >
                        Grant/Deny Jobs
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'userJobs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('userJobs')}
                    >
                        User Job Management
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
                        Assign User
                    </button>
                </div>

                <div className="tabs-content">
                    {activeTab === 'grant' && renderGrantTab()}
                    {activeTab === 'userJobs' && renderUserJobsTab()}
                    {activeTab === 'copy' && renderCopyTab()}
                    {activeTab === 'assign' && renderAssignTab()}
                </div>
            </div>
        </div>
    );
};

export default JobPermissionManagement;