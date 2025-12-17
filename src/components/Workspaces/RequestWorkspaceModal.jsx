import React, { useState } from 'react';
import Modal from '../Modals/Modal';
import toast from 'react-hot-toast';

const RequestWorkspaceModal = ({ isOpen, onClose, ownerUserID, onWorkspaceAdded }) => {
    const [workspaceName, setWorkspaceName] = useState('');
    const [ownerType, setOwnerType] = useState(1);
    const [ownerName, setOwnerName] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    
    const [workspaceError, setWorkspaceError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [addingWorkspace, setAddingWorkspace] = useState(false);

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

    const API_URL = process.env.REACT_APP_API_BASE_URL;

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
            
            // Reset form fields
            setWorkspaceName('');
            setOwnerType(1);
            setOwnerName('');
            setEmail('');
            setPhone('');
            setAddressLine1('');
            setCity('');
            setCountry('');
            
            // Notify parent component and close modal after delay
            setTimeout(() => {
                if (onWorkspaceAdded) {
                    onWorkspaceAdded();
                }
                onClose();
            }, 2000);
            
        } catch (err) {
            setWorkspaceError(err.message);
            console.error('Error adding workspace:', err);
        } finally {
            setAddingWorkspace(false);
        }
    };

    const handleClose = () => {
        // Reset all fields on close
        setWorkspaceName('');
        setOwnerType(1);
        setOwnerName('');
        setEmail('');
        setPhone('');
        setAddressLine1('');
        setCity('');
        setCountry('');
        setSuccessMessage('');
        setWorkspaceError('');
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Request Workspace"
        >
            <div className="settings-form">
                {successMessage && (
                    <div className="success-message">
                        <i className="fas fa-check-circle"></i> {successMessage}
                    </div>
                )}
                <form onSubmit={handleAddWorkspace}>
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
                        <button 
                            className="btn-primary" 
                            type="submit" 
                            disabled={addingWorkspace || !workspaceName || !ownerType || !ownerName || !email || !phone || !addressLine1 || !city || !country}
                        >
                            {addingWorkspace ? 'Requesting...' : 'Request Workspace'}
                        </button>
                        <button
                            className="btn-close"
                            type="button"
                            onClick={handleClose}
                            disabled={addingWorkspace}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default RequestWorkspaceModal;