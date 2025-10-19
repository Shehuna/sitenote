import React from 'react';
import './Modal.css';

export default function Modal({ isOpen, onClose, title, children, customClass }) {
  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${customClass || ''}`}> 
      
      <div className="modal-content">
        <span className="close-btn" onClick={onClose}>&times;</span>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}