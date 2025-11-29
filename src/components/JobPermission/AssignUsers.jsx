import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const AssignUsers = ({ filteredUsers, projects, jobs, loading, setLoading, defId }) => {
    const [assignUser, setAssignUser] = useState('');
    const [assignedJobs, setAssignedJobs] = useState([]);
    const [userAssignedJobs, setUserAssignedJobs] = useState([]);
    const [loadingUserJobs, setLoadingUserJobs] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));
    const API_URL = process.env.REACT_APP_API_BASE_URL;

    // Filter jobs to only include those from the default workspace
    const defaultWorkspaceJobs = jobs.filter(job => job.workspaceId == defId);

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

    // Group jobs by project within the default workspace
    const getGroupedJobs = () => {
        const grouped = {};
        
        defaultWorkspaceJobs.forEach(job => {
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

    return (
        <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '400px' }}>
            <div className="settings-form" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* User Selection - Compact */}
                <div className="form-group" style={{ marginBottom: '0' }}>
                    <label style={{ fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Select User:</label>
                    <select
                        value={assignUser}
                        onChange={(e) => setAssignUser(e.target.value)}
                        disabled={loadingUserJobs}
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            height: '32px'
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
                        <div className="loading-indicator" style={{ fontSize: '11px', marginTop: '2px' }}>Loading user jobs...</div>
                    )}
                </div>

                {/* Jobs Selection - Very Compact */}
                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: '0' }}>
                    <label style={{ fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
                        Jobs to Assign:
                    </label>
                    <div 
                        className="jobs-selection-container"
                        style={{
                            flex: 1,
                            maxHeight: '200px',
                            overflowY: 'auto',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '8px',
                            backgroundColor: '#fff'
                        }}
                    >
                        {Object.keys(groupedJobs).length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                color: '#666', 
                                padding: '20px 12px',
                                fontSize: '12px'
                            }}>
                                <i className="fas fa-folder-open" style={{ fontSize: '20px', marginBottom: '6px', opacity: 0.5 }}></i>
                                <div>No jobs available</div>
                            </div>
                        ) : (
                            Object.entries(groupedJobs).map(([projectId, projectData]) => (
                                <div 
                                    key={projectId} 
                                    className="project-jobs-group"
                                    style={{ 
                                        marginBottom: '12px'
                                    }}
                                >
                                    <h4 
                                        className="project-name"
                                        style={{
                                            margin: '0 0 8px 0',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#495057',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            paddingBottom: '4px',
                                            borderBottom: '1px solid #dee2e6'
                                        }}
                                    >
                                        <i className="fas fa-folder" style={{ color: '#17a2b8', fontSize: '10px' }}></i>
                                        {projectData.projectName}
                                        <span 
                                            style={{
                                                fontSize: '10px',
                                                backgroundColor: '#e9ecef',
                                                color: '#6c757d',
                                                padding: '1px 4px',
                                                borderRadius: '8px',
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
                                            gap: '4px'
                                        }}
                                    >
                                        {projectData.jobs.map(job => {
                                            const isAlreadyAssigned = isJobAlreadyAssigned(job.jobId);
                                            const isChecked = assignedJobs.some(assigned => assigned.jobId === job.jobId);
                                            
                                            return (
                                                <label 
                                                    key={job.jobId} 
                                                    className={`job-checkbox ${isAlreadyAssigned ? 'disabled' : ''}`}
                                                    title={isAlreadyAssigned ? 'User already has this job' : job.fullPath}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center', 
                                                        gap: '6px',
                                                        padding: '6px 8px',
                                                        borderRadius: '3px',
                                                        transition: 'all 0.2s',
                                                        cursor: isAlreadyAssigned ? 'not-allowed' : 'pointer',
                                                        opacity: isAlreadyAssigned ? 0.6 : 1,
                                                        backgroundColor: isAlreadyAssigned ? '#f5f5f5' : '#fff',
                                                        border: '1px solid #e9ecef',
                                                        margin: '0',
                                                        fontSize: '11px',
                                                        minHeight: '32px'
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
                                                            width: '12px',
                                                            height: '12px',
                                                            flexShrink: 0 
                                                        }}
                                                    />
                                                    <div
                                                        style={{
                                                            flex: 1,
                                                            minWidth: 0,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '1px'
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
                                                                    fontSize: '11px',
                                                                    lineHeight: '1.2'
                                                                }}
                                                            >
                                                                {job.jobName}
                                                            </span>
                                                            {isAlreadyAssigned && (
                                                                <span 
                                                                    style={{
                                                                        fontSize: '8px',
                                                                        background: '#ffebee',
                                                                        color: '#c62828',
                                                                        padding: '1px 3px',
                                                                        borderRadius: '2px',
                                                                        marginLeft: '6px',
                                                                        flexShrink: 0,
                                                                        fontWeight: '600'
                                                                    }}
                                                                >
                                                                    Assigned
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div 
                                                            style={{
                                                                fontSize: '9px',
                                                                color: '#6c757d',
                                                                lineHeight: '1.1'
                                                            }}
                                                        >
                                                            ID: {job.jobId} • {job.projectName}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Selection Info - Compact */}
                <div className="selection-info" style={{ marginTop: '4px', fontSize: '11px' }}>
                    {assignedJobs.length === 0 ? (
                        <span style={{ color: '#666' }}>No jobs selected</span>
                    ) : (
                        <span style={{ color: '#28a745', fontWeight: '500' }}>
                            {assignedJobs.length} job{assignedJobs.length !== 1 ? 's' : ''} selected
                        </span>
                    )}
                    {userAssignedJobs.length > 0 && (
                        <div style={{ 
                            marginTop: '2px',
                            color: '#856404',
                            background: '#fff3cd',
                            padding: '3px 6px',
                            borderRadius: '3px',
                            border: '1px solid #ffeaa7',
                            fontSize: '10px'
                        }}>
                            User has {userAssignedJobs.length} existing job{userAssignedJobs.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Button - Compact */}
            <div className="settings-action-buttons" style={{ 
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #eee',
                flexShrink: 0
            }}>
                <button 
                    onClick={handleAssignUser} 
                    disabled={!assignUser || assignedJobs.length === 0 || loading}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: assignedJobs.length > 0 ? '#28a745' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: assignedJobs.length > 0 && !loading ? 'pointer' : 'not-allowed',
                        fontSize: '12px',
                        fontWeight: '500',
                        width: '100%',
                        height: '32px'
                    }}
                >
                    {loading ? (
                        <>
                            <i className="fas fa-spinner fa-spin" style={{ marginRight: '4px' }}></i>
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