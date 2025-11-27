import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const ApproveRejectWorkspace = ({ onClose }) => {
    const [pendingWorkspaces, setPendingWorkspaces] = useState([]);
    const [selectedPendingWorkspaces, setSelectedPendingWorkspaces] = useState([]);
    const [loadingPendingWorkspaces, setLoadingPendingWorkspaces] = useState(false);
    const [approvingWorkspace, setApprovingWorkspace] = useState(false);
    const [rejectingWorkspace, setRejectingWorkspace] = useState(false);
    const [workspaceDetails, setWorkspaceDetails] = useState({});

    const API_URL = process.env.REACT_APP_API_BASE_URL;

    useEffect(() => {
        fetchPendingWorkspaces();
    }, []);

    // Fetch workspace details for each pending workspace
    const fetchWorkspaceDetails = async (workspaceId) => {
        try {
            const response = await fetch(`${API_URL}/api/Workspace/GetWorkspaceById/${workspaceId}`);
            if (!response.ok) throw new Error('Failed to fetch workspace details');
            const data = await response.json();
            return data.workspace || data;
        } catch (err) {
            console.error('Error fetching workspace details:', err);
            return null;
        }
    };

    const fetchPendingWorkspaces = async () => {
        setLoadingPendingWorkspaces(true);
        try {
            const response = await fetch(`${API_URL}/api/Workspace/GetWorkspace`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Error fetching workspaces!');
            }
            
            const data = await response.json();
            const pending = (data.workspaces || [])
                .filter(workspace => workspace.status === 0)
                .map(workspace => ({
                    id: workspace.id,
                    name: workspace.name,
                    ownerName: workspace.ownerName,
                    status: workspace.status,
                    ownerUserID: workspace.ownerUserID
                }));

            setPendingWorkspaces(pending);

            // Fetch detailed information for each pending workspace
            const details = {};
            for (const workspace of pending) {
                const detail = await fetchWorkspaceDetails(workspace.id);
                if (detail) {
                    details[workspace.id] = detail;
                }
            }
            setWorkspaceDetails(details);
        } catch (err) {
            console.error('Error fetching pending workspaces:', err);
            toast.error('Failed to load pending workspaces');
        } finally {
            setLoadingPendingWorkspaces(false);
        }
    };

    const handleCheckboxChange = (workspaceId) => {
        setSelectedPendingWorkspaces(prev => {
            if (prev.includes(workspaceId)) {
                return prev.filter(id => id !== workspaceId);
            } else {
                return [...prev, workspaceId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedPendingWorkspaces.length === pendingWorkspaces.length) {
            setSelectedPendingWorkspaces([]);
        } else {
            setSelectedPendingWorkspaces(pendingWorkspaces.map(w => w.id));
        }
    };

    // Get user details by ID
    const getUserById = async (userId) => {
        try {
            const response = await fetch(`${API_URL}/api/UserManagement/GetUserById/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch user details');
            const data = await response.json();
            return data.user || data;
        } catch (err) {
            console.error('Error fetching user details:', err);
            return null;
        }
    };

    // Update user's default workspace
    const updateUserDefaultWorkspace = async (userId, workspaceId) => {
        try {
            const response = await fetch(`${API_URL}/api/UserManagement/UpdateDefaultWorkspaceByUserId/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    defaultWorkspaceId: workspaceId
                }),
            });

            if (!response.ok) throw new Error('Failed to update default workspace');
            return true;
        } catch (err) {
            console.error('Error updating default workspace:', err);
            return false;
        }
    };

    // Add user to workspace - using requester's user ID
    const addUserToWorkspace = async (requesterUserId, workspaceId) => {
        try {
            const response = await fetch(`${API_URL}/api/UserWorkspace/AddUserWorkspace`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userID: requesterUserId,
                    workspaceID: workspaceId,
                    role: 1,
                    status: 1
                }),
            });

            if (!response.ok) throw new Error('Failed to add user to workspace');
            return true;
        } catch (err) {
            console.error('Error adding user to workspace:', err);
            return false;
        }
    };

    // Update workspace status
    const updateWorkspaceStatus = async (workspaceId, status, workspaceData) => {
        try {
            const response = await fetch(`${API_URL}/api/Workspace/UpdateStatus/${workspaceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: status
                }),
            });

            if (!response.ok) throw new Error(`Failed to update workspace status to ${status}`);
            return true;
        } catch (err) {
            console.error('Error updating workspace status:', err);
            return false;
        }
    };

    const handleApproveWorkspaces = async () => {
        if (selectedPendingWorkspaces.length === 0) {
            toast.error('Please select at least one workspace to approve');
            return;
        }

        try {
            setApprovingWorkspace(true);

            const approvedWorkspaces = [];
            const failedWorkspaces = [];

            for (const workspaceId of selectedPendingWorkspaces) {
                try {
                    const workspaceData = workspaceDetails[workspaceId];
                    if (!workspaceData) {
                        failedWorkspaces.push({ id: workspaceId, reason: 'Workspace details not found' });
                        continue;
                    }

                    const requesterUserId = workspaceData.ownerUserID;
                    if (!requesterUserId) {
                        failedWorkspaces.push({ id: workspaceId, reason: 'Requester user ID not found' });
                        continue;
                    }

                    // Step 1: Update workspace status to 1 (Approved)
                    const statusUpdated = await updateWorkspaceStatus(workspaceId, 1, workspaceData);
                    if (!statusUpdated) {
                        failedWorkspaces.push({ id: workspaceId, reason: 'Failed to update workspace status' });
                        continue;
                    }

                    // Step 2: Add requester user to UserWorkspace table
                    const userAdded = await addUserToWorkspace(requesterUserId, workspaceId);
                    if (!userAdded) {
                        failedWorkspaces.push({ id: workspaceId, reason: 'Failed to add requester to workspace' });
                        continue;
                    }

                    // Step 3: Check and update default workspace if needed
                    const requesterDetails = await getUserById(requesterUserId);
                    if (requesterDetails) {
                        if (requesterDetails.defaultWorkspaceId === null || requesterDetails.defaultWorkspaceId === undefined) {
                            await updateUserDefaultWorkspace(requesterUserId, workspaceId);
                        }
                    }

                    approvedWorkspaces.push(workspaceId);
                    
                } catch (err) {
                    console.error(`Error approving workspace ${workspaceId}:`, err);
                    failedWorkspaces.push({ id: workspaceId, reason: err.message });
                }
            }

            if (approvedWorkspaces.length > 0) {
                toast.success(`${approvedWorkspaces.length} workspace(s) approved successfully`);
                setPendingWorkspaces(prev => prev.filter(w => !approvedWorkspaces.includes(w.id)));
                setSelectedPendingWorkspaces(prev => prev.filter(id => !approvedWorkspaces.includes(id)));
                const updatedDetails = { ...workspaceDetails };
                approvedWorkspaces.forEach(id => delete updatedDetails[id]);
                setWorkspaceDetails(updatedDetails);
            }
            
            if (failedWorkspaces.length > 0) {
                toast.error(`${failedWorkspaces.length} workspace(s) failed to approve`);
            }

        } catch (err) {
            console.error('Error in approve workflow:', err);
            toast.error('Failed to approve workspaces');
        } finally {
            setApprovingWorkspace(false);
        }
    };

    const handleRejectWorkspaces = async () => {
        if (selectedPendingWorkspaces.length === 0) {
            toast.error('Please select at least one workspace to reject');
            return;
        }

        try {
            setRejectingWorkspace(true);

            const rejectedWorkspaces = [];
            const failedWorkspaces = [];

            for (const workspaceId of selectedPendingWorkspaces) {
                try {
                    const workspaceData = workspaceDetails[workspaceId];
                    if (!workspaceData) {
                        failedWorkspaces.push({ id: workspaceId, reason: 'Workspace details not found' });
                        continue;
                    }

                    const statusUpdated = await updateWorkspaceStatus(workspaceId, 2, workspaceData);
                    if (statusUpdated) {
                        rejectedWorkspaces.push(workspaceId);
                    } else {
                        failedWorkspaces.push({ id: workspaceId, reason: 'Failed to update workspace status' });
                    }
                    
                } catch (err) {
                    console.error(`Error rejecting workspace ${workspaceId}:`, err);
                    failedWorkspaces.push({ id: workspaceId, reason: err.message });
                }
            }

            if (rejectedWorkspaces.length > 0) {
                toast.success(`${rejectedWorkspaces.length} workspace(s) rejected successfully`);
                setPendingWorkspaces(prev => prev.filter(w => !rejectedWorkspaces.includes(w.id)));
                setSelectedPendingWorkspaces(prev => prev.filter(id => !rejectedWorkspaces.includes(id)));
                const updatedDetails = { ...workspaceDetails };
                rejectedWorkspaces.forEach(id => delete updatedDetails[id]);
                setWorkspaceDetails(updatedDetails);
            }
            
            if (failedWorkspaces.length > 0) {
                toast.error(`${failedWorkspaces.length} workspace(s) failed to reject`);
            }

        } catch (err) {
            console.error('Error in reject workflow:', err);
            toast.error('Failed to reject workspaces');
        } finally {
            setRejectingWorkspace(false);
        }
    };

    return (
        <div className="approve-reject-container">
             <div className="selection-controls">
                <div className="select-all-group">
                    <label className="checkbox-container">
                        <input
                            type="checkbox"
                            checked={selectedPendingWorkspaces.length === pendingWorkspaces.length && pendingWorkspaces.length > 0}
                            onChange={handleSelectAll}
                            disabled={pendingWorkspaces.length === 0}
                        />
                        <span className="checkmark"></span>
                        Select All
                    </label>
                    <span className="selection-count">
                        {selectedPendingWorkspaces.length} of {pendingWorkspaces.length} selected
                    </span>
                </div>
                
                {selectedPendingWorkspaces.length > 0 && (
                    <div className="selection-actions">
                        <span className="selection-badge">
                            {selectedPendingWorkspaces.length} selected
                        </span>
                    </div>
                )}
            </div>

            {/* Table Section */}
            <div className="table-section">
                {loadingPendingWorkspaces ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <div className="loading-text">Loading workspace requests...</div>
                    </div>
                ) : pendingWorkspaces.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>No Pending Requests</h3>
                        <p>All workspace requests have been processed.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="enhanced-table">
                            <thead>
                                <tr>
                                    <th className="checkbox-column">
                                        <span>Select</span>
                                    </th>
                                    <th className="name-column">
                                        <span>Workspace Name</span>
                                    </th>
                                    <th className="requester-column">
                                        <span>Requested By</span>
                                    </th>
                                    <th className="status-column">
                                        <span>Status</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingWorkspaces.map((workspace, index) => (
                                    <tr 
                                        key={workspace.id} 
                                        className={`table-row ${selectedPendingWorkspaces.includes(workspace.id) ? 'selected' : ''} ${index % 2 === 0 ? 'even' : 'odd'}`}
                                    >
                                        <td className="checkbox-column">
                                            <label className="checkbox-container small">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPendingWorkspaces.includes(workspace.id)}
                                                    onChange={() => handleCheckboxChange(workspace.id)}
                                                />
                                                <span className="checkmark small"></span>
                                            </label>
                                        </td>
                                        <td className="name-column">
                                            <div className="workspace-name">
                                                <span className="name-text">{workspace.name}</span>
                                            </div>
                                        </td>
                                        <td className="requester-column">
                                            <div className="requester-info">
                                                <span className="requester-name">{workspace.ownerName}</span>
                                            </div>
                                        </td>
                                        
                                        <td className="status-column">
                                            <span className="status-badge pending">
                                                <span className="status-dot"></span>
                                                Pending 
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="action-section">
                <div className="action-buttons">
                    <button 
                        className="btn-approve" 
                        onClick={handleApproveWorkspaces}
                        disabled={selectedPendingWorkspaces.length === 0 || approvingWorkspace || rejectingWorkspace}
                    >
                        {approvingWorkspace ? (
                            <>
                                <div className="button-spinner"></div>
                                Approving...
                            </>
                        ) : (
                            <>
                                <span className="btn-icon">✓</span>
                                Approve ({selectedPendingWorkspaces.length})
                            </>
                        )}
                    </button>
                    <button 
                        className="btn-reject" 
                        onClick={handleRejectWorkspaces}
                        disabled={selectedPendingWorkspaces.length === 0 || approvingWorkspace || rejectingWorkspace}
                    >
                        {rejectingWorkspace ? (
                            <>
                                <div className="button-spinner"></div>
                                Rejecting...
                            </>
                        ) : (
                            <>
                                <span className="btn-icon">✕</span>
                                Reject ({selectedPendingWorkspaces.length})
                            </>
                        )}
                    </button>
                </div>
                <button
                    className="btn-close"
                    onClick={onClose}
                    disabled={approvingWorkspace || rejectingWorkspace}
                >
                    Close
                </button>
            </div>

            <style jsx>{`
                .approve-reject-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    gap: 1.5rem;
                }

                /* Header Section */
                .header-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid #e2e8f0;
                }

                .title-section .modal-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0 0 0.25rem 0;
                }

                .title-section .modal-subtitle {
                    font-size: 0.875rem;
                    color: #6b7280;
                    margin: 0;
                }

                .stats-section {
                    display: flex;
                    gap: 1rem;
                }

                .stat-card {
                    text-align: center;
                    padding: 0.75rem 1rem;
                    background: #f8fafc;
                    border-radius: 0.5rem;
                    border: 1px solid #e2e8f0;
                    min-width: 80px;
                }

                .stat-number {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #3b82f6;
                }

                .stat-label {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-top: 0.25rem;
                }

                /* Selection Controls */
                .selection-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: #f8fafc;
                    border-radius: 0.5rem;
                    border: 1px solid #e2e8f0;
                }

                .select-all-group {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .checkbox-container {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    color: #374151;
                    cursor: pointer;
                    position: relative;
                }

                .checkbox-container input {
                    position: absolute;
                    opacity: 0;
                    cursor: pointer;
                }

                .checkmark {
                    width: 18px;
                    height: 18px;
                    border: 2px solid #d1d5db;
                    border-radius: 4px;
                    background: white;
                    transition: all 0.2s ease;
                }

                .checkmark.small {
                    width: 16px;
                    height: 16px;
                }

                .checkbox-container input:checked + .checkmark {
                    background: #3b82f6;
                    border-color: #3b82f6;
                }

                .checkbox-container input:checked + .checkmark:after {
                    content: "✓";
                    color: white;
                    font-size: 12px;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }

                .selection-count {
                    font-size: 0.875rem;
                    color: #6b7280;
                    font-weight: 500;
                }

                .selection-badge {
                    background: #3b82f6;
                    color: white;
                    padding: 0.25rem 0.75rem;
                    border-radius: 1rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                /* Table Section */
                .table-section {
                    flex: 1;
                    overflow: hidden;
                }

                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem;
                    color: #6b7280;
                }

                .spinner {
                    width: 2rem;
                    height: 2rem;
                    border: 2px solid #e5e7eb;
                    border-top: 2px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .empty-state {
                    text-align: center;
                    padding: 3rem;
                    color: #9ca3af;
                }

                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }

                .empty-state h3 {
                    font-size: 1.25rem;
                    margin: 0 0 0.5rem 0;
                    color: #6b7280;
                }

                .table-container {
                    height: 100%;
                    overflow: auto;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    background: white;
                }

                .enhanced-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .enhanced-table th {
                    background: #f8fafc;
                    padding: 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: #374151;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .enhanced-table td {
                    padding: 1rem;
                    border-bottom: 1px solid #f1f5f9;
                }

                .enhanced-table tr:last-child td {
                    border-bottom: none;
                }

                .enhanced-table tr:hover {
                    background: #f8fafc;
                }

                .enhanced-table tr.selected {
                    background: #eff6ff;
                }

                .table-row.even {
                    background: #fafafa;
                }

                /* Column Styles */
                .checkbox-column {
                    width: 60px;
                    text-align: center;
                }

                .name-column {
                    width: 30%;
                }

                .requester-column {
                    width: 25%;
                }

                .userid-column {
                    width: 15%;
                }

                .status-column {
                    width: 20%;
                }

                .workspace-name .name-text {
                    font-weight: 600;
                    color: #1f2937;
                }

                .requester-info .requester-name {
                    color: #374151;
                }

                .user-id {
                    color: #6b7280;
                    font-family: 'Courier New', monospace;
                    font-size: 0.875rem;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.375rem 0.75rem;
                    border-radius: 1rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .status-badge.pending {
                    background: #fef3c7;
                    color: #d97706;
                }

                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: currentColor;
                }

                /* Action Section */
                .action-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 1.5rem;
                    border-top: 1px solid #e2e8f0;
                }

                .action-buttons {
                    display: flex;
                    gap: 1rem;
                }

                .btn-approve {
                    background: #3b82f6;
                    border: 1px solid #3b82f6;
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all 0.2s ease;
                    min-width: 140px;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    justify-content: center;
                }

                .btn-approve:hover:not(:disabled) {
                    background: #2563eb;
                    border-color: #2563eb;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }

                .btn-reject {
                    background: #dc2626;
                    border: 1px solid #dc2626;
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all 0.2s ease;
                    min-width: 140px;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    justify-content: center;
                }

                .btn-reject:hover:not(:disabled) {
                    background: #b91c1c;
                    border-color: #b91c1c;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
                }

                .btn-approve:disabled,
                .btn-reject:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .btn-icon {
                    font-weight: bold;
                }

                .button-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .btn-close {
                    background: white;
                    border: 1px solid #d1d5db;
                    color: #374151;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-close:hover:not(:disabled) {
                    background: #f9fafb;
                    border-color: #9ca3af;
                }

                .btn-close:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
};

export default ApproveRejectWorkspace;