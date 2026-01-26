import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';

const AssignUsers = ({ filteredUsers, projects, jobs, loading, setLoading, defId }) => {
    const [assignUser, setAssignUser] = useState('');
    const [assignedJobs, setAssignedJobs] = useState([]);
    const [userAssignedJobs, setUserAssignedJobs] = useState([]);
    const [loadingUserJobs, setLoadingUserJobs] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const user = JSON.parse(localStorage.getItem('user'));
    const API_URL = process.env.REACT_APP_API_BASE_URL;

    // Filter jobs to only include those from the default workspace
    const defaultWorkspaceJobs = useMemo(() => 
        jobs.filter(job => job.workspaceId == defId), 
        [jobs, defId]
    );

    // Filter jobs based on search term
    const filteredJobs = useMemo(() => {
        if (!searchTerm.trim()) return defaultWorkspaceJobs;
        
        const term = searchTerm.toLowerCase().trim();
        return defaultWorkspaceJobs.filter(job => 
            job.jobName.toLowerCase().includes(term) ||
            (job.projectName && job.projectName.toLowerCase().includes(term)) ||
            (job.jobId && job.jobId.toString().includes(term))
        );
    }, [defaultWorkspaceJobs, searchTerm]);

    // Fetch user's assigned jobs when user selection changes
    useEffect(() => {
        if (assignUser) {
            fetchUserAssignedJobs(assignUser);
        } else {
            setUserAssignedJobs([]);
        }
    }, [assignUser]);

    const fetchUserAssignedJobs = async (userId) => {
        setLoadingUserJobs(true);
        try {
            const response = await fetch(`${API_URL}/api/SiteNote/GetUniqueJobs?userId=${userId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch user jobs: ${response.status}`);
            }
            
            const data = await response.json();
            const userJobs = data.data || data.jobs || data || [];
            setUserAssignedJobs(userJobs);
            
        } catch (err) {
            console.error('Error fetching user assigned jobs:', err);
            toast.error('Error loading user job assignments');
            setUserAssignedJobs([]);
        } finally {
            setLoadingUserJobs(false);
        }
    };

    // Check if a job is already assigned to the user
    const isJobAlreadyAssigned = (jobId) => {
        return userAssignedJobs.some(assignedJob => 
            assignedJob.jobId === jobId || assignedJob.id === jobId
        );
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

            for (const job of assignedJobs) {
                if (isJobAlreadyAssigned(job.jobId)) {
                    jobsAlreadyAssigned.push(job.jobName);
                } else {
                    assignPromises.push(
                        fetch(`${API_URL}/api/UserJobAuth/AddUserJob`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: assignUser,
                                jobId: job.jobId,
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
                const successfulAssignments = results.filter(result => result.status === 'fulfilled' && result.value.ok).length;
                
                if (successfulAssignments > 0) {
                    toast.success(`Successfully assigned ${successfulAssignments} job(s) to user`);
                    fetchUserAssignedJobs(assignUser);
                    setAssignedJobs([]);
                } else {
                    toast.error('Failed to assign jobs. Please try again.');
                }
            }
        } catch (error) {
            toast.error('Error assigning jobs to user');
            console.error('Assign user error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Group filtered jobs by project
    const getGroupedJobs = () => {
        const grouped = {};
        
        filteredJobs.forEach(job => {
            const projectKey = job.projectId;
            
            if (!grouped[projectKey]) {
                grouped[projectKey] = {
                    projectName: job.projectName,
                    jobs: []
                };
            }
            
            grouped[projectKey].jobs.push(job);
        });
        
        return grouped;
    };

    const groupedJobs = getGroupedJobs();

    // Handle select/deselect all jobs in current filtered view
    const handleSelectAll = () => {
        const selectableJobs = filteredJobs.filter(job => !isJobAlreadyAssigned(job.jobId));
        
        if (selectableJobs.length === 0) {
            toast.error('No selectable jobs in current view');
            return;
        }

        // Get job IDs that are already in assignedJobs
        const currentAssignedIds = new Set(assignedJobs.map(job => job.jobId));
        
        // Add only jobs that aren't already selected
        const jobsToAdd = selectableJobs.filter(job => !currentAssignedIds.has(job.jobId));
        
        if (jobsToAdd.length > 0) {
            setAssignedJobs(prev => [...prev, ...jobsToAdd]);
            //toast.success(`Added ${jobsToAdd.length} job${jobsToAdd.length !== 1 ? 's' : ''} to selection`);
        }
    };

    // Handle deselect all jobs in current filtered view
    const handleDeselectAll = () => {
        if (assignedJobs.length === 0) {
            toast.error('No jobs selected');
            return;
        }

        // Remove only jobs that are in the current filtered view
        const filteredJobIds = new Set(filteredJobs.map(job => job.jobId));
        const jobsToRemove = assignedJobs.filter(job => filteredJobIds.has(job.jobId));
        
        if (jobsToRemove.length > 0) {
            setAssignedJobs(prev => prev.filter(job => !filteredJobIds.has(job.jobId)));
            //toast.success(`Removed ${jobsToRemove.length} job${jobsToRemove.length !== 1 ? 's' : ''} from selection`);
        }
    };

    // Clear search
    const handleClearSearch = () => {
        setSearchTerm('');
    };

    return (
        <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '650px' }}>
            <div className="settings-form" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* User Selection */}
                <div className="form-group" style={{ marginBottom: '0', flexShrink: 0 }}>
                    <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Select User:</label>
                    <select
                        value={assignUser}
                        onChange={(e) => setAssignUser(e.target.value)}
                        disabled={loadingUserJobs}
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '14px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            height: '40px'
                        }}
                    >
                        <option value="">Select User</option>
                        {filteredUsers.map(user => (
                            <option key={user.userId} value={user.userId}>
                                {user.userName} ({user.fname} {user.lname})
                            </option>
                        ))}
                    </select>
                    {loadingUserJobs && (
                        <div className="loading-indicator" style={{ fontSize: '12px', marginTop: '4px' }}>Loading user jobs...</div>
                    )}
                </div>

                {/* Jobs Selection with Search */}
                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500' }}>
                            Jobs to Assign:
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                                onClick={handleSelectAll}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    backgroundColor: '#e9ecef',
                                    border: '1px solid #ced4da',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    color: '#495057'
                                }}
                                title="Select all jobs in current view"
                            >
                                Select All
                            </button>
                            <button
                                onClick={handleDeselectAll}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    backgroundColor: '#e9ecef',
                                    border: '1px solid #ced4da',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    color: '#495057'
                                }}
                                title="Deselect all jobs in current view"
                            >
                                Deselect All
                            </button>
                        </div>
                    </div>
                    
                    {/* Search Box */}
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                        <input
                            type="text"
                            placeholder="Search jobs by name, project, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 35px 8px 12px',
                                fontSize: '13px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                height: '36px'
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={handleClearSearch}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#666',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    fontSize: '12px'
                                }}
                                title="Clear search"
                            >
                                ✕
                            </button>
                        )}
                        {!searchTerm && (
                            <div style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#999'
                            }}>
                                <i className="fas fa-search"></i>
                            </div>
                        )}
                    </div>

                    <div 
                        className="jobs-selection-container"
                        style={{
                            flex: 1,
                            maxHeight: '420px', // Increased height
                            overflowY: 'auto',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '10px',
                            backgroundColor: '#fff'
                        }}
                    >
                        {Object.keys(groupedJobs).length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                color: '#666', 
                                padding: '20px 12px',
                                fontSize: '14px'
                            }}>
                                <i className="fas fa-search" style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}></i>
                                <div>
                                    {searchTerm ? `No jobs found for "${searchTerm}"` : 'No jobs available'}
                                </div>
                                {searchTerm && (
                                    <button
                                        onClick={handleClearSearch}
                                        style={{
                                            marginTop: '10px',
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            backgroundColor: '#f8f9fa',
                                            border: '1px solid #dee2e6',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            color: '#495057'
                                        }}
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Search results count */}
                                {searchTerm && (
                                    <div style={{
                                        marginBottom: '12px',
                                        padding: '6px 10px',
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        color: '#495057'
                                    }}>
                                        <i className="fas fa-filter" style={{ marginRight: '6px' }}></i>
                                        Found {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} matching "{searchTerm}"
                                    </div>
                                )}
                                
                                {/* Jobs List */}
                                {Object.entries(groupedJobs).map(([projectId, projectData]) => (
                                    <div 
                                        key={projectId} 
                                        className="project-jobs-group"
                                        style={{ 
                                            marginBottom: '16px'
                                        }}
                                    >
                                        <h4 
                                            className="project-name"
                                            style={{
                                                margin: '0 0 10px 0',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: '#495057',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                paddingBottom: '6px',
                                                borderBottom: '1px solid #dee2e6'
                                            }}
                                        >
                                            <i className="fas fa-folder" style={{ color: '#17a2b8', fontSize: '12px' }}></i>
                                            {projectData.projectName}
                                            <span 
                                                style={{
                                                    fontSize: '11px',
                                                    backgroundColor: '#e9ecef',
                                                    color: '#6c757d',
                                                    padding: '2px 6px',
                                                    borderRadius: '10px',
                                                    marginLeft: 'auto'
                                                }}
                                            >
                                                {projectData.jobs.length}
                                            </span>
                                        </h4>
                                        <div 
                                            className="jobs-list"
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px'
                                            }}
                                        >
                                            {projectData.jobs.map(job => {
                                                const isAlreadyAssigned = isJobAlreadyAssigned(job.jobId);
                                                const isChecked = assignedJobs.some(assigned => assigned.jobId === job.jobId);
                                                
                                                return (
                                                    <label 
                                                        key={job.jobId} 
                                                        className={`job-checkbox ${isAlreadyAssigned ? 'disabled' : ''}`}
                                                        title={isAlreadyAssigned ? 'User already has this job' : job.jobName}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center', 
                                                            gap: '8px',
                                                            padding: '8px 10px',
                                                            borderRadius: '4px',
                                                            transition: 'all 0.2s',
                                                            cursor: isAlreadyAssigned ? 'not-allowed' : 'pointer',
                                                            opacity: isAlreadyAssigned ? 0.6 : 1,
                                                            backgroundColor: isAlreadyAssigned ? '#f5f5f5' : '#fff',
                                                            border: '1px solid #e9ecef',
                                                            margin: '0',
                                                            fontSize: '13px',
                                                            minHeight: '44px'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                if (isAlreadyAssigned) return;
                                                                
                                                                if (e.target.checked) {
                                                                    setAssignedJobs(prev => [...prev, job]);
                                                                } else {
                                                                    setAssignedJobs(prev => prev.filter(j => j.jobId !== job.jobId));
                                                                }
                                                            }}
                                                            disabled={isAlreadyAssigned}
                                                            style={{ 
                                                                width: '16px',
                                                                height: '16px',
                                                                flexShrink: 0 
                                                            }}
                                                        />
                                                        <div
                                                            style={{
                                                                flex: 1,
                                                                minWidth: 0,
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '2px'
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between'
                                                                }}
                                                            >
                                                                <span 
                                                                    style={{ 
                                                                        fontWeight: '500',
                                                                        color: '#212529',
                                                                        fontSize: '13px',
                                                                        lineHeight: '1.3'
                                                                    }}
                                                                >
                                                                    {job.jobName}
                                                                </span>
                                                                {isAlreadyAssigned && (
                                                                    <span 
                                                                        style={{
                                                                            fontSize: '10px',
                                                                            background: '#ffebee',
                                                                            color: '#c62828',
                                                                            padding: '2px 5px',
                                                                            borderRadius: '3px',
                                                                            marginLeft: '8px',
                                                                            flexShrink: 0,
                                                                            fontWeight: '600'
                                                                        }}
                                                                    >
                                                                        Assigned
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Selection Info */}
                <div className="selection-info" style={{ marginTop: '6px', fontSize: '13px', flexShrink: 0 }}>
                    {assignedJobs.length === 0 ? (
                        <span style={{ color: '#666' }}>No jobs selected</span>
                    ) : (
                        <span style={{ color: '#28a745', fontWeight: '500' }}>
                            {assignedJobs.length} job{assignedJobs.length !== 1 ? 's' : ''} selected
                        </span>
                    )}
                    {userAssignedJobs.length > 0 && (
                        <div style={{ 
                            marginTop: '6px',
                            color: '#856404',
                            background: '#fff3cd',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid #ffeaa7',
                            fontSize: '12px'
                        }}>
                            User has {userAssignedJobs.length} existing job{userAssignedJobs.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Button */}
            <div className="settings-action-buttons" style={{ 
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #eee',
                flexShrink: 0
            }}>
                <button 
                    onClick={handleAssignUser} 
                    disabled={!assignUser || assignedJobs.length === 0 || loading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: assignedJobs.length > 0 ? 'rgb(38, 82, 238)' : '#2660a3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: assignedJobs.length > 0 && !loading ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: '500',
                        minWidth: '180px',
                        margin: '10px'
                    }}
                >
                    {loading ? (
                        <>
                            <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                            Assigning...
                        </>
                    ) : (
                        `Assign ${assignedJobs.length} Job${assignedJobs.length !== 1 ? 's' : ''}`
                    )}
                </button>
            </div>
        </div>
    );
};

export default AssignUsers;