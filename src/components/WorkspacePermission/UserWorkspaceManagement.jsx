import React, { useState, useEffect } from 'react';
import './UserWorkspaceManagement.css';
import toast from 'react-hot-toast';

const UserWorkspaceManagement = ({ defWorkID, fetchedUsers = [] }) => {
    const initialUsers = Array.isArray(fetchedUsers) ? fetchedUsers : (fetchedUsers && Array.isArray(fetchedUsers.users) ? fetchedUsers.users : []);
    const [users, setUsers] = useState(initialUsers);
    const [selectedUserId, setSelectedUserId] = useState(initialUsers[0]?.userId || null);
    const [userWorkspaces, setUserWorkspaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [modal, setModal] = useState({ show: false, type: '', message: '', onConfirm: null });

    useEffect(() => {
        const normalized = Array.isArray(fetchedUsers) ? fetchedUsers : (fetchedUsers && Array.isArray(fetchedUsers.users) ? fetchedUsers.users : []);
        setUsers(normalized);
        if (normalized.length && !selectedUserId) setSelectedUserId(normalized[0].userId);
    }, [fetchedUsers]);

    const API_URL = process.env.REACT_APP_API_BASE_URL;

    useEffect(() => {
        const load = async () => {
            if (!selectedUserId) { setUserWorkspaces([]); return; }
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/UserWorkspacePermission/GetWorkspacesByUser/${selectedUserId}`);
                const data = await res.json();
                const workspaces = data.userWorkspaces || data.workspaces || data || [];
                // normalize each workspace to include PermissionId for delete calls
                const normalized = Array.isArray(workspaces) ? workspaces.map(w => ({
                    ...w,
                    PermissionId: w.PermissionId || w.userWorkspacePermissionId || w.userWorkspaceId || w.id || w.userWorkspaceId || w.permissionId
                })) : [];
                setUserWorkspaces(normalized);
            } catch (err) { console.error(err); setUserWorkspaces([]); }
            finally { setLoading(false); }
        };
        load();
    }, [selectedUserId, defWorkID]);

    const filteredUsers = users.filter(u => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (u.userName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (`${u.fname || ''} ${u.lname || ''}`).toLowerCase().includes(q);
    });

    const showConfirm = (message, onConfirm) => {
        setModal({ show: true, type: 'confirm', message, onConfirm });
    };

    const showAlert = (message) => {
        setModal({ show: true, type: 'alert', message, onConfirm: null });
    };

    const closeModal = () => { setModal({ show: false, type: '', message: '', onConfirm: null }); };

    const handleConfirm = () => { if (modal.onConfirm) modal.onConfirm(); closeModal(); };

    // await confirm action so we can ensure delete runs before closing modal
    const handleConfirmAwait = async () => {
        if (modal.onConfirm) {
            try {
                console.log('handleConfirmAwait: invoking onConfirm');
                await modal.onConfirm();
                console.log('handleConfirmAwait: onConfirm completed');
            } catch (err) {
                console.error('handleConfirmAwait: onConfirm error', err);
            }
        }
        closeModal();
    };

    const handleRemove = (workspace) => {
        console.log('handleRemove: requested for workspace', workspace, 'selectedUserId', selectedUserId);
        showConfirm(`Remove workspace access "${workspace.name || workspace.workspaceName || workspace.id}" for this user?`, async () => {
            console.log('onConfirm: starting remove flow for user', selectedUserId);
            try {
                // Call delete endpoint directly using the workspace id (simple form)
                const idToDelete = workspace.PermissionId ;
                console.log('onConfirm: deleting using workspace id', idToDelete);
                const del = await fetch(`${API_URL}/api/UserWorkspacePermission/DeleteUserWorkspacePermission/${idToDelete}`, { method: 'DELETE' });
                console.log('onConfirm: delete response status', del.status);
                if (del.ok) {
                    setUserWorkspaces(prev => prev.filter(p => (p.workspaceID || p.workspaceId || p.id) != (workspace.workspaceID || workspace.workspaceId || workspace.id)));
                    toast.success('Permission removed');
                } else {
                    console.error('onConfirm: delete failed', await del.text());
                    showAlert('Failed to remove permission');
                }
            } catch (err) { console.error('onConfirm: error removing permission', err); showAlert('Error removing permission'); }
        });
    };

    return (
        <div className="user-workspaces-modern">
            <div className="users-pane">
                <div className="users-header">
                    <input placeholder="Search users..." value={query} onChange={(e)=>setQuery(e.target.value)} />
                </div>
                <ul className="users-list">
                    {filteredUsers.map(u => (
                        <li key={u.userId} className={u.userId === selectedUserId ? 'active' : ''} onClick={() => setSelectedUserId(u.userId)}>
                            <div className="u-name">{u.fname} {u.lname}</div>
                            <div className="u-meta">{u.userName}</div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="projects-pane">
                <div className="projects-header">
                    <h3>Workspaces for user</h3>
                    <div className="projects-actions">
                        <button onClick={() => { setSelectedUserId(null); setUserWorkspaces([]); }}>Clear</button>
                    </div>
                </div>
                <div className="projects-grid">
                    {loading ? <div className="loading">Loading...</div> : userWorkspaces.length === 0 ? <div className="empty">No workspaces found</div> : userWorkspaces.map(w => (
                        <div className="project-card" key={w.workspaceID || w.workspaceId || w.id}>
                            <div className="project-title">{w.name || w.workspaceName}</div>
                            <div className="project-actions">
                                <button className="btn danger" onClick={() => handleRemove(w)}>Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {modal.show && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-title">{modal.type === 'confirm' ? 'Confirm Action' : 'Message'}</div>
                        <p>{modal.message}</p>
                        <div className="modal-buttons">
                            {modal.type === 'confirm' && (
                                <>
                                    <button className="btn secondary" onClick={closeModal}>No</button>
                                    <button className="btn primary" onClick={handleConfirmAwait}>Yes</button>
                                </>
                            )}
                            {modal.type === 'alert' && (
                                <button className="btn primary" onClick={closeModal}>OK</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserWorkspaceManagement;
