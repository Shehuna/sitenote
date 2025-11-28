import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const ManageWorkspaceUsersModal = ({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  allUsers = [],
}) => {
  const [activeTab, setActiveTab] = useState('members');
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [addingUserId, setAddingUserId] = useState(null);
  const [removingUserId, setRemovingUserId] = useState(null);

  const API_URL = process.env.REACT_APP_API_BASE_URL;

  const fetchWorkspaceMembers = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`${API_URL}/api/UserWorkspace/GetUsersByWorkspaceId/${workspaceId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setWorkspaceMembers(data.users || []);
    } catch (err) {
      toast.error('Failed to load workspace members');
    }
  };

  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchWorkspaceMembers();
    }
  }, [isOpen, workspaceId]);

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
      if (!res.ok) throw new Error();
      toast.success('Role updated successfully');
      fetchWorkspaceMembers();
    } catch (err) {
      toast.error('Failed to update role');
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
      if (!res.ok) throw new Error();
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

  const filteredUsers = allUsers.filter(
    (user) =>
      !workspaceMembers.some((m) => m.userId === user.id) &&
      (user.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${user.fname || ''} ${user.lname || ''}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Users — {workspaceName || 'Workspace'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="manage-users-container">
          <style jsx>{`
            /* Same styles as in your second example */
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
          `}</style>

          <div className="modern-tabs">
            <button className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
              Members ({workspaceMembers.length})
            </button>
            <button className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
              Add Users
            </button>
          </div>

          {activeTab === 'members' && (
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

          {activeTab === 'add' && (
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

          <div className="modal-footer">
            <button className="btn-close-modal" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {/* Confirmation Dialog for Removal */}
        {memberToDelete && (
          <div className="modal-overlay" onClick={() => setMemberToDelete(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Remove User?</h3>
              <p>
                Remove <strong>{memberToDelete.userName}</strong> from this workspace?
              </p>
              <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  style={{ background: '#ef4444', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={removeUserFromWorkspace}
                  disabled={removingUserId !== null}
                >
                  {removingUserId ? 'Removing...' : 'Yes, Remove'}
                </button>
                <button
                  style={{ background: '#6b7280', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={() => setMemberToDelete(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageWorkspaceUsersModal;