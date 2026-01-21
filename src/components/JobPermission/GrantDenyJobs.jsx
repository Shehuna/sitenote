import React, { useState, useMemo, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

// Move these helper functions outside the component
const getJobDisplayName = (job) => {
    return job.name || job.text || job.jobName || `Job ${job.id}`;
};

const getJobId = (job) => {
    return job.id || job.jobId;
};

const GrantDenyJobs = ({ filteredUsers, projects, loading, setLoading }) => {
    const [selectedUsers, setSelectedUsers] = useState([]); 
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedJob, setSelectedJob] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    
    // New states for searchable dropdowns
    const [projectSearch, setProjectSearch] = useState('');
    const [jobSearch, setJobSearch] = useState('');
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [showJobDropdown, setShowJobDropdown] = useState(false);
    
    // Refs for click outside detection
    const projectRef = useRef(null);
    const jobRef = useRef(null);
    const userSearchRef = useRef(null);

    const user = JSON.parse(localStorage.getItem('user'));
    const API_URL = process.env.REACT_APP_API_BASE_URL;

    // Fetch jobs when selectedProject changes
    useEffect(() => {
        const fetchJobs = async () => {
            if (!selectedProject) {
                setJobs([]);
                setSelectedJob('');
                setJobSearch('');
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

    // Filtered projects based on search
    const filteredProjects = useMemo(() => {
        if (!projectSearch.trim()) return projects;
        return projects.filter(project => 
            project.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
            (project.id && project.id.toString().toLowerCase().includes(projectSearch.toLowerCase()))
        );
    }, [projects, projectSearch]);

    // Filtered jobs based on search
    const filteredJobs = useMemo(() => {
        if (!jobSearch.trim()) return jobs.filter(job => job.status == 1 || job.status === undefined);
        return jobs.filter(job => {
            if (!(job.status == 1 || job.status === undefined)) return false;
            
            const jobName = getJobDisplayName(job).toLowerCase();
            const jobId = getJobId(job).toString().toLowerCase();
            const search = jobSearch.toLowerCase();
            
            return jobName.includes(search) || jobId.includes(search);
        });
    }, [jobs, jobSearch]);

    // Filter users for user search
    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        
        return filteredUsers.filter(user => 
            user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        ).filter(user => !selectedUsers.some(selected => selected.userId === user.userId));
    }, [searchTerm, filteredUsers, selectedUsers]);

    // Handle click outside for dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (projectRef.current && !projectRef.current.contains(event.target)) {
                setShowProjectDropdown(false);
            }
            if (jobRef.current && !jobRef.current.contains(event.target)) {
                setShowJobDropdown(false);
            }
            if (userSearchRef.current && !userSearchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
        setProjectSearch('');
        setJobSearch('');
        setShowProjectDropdown(false);
        setShowJobDropdown(false);
    };

    const handleSelectUser = (user) => {
        if (!selectedUsers.some(selected => selected.userId === user.userId)) {
            setSelectedUsers(prev => [...prev, user]);
        }
        setSearchTerm('');
        setShowDropdown(false);
    };

    const handleRemoveUser = (userId) => {
        setSelectedUsers(prev => prev.filter(user => user.userId !== userId));
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
            handleRemoveUser(selectedUsers[selectedUsers.length - 1].userId);
        }
    };

    const handleProjectSelect = (project) => {
        setSelectedProject(project.id);
        setSelectedJob('');
        setJobSearch('');
        setShowProjectDropdown(false);
        setProjectSearch(project.name);
    };

    const handleJobSelect = (job) => {
        setSelectedJob(getJobId(job));
        setShowJobDropdown(false);
        setJobSearch(getJobDisplayName(job));
    };

    const handleProjectSearchChange = (e) => {
        setProjectSearch(e.target.value);
        setShowProjectDropdown(true);
        if (!e.target.value) {
            setSelectedProject('');
            setSelectedJob('');
            setJobSearch('');
        }
    };

    const handleJobSearchChange = (e) => {
        setJobSearch(e.target.value);
        setShowJobDropdown(true);
        if (!e.target.value) {
            setSelectedJob('');
        }
    };

    const handleProjectFocus = () => {
        setShowProjectDropdown(true);
    };

    const handleJobFocus = () => {
        if (selectedProject) {
            setShowJobDropdown(true);
        }
    };

    // Get selected project name for display
    const getSelectedProjectName = () => {
        if (!selectedProject) return '';
        const project = projects.find(p => p.id === selectedProject);
        return project ? project.name : '';
    };

    // Get selected job name for display
    const getSelectedJobName = () => {
        if (!selectedJob) return '';
        const job = jobs.find(j => getJobId(j) == selectedJob);
        return job ? getJobDisplayName(job) : '';
    };

    return (
        <div className="tab-content" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            maxHeight: '400px',
            overflow: 'visible' // Changed from hidden
        }}>
            <div className="settings-form" style={{ 
                flex: 1, 
                overflow: 'visible', // Changed from hidden
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px',
                position: 'relative' // Added for dropdown positioning
            }}>
                {/* User Selection - Compact */}
                <div className="form-group" style={{ marginBottom: '0' }}>
                    <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Select Users:</label>
                    <div className="user-selection-container" ref={userSearchRef}>
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
                                    padding: '8px 10px',
                                    fontSize: '14px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    height: '36px'
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
                                    maxHeight: '150px',
                                    overflowY: 'auto',
                                    zIndex: 100, // Increased z-index
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    marginTop: '2px'
                                }}>
                                    {searchResults.map(user => (
                                        <div
                                            key={user.userId}
                                            style={{
                                                padding: '8px 10px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f5f5f5',
                                                fontSize: '13px',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onClick={() => handleSelectUser(user)}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '500' }}>{user.userName}</span>
                                                {user.email && (
                                                    <span style={{ fontSize: '12px', color: '#666' }}>{user.email}</span>
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
                            gap: '6px',
                            marginBottom: '6px',
                            minHeight: '32px',
                            maxHeight: '80px',
                            overflowY: 'auto',
                            padding: '4px',
                            marginTop: '6px'
                        }}>
                            {selectedUsers.map(user => (
                                <div key={user.userId} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#e3f2fd',
                                    border: '1px solid #bbdefb',
                                    borderRadius: '16px',
                                    padding: '4px 8px',
                                    fontSize: '13px'
                                }}>
                                    <span style={{ color: '#1976d2', marginRight: '6px' }}>
                                        {user.userName}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveUser(user.userId)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#1976d2',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            padding: '0',
                                            width: '14px',
                                            height: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '50%',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
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

                {/* Project Selection - Searchable Dropdown */}
                <div className="form-group" style={{ marginBottom: '0' }} ref={projectRef}>
                    <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Project:</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search and select project..."
                            value={projectSearch}
                            onChange={handleProjectSearchChange}
                            onFocus={handleProjectFocus}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                fontSize: '14px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                height: '36px',
                                cursor: 'pointer',
                                backgroundColor: 'white'
                            }}
                        />
                        
                        {showProjectDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: 'white',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 101, // Increased z-index
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                marginTop: '2px'
                            }}>
                                {filteredProjects.length > 0 ? (
                                    filteredProjects.map(project => (
                                        <div
                                            key={project.id}
                                            style={{
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f5f5f5',
                                                fontSize: '14px',
                                                transition: 'background-color 0.2s',
                                                backgroundColor: selectedProject === project.id ? '#e3f2fd' : 'white'
                                            }}
                                            onClick={() => handleProjectSelect(project)}
                                            onMouseEnter={(e) => {
                                                if (selectedProject !== project.id) {
                                                    e.currentTarget.style.backgroundColor = '#f0f7ff';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedProject !== project.id) {
                                                    e.currentTarget.style.backgroundColor = 'white';
                                                }
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '500' }}>{project.name}</span>
                                                
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{
                                        padding: '10px 12px',
                                        fontSize: '14px',
                                        color: '#666',
                                        textAlign: 'center'
                                    }}>
                                        No projects found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Job Selection - Searchable Dropdown */}
                <div className="form-group" style={{ marginBottom: '0' }} ref={jobRef}>
                    <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Job:</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder={selectedProject ? "Search and select job..." : "Select a project first"}
                            value={jobSearch}
                            onChange={handleJobSearchChange}
                            onFocus={handleJobFocus}
                            disabled={!selectedProject || loadingJobs}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                fontSize: '14px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                height: '36px',
                                cursor: selectedProject ? 'pointer' : 'not-allowed',
                                backgroundColor: selectedProject ? 'white' : '#f5f5f5',
                                color: selectedProject ? '#333' : '#999'
                            }}
                        />
                        
                        {showJobDropdown && selectedProject && !loadingJobs && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: 'white',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 101, // Increased z-index
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                marginTop: '2px'
                            }}>
                                {filteredJobs.length > 0 ? (
                                    filteredJobs.map(job => (
                                        <div
                                            key={getJobId(job)}
                                            style={{
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f5f5f5',
                                                fontSize: '14px',
                                                transition: 'background-color 0.2s',
                                                backgroundColor: selectedJob == getJobId(job) ? '#e3f2fd' : 'white'
                                            }}
                                            onClick={() => handleJobSelect(job)}
                                            onMouseEnter={(e) => {
                                                if (selectedJob != getJobId(job)) {
                                                    e.currentTarget.style.backgroundColor = '#f0f7ff';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedJob != getJobId(job)) {
                                                    e.currentTarget.style.backgroundColor = 'white';
                                                }
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '500' }}>{getJobDisplayName(job)}</span>
                                                
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{
                                        padding: '10px 12px',
                                        fontSize: '14px',
                                        color: '#666',
                                        textAlign: 'center'
                                    }}>
                                        {jobSearch ? 'No jobs found' : 'No jobs available'}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {loadingJobs && (
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                right: '10px',
                                transform: 'translateY(-50%)',
                                fontSize: '12px',
                                color: '#666'
                            }}>
                                Loading...
                            </div>
                        )}
                    </div>
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
                        padding: '10px 12px',
                        backgroundColor: selectedUsers.length > 0 && selectedProject && selectedJob ? '#1976d2' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (selectedUsers.length > 0 && selectedProject && selectedJob && !loading) ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: '500',
                        height: '40px',
                        margin: '12px',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (selectedUsers.length > 0 && selectedProject && selectedJob && !loading) {
                            e.currentTarget.style.backgroundColor = '#1565c0';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (selectedUsers.length > 0 && selectedProject && selectedJob && !loading) {
                            e.currentTarget.style.backgroundColor = '#1976d2';
                        }
                    }}
                >
                    {loading ? 'Granting...' : `Grant (${selectedUsers.length})`}
                </button>
                <button
                    onClick={handleDenyPermission} 
                    disabled={selectedUsers.length === 0 || !selectedProject || !selectedJob || loading || loadingJobs}
                    style={{
                        flex: 1,
                        padding: '10px 12px',
                        backgroundColor: selectedUsers.length > 0 && selectedProject && selectedJob ? '#dc3545' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (selectedUsers.length > 0 && selectedProject && selectedJob && !loading) ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: '500',
                        height: '40px',
                        margin: '12px',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (selectedUsers.length > 0 && selectedProject && selectedJob && !loading) {
                            e.currentTarget.style.backgroundColor = '#c82333';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (selectedUsers.length > 0 && selectedProject && selectedJob && !loading) {
                            e.currentTarget.style.backgroundColor = '#dc3545';
                        }
                    }}
                >
                    {loading ? 'Denying...' : `Deny (${selectedUsers.length})`}
                </button>
            </div>
        </div>
    );
};

export default GrantDenyJobs;