import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Modal from '../Modals/Modal';

const UserProfile = ({ userid, onBack }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const apiUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    fetchUser();
  }, [userid]);

  const fetchUser = async () => {
    if (!userid) {
      setError('User ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiUrl}/api/UserManagement/GetUserById/${userid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching user:', err);
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setPasswordError('');
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await fetch(`${apiUrl}/api/UserManagement/ChangePassword/${userid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        throw new Error(`Failed to change password: ${response.status}`);
      }

      const data = await response.json();
      setSuccessMessage(data.message || 'Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
      }, 2000);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="user-profile-content">
        <div className="loading-message">Loading user profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-profile-content">
        <div className="error-message">
          Error: {error}
          <button onClick={fetchUser} >Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-content">
      <div className="change-password-top">
        <button 
          onClick={() => { 
            setShowPasswordModal(true); 
            setSuccessMessage(''); 
          }}
          className="btn-primary"
        >
          Change Password
        </button>
      </div>
      
      <div className="profile-info">
        <div className="info-section">
          <h4>Personal Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>First Name:</label>
              <span>{user?.fname}</span>
            </div>
            <div className="info-item">
              <label>Last Name:</label>
              <span>{user?.lname}</span>
            </div>
            <div className="info-item">
              <label>Username:</label>
              <span>{user?.userName}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{user?.email}</span>
            </div>
            <div className="info-item">
              <label>Role:</label>
              <span>{user?.role}</span>
            </div>
            <div className="info-item">
              <label>Status:</label>
              <span>{user?.status === 1 ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="info-item">
              <label>Default Workspace ID:</label>
              <span>{user?.defaultWorkspaceId}</span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showPasswordModal}
        onClose={() => { 
          setShowPasswordModal(false); 
          setSuccessMessage(''); 
        }}
        title="Change Password"
        customClass="modal-sm"
      >
        <div className="settings-form">
          {successMessage && (
            <div className="success-message">
              <i className="fas fa-check-circle"></i> {successMessage}
            </div>
          )}
          <div className="form-group">
            <label>New Password:</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordError('');
              }}
              placeholder="Enter new password (min 6 characters)"
              required
              minLength="6"
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordError('');
              }}
              placeholder="Confirm new password"
              required
            />
          </div>
          {passwordError && <div className="error-message">{passwordError}</div>}
          
          <div className="modal-footer">
            <button
              className="btn-primary"
              onClick={handlePasswordChange}
              disabled={changingPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? 'Changing...' : 'OK'}
            </button>
            <button
              className="btn-close"
              onClick={() => { 
                setShowPasswordModal(false); 
                setSuccessMessage(''); 
              }}
              disabled={changingPassword}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <style jsx>{`
        .user-profile-content {
          padding: 20px;
        }
        .change-password-top {
          margin-bottom: 20px;
        }
        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        .info-section h4 {
          color: #2c3e50;
          margin-bottom: 15px;
          border-bottom: 2px solid #3498db;
          padding-bottom: 5px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-item label {
          font-weight: 600;
          color: #7f8c8d;
          margin-bottom: 5px;
        }
        .info-item span {
          color: #2c3e50;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
          border-left: 3px solid #3498db;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 5px;
        }
        .form-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid #007BFF;
          border-radius: 4px;
          font-size: 14px;
          background: #f8f9fa;
        }
        .error-message {
          color: #e74c3c;
          font-size: 14px;
          margin-top: 5px;
        }
        .success-message {
          color: #27ae60;
          font-size: 14px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #d4edda;
          padding: 10px;
          border-radius: 4px;
          border: 1px solid #c3e6cb;
        }
        .settings-form {
          padding: 20px;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }
        .btn-primary, .btn-close {
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          padding: 10px 20px;
        }
        .btn-primary {
          background: #007BFF;
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }
        .btn-primary:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }
        .btn-close {
          background: #ecf0f1;
          color: #7f8c8d;
        }
        .btn-close:hover:not(:disabled) {
          background: #bdc3c7;
        }
      `}</style>
    </div>
  );
};

export default UserProfile;