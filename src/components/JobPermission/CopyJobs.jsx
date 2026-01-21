import React, { useState, useMemo, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const CopyJobs = ({ filteredUsers, loading, setLoading, defWorkId }) => {
    const [sourceUser, setSourceUser] = useState('');
    const [targetUsers, setTargetUsers] = useState([]);
    const [copySearchTerm, setCopySearchTerm] = useState('');
    const [showCopyDropdown, setShowCopyDropdown] = useState(false);
    const [sourceUserJobs, setSourceUserJobs] = useState([]);
    const [defaultWorkspaceJobs, setDefaultWorkspaceJobs] = useState([]);
    const searchInputRef = useRef(null);

    const user = JSON.parse(localStorage.getItem('user'));
    const API_URL = process.env.REACT_APP_API_BASE_URL;

    const copySearchResults = useMemo(() => {
        if (!copySearchTerm.trim()) return [];
        
        return filteredUsers.filter(user => 
            user.userName.toLowerCase().includes(copySearchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(copySearchTerm.toLowerCase())
        ).filter(user => !targetUsers.some(selected => selected.userId === user.userId) && user.userId !== parseInt(sourceUser));
    }, [copySearchTerm, filteredUsers, targetUsers, sourceUser]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
                setShowCopyDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
            e.preventDefault();
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
        <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '400px' }}>
            <div className="settings-form" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px' }}>
                {/* Source User Selection */}
                <div className="form-group" style={{ marginBottom: '0', marginLeft: '12px', marginRight: '12px'}}>
                    <label style={{ fontSize: '13px', marginBottom: '6px', fontWeight: '600', color: '#333' }}>Source User:</label>
                    <select
                        value={sourceUser}
                        onChange={handleSourceUserChange}
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '13px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            height: '36px',
                            backgroundColor: 'white'
                        }}
                    >
                        <option value="">Select Source User</option>
                        {filteredUsers.map(user => (
                            <option key={user.userId} value={user.userId}>{user.userName}</option>
                        ))}
                    </select>
                   
                    {sourceUser && (
                        <div style={{ 
                            marginTop: '6px', 
                            padding: '6px 8px', 
                            fontSize: '12px', 
                            color: '#555',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            borderLeft: '3px solid #1976d2'
                        }}>
                            <div style={{ fontWeight: '500' }}>
                                Found {defaultWorkspaceJobs.length} job(s) in default workspace 
                                {sourceUserJobs.length > 0 && 
                                    ` (out of ${sourceUserJobs.length} total jobs)`}
                            </div>
                            {defaultWorkspaceJobs.length > 0 && (
                                <div style={{ 
                                    marginTop: '4px', 
                                    fontSize: '11px', 
                                    color: '#666',
                                    paddingTop: '4px',
                                    borderTop: '1px solid #eee'
                                }}>
                                    <span style={{ fontWeight: '500' }}>Jobs available to copy:</span> {defaultWorkspaceJobs.map(job => job.jobName).join(', ')}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Target Users Selection */}
                <div className="form-group" style={{ marginBottom: '0', marginLeft: '12px', marginRight: '12px' }}>
                    <label style={{ fontSize: '13px', marginBottom: '6px', fontWeight: '600', color: '#333' }}>Target Users:</label>
                    <div className="user-selection-container">
                        <div className="search-input-container" style={{ position: 'relative' }} ref={searchInputRef}>
                            <input
                                type="text"
                                placeholder="Search target users by name or email..."
                                value={copySearchTerm}
                                onChange={handleCopySearchChange}
                                onKeyDown={handleCopyKeyDown}
                                onFocus={() => setShowCopyDropdown(true)}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    fontSize: '13px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    height: '36px'
                                }}
                            />
                            
                            {showCopyDropdown && copySearchResults.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    maxHeight: '140px',
                                    overflowY: 'auto',
                                    zIndex: 10,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    marginTop: '2px'
                                }}>
                                    {copySearchResults.map(user => (
                                        <div
                                            key={user.userId}
                                            style={{
                                                padding: '8px 10px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f5f5f5',
                                                fontSize: '12px',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onClick={() => handleSelectTargetUser(user)}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '500', fontSize: '12px' }}>{user.userName}</span>
                                                {user.email && (
                                                    <span style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{user.email}</span>
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
                            margin: '8px 0',
                            minHeight: '32px',
                            maxHeight: '64px',
                            overflowY: 'auto',
                            padding: '6px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            border: '1px solid #e9ecef'
                        }}>
                            {targetUsers.map(user => (
                                <div key={user.userId} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#e3f2fd',
                                    border: '1px solid #bbdefb',
                                    borderRadius: '14px',
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    <span style={{ 
                                        color: '#1976d2', 
                                        marginRight: '6px',
                                        fontWeight: '500',
                                        fontSize: '12px'
                                    }}>
                                        {user.userName}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTargetUser(user.userId)}
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
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1976d2'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', padding: '4px' }}>
                            {targetUsers.length === 0 ? (
                                <span style={{ fontStyle: 'italic' }}>No target users selected</span>
                            ) : (
                                <span style={{ fontWeight: '500' }}>
                                    {targetUsers.length} target user{targetUsers.length !== 1 ? 's' : ''} selected
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Button - Aligned left with margins */}
            <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #eee',
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'flex-start',
                paddingLeft: '8px',
                marginBottom: '8px'
            }}>
                <button
                    className="btn-primary" 
                    onClick={handleCopyJobs} 
                    disabled={!sourceUser || targetUsers.length === 0 || defaultWorkspaceJobs.length === 0 || loading}
                    style={{
                        padding: '10px 24px',
                        backgroundColor: (!sourceUser || targetUsers.length === 0 || defaultWorkspaceJobs.length === 0 || loading) ? '#adb5bd' : '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (!sourceUser || targetUsers.length === 0 || defaultWorkspaceJobs.length === 0 || loading) ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        height: '38px',
                        minWidth: '180px',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = '#1565c0';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(25, 118, 210, 0.2)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = '#1976d2';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        }
                    }}
                >
                    {loading ? (
                        <span>Copying...</span>
                    ) : (
                        <span>
                            Copy {defaultWorkspaceJobs.length} Job{defaultWorkspaceJobs.length !== 1 ? 's' : ''} to {targetUsers.length} User{targetUsers.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default CopyJobs;