import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import './WorkspaceRequestModal.css';
import toast from 'react-hot-toast';

const WorkspaceRequestModal = ({
    isOpen,
    onClose,
    refreshNotes,
    userid
}) => {
    const [proposedName, setproposedName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState(null);
    
    const workspaceNameRef = useRef(null);

    const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

    useEffect(() => {
        if (isOpen) {
            setproposedName('');
            setErrors({});
            setApiError(null);
            setIsSubmitting(false);
            
            // Focus on workspace name input when modal opens
            setTimeout(() => {
                if (workspaceNameRef.current) {
                    workspaceNameRef.current.focus();
                }
            }, 100);
        }
    }, [isOpen]);

    const validateForm = () => {
        const newErrors = {};
        
        if (!proposedName.trim()) {
            newErrors.proposedName = "Workspace name is required";
        } 
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setApiError(null);

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            
            const requestData = {
                proposedName: proposedName.trim(),
                requesterUserId: userid || user?.id,
            };

            const response = await fetch(`${apiUrl}/WorkspaceRequest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to submit workspace request');
            }

            const result = await response.json();
            
            toast.success('Workspace request submitted successfully!');
            console.log('Workspace request submitted:', result);
            
            // Reset form and close modal
            setproposedName('');
            onClose();
            
        } catch (error) {
            console.error('Workspace request error:', error);
            setApiError(error.message || 'Failed to submit workspace request. Please try again.');
            toast.error('Failed to submit workspace request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = useCallback((event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            if (!isSubmitting) {
                handleSubmit();
            }
        }
    }, [isSubmitting, handleSubmit]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Request New Workspace">
            <div className="workspace-request-content">
                <div className="form-group">
                    <label htmlFor="proposedName">
                        Workspace Name *
                    </label>
                    {errors.proposedName && (
                        <span className="error-message-inline">{errors.proposedName}</span>
                    )}
                    <input
                        ref={workspaceNameRef}
                        id="proposedName"
                        type="text"
                        value={proposedName}
                        onChange={(e) => {
                            setproposedName(e.target.value);
                            setErrors(prev => ({ ...prev, proposedName: undefined }));
                        }}
                        placeholder="Enter workspace name..."
                        className={errors.proposedName ? 'error' : ''}
                    />
                </div>

                <div className="info-section">
                    <div className="info-icon">
                        <i className="fas fa-info-circle"></i>
                    </div>
                    <div className="info-content">
                        <h4>What happens next?</h4>
                        <ul>
                            <li>Your request will be sent for review</li>
                            <li>You'll receive a notification once your request is processed</li>
                            <li>Approved workspaces will be available in your workspace list</li>
                        </ul>
                    </div>
                </div>

                {apiError && (
                    <div className="error-message">
                        {apiError}
                        <button 
                            onClick={() => setApiError(null)} 
                            className="dismiss-error"
                        >
                            ×
                        </button>
                    </div>
                )}
            </div>

            <div className="modal-footer">
                <button 
                    className="cancel-button" 
                    onClick={onClose} 
                    disabled={isSubmitting}
                >
                    Cancel
                </button>

                <button
                    className="submit-button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !proposedName.trim()}
                >
                    {isSubmitting ? (
                        <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Submitting...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-paper-plane"></i>
                            Submit Request
                        </>
                    )}
                </button>
            </div>
        </Modal>
    );
};

WorkspaceRequestModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    refreshNotes: PropTypes.func,
    userid: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

WorkspaceRequestModal.defaultProps = {
    refreshNotes: () => {},
    userid: null
};

export default WorkspaceRequestModal;