import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const AssignUsers = ({ filteredUsers, projects, jobs, loading, setLoading }) => {
    const [assignUser, setAssignUser] = useState('');
    const [assignedJobs, setAssignedJobs] = useState([]);
    const [userAssignedJobs, setUserAssignedJobs] = useState([]);
    const [loadingUserJobs, setLoadingUserJobs] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));
    const API_URL = process.env.REACT_APP_API_BASE_URL;

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
            console.log('User assigned jobs:', data);
            
            // Handle different response structures
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
            const jobsToAssign = [];

            for (const job of assignedJobs) {
                if (isJobAlreadyAssigned(job.id)) {
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
                    // Refresh user assigned jobs to update the disabled state
                    fetchUserAssignedJobs(assignUser);
                }
            }

            resetAssignForm();
        } catch (error) {
            toast.error('Error assigning jobs to user');
            console.error('Assign user error:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetAssignForm = () => {
        setAssignedJobs([]);
        // Don't reset assignUser so we keep the user selection for better UX
    };

    return (
        <div className="tab-content">
            <div className="settings-form">
                <div className="form-group">
                    <label>Select User:</label>
                    <select
                        value={assignUser}
                        onChange={(e) => setAssignUser(e.target.value)}
                        disabled={loadingUserJobs}
                    >
                        <option value="">Select User</option>
                        {filteredUsers.map(user => (
                            <option key={user.id} value={user.id}>{user.userName}</option>
                        ))}
                    </select>
                    {loadingUserJobs && (
                        <div className="loading-indicator">Loading user jobs...</div>
                    )}
                </div>

                <div className="form-group">
                <label>Select Jobs to Assign:</label>
                <div 
                    className="jobs-selection-container"
                    style={{
                        maxHeight: '400px',
                        overflowY: 'auto',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '16px',
                        backgroundColor: '#fff'
                    }}
                >
                    {projects.map(project => {
                        const projectJobs = jobs.filter(job => job.projectId === project.id && job.status === 1);
                        
                        if (projectJobs.length === 0) return null;

                        return (
                            <div 
                                key={project.id} 
                                className="project-jobs-group"
                                style={{ marginBottom: '20px' }}
                            >
                                <h4 
                                    className="project-name"
                                    style={{
                                        margin: '0 0 12px 0',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: '#2c3e50',
                                        borderBottom: '1px solid #eee',
                                        paddingBottom: '8px'
                                    }}
                                >
                                    {project.text || project.name}
                                </h4>
                                <div 
                                    className="jobs-list"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}
                                >
                                    {projectJobs.map(job => {
                                        const isAlreadyAssigned = isJobAlreadyAssigned(job.id);
                                        const isChecked = assignedJobs.some(assigned => assigned.id === job.id);
                                        
                                        return (
                                            <label 
                                                key={job.id} 
                                                className={`job-checkbox ${isAlreadyAssigned ? 'disabled' : ''}`}
                                                title={isAlreadyAssigned ? 'User already has this job' : ''}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start', 
                                                    gap: '12px',
                                                    padding: '8px 12px',
                                                    borderRadius: '4px',
                                                    transition: 'background-color 0.2s',
                                                    cursor: isAlreadyAssigned ? 'not-allowed' : 'pointer',
                                                    opacity: isAlreadyAssigned ? 0.6 : 1,
                                                    backgroundColor: isAlreadyAssigned ? '#f5f5f5' : 'transparent'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isAlreadyAssigned) {
                                                        e.target.style.backgroundColor = '#f8f9fa';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isAlreadyAssigned) {
                                                        e.target.style.backgroundColor = 'transparent';
                                                    }
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
                                                            setAssignedJobs(prev => prev.filter(j => j.id !== job.id));
                                                        }
                                                    }}
                                                    disabled={isAlreadyAssigned}
                                                    style={{ 
                                                        margin: '2px 0 0 0', 
                                                        width: '16px',
                                                        height: '16px',
                                                        flexShrink: 0 
                                                    }}
                                                />
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        width: '100%',
                                                        minHeight: '20px'
                                                    }}
                                                >
                                                    <span style={{ lineHeight: '1.4' }}>
                                                        {job.name}
                                                    </span>
                                                    {isAlreadyAssigned && (
                                                        <span 
                                                            className="already-assigned-badge"
                                                            style={{
                                                                fontSize: '11px',
                                                                background: '#ffebee',
                                                                color: '#c62828',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                marginLeft: '12px',
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            Already Assigned
                                                        </span>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
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
                    {userAssignedJobs.length > 0 && (
                        <span className="info-text warning">
                            User already has {userAssignedJobs.length} job{userAssignedJobs.length !== 1 ? 's' : ''} assigned
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
};

export default AssignUsers;