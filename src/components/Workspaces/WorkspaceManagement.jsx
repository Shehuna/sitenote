import React, { useEffect, useState } from 'react'
import Modal from '../Modals/Modal';
import ApproveRejectWorkspace from './ApproveRejectWorkspace';
import toast from 'react-hot-toast';
import ManageWorkspaceUsersModal from './ManageWorkspaceUsersModal';
import ChangeWorkspaceModal from './ChangeWorkspaceModal';


const WorkspaceManagement = ({onUpdateDefaultWorkspace, userRole, workspaceRole}) => {
    
    const [workspaceName, setWorkspaceName] = useState('');
    const [ownerUserID, setOwnerUserID] = useState('');
    const [ownerType, setOwnerType] = useState(1);
    const [ownerName, setOwnerName] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [phone, setPhone] = useState('');
    const [status, setStatus] = useState(0);
    const [users, setUsers] = useState([])

    const [isAddWorkspaceOpen, setIsAddWorkspaceOpen] = useState(false);
    const [isEditWorkspaceOpen, setIsEditWorkspaceOpen] = useState(false);
    const [isChangeWorkspaceOpen, setIsChangeWorkspaceOpen] = useState(false);
    const [isUserWorkspaceOpen, setIsUserWorkspaceOpen] = useState(false);
    const [isApproveRejectOpen, setIsApproveRejectOpen] = useState(false);
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    const [workspaces, setWorkspaces] = useState([]);
    const [userWorkspaces, setUserWorkspaces] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    
    const [email, setEmail] = useState('');
    
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [workspaceError, setWorkspaceError] = useState('');
    const [addingWorkspace, setAddingWorkspace] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState(false);
    
    const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
    const [addingUser, setAddingUser] = useState(false);

    const API_URL = process.env.REACT_APP_API_BASE_URL

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setOwnerUserID(user.id)
        fetchWorkspaces(user.id);
        fetchUsers()
        fetchUserWorkspaces(user.id)
    }, []);

    useEffect(() => {
        if (isEditWorkspaceOpen && selectedWorkspace) {
            const workspace = workspaces.find(w => w.id === parseInt(selectedWorkspace));
            if (workspace) {
                setWorkspaceName(workspace.name)
                setOwnerType(workspace.ownerType)
                setOwnerName(workspace.ownerName)
                setAddressLine1(workspace.addressLine1)
                setCity(workspace.city)
                setCountry(workspace.country)
                setStatus(workspace.status)
                setEmail(workspace.email || '')
                setPhone(workspace.phone || '')
            }
        } else{
            setWorkspaceName('')
        }
    }, [isEditWorkspaceOpen, selectedWorkspace, workspaces]);

    const fetchWorkspaces = async (userid) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/Workspace/GetWorkspacesByUserId/${userid}`,{
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Error fetching workspaces data!');
            }
            
            const data = await response.json();
            setWorkspaces(data.workspaces || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching Workspaces:', err);
        } finally {
            setLoading(false);
        }
    };

    // Keep only functions that are still needed for other parts
    const validateEditWorkspace = () => {
        if (!selectedWorkspace) {
            return 'Please select a workspace';
        }
        if (!workspaceName.trim()) {
            return 'Workspace name is required';
        }
        if (!ownerType) {
            return 'Owner type is required';
        }
        if (!ownerName.trim()) {
            return 'Owner name is required';
        }
        if (!email.trim()) {
            return 'Email is required';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return 'Please enter a valid email address';
        }
        if (!phone.trim()) {
            return 'Phone is required';
        }
        if (!addressLine1.trim()) {
            return 'Address Line 1 is required';
        }
        if (!city.trim()) {
            return 'City is required';
        }
        if (!country) {
            return 'Country is required';
        }
        return '';
    };

    const handleEditWorkspace = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        setWorkspaceError('');
        const validationError = validateEditWorkspace();
        if (validationError) {
            setWorkspaceError(validationError);
            return;
        }

        try {
            setEditingWorkspace(true);
            const response = await fetch(`${API_URL}/api/Workspace/UpdateWorkspace/${selectedWorkspace}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: selectedWorkspace,
                    name: workspaceName,
                    ownerUserID: ownerUserID,
                    ownerType: ownerType,
                    ownerName: ownerName,
                    email: email,
                    phone: phone,
                    addressLine1: addressLine1,
                    city: city,
                    country: country,
                    status: status
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setWorkspaceError(errorData.message || `Failed to update workspace: ${response.status}`);
                return;
            }
            
            const data = await response.json();
            setSuccessMessage(data.message || 'Workspace updated successfully');
            setTimeout(() => {
                setIsEditWorkspaceOpen(false);
                const user = JSON.parse(localStorage.getItem('user'));
                fetchWorkspaces(user.id);
                setWorkspaceName('')
                setOwnerType(1)
                setOwnerName('')
                setEmail('')
                setPhone('')
                setAddressLine1('')
                setCity('')
                setCountry('')
                setStatus(0)
            }, 2000);
        } catch (err) {
            setWorkspaceError(err.message);
        } finally {
            setEditingWorkspace(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    const addUserToWorkSpace = async() => {
        if (!selectedUser || !selectedWorkspace) {
            toast.error('Please select a user and workspace');
            return;
        }

        try {
            setAddingUser(true);
            
            // First, check if user already exists in this workspace
            const userInWorkspaceCheck = await fetch(
                `${API_URL}/api/UserWorkspace/CheckUserInWorkspace/${selectedUser}/${selectedWorkspace}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            if (userInWorkspaceCheck.ok) {
                const checkData = await userInWorkspaceCheck.json();
                if (checkData.exists) {
                    toast.error('User is already in this workspace');
                    setAddingUser(false);
                    return;
                }
            }

            // Get user details to check if they have a default workspace
            const userResponse = await fetch(
                `${API_URL}/api/UserManagement/GetUserById/${selectedUser}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            if (!userResponse.ok) {
                const errorData = await userResponse.json();
                throw new Error(errorData.message || 'Failed to fetch user details');
            }

            const userData = await userResponse.json();
            const user = userData.user || userData;
            
            // Check if user already has a default workspace
            const hasDefaultWorkspace = user.defaultWorkspaceId && 
                                       user.defaultWorkspaceId !== null && 
                                       user.defaultWorkspaceId !== 0 && 
                                       user.defaultWorkspaceId !== undefined;
            
            // Add user to workspace
            const response = await fetch(`${API_URL}/api/UserWorkspace/AddUserWorkspace`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userID: selectedUser,
                    workspaceID: selectedWorkspace,
                    role: 2,
                    status: 1
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add user to workspace');
            }
            
            // Only update default workspace if user doesn't have one
            if (!hasDefaultWorkspace) {
                try {
                    await updateUserDefaultWorkspace(selectedUser);
                    toast.success('User added to workspace and default workspace set successfully');
                } catch (updateError) {
                    // Even if default workspace update fails, the user was still added to workspace
                    toast.success('User added to workspace (failed to set default workspace)');
                    console.error('Failed to update default workspace:', updateError);
                }
            } else {
                toast.success('User added to workspace (kept existing default workspace)');
            }
            
            // Reset selection
            setSelectedUser('');
            
            // Refresh data
            const loggedInUser = JSON.parse(localStorage.getItem('user'));
            fetchWorkspaces(loggedInUser.id);
            
            // Close modal after successful addition
            setTimeout(() => {
                setIsUserWorkspaceOpen(false);
            }, 1500);
            
        } catch (err) {
            console.error('Error adding user to workspace:', err);
            toast.error(err.message || 'Failed to add user to workspace');
        } finally {
            setAddingUser(false);
        }
    }

    const updateUserDefaultWorkspace = async (userId) => {
        const response = await fetch(`${API_URL}/api/UserManagement/UpdateDefaultWorkspaceByUserId/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                defaultWorkspaceId: selectedWorkspace
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update default workspace');
        }
        
        return await response.json();
    }

    const handleOptionClick = (works) => {
        setWorkspaceName(works.name)
        setOwnerType(works.ownerType)
        setOwnerName(works.ownerName)
        setEmail(works.email || '')
        setPhone(works.phone || '')
        setAddressLine1(works.addressLine1)
        setCity(works.city)
        setCountry(works.country)
        setStatus(works.status)
    }

    const fetchUserWorkspaces = async (userid) =>{
        try {
            const response = await fetch(`${API_URL}/api/UserWorkspace/GetWorkspacesByUserId/${userid}`,{
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Error fetching user workspaces data!');
            }
            
            const data = await response.json();
            setUserWorkspaces(data.userWorkspaces || []);
            
        } catch (err) {
            setError(err.message);
            console.error('Error fetching User workspaces:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleApproveRejectClose = () => {
        setIsApproveRejectOpen(false);
    };

    return (
        <div className="settings-content">
            <div className="settings-action-buttons">
                
                <button
                    className="btn-secondary"
                    onClick={() => setIsEditWorkspaceOpen(true)}
                    hidden={!(userRole === "Admin" && selectedWorkspace)}
                >
                    Edit Workspace
                </button>
                <button
                    className="btn-secondary"
                    onClick={() => setIsApproveRejectOpen(true)}
                    hidden={!(userRole === "Admin")}
                >
                    Approve/Reject Workspace
                </button>
                <button
                    className="btn-secondary"
                    onClick={() => setIsUserWorkspaceOpen(true)}
                    disabled={!((userRole === "Admin" || workspaceRole == 1) && selectedWorkspace)}
                >
                    Add User to Workspace
                </button>
                <button
                    className="btn-secondary"
                    onClick={() => setIsManageUsersOpen(true)}
                    disabled={!selectedWorkspace || (userRole !== "Admin" && workspaceRole !== 1)}
                >
                    Manage Users
                </button>
            </div>
            <div className="settings-lookup-list">
                <h4>Workspace</h4>
                <select
                    size="5"
                    className="lookup-select"
                    value={selectedWorkspace}
                    onChange={(e) => setSelectedWorkspace(e.target.value)}
                >
                    <option disabled value="">
                        Select a Workspace
                    </option>
                    {workspaces.map((workspace) => (
                        <option
                            onClick={() => handleOptionClick(workspace)}
                            key={workspace.id}
                            value={workspace.id}
                        >
                            {workspace.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Edit Workspace Modal */}
            <Modal
                isOpen={isEditWorkspaceOpen}
                onClose={() => { setIsEditWorkspaceOpen(false); setSuccessMessage(''); setWorkspaceError(''); }}
                title="Edit Workspace"
            >
                <div className="settings-form">
                    {successMessage && (
                        <div className="success-message">
                            <i className="fas fa-check-circle"></i> {successMessage}
                        </div>
                    )}
                    <form onSubmit={(e) => { e.preventDefault(); handleEditWorkspace(e); }}>
                        <div className="settings-form user-form-grid">
                            <div className="form-group">
                                <label>Workspace Name:</label>
                                <input
                                    type="text"
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    placeholder="Enter workspace name"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Owner Type:</label>
                                <select
                                    value={ownerType}
                                    onChange={(e) => setOwnerType(e.target.value)}
                                >
                                    <option value="1">Individual</option>
                                    <option value="2">Company</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Owner Name:</label>
                                <input
                                    type="text"
                                    value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    placeholder="Enter Owner name"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email:</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter email"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone:</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Enter phone"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Address Line 1:</label>
                                <input
                                    type="text"
                                    value={addressLine1}
                                    onChange={(e) => setAddressLine1(e.target.value)}
                                    placeholder="Enter address Line 1"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>City:</label>
                                <input
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="Enter city"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Country:</label>
                                <select
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>
                                        Select Country
                                    </option>
                                    <option value="United States">United States</option>
                                    <option value="Canada">Canada</option>
                                    <option value="United Kingdom">United Kingdom</option>
                                    <option value="Australia">Australia</option>
                                    <option value="Germany">Germany</option>
                                    <option value="France">France</option>
                                    <option value="Japan">Japan</option>
                                    <option value="Brazil">Brazil</option>
                                    <option value="India">India</option>
                                    <option value="China">China</option>
                                    <option value="Djibouti">Djibouti</option>
                                    <option value="Ethiopia">Ethiopia</option>
                                </select>
                            </div>
                        </div>
                        {workspaceError && <div className="error-message">{workspaceError}</div>}
                        <div className="modal-footer">
                            <button className="btn-primary" type="submit" disabled={editingWorkspace || !selectedWorkspace || !workspaceName || !ownerType || !ownerName || !email || !phone || !addressLine1 || !city || !country}>
                                {editingWorkspace ? 'Updating...' : 'Update'}
                            </button>
                            <button
                                className="btn-close"
                                type="button"
                                onClick={() => { setIsEditWorkspaceOpen(false); setSuccessMessage(''); setWorkspaceError(''); }}
                                disabled={editingWorkspace}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Approve/Reject Workspace Modal */}
            <Modal
                isOpen={isApproveRejectOpen}
                onClose={handleApproveRejectClose}
                title="Approve/Reject Workspace Requests"
                size="large"
            >
                <ApproveRejectWorkspace 
                    onClose={handleApproveRejectClose}
                />
            </Modal>

            {/* User Workspace Modal */}
            <Modal
                isOpen={isUserWorkspaceOpen}
                onClose={() => setIsUserWorkspaceOpen(false)}
                title="Add User to Workspace"
            >
                <div className="settings-form">
                    <div className="settings-form">
                        <div className="form-group">
                            <label>Users:</label>
                            <select
                                size="5"
                                className="lookup-select"
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                            >
                                <option value="">Select a User</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.userName}
                                    </option>
                                ))}
                            </select>
                           
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn-primary" 
                                disabled={!selectedUser || addingUser}  
                                onClick={addUserToWorkSpace}
                            >
                                {addingUser ? 'Adding...' : 'Add to Workspace'}
                            </button>
                            <button
                                className="btn-close"
                                onClick={() => setIsUserWorkspaceOpen(false)}
                                disabled={addingUser}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Change Workspace Modal */}
            <ChangeWorkspaceModal
                isOpen={isChangeWorkspaceOpen}
                onClose={() => setIsChangeWorkspaceOpen(false)}
                ownerUserID={ownerUserID}
                onUpdateDefaultWorkspace={onUpdateDefaultWorkspace}
                onWorkspaceChanged={(workspaceId, workspaceName) => {
                    setSelectedWorkspace(workspaceId);
                }}
            />
            
            {/* Manage Users Modal */}
            <ManageWorkspaceUsersModal
                isOpen={isManageUsersOpen}
                onClose={() => setIsManageUsersOpen(false)}
                workspaceId={selectedWorkspace}
                workspaceName={workspaces.find(w => w.id === parseInt(selectedWorkspace))?.name || ''}
                allUsers={users}
            />
        </div>
    );
}

export default WorkspaceManagement;