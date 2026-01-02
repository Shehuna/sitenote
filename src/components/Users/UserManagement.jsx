import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../Modals/Modal';

const UserManagement = ({ workspaceId }) => {
    const [users, setUsers] = useState([]); // All users in system
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userWorkspaces, setUserWorkspaces] = useState([]);

    // States for integrated user management feature
    const [activeTab, setActiveTab] = useState('all');
    const [workspaceMembers, setWorkspaceMembers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [memberToDelete, setMemberToDelete] = useState(null);
    const [updatingRoleId, setUpdatingRoleId] = useState(null);
    const [addingUserId, setAddingUserId] = useState(null);
    const [removingUserId, setRemovingUserId] = useState(null);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

    const API_URL = process.env.REACT_APP_API_BASE_URL;

    const fetchAllUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/UserManagement/GetUsers`);
            if (!response.ok) {
                throw new Error('Error fetching users data!');
            }
            const data = await response.json();
            setUsers(data.users || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching users:', err);
        }
    };

    const fetchWorkspaceMembers = async () => {
        if (!workspaceId) return;
        try {
            const res = await fetch(`${API_URL}/api/UserWorkspace/GetUsersByWorkspaceId/${workspaceId}`);
            if (!res.ok) throw new Error('Failed to fetch workspace members');
            const data = await res.json();
            setWorkspaceMembers(data.users || []);
        } catch (err) {
            setError(err.message);
            toast.error('Failed to load workspace members');
        }
    };

    const fetchUserWorkspaces = async (uid) => {
        try {
            const res = await fetch(`${API_URL}/api/UserWorkspace/GetWorkspacesByUserId/${uid}`);
            if (!res.ok) throw new Error('Failed to fetch user workspaces');
            const data = await res.json();
            setUserWorkspaces(data.userWorkspaces || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching user workspaces:', err);
        }
    };

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const uid = storedUser.id;
        const urole = storedUser.role;
        setUserId(uid);
        setUserRole(urole);

        if (workspaceId && uid) {
            setLoading(true);
            Promise.all([
                fetchAllUsers(),
                fetchWorkspaceMembers(),
                fetchUserWorkspaces(uid)
            ]).finally(() => setLoading(false));
        }
    }, [workspaceId]);

    const handleChangeStatus = async (userId, newStatus) => {
        setUpdatingStatusId(userId);
        try {
            const response = await fetch(`${API_URL}/api/UserManagement/ChangeStatus/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newStatus: newStatus
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(err || 'Failed to change status');
            }

            toast.success("Status updated successfully!");
            fetchAllUsers();
            fetchWorkspaceMembers();
        } catch (err) {
            toast.error(err.message || "Failed to update status");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    // Functions for integrated feature
    const updateUserRole = async (userWorkspaceID, userId, newRole) => {
        setUpdatingRoleId(userWorkspaceID);
        try {
            const res = await fetch(`${API_URL}/api/UserWorkspace/UpdateUserWorkspace/${userWorkspaceID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userID: parseInt(userId),
                    workspaceID: parseInt(workspaceId),
                    role: newRole,
                    status: 1,
                }),
            });
            if (!res.ok) {
                const errorData = await res.json();
                toast.error(errorData.message);
                return;
            }
            toast.success('Role updated successfully');
            fetchWorkspaceMembers();
        } catch (err) {
            toast.error(err.message || 'Failed to update role');
        } finally {
            setUpdatingRoleId(null);
        }
    };

    const removeUserFromWorkspace = async () => {
        if (!memberToDelete) return;
        setRemovingUserId(memberToDelete.userWorkspaceID);
        try {
            const res = await fetch(`${API_URL}/api/UserWorkspace/DeleteUserWorkspace/${memberToDelete.userWorkspaceID}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const errorData = await res.json();
                toast.error(errorData.message);
                return;
            }
            toast.success('User removed from workspace');
            fetchWorkspaceMembers();
            setMemberToDelete(null);
        } catch (err) {
            toast.error('Failed to remove user');
        } finally {
            setRemovingUserId(null);
        }
    };

    const addUserToWorkspace = async (userId) => {
        setAddingUserId(userId);
        try {
            const res = await fetch(`${API_URL}/api/UserWorkspace/AddUserWorkspace`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userID: userId,
                    workspaceID: parseInt(workspaceId),
                    role: 2, // Editor by default
                    status: 1,
                }),
            });
            if (!res.ok) throw new Error();
            toast.success('User added successfully');
            fetchWorkspaceMembers();
        } catch (err) {
            toast.error('Failed to add user');
        } finally {
            setAddingUserId(null);
        }
    };

    const filteredUsers = users.filter(
        (user) =>
            !workspaceMembers.some((m) => m.userId === user.id) &&
            (user.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                `${user.fname || ''} ${user.lname || ''}`.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const isSystemAdmin = userRole?.toLowerCase() === 'admin';
    const workspaceRole = userWorkspaces.find(w => w.workspaceID === parseInt(workspaceId))?.role;
    const isWorkspaceAdmin = workspaceRole === 1;
    const hasPermission = isSystemAdmin || isWorkspaceAdmin;

    const showAllUsers = isSystemAdmin;
    const showMembers = hasPermission;
    const showAddUsers = hasPermission;

    useEffect(() => {
        if (!showAllUsers && activeTab === 'all') {
            setActiveTab('members');
        }
    }, [showAllUsers, activeTab]);

    if (error) return <div>Error: {error}</div>;

    return (
        <div className="settings-content" style={{ position: 'relative', minHeight: '400px' }}>
            <style jsx>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .full-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255,255,255,0.97);
                    backdrop-filter: blur(10px);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    z-index: 9999;
                    border-radius: 12px;
                    text-align: center;
                    padding: 0;
                    box-sizing: border-box;
                    padding-top: 80px;
                }
                .spinner {
                    width: 60px;
                    height: 60px;
                    border: 6px solid #f3f3f3;
                    border-top: 6px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                    display: block;
                }
                .manage-users-container { padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                .modern-tabs { display: flex; border-bottom: 1px solid #e5e7eb; margin-bottom: 16px; gap: 4px; }
                .tab-btn { padding: 10px 20px; background: none; border: none; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px 8px 0 0; transition: all 0.2s; }
                .tab-btn.active { background: #2563eb; color: white; }
                .table-container { max-height: 65vh; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
                .modern-table { width: 100%; border-collapse: collapse; }
                .modern-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #374151; position: sticky; top: 0; z-index: 10; }
                .modern-table td { padding: 12px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
                .user-name-display { max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
                .user-username { font-size: 12px; color: #6b7280; }
                .role-select { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
                .btn-remove, .btn-add-right { width: 90px; height: 40px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .btn-remove { background: #ef4444; color: white; }
                .btn-add-right { background: #2563eb; color: white; }
                .btn-remove:disabled, .btn-add-right:disabled { opacity: 0.7; cursor: not-allowed; }
                .search-input { width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 15px; margin-bottom: 16px; outline: none; }
                .users-list-scroll { max-height: 55vh; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 16px; }
                .user-row-right { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #f3f4f6; transition: background 0.2s; }
                .user-row-right:hover { background: #f8fafc; }
                .user-info-right strong { font-size: 14.5px; display: block; }
                .user-info-right small { color: #555; font-size: 13px; }
                .empty-text { text-align: center; color: #6b7280; padding: 40px; font-size: 15px; }
                .modal-footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: right; }
                .btn-close-modal { background: #6b7280; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; }
                .badge.inactive { background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-left: 8px; }
                .permission-denied { text-align: center; padding: 40px; font-size: 18px; color: #ef4444; }
            `}</style>
            {loading && (
                <div className="full-overlay">
                    <div className="spinner" />
                    <p style={{fontSize:'1.2rem',fontWeight:'600',margin:0}}>Loading...</p>
                </div>
            )}
            {!loading && !hasPermission && (
                <div className="permission-denied">
                    You don't have permission to access this page.
                </div>
            )}
            {!loading && hasPermission && (
                <div className="manage-users-container">
                    <div className="modern-tabs">
                        {showAllUsers && (
                            <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
                                All Users ({users.length})
                            </button>
                        )}
                        {showMembers && (
                            <button className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
                                Members ({workspaceMembers.length})
                            </button>
                        )}
                        {showAddUsers && (
                            <button className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
                                Add Users
                            </button>
                        )}
                    </div>
                    {activeTab === 'all' && showAllUsers && (
                        <div className="table-container">
                            {users.length === 0 ? (
                                <p className="empty-text">No users</p>
                            ) : (
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className="user-name-display" title={`${user.fname} ${user.lname}`}>
                                                        {user.fname} {user.lname} {user.status === 0 && <span className="badge inactive">Inactive</span>}
                                                    </div>
                                                    <div className="user-username">@{user.userName}</div>
                                                </td>
                                                <td>{user.email}</td>
                                                <td>
                                                    <select
                                                        className="role-select"
                                                        value={user.status}
                                                        onChange={(e) => handleChangeStatus(user.id, parseInt(e.target.value))}
                                                        disabled={updatingStatusId === user.id}
                                                    >
                                                        <option value={1}>Active</option>
                                                        <option value={0}>Inactive</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                    {activeTab === 'members' && showMembers && (
                        <div className="table-container">
                            {workspaceMembers.length === 0 ? (
                                <p className="empty-text">No members yet</p>
                            ) : (
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workspaceMembers.map((m) => (
                                            <tr key={m.userWorkspaceID}>
                                                <td>
                                                    <div className="user-name-display" title={`${m.fname} ${m.lname}`}>
                                                        {m.fname} {m.lname}
                                                    </div>
                                                    <div className="user-username">@{m.userName}</div>
                                                </td>
                                                <td>{m.email}</td>
                                                <td>
                                                    <select
                                                        className="role-select"
                                                        value={m.roleInWorkspace}
                                                        onChange={(e) => updateUserRole(m.userWorkspaceID, m.userId, parseInt(e.target.value))}
                                                        disabled={updatingRoleId === m.userWorkspaceID}
                                                    >
                                                        <option value={1}>Admin</option>
                                                        <option value={2}>Editor</option>
                                                        <option value={3}>Viewer</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn-remove"
                                                        onClick={() => setMemberToDelete(m)}
                                                        disabled={removingUserId === m.userWorkspaceID}
                                                    >
                                                        {removingUserId === m.userWorkspaceID ? 'Removing...' : 'Remove'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                    {activeTab === 'add' && showAddUsers && (
                        <div>
                            <input
                                type="text"
                                placeholder="Search by name, username, or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                                autoFocus
                            />
                            <div className="users-list-scroll">
                                {filteredUsers.length === 0 ? (
                                    <p className="empty-text">
                                        {searchTerm ? 'No users found' : 'All users are already members'}
                                    </p>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <div key={user.id} className="user-row-right">
                                            <div className="user-info-right">
                                                <strong>{user.fname} {user.lname}</strong>
                                                <small>@{user.userName} • {user.email}</small>
                                            </div>
                                            <button
                                                className="btn-add-right"
                                                onClick={() => addUserToWorkspace(user.id)}
                                                disabled={addingUserId === user.id}
                                            >
                                                {addingUserId === user.id ? 'Adding...' : 'Add'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Confirmation Dialog for Removal */}
            {memberToDelete && (
                <Modal isOpen={!!memberToDelete} onClose={() => setMemberToDelete(null)} title="Remove User?">
                    <p>
                        Remove <strong>{memberToDelete.userName}</strong> from this workspace?
                    </p>
                    <div className="modal-footer">
                        <button
                            className="btn-danger"
                            onClick={removeUserFromWorkspace}
                            disabled={removingUserId !== null}
                        >
                            {removingUserId ? 'Removing...' : 'Yes, Remove'}
                        </button>
                        <button
                            className="btn-close"
                            onClick={() => setMemberToDelete(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default UserManagement;