import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const AssignUsers = ({ filteredUsers, workspaces, loading, setLoading, defId }) => {
    const [assignUser, setAssignUser] = useState('');
    const [assignedWorkspaces, setAssignedWorkspaces] = useState([]);
    const [userAssignedWorkspaces, setUserAssignedWorkspaces] = useState([]);
    const [loadingUserWorkspaces, setLoadingUserWorkspaces] = useState(false);

    const API_URL = process.env.REACT_APP_API_BASE_URL;

    useEffect(() => {
        if (assignUser) {
            fetchUserAssignedWorkspaces(assignUser);
        } else {
            setUserAssignedWorkspaces([]);
        }
    }, [assignUser]);

    const fetchUserAssignedWorkspaces = async (userId) => {
        setLoadingUserWorkspaces(true);
        try {
            const response = await fetch(`${API_URL}/api/UserWorkspacePermission/GetWorkspacesByUser/${userId}`);
            if (!response.ok) { throw new Error(`Failed to fetch user workspaces: ${response.status}`); }
            const data = await response.json();
            const userWorkspaces = data.userWorkspaces || data || [];
            setUserAssignedWorkspaces(userWorkspaces);
        } catch (err) {
            console.error('Error fetching user assigned workspaces:', err);
            toast.error('Error loading user workspace assignments');
            setUserAssignedWorkspaces([]);
        } finally { setLoadingUserWorkspaces(false); }
    };

    const isWorkspaceAlreadyAssigned = (workspaceId) => {
        return userAssignedWorkspaces.some(ap => (ap.workspaceID === workspaceId) || (ap.workspaceId === workspaceId) || (ap.id === workspaceId));
    };

    const handleAssignUser = async () => {
        if (!assignUser) { toast.error('Please select a user'); return; }
        if (assignedWorkspaces.length === 0) { toast.error('Please select at least one workspace'); return; }

        setLoading(true);
        try {
            const assignPromises = [];
            const workspacesAlreadyAssigned = [];

            for (const ws of assignedWorkspaces) {
                if (isWorkspaceAlreadyAssigned(ws.workspaceID || ws.workspaceId || ws.id)) {
                    workspacesAlreadyAssigned.push(ws.name || ws.workspaceName);
                } else {
                    assignPromises.push(
                                fetch(`${API_URL}/api/UserWorkspacePermission/AddUserWorkspacePermission`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: assignUser, workspaceId: ws.workspaceID || ws.workspaceId || ws.id })
                                })
                    );
                }
            }

            if (workspacesAlreadyAssigned.length > 0) {
                toast.error(`User already has these workspaces: ${workspacesAlreadyAssigned.join(', ')}`);
            }

            if (assignPromises.length > 0) {
                const results = await Promise.allSettled(assignPromises);
                const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
                if (successful > 0) {
                    toast.success(`Assigned ${successful} workspace(s)`);
                    fetchUserAssignedWorkspaces(assignUser);
                    setAssignedWorkspaces([]);
                } else {
                    toast.error('Failed to assign workspaces. Please try again.');
                }
            }
        } catch (error) {
            toast.error('Error assigning workspaces to user');
            console.error('Assign user error:', error);
        } finally { setLoading(false); }
    };

    const users = Array.isArray(filteredUsers) ? filteredUsers : (filteredUsers && Array.isArray(filteredUsers.users) ? filteredUsers.users : []);

    return (
        <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '400px' }}>
            <div className="settings-form" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                    <label style={{ fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Select User:</label>
                    <select value={assignUser} onChange={(e) => setAssignUser(e.target.value)} disabled={loadingUserWorkspaces} style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px', height: '32px' }}>
                        <option value="">Select User</option>
                        {users.map(u => (<option key={u.userId} value={u.userId}>{u.userName} ({u.fname} {u.lname})</option>))}
                    </select>
                    {loadingUserWorkspaces && <div className="loading-indicator" style={{ fontSize: '11px', marginTop: '2px' }}>Loading user workspace assignments...</div>}
                </div>

                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: '0' }}>
                    <label style={{ fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Workspaces to Assign:</label>
                    <div className="jobs-selection-container" style={{ flex: 1, maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '8px', backgroundColor: '#fff' }}>
                        {workspaces.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#666', padding: '20px 12px', fontSize: '12px' }}>
                                <div>No workspaces available</div>
                            </div>
                        ) : (
                            workspaces.map(w => {
                                const isAlready = isWorkspaceAlreadyAssigned(w.workspaceID || w.workspaceId || w.id);
                                const isChecked = assignedWorkspaces.some(ap => (ap.workspaceID || ap.workspaceId || ap.id) === (w.workspaceID || w.workspaceId || w.id));
                                return (
                                    <label key={w.workspaceID || w.workspaceId || w.id} className={`job-checkbox ${isAlready ? 'disabled' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderRadius: '3px', cursor: isAlready ? 'not-allowed' : 'pointer', opacity: isAlready ? 0.6 : 1, backgroundColor: isAlready ? '#f5f5f5' : '#fff', border: '1px solid #e9ecef', margin: '0', fontSize: '11px', minHeight: '32px' }}>
                                        <input type="checkbox" checked={isChecked} onChange={(e) => {
                                            if (isAlready) return;
                                            if (e.target.checked) setAssignedWorkspaces(prev => [...prev, w]); else setAssignedWorkspaces(prev => prev.filter(x => (x.workspaceID || x.workspaceId || x.id) !== (w.workspaceID || w.workspaceId || w.id)));
                                        }} disabled={isAlready} style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: '500', color: '#212529', fontSize: '11px', lineHeight: '1.2' }}>{w.name || w.workspaceName}</span>
                                                {isAlready && <span style={{ fontSize: '8px', background: '#ffebee', color: '#c62828', padding: '1px 3px', borderRadius: '2px', marginLeft: '6px', flexShrink: 0, fontWeight: '600' }}>Assigned</span>}
                                            </div>
                                            <div style={{ fontSize: '9px', color: '#6c757d', lineHeight: '1.1' }}>ID: {w.workspaceID || w.workspaceId || w.id}</div>
                                        </div>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="selection-info" style={{ marginTop: '4px', fontSize: '11px' }}>
                    {assignedWorkspaces.length === 0 ? <span style={{ color: '#666' }}>No workspaces selected</span> : <span style={{ color: '#28a745', fontWeight: '500' }}>{assignedWorkspaces.length} workspace{assignedWorkspaces.length !== 1 ? 's' : ''} selected</span>}
                </div>
            </div>

            <div className="settings-action-buttons" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee', flexShrink: 0 }}>
                <button onClick={handleAssignUser} disabled={!assignUser || assignedWorkspaces.length === 0 || loading} style={{ padding: '8px 16px', backgroundColor: assignedWorkspaces.length > 0 ? '#2f55ddff' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: assignedWorkspaces.length > 0 && !loading ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: '500', width: '100%', height: '32px', margin: '12px' }}>
                    {loading ? <>Assigning...</> : `Assign ${assignedWorkspaces.length} Workspace${assignedWorkspaces.length !== 1 ? 's' : ''}`}
                </button>
            </div>
        </div>
    );
};

export default AssignUsers;
