import React, { useEffect, useState } from 'react'
import Modal from '../Modals/Modal';
import ApproveRejectWorkspace from './ApproveRejectWorkspace';
import toast from 'react-hot-toast';
import ManageWorkspaceUsersModal from './ManageWorkspaceUsersModal';

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

    const COUNTRY_OPTIONS = [
        "United States",
        "Canada",
        "United Kingdom",
        "Australia",
        "Germany",
        "France",
        "Japan",
        "Brazil",
        "India",
        "China",
        "Djibouti",
        "Ethiopia",
    ];

    const API_URL = process.env.REACT_APP_API_BASE_URL

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setOwnerUserID(user.id)
        fetchWorkspaces(user.id);
        fetchUsers()
        fetchUserWorkspaces(user.id)
    }, []);

    useEffect(() => {
        if (isChangeWorkspaceOpen && selectedWorkspace) {
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
    }, [isChangeWorkspaceOpen, selectedWorkspace, workspaces]);

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

    const validateAddWorkspace = () => {
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

    const handleAddWorkspace = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        setWorkspaceError('');
        const validationError = validateAddWorkspace();
        if (validationError) {
            setWorkspaceError(validationError);
            return;
        }
        try {
            setAddingWorkspace(true);
            const response = await fetch(`${API_URL}/api/Workspace/AddWorkspace`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: workspaceName,
                    ownerUserID: ownerUserID,
                    ownerType: ownerType,
                    ownerName: ownerName,
                    email: email,
                    phone: phone,
                    addressLine1: addressLine1,
                    city: city,
                    country: country,
                    status: 0 // Set status to 0 for pending approval
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setWorkspaceError(errorData.message || `Failed to add workspace: ${response.status}`);
                return;
            }
            const data = await response.json();
            setSuccessMessage(data.message || 'Workspace requested successfully. Waiting for approval.');
            setTimeout(() => {
                setIsAddWorkspaceOpen(false);
                const user = JSON.parse(localStorage.getItem('user'));
                fetchWorkspaces(user.id); 
            }, 2000);
            setWorkspaceName('')
            setOwnerType(1)
            setOwnerName('')
            setEmail('')
            setPhone('')
            setAddressLine1('')
            setCity('')
            setCountry('')
            setStatus(0)
        } catch (err) {
            setWorkspaceError(err.message);
            console.error('Error adding workspace:', err);
        } finally {
            setAddingWorkspace(false);
        }
    };

    const openAddWorkspaceModal = () => {
        setSuccessMessage('');
        setWorkspaceError('');
        setWorkspaceName('')
        setOwnerType(1)
        setOwnerName('')
        setEmail('')
        setPhone('')
        setAddressLine1('')
        setCity('')
        setCountry('')
        setStatus(0)
        setIsAddWorkspaceOpen(true);
    };

    const openEditWorkspaceModal = () => {
        setSuccessMessage('');
        setWorkspaceError('');
        setIsEditWorkspaceOpen(true);
    };

    const openApproveRejectModal = () => {
        setIsApproveRejectOpen(true);
    };

    const addUserToWorkSpace = async() => {
        try {
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

            if (!response.ok) throw new Error('Failed to add user to workspace');
            toast.success('User Added to workspace Successfully')
            await updateUserDefaultWorkspace(selectedUser)
            const user = JSON.parse(localStorage.getItem('user'));
            fetchWorkspaces(user.id);
        } catch (err) {
            setError(err.message);
            console.error('Error adding user to workspace:', err);
        }
    }

    const updateDefWorkspace = async () =>{
        onUpdateDefaultWorkspace(selectedWorkspace, workspaceName)
        setIsChangeWorkspaceOpen(false)
        await updateUserDefaultWorkspace(ownerUserID)
    }

    const updateUserDefaultWorkspace = async (userId) =>{
        try {
            const response = await fetch(`${API_URL}/api/UserManagement/UpdateDefaultWorkspaceByUserId/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    defaultWorkspaceId: selectedWorkspace
                }),
            });

            if (!response.ok) throw new Error('Failed to update default workspace');
            else toast.success('Default workspace updated successfully')
        } catch (err) {
            setError(err.message);
            console.error('Error updating default workspace:', err);
        }
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
                    className="btn-primary"
                    onClick={openAddWorkspaceModal}
                >
                    Request Workspace
                </button>
                <button
                    className="btn-secondary"
                    onClick={openEditWorkspaceModal}
                    hidden={!(userRole === "Admin" && selectedWorkspace)}
                >
                    Edit Workspace
                </button>
                <button
                    className="btn-secondary"
                    onClick={openApproveRejectModal}
                    hidden={!(userRole === "Admin")}
                >
                    Approve/Reject Workspace
                </button>
                <button
                    className="btn-secondary"
                    onClick={() => setIsUserWorkspaceOpen(true)}
                    disabled={!((userRole === "Admin" || workspaceRole == 1) && selectedWorkspace)}
                >
                    User Workspace
                </button>
                <button
                    className="btn-secondary"
                    onClick={() => setIsChangeWorkspaceOpen(true)}
                >
                    Select Workspace
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
            
            {/* Add Workspace Modal */}
            <Modal
                isOpen={isAddWorkspaceOpen}
                onClose={() => { setIsAddWorkspaceOpen(false); setSuccessMessage(''); setWorkspaceError(''); }}
                title="Request Workspace"
            >
                <div className="settings-form">
                    {successMessage && (
                        <div className="success-message">
                            <i className="fas fa-check-circle"></i> {successMessage}
                        </div>
                    )}
                    <form onSubmit={(e) => { e.preventDefault(); handleAddWorkspace(e); }}>
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
                                <label htmlFor="country-select">Country:</label>
                                <select
                                    id="country-select"
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>
                                        Select Country
                                    </option>
                                    {COUNTRY_OPTIONS.map((countryName) => (
                                        <option key={countryName} value={countryName}>
                                            {countryName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {workspaceError && <div className="error-message">{workspaceError}</div>}
                        <div className="modal-footer">
                            <button className="btn-primary" type="submit" disabled={addingWorkspace || !workspaceName || !ownerType || !ownerName || !email || !phone || !addressLine1 || !city || !country}>
                                {addingWorkspace ? 'Requesting...' : 'Request Workspace'}
                            </button>
                            <button
                                className="btn-close"
                                type="button"
                                onClick={() => { setIsAddWorkspaceOpen(false); setSuccessMessage(''); setWorkspaceError(''); }}
                                disabled={addingWorkspace}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

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
                                <label htmlFor="country-select">Country:</label>
                                <select
                                    id="country-select"
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>
                                        Select Country
                                    </option>
                                    {COUNTRY_OPTIONS.map((countryName) => (
                                        <option key={countryName} value={countryName}>
                                            {countryName}
                                        </option>
                                    ))}
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
                            <button className="btn-primary" disabled={!selectedUser}  onClick={addUserToWorkSpace}>
                                Add
                            </button>
                            <button
                                className="btn-close"
                                onClick={() => setIsUserWorkspaceOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Change Workspace Modal */}
            <Modal
                isOpen={isChangeWorkspaceOpen}
                onClose={() => setIsChangeWorkspaceOpen(false)}
                title="Change Workspace"
            >
                <div className="settings-form">
                    <div className="settings-form">
                        <div className="form-group">
                            <label>Workspaces:</label>
                            <select
                                value={selectedWorkspace}
                                onChange={(e) => setSelectedWorkspace(e.target.value)}
                            >
                                <option value="">Select Workspaces</option>
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
                        <div className="modal-footer">
                            <button className="btn-primary" onClick={updateDefWorkspace}>
                                Change
                            </button>
                            <button
                                className="btn-close"
                                onClick={() => setIsChangeWorkspaceOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
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

export default WorkspaceManagement