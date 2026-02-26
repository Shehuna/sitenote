import React from 'react';
import './ConfirmationModal.css';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container confirmation-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title || 'Confirm Action'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <p>{message || 'Are you sure you want to proceed?'}</p>
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        {cancelText}
                    </button>
                    <button className="btn-primary" onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;