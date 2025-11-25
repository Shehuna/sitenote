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
                    ownerUserID: workspace.ownerUserID // Include ownerUserID
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
                    userID: requesterUserId, // Use requester's user ID
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
            const response = await fetch(`${API_URL}/api/Workspace/UpdateWorkspace/${workspaceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: workspaceId,
                    name: workspaceData.name,
                    ownerUserID: workspaceData.ownerUserID,
                    ownerType: workspaceData.ownerType,
                    ownerName: workspaceData.ownerName,
                    email: workspaceData.email,
                    phone: workspaceData.phone,
                    addressLine1: workspaceData.addressLine1,
                    city: workspaceData.city,
                    country: workspaceData.country,
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

            // Process each selected workspace for approval
            for (const workspaceId of selectedPendingWorkspaces) {
                try {
                    const workspaceData = workspaceDetails[workspaceId];
                    if (!workspaceData) {
                        failedWorkspaces.push({ id: workspaceId, reason: 'Workspace details not found' });
                        continue;
                    }

                    // Get the requester's user ID from workspace data
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

                    // Step 3: Get requester details and check default workspace
                    const requesterDetails = await getUserById(requesterUserId);
                    if (requesterDetails) {
                        // If requester's defaultWorkspaceId is null, set it to the approved workspace
                        if (requesterDetails.defaultWorkspaceId === null || requesterDetails.defaultWorkspaceId === undefined) {
                            const defaultUpdated = await updateUserDefaultWorkspace(requesterUserId, workspaceId);
                            if (!defaultUpdated) {
                                console.warn(`Failed to update default workspace for requester ${requesterUserId}`);
                            } else {
                                console.log(`Set default workspace for requester ${requesterUserId} to ${workspaceId}`);
                            }
                        } else {
                            console.log(`Requester ${requesterUserId} already has default workspace: ${requesterDetails.defaultWorkspaceId}`);
                        }
                    } else {
                        console.warn(`Could not fetch details for requester ${requesterUserId}`);
                    }

                    approvedWorkspaces.push(workspaceId);
                    
                } catch (err) {
                    console.error(`Error approving workspace ${workspaceId}:`, err);
                    failedWorkspaces.push({ id: workspaceId, reason: err.message });
                }
            }

            // Show results
            if (approvedWorkspaces.length > 0) {
                toast.success(`${approvedWorkspaces.length} workspace(s) approved successfully`);
            }
            
            if (failedWorkspaces.length > 0) {
                toast.error(`${failedWorkspaces.length} workspace(s) failed to approve`);
                console.error('Failed workspaces:', failedWorkspaces);
            }

            // Remove approved workspaces from the list
            if (approvedWorkspaces.length > 0) {
                setPendingWorkspaces(prev => prev.filter(w => !approvedWorkspaces.includes(w.id)));
                setSelectedPendingWorkspaces(prev => prev.filter(id => !approvedWorkspaces.includes(id)));
                
                // Remove from workspace details
                const updatedDetails = { ...workspaceDetails };
                approvedWorkspaces.forEach(id => delete updatedDetails[id]);
                setWorkspaceDetails(updatedDetails);
            }

            // If all selected were processed, close the modal
            if (failedWorkspaces.length === 0 && approvedWorkspaces.length > 0) {
                onClose();
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

            // Process each selected workspace for rejection
            for (const workspaceId of selectedPendingWorkspaces) {
                try {
                    const workspaceData = workspaceDetails[workspaceId];
                    if (!workspaceData) {
                        failedWorkspaces.push({ id: workspaceId, reason: 'Workspace details not found' });
                        continue;
                    }

                    // Update workspace status to 2 (Rejected)
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

            // Show results
            if (rejectedWorkspaces.length > 0) {
                toast.success(`${rejectedWorkspaces.length} workspace(s) rejected successfully`);
            }
            
            if (failedWorkspaces.length > 0) {
                toast.error(`${failedWorkspaces.length} workspace(s) failed to reject`);
                console.error('Failed workspaces:', failedWorkspaces);
            }

            // Remove rejected workspaces from the list
            if (rejectedWorkspaces.length > 0) {
                setPendingWorkspaces(prev => prev.filter(w => !rejectedWorkspaces.includes(w.id)));
                setSelectedPendingWorkspaces(prev => prev.filter(id => !rejectedWorkspaces.includes(id)));
                
                // Remove from workspace details
                const updatedDetails = { ...workspaceDetails };
                rejectedWorkspaces.forEach(id => delete updatedDetails[id]);
                setWorkspaceDetails(updatedDetails);
            }

            // If all selected were processed, close the modal
            if (failedWorkspaces.length === 0 && rejectedWorkspaces.length > 0) {
                onClose();
            }

        } catch (err) {
            console.error('Error in reject workflow:', err);
            toast.error('Failed to reject workspaces');
        } finally {
            setRejectingWorkspace(false);
        }
    };

    return (
        <div className="settings-form">
            <div className="pending-workspaces-header">
                <div className="select-all-section">
                    <label className="select-all-checkbox">
                        <input
                            type="checkbox"
                            checked={selectedPendingWorkspaces.length === pendingWorkspaces.length && pendingWorkspaces.length > 0}
                            onChange={handleSelectAll}
                            disabled={pendingWorkspaces.length === 0}
                        />
                        Select All
                    </label>
                    <span className="selected-count">
                        {selectedPendingWorkspaces.length} of {pendingWorkspaces.length} selected
                    </span>
                </div>
            </div>

            {loadingPendingWorkspaces ? (
                <div className="loading-message">Loading pending workspaces...</div>
            ) : pendingWorkspaces.length === 0 ? (
                <div className="no-data-message">No pending workspace requests</div>
            ) : (
                <div className="pending-workspaces-list">
                    <table className="workspaces-table">
                        <thead>
                            <tr>
                                <th width="50px"></th>
                                <th>Workspace Name</th>
                                <th>Requester Name</th>
                                <th>Requester ID</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingWorkspaces.map((workspace) => (
                                <tr key={workspace.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedPendingWorkspaces.includes(workspace.id)}
                                            onChange={() => handleCheckboxChange(workspace.id)}
                                        />
                                    </td>
                                    <td>{workspace.name}</td>
                                    <td>{workspace.ownerName}</td>
                                    <td>{workspace.ownerUserID}</td>
                                    <td>
                                        <span className="status-badge status-pending">
                                            Pending
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <div className="action-buttons">
                    <button 
                        className="btn-approve" 
                        onClick={handleApproveWorkspaces}
                        disabled={selectedPendingWorkspaces.length === 0 || approvingWorkspace || rejectingWorkspace}
                    >
                        {approvingWorkspace ? 'Approving...' : `Approve (${selectedPendingWorkspaces.length})`}
                    </button>
                    <button 
                        className="btn-reject" 
                        onClick={handleRejectWorkspaces}
                        disabled={selectedPendingWorkspaces.length === 0 || approvingWorkspace || rejectingWorkspace}
                    >
                        {rejectingWorkspace ? 'Rejecting...' : `Reject (${selectedPendingWorkspaces.length})`}
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
                    min-width: 120px;
                }

                .btn-approve:hover:not(:disabled) {
                    background: #2563eb;
                    border-color: #2563eb;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
                }

                .btn-approve:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
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
                    min-width: 120px;
                }

                .btn-reject:hover:not(:disabled) {
                    background: #b91c1c;
                    border-color: #b91c1c;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
                }

                .btn-reject:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .action-buttons {
                    display: flex;
                    gap: 1rem;
                }

                .pending-workspaces-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding: 1rem;
                    background: #f8fafc;
                    border-radius: 0.5rem;
                    border: 1px solid #e2e8f0;
                }

                .select-all-section {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .select-all-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    color: #374151;
                    cursor: pointer;
                }

                .select-all-checkbox input {
                    width: 16px;
                    height: 16px;
                }

                .selected-count {
                    font-size: 0.875rem;
                    color: #6b7280;
                    font-weight: 500;
                }

                .pending-workspaces-list {
                    max-height: 400px;
                    overflow-y: auto;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                }

                .workspaces-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                }

                .workspaces-table th {
                    background: #f8fafc;
                    padding: 0.75rem;
                    text-align: left;
                    font-weight: 600;
                    color: #374151;
                    border-bottom: 1px solid #e2e8f0;
                }

                .workspaces-table td {
                    padding: 0.75rem;
                    border-bottom: 1px solid #e2e8f0;
                }

                .workspaces-table tr:last-child td {
                    border-bottom: none;
                }

                .workspaces-table tr:hover {
                    background: #f8fafc;
                }

                .status-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .status-pending {
                    background: #fef3c7;
                    color: #d97706;
                }

                .loading-message {
                    text-align: center;
                    padding: 2rem;
                    color: #6b7280;
                    font-style: italic;
                }

                .no-data-message {
                    text-align: center;
                    padding: 2rem;
                    color: #9ca3af;
                    font-style: italic;
                }
            `}</style>
        </div>
    );
};

export default ApproveRejectWorkspace;