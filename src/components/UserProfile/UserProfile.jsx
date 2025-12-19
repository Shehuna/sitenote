import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Modal from '../Modals/Modal';
import './UserProfile.css';

const UserProfile = ({ userid }) => {
  const [user, setUser] = useState(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [editForm, setEditForm] = useState({ Fname: '', Lname: '', UserName: '', Email: '' });
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [imageCacheBuster, setImageCacheBuster] = useState(Date.now());

  const apiUrl = process.env.REACT_APP_API_BASE_URL.replace(/\/$/, '');

  useEffect(() => {
    if (userid) fetchUser();
  }, [userid]);

  const fetchUser = async () => {
    try { 
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/UserManagement/GetUserById/${userid}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const u = data.user;
      setUser(u);
      setEditForm({
        Fname: u.fname || '',
        Lname: u.lname || '',
        UserName: u.userName || '',
        Email: u.email || '',
      });

      if (u.defaultWorkspaceName) {
        setWorkspaceName(u.defaultWorkspaceName || '-');
      } else {
        setWorkspaceName('-');
      }
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setSuccessMessage('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      return setPasswordError('All fields are required');
    }
    if (newPassword !== confirmPassword) {
      return setPasswordError('New passwords do not match');
    }
    if (newPassword.length < 6) {
      return setPasswordError('New password must be at least 6 characters');
    }

    try {
      setChangingPassword(true);
      const res = await fetch(`${apiUrl}/api/UserManagement/ChangePassword/${userid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to change password');

      setSuccessMessage('Password changed successfully!');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUpdateProfile = async () => {
    const fd = new FormData();
    fd.append('Fname', editForm.Fname);
    fd.append('Lname', editForm.Lname);
    fd.append('UserName', editForm.UserName);
    fd.append('Email', editForm.Email);
    fd.append('Role', user.role || 'User');
    fd.append('Status', user.status);
    fd.append('SystemUserID', '0');
    fd.append('DefaultWorkspaceId', user.defaultWorkspaceId || '');
    if (profilePictureFile) fd.append('ProfilePicture', profilePictureFile);

    try {
      setUpdatingProfile(true);
      const res = await fetch(`${apiUrl}/api/UserManagement/UpdateUser/${userid}`, {
        method: 'PUT',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      setUser(data.user);
      setImageCacheBuster(Date.now());
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
      toast.success('Profile updated successfully');
      setShowEditModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setProfilePictureFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfilePicturePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setProfilePicturePreview(null);
    }
  };

  if (loading) {
    return (
      
        <div className="loading-spinner"></div>
      
    );
  }

  const imageUrl = user?.profilePicturePath
    ? `${apiUrl}/api/UserManagement/ProfilePicture/${userid}?t=${imageCacheBuster}`
    : null;

  const displayName = `${user?.fname || ''} ${user?.lname || ''}`.trim() || user?.userName;

  return (
    <div className="user-profile">
      <div className="profile-actions">
        <button onClick={() => setShowPasswordModal(true)} className="btn-secondary">
          Change Password
        </button>
        <button onClick={() => setShowEditModal(true)} className="btn-primary">
          Edit Profile
        </button>
      </div>

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {imageUrl ? (
              <img src={imageUrl} alt={`${displayName}'s profile`} />
            ) : (
              <div className="avatar-fallback">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-summary">
            <h2>{displayName}</h2>
            <p className="username">@{user?.userName}</p>
            <p className="email">{user?.email}</p>
          </div>
        </div>

        <div className="profile-details">
          <div className="detail-row">
            <span className="label">Full Name</span>
            <span className="value">{user?.fname} {user?.lname}</span>
          </div>
          <div className="detail-row">
            <span className="label">Role</span>
            <span className="value">{user?.role || 'User'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Status</span>
            <span className="value status">
              <span className={user?.status === 1 ? 'active' : 'inactive'}>
                {user?.status === 1 ? 'Active' : 'Inactive'}
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Default Workspace</span>
            <span className="value">{workspaceName}</span>
          </div>
        </div>
      </div>

      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
        <form onSubmit={handlePasswordChange} className="modal-form">
          {successMessage && <div className="success-msg">{successMessage}</div>}
          <div className="form-group">
            <label>Current Password *</label>
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>New Password *</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Confirm New Password *</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          {passwordError && <div className="error-msg">{passwordError}</div>}
          <div className="modal-footer">
            <button type="submit" className="btn-primary" disabled={changingPassword}>
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
            <button type="button" className="btn-cancel" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Profile">
        <div className="modal-form">
          <div className="edit-header">
            <div className="preview-avatar">
              <img src={profilePicturePreview || imageUrl || '/placeholder-avatar.png'} alt="Profile Preview" />
            </div>
            <div className="edit-summary">
              <h3>Update Your Details</h3>
              <p>Make changes to your profile information below.</p>
            </div>
          </div>
          <div className="name-group">
            <div className="form-group">
              <label>First Name</label>
              <input type="text" value={editForm.Fname} onChange={(e) => setEditForm({ ...editForm, Fname: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" value={editForm.Lname} onChange={(e) => setEditForm({ ...editForm, Lname: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={editForm.Email} onChange={(e) => setEditForm({ ...editForm, Email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Profile Picture</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          <div className="modal-footer">
            <button className="btn-primary" onClick={handleUpdateProfile} disabled={updatingProfile}>
              {updatingProfile ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserProfile;