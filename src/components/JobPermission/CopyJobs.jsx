import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';

const CopyJobs = ({ filteredUsers, loading, setLoading, defWorkId }) => {
    const [sourceUser, setSourceUser] = useState('');
    const [targetUsers, setTargetUsers] = useState([]);
    const [copySearchTerm, setCopySearchTerm] = useState('');
    const [showCopyDropdown, setShowCopyDropdown] = useState(false);
    const [sourceUserJobs, setSourceUserJobs] = useState([]);
    const [defaultWorkspaceJobs, setDefaultWorkspaceJobs] = useState([]);

    const user = JSON.parse(localStorage.getItem('user'));
    const API_URL = process.env.REACT_APP_API_BASE_URL;

    const copySearchResults = useMemo(() => {
        if (!copySearchTerm.trim()) return [];
        
        return filteredUsers.filter(user => 
            user.userName.toLowerCase().includes(copySearchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(copySearchTerm.toLowerCase())
        ).filter(user => !targetUsers.some(selected => selected.userId === user.userId) && user.userId !== parseInt(sourceUser));
    }, [copySearchTerm, filteredUsers, targetUsers, sourceUser]);

    // Fetch source user's jobs when source user changes
    useEffect(() => {
        if (sourceUser && defWorkId) {
            fetchSourceUserJobs();
        }
    }, [sourceUser, defWorkId]);

    // Function to fetch jobs for any user
    const fetchUserJobs = async (userId) => {
        try {
            const response = await fetch(
                `${API_URL}/api/SiteNote/SearchJobs?userId=${userId}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            if (!response.ok) {
                console.error(`Failed to fetch jobs for user ${userId}`);
                return [];
            }

            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error(`Error fetching jobs for user ${userId}:`, error);
            return [];
        }
    };

    const fetchSourceUserJobs = async () => {
        try {
            const allJobs = await fetchUserJobs(sourceUser);
            setSourceUserJobs(allJobs);

            // Filter jobs that belong to the default workspace
            const workspaceJobs = allJobs.filter(job => 
                job.workspaceId === defWorkId
            );
            
            setDefaultWorkspaceJobs(workspaceJobs);
            
            // Show info about the jobs found
            if (workspaceJobs.length === 0 && allJobs.length > 0) {
                toast.info(`Source user has ${allJobs.length} jobs but none in the default workspace (ID: ${defWorkId})`);
            }
            
        } catch (error) {
            console.error('Error fetching source user jobs:', error);
            setSourceUserJobs([]);
            setDefaultWorkspaceJobs([]);
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

        if (defaultWorkspaceJobs.length === 0) {
            toast.error('No jobs found in the default workspace to copy');
            return;
        }

        setLoading(true);
        try {
            const copyPromises = [];
            const successfulCopies = [];
            const alreadyHadJobs = [];
            const failedCopies = [];

            for (const targetUser of targetUsers) {
                try {
                    // Get target user's current jobs
                    const targetJobs = await fetchUserJobs(targetUser.userId);

                    // Filter out jobs that target user already has
                    const jobsToCopy = defaultWorkspaceJobs.filter(sourceJob => 
                        !targetJobs.some(targetJob => 
                            targetJob.jobId === sourceJob.jobId && 
                            targetJob.workspaceId === sourceJob.workspaceId
                        )
                    );

                    // Check if user already had any jobs
                    const existingJobs = defaultWorkspaceJobs.filter(sourceJob => 
                        targetJobs.some(targetJob => 
                            targetJob.jobId === sourceJob.jobId && 
                            targetJob.workspaceId === sourceJob.workspaceId
                        )
                    );

                    // Track jobs that were already assigned
                    if (existingJobs.length > 0) {
                        alreadyHadJobs.push({
                            userName: targetUser.userName,
                            count: existingJobs.length,
                            jobNames: existingJobs.map(job => job.jobName).join(', ')
                        });
                    }

                    // Skip if no new jobs to copy
                    if (jobsToCopy.length === 0) {
                        continue;
                    }

                    // Add new jobs using the UserJobAuth endpoint
                    for (const job of jobsToCopy) {
                        const copyPromise = fetch(`${API_URL}/api/UserJobAuth/AddUserJob`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: targetUser.userId,
                                jobId: job.jobId,
                                userIDScreen: user.id
                            })
                        });

                        copyPromises.push(copyPromise);
                    }

                    successfulCopies.push({
                        user: targetUser.userName,
                        jobsCount: jobsToCopy.length,
                        jobNames: jobsToCopy.map(job => job.jobName).join(', ')
                    });
                } catch (error) {
                    failedCopies.push(targetUser.userName);
                    console.error(`Error copying jobs to user ${targetUser.userName}:`, error);
                }
            }

            if (copyPromises.length > 0) {
                await Promise.allSettled(copyPromises);
            }

            // Show notifications only after processing is complete
            
            // Show success notifications for copied jobs
            successfulCopies.forEach(copy => {
                toast.success(`${copy.user}: Successfully copied ${copy.jobsCount} job(s) - ${copy.jobNames}`, {
                    duration: 5000
                });
            });

            // Show "already has this job" notifications
            alreadyHadJobs.forEach(info => {
                toast.error(`${info.userName}: Already has ${info.count} job(s) - ${info.jobNames}`, {
                    duration: 5000
                });
            });

            // Show failed copies
            if (failedCopies.length > 0) {
                toast.error(`Failed to copy jobs to: ${failedCopies.join(', ')}`);
            }

            // Show summary if no jobs were copied
            if (successfulCopies.length === 0 && alreadyHadJobs.length > 0) {
                toast.info('All target users already had these jobs. No new jobs were copied.');
            }

            resetCopyForm();
        } catch (error) {
            toast.error('Error copying jobs');
            console.error('Copy jobs error:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetCopyForm = () => {
        setSourceUser('');
        setTargetUsers([]);
        setCopySearchTerm('');
        setShowCopyDropdown(false);
        setSourceUserJobs([]);
        setDefaultWorkspaceJobs([]);
    };

    const handleSelectTargetUser = (selectedUser) => {
        if (!targetUsers.some(selected => selected.userId === selectedUser.userId)) {
            setTargetUsers(prev => [...prev, selectedUser]);
        }
        setCopySearchTerm('');
        setShowCopyDropdown(false);
    };

    const handleRemoveTargetUser = (userId) => {
        setTargetUsers(prev => prev.filter(user => user.userId !== userId));
    };

    const handleCopySearchChange = (e) => {
        const value = e.target.value;
        setCopySearchTerm(value);
        setShowCopyDropdown(value.length > 0);
    };

    const handleCopyKeyDown = (e) => {
        if (e.key === 'Enter' && copySearchTerm.trim() && copySearchResults.length > 0) {
            handleSelectTargetUser(copySearchResults[0]);
        } else if (e.key === 'Backspace' && copySearchTerm === '' && targetUsers.length > 0) {
            handleRemoveTargetUser(targetUsers[targetUsers.length - 1].userId);
        }
    };

    const handleSourceUserChange = (e) => {
        const userId = e.target.value;
        setSourceUser(userId);
        // Reset jobs when user changes
        setSourceUserJobs([]);
        setDefaultWorkspaceJobs([]);
    };

    return (
        <div className="tab-content">
            <div className="settings-form">
                <div className="form-group">
                    <label>Source User:</label>
                    <select
                        value={sourceUser}
                        onChange={handleSourceUserChange}
                    >
                        <option value="">Select Source User</option>
                        {filteredUsers.map(user => (
                            <option key={user.userId} value={user.userId}>{user.userName}</option>
                        ))}
                    </select>
                   
                    {sourceUser && (
                        <div className="jobs-info">
                            <small>
                                Found {defaultWorkspaceJobs.length} job(s) in default workspace 
                                {sourceUserJobs.length > 0 && 
                                    ` (out of ${sourceUserJobs.length} total jobs)`}
                            </small>
                            {defaultWorkspaceJobs.length > 0 && (
                                <div className="job-list">
                                    <small>Jobs available to copy: {defaultWorkspaceJobs.map(job => job.jobName).join(', ')}</small>
                                </div>
                            )}
                        </div>
                    )}
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
                                            key={user.userId}
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
                                <div key={user.userId} className="user-tag">
                                    <span className="user-tag-name">
                                        {user.userName}
                                    </span>
                                    <button
                                        type="button"
                                        className="remove-user-btn"
                                        onClick={() => handleRemoveTargetUser(user.userId)}
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
                    disabled={!sourceUser || targetUsers.length === 0 || defaultWorkspaceJobs.length === 0 || loading}
                >
                    {loading ? 'Copying...' : `Copy ${defaultWorkspaceJobs.length} Jobs to ${targetUsers.length} User${targetUsers.length !== 1 ? 's' : ''}`}
                </button>
            </div>
        </div>
    );
};

export default CopyJobs;