import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../Modals/Modal';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/images/avatar.png';

const useQuery = () => new URLSearchParams(window.location.search);

const UserManagement = ({ workspaceId }) => {
    const navigate = useNavigate();
    const query = useQuery();
    const initialAddUserState = query.get('action') === 'create';

    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [isChangeUserPassOpen, setIsChangeUserPassOpen] = useState(false);
    const [isChangeUserStatusOpen, setIsChangeUserStatusOpen] = useState(false);
    const [isDeleteUserConfirmOpen, setIsDeleteUserConfirmOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        Fname: '',
        Lname: '',
        UserName: '',
        Email: '',
        Password: '',
        Status: 'Active',
        profilePictureBase64: null
    });

    const [errors, setErrors] = useState({});
    const [newPass, setNewPass] = useState('');
    const [confirmNewPass, setConfirmNewPass] = useState('');

    const API_URL = process.env.REACT_APP_API_BASE_URL;
    const isSignUpFlow = initialAddUserState;

    const fetchUsers = async () => {
        if (!workspaceId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/UserWorkspace/GetUsersByWorkspaceId/${workspaceId}`);
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data.users || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isSignUpFlow && workspaceId) fetchUsers();
    }, [isSignUpFlow, workspaceId]);

    useEffect(() => {
        if (initialAddUserState) setIsAddUserOpen(true);
    }, [initialAddUserState]);

    useEffect(() => {
        if ((isEditUserOpen || isChangeUserStatusOpen) && selectedUser && users.length > 0) {
            const user = users.find(u => u.userId === parseInt(selectedUser));
            if (user) {
                setFormData({
                    Fname: user.fname || '',
                    Lname: user.lname || '',
                    UserName: user.userName || '',
                    Email: user.email || '',
                    Password: '',
                    Status: user.status === 1 ? 'Active' : 'Inactive',
                    profilePictureBase64: user.profilePicturePath || null
                });
            }
        } else if (!isEditUserOpen && !isChangeUserStatusOpen) {
            setFormData({
                Fname: '', Lname: '', UserName: '', Email: '', Password: '',
                Status: 'Active', profilePictureBase64: null
            });
            setErrors({});
        }
    }, [isEditUserOpen, isChangeUserStatusOpen, selectedUser, users]);

    const validateField = (name, value) => {
        let error = '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (name !== 'profilePictureBase64' && !value && isAddUserOpen) {
            error = 'This field is mandatory.';
        } else if (name === 'Fname' || name === 'Lname') {
            if (value.length < 2) error = 'Must be at least 2 characters long.';
            else if (value.length > 50) error = 'Cannot exceed 50 characters.';
        } else if (name === 'UserName') {
            if (value.length < 3) error = 'Must be at least 3 characters long.';
            else if (value.length > 30) error = 'Cannot exceed 30 characters.';
        } else if (name === 'Email') {
            if (!emailRegex.test(value)) error = 'Invalid email format.';
        } else if (name === 'Password' && isAddUserOpen) {
            if (value.length < 6) error = 'Password must be at least 6 characters long.';
        }

        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };

    const validateForm = () => {
        let valid = true;
        const fields = ['Fname', 'Lname', 'UserName', 'Email'];
        if (isAddUserOpen) fields.push('Password');
        fields.forEach(field => {
            if (validateField(field, formData[field])) valid = false;
        });
        return valid;
    };

    const handleInputChange = (e) => {
        const { name, value, files } = e.target;
        const newValue = files ? files[0] : value;
        setFormData(prev => ({ ...prev, [name]: newValue }));
        if (!isChangeUserStatusOpen) validateField(name, newValue);
    };

    const handleCreateUser = async () => {
        if (!validateForm()) {
            toast.error('Please fix the errors');
            return;
        }

        const formDataObj = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== undefined) {
                formDataObj.append(key, formData[key]);
            }
        });

        try {
            const response = await fetch(`${API_URL}/api/UserManagement/CreateUser`, {
                method: 'POST',
                body: formDataObj
            });

            if (!response.ok) throw new Error('Failed to create user');

            toast.success('User created successfully!');
            setIsAddUserOpen(false);

            if (isSignUpFlow) {
                const loginRes = await fetch(`${API_URL}/api/UserManagement/Login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: formData.UserName, password: formData.Password })
                });
                if (loginRes.ok) {
                    const data = await loginRes.json();
                    localStorage.setItem('user', JSON.stringify(data.user));
                    toast.success(`Welcome, ${formData.Fname}!`);
                    setTimeout(() => window.location.href = '/dashboard', 1000);
                } else {
                    toast.success('Account created! Please log in.');
                    setTimeout(() => navigate('/login'), 1500);
                }
            } else {
                fetchUsers();
            }
        } catch (err) {
            toast.error('Failed to create user');
        }
    };

    const handleEditUser = async () => {
        if (!validateForm()) {
            toast.error('Please fix the errors');
            return;
        }

        const formDataObj = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== undefined) {
                formDataObj.append(key, formData[key]);
            }
        });

        try {
            const response = await fetch(`${API_URL}/api/UserManagement/UpdateUser/${selectedUser}`, {
                method: 'PUT',
                body: formDataObj
            });
            if (!response.ok) throw new Error('Failed to update user');
            toast.success('User updated successfully!');
            setIsEditUserOpen(false);
            fetchUsers();
        } catch (err) {
            toast.error('Failed to update user');
        }
    };

    const handleChangeStatus = async () => {
        if (!selectedUser) {
            toast.error("No user selected");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/UserManagement/ChangeStatus/${selectedUser}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newStatus: formData.Status === "Active" ? 1 : 0
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(err || 'Failed to change status');
            }

            toast.success("Status updated successfully!");
            setIsChangeUserStatusOpen(false);
            fetchUsers();
        } catch (err) {
            toast.error(err.message || "Failed to update status");
        }
    };

    const handleDelete = async () => {
        try {
            const response = await fetch(`${API_URL}/api/UserManagement/DeleteUser/${selectedUser}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to delete user');
            toast.success("User deleted permanently");
            setIsDeleteUserConfirmOpen(false);
            setSelectedUser('');
            fetchUsers();
        } catch (err) {
            toast.error("Failed to delete user");
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPass.length < 6) return toast.error("Password must be at least 6 characters");
        if (newPass !== confirmNewPass) return toast.error("Passwords do not match");

        try {
            const response = await fetch(`${API_URL}/api/UserManagement/ChangePassword/${selectedUser}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: newPass })
            });
            if (!response.ok) throw new Error('Failed to change password');
            toast.success("Password changed successfully");
            setIsChangeUserPassOpen(false);
            setNewPass('');
            setConfirmNewPass('');
        } catch (err) {
            toast.error("Failed to change password");
        }
    };

    const closeAddUserModal = () => {
        setIsAddUserOpen(false);
        setErrors({});
        if (query.get('action') === 'create') {
            window.history.replaceState(null, '', window.location.pathname);
            if (isSignUpFlow) navigate('/login');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="settings-content">

            {!isSignUpFlow && (
                <>
                    <div className="settings-action-buttons">
                        <button className="btn-secondary" onClick={() => setIsChangeUserStatusOpen(true)} disabled={!selectedUser}>
                            Change Status
                        </button>
                        {/* <button className="btn-danger" onClick={() => setIsDeleteUserConfirmOpen(true)} disabled={!selectedUser}>
                            Delete
                        </button> */}
                    </div>

                    <div className="settings-lookup-list">
                        <h4>Workspace User Lookups</h4>
                        <select size="5" className="lookup-select" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                            <option value="">Select a User</option>
                            {users.map(user => (
                                <option key={user.userId} value={user.userId}>
                                    {user.userName} ({user.status === 1 ? 'Active' : 'Inactive'})
                                </option>
                            ))}
                        </select>
                    </div>
                </>
            )}

            <Modal isOpen={isAddUserOpen} onClose={closeAddUserModal} title="Add User">
                <div className="settings-form user-form-grid">
                    <div className="form-group">
                        <label>First Name: *</label>
                        <input type="text" name="Fname" value={formData.Fname} onChange={handleInputChange} />
                        {errors.Fname && <p style={{ color: 'red', fontSize: '12px' }}>{errors.Fname}</p>}
                    </div>
                    <div className="form-group">
                        <label>Last Name: *</label>
                        <input type="text" name="Lname" value={formData.Lname} onChange={handleInputChange} />
                        {errors.Lname && <p style={{ color: 'red', fontSize: '12px' }}>{errors.Lname}</p>}
                    </div>
                    <div className="form-group">
                        <label>Username: *</label>
                        <input type="text" name="UserName" value={formData.UserName} onChange={handleInputChange} />
                        {errors.UserName && <p style={{ color: 'red', fontSize: '12px' }}>{errors.UserName}</p>}
                    </div>
                    <div className="form-group">
                        <label>Email: *</label>
                        <input type="email" name="Email" value={formData.Email} onChange={handleInputChange} />
                        {errors.Email && <p style={{ color: 'red', fontSize: '12px' }}>{errors.Email}</p>}
                    </div>
                    <div className="form-group">
                        <label>Password: *</label>
                        <input type="password" name="Password" value={formData.Password} onChange={handleInputChange} />
                        {errors.Password && <p style={{ color: 'red', fontSize: '12px' }}>{errors.Password}</p>}
                    </div>
                    <div className="form-group">
                        <label>Profile Picture:</label>
                        <input type="file" name="profilePictureBase64" onChange={handleInputChange} />
                    </div>
                </div>
                <div className="settings-action-buttons">
                    <button className="btn-primary" onClick={handleCreateUser}>
                        {isSignUpFlow ? "Create Account" : "Create User"}
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isEditUserOpen} onClose={() => { setIsEditUserOpen(false); setErrors({}); }} title="Edit User">
                <div className="settings-content">
                    <div className="settings-form user-form-grid">
                        <div className="form-group" style={{ textAlign: 'center' }}>
                            <img
                                style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover' }}
                                src={formData.profilePictureBase64 ? `data:image/png;base64,${formData.profilePictureBase64}` : logo}
                                alt="Profile"
                            />
                            <label>Profile Picture:</label>
                            <input type="file" name="profilePictureBase64" onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label>First Name: *</label>
                            <input type="text" name="Fname" value={formData.Fname} onChange={handleInputChange} />
                            {errors.Fname && <p style={{ color: 'red', fontSize: '12px' }}>{errors.Fname}</p>}
                        </div>
                        <div className="form-group">
                            <label>Last Name: *</label>
                            <input type="text" name="Lname" value={formData.Lname} onChange={handleInputChange} />
                            {errors.Lname && <p style={{ color: 'red', fontSize: '12px' }}>{errors.Lname}</p>}
                        </div>
                        <div className="form-group">
                            <label>Username: *</label>
                            <input type="text" name="UserName" value={formData.UserName} onChange={handleInputChange} />
                            {errors.UserName && <p style={{ color: 'red', fontSize: '12px' }}>{errors.UserName}</p>}
                        </div>
                        <div className="form-group">
                            <label>Email: *</label>
                            <input type="email" name="Email" value={formData.Email} onChange={handleInputChange} />
                            {errors.Email && <p style={{ color: 'red', fontSize: '12px' }}>{errors.Email}</p>}
                        </div>
                    </div>
                    <div className="settings-action-buttons">
                        <button className="btn-primary" onClick={handleEditUser}>Update User</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isChangeUserStatusOpen} onClose={() => setIsChangeUserStatusOpen(false)} title="Change User Status">
                <div className="settings-form">
                    <div className="form-group">
                        <label>User Name:</label>
                        <input type="text" value={formData.UserName || ''} disabled style={{ backgroundColor: '#f9f9f9' }} />
                    </div>
                    <div className="form-group">
                        <label>Status:</label>
                        <select name="Status" value={formData.Status} onChange={handleInputChange}>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                    <div className="modal-footer">
                        <button className="btn-primary" onClick={handleChangeStatus}>Save Status</button>
                        <button className="btn-close" onClick={() => setIsChangeUserStatusOpen(false)}>Cancel</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isChangeUserPassOpen} onClose={() => setIsChangeUserPassOpen(false)} title="Change Password">
                <form onSubmit={handlePasswordChange}>
                    <div className="form-group">
                        <label>New Password: *</label>
                        <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password: *</label>
                        <input type="password" value={confirmNewPass} onChange={(e) => setConfirmNewPass(e.target.value)} required />
                    </div>
                    <div className="modal-footer">
                        <button type="submit" className="btn-primary">OK</button>
                        <button type="button" className="btn-close" onClick={() => setIsChangeUserPassOpen(false)}>Cancel</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isDeleteUserConfirmOpen} onClose={() => setIsDeleteUserConfirmOpen(false)} title="Confirm Delete">
                <p style={{ textAlign: 'center', fontSize: '14px' }}>Are you sure you want to delete this user?</p>
                <div className="modal-footer">
                    <button className="btn-danger" onClick={handleDelete}>Delete</button>
                    <button className="btn-secondary" onClick={() => setIsDeleteUserConfirmOpen(false)}>Cancel</button>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagement;