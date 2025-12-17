import React, { useState, useEffect } from 'react'
import Modal from '../Modals/Modal';
import toast from 'react-hot-toast';

const ChangeWorkspaceModal = ({ 
  isOpen, 
  onClose, 
  ownerUserID, 
  onUpdateDefaultWorkspace,
  
}) => {
    
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const API_URL = process.env.REACT_APP_API_BASE_URL;

    useEffect(() => {
        if (isOpen && ownerUserID) {
            fetchWorkspaces(ownerUserID);
        }
    }, [isOpen, ownerUserID]);

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
            console.error('Error fetching workspaces:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateUserDefaultWorkspace = async (userId, workspaceId) => {
        try {
            const response = await fetch(`${API_URL}/api/UserManagement/UpdateDefaultWorkspaceByUserId/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    defaultWorkspaceId: workspaceId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update default workspace');
            }
            
            return await response.json();
        } catch (err) {
            console.error('Error updating default workspace:', err);
            throw err;
        }
    };

    const handleWorkspaceChange = async () => {
        if (!selectedWorkspace) {
            toast.error('Please select a workspace');
            return;
        }

        const selectedWorkspaceData = workspaces.find(w => w.id === parseInt(selectedWorkspace));
        if (!selectedWorkspaceData) {
            toast.error('Invalid workspace selection');
            return;
        }

        try {
            // Update default workspace in database
            await updateUserDefaultWorkspace(ownerUserID, selectedWorkspace);
            
            // Update in parent component
            onUpdateDefaultWorkspace(selectedWorkspace, selectedWorkspaceData.name);
            
            toast.success(`Workspace changed to ${selectedWorkspaceData.name}`);
            onClose();
        } catch (err) {
            console.error('Error changing workspace:', err);
            toast.error(err.message || 'Failed to change workspace');
        }
    };

    const handleOptionClick = (works) => {
        setSelectedWorkspace(works.id.toString());
    };

    if (loading && isOpen) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Change Workspace">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading workspaces...</p>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Change Workspace"
        >
            <div className="settings-form">
                <div className="form-group">
                    <label>Select Workspace:</label>
                    <select
                        value={selectedWorkspace}
                        onChange={(e) => setSelectedWorkspace(e.target.value)}
                        className="workspace-select"
                    >
                        <option value="">Select a Workspace</option>
                        {workspaces.map((workspace) => (
                            <option
                                key={workspace.id}
                                value={workspace.id}
                            >
                                {workspace.name} {workspace.status === 0 ? '(Pending)' : ''}
                            </option>
                        ))}
                    </select>
                    {error && <div className="error-message">{error}</div>}
                </div>
                <div className="modal-footer">
                    <button 
                        className="btn-primary" 
                        onClick={handleWorkspaceChange}
                        disabled={!selectedWorkspace}
                    >
                        Change Workspace
                    </button>
                    <button
                        className="btn-close"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default ChangeWorkspaceModal;