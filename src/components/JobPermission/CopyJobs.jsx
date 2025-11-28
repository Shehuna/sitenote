import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';

const CopyJobs = ({ filteredUsers, loading, setLoading }) => {
    const [sourceUser, setSourceUser] = useState('');
    const [targetUsers, setTargetUsers] = useState([]);
    const [copySearchTerm, setCopySearchTerm] = useState('');
    const [showCopyDropdown, setShowCopyDropdown] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));
    const API_URL = process.env.REACT_APP_API_BASE_URL;

    const copySearchResults = useMemo(() => {
        if (!copySearchTerm.trim()) return [];
        
        return filteredUsers.filter(user => 
            user.userName.toLowerCase().includes(copySearchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(copySearchTerm.toLowerCase())
        ).filter(user => !targetUsers.some(selected => selected.id === user.id) && user.id !== sourceUser);
    }, [copySearchTerm, filteredUsers, targetUsers, sourceUser]);

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

    const handleCopySearchChange = (e) => {
        const value = e.target.value;
        setCopySearchTerm(value);
        setShowCopyDropdown(value.length > 0);
    };

    const handleCopyKeyDown = (e) => {
        if (e.key === 'Enter' && copySearchTerm.trim() && copySearchResults.length > 0) {
            handleSelectTargetUser(copySearchResults[0]);
        } else if (e.key === 'Backspace' && copySearchTerm === '' && targetUsers.length > 0) {
            handleRemoveTargetUser(targetUsers[targetUsers.length - 1].id);
        }
    };

    return (
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
};

export default CopyJobs;

