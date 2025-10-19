import React, { useState, useEffect, useRef } from 'react';
import './ViewNoteModal.css';

const ViewNoteModal = ({ noteId, onClose, documents = [], currentTheme, onViewAttachments }) => {
    const [currentNote, setCurrentNote] = useState(null);
    const [filteredDocuments, setFilteredDocuments] = useState([]);
    
    const noteRefs = useRef({});
    const chatContainerRef = useRef(null);

    useEffect(() => {
        const selectedNote = documents.find(doc => doc.id === noteId);
        setCurrentNote(selectedNote);

        if (selectedNote) {
            const filtered = documents.filter(doc =>
                doc.project === selectedNote.project && doc.job === selectedNote.job
            ).sort((a, b) => new Date(a.date) - new Date(b.date));

            setFilteredDocuments(filtered);
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
                if (noteRefs.current[noteId]) {
                    noteRefs.current[noteId].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 0);
        }
    }, [noteId, documents]);

    if (!currentNote) return null;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`view-note-modal-overlay theme-${currentTheme}`}>
            <div className="view-note-modal">
                <div className="whatsapp-header">
                    <div className="header-left">
                        <button className="back-button" onClick={onClose}>
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <div className="contact-info">
                            <div className="contact-name">Project: {currentNote.project}</div>
                            <div className="contact-status">Job: {currentNote.job}</div>
                        </div>
                    </div>
                    <div className="header-right">
                        <button className="header-button">
                            <i className="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>

                <div className="whatsapp-chat" id="chat-container" ref={chatContainerRef}>
                    {filteredDocuments.map((doc) => (
    <div
        key={doc.id}
        ref={el => noteRefs.current[doc.id] = el}
        className="message-row"
    >
        <div className={`message received ${doc.id === noteId ? 'selected' : ''}`}>
            <div className="message-content">
                <div className="message-header">
                    <span className="sender-name">{doc.userName}</span>
                    <span className="message-time">
                        {formatDate(doc.noteDate)} - {formatTime(doc.noteDate)}
                    </span>
                </div>
                <div className="message-text">
                    {doc.note}
                </div>
            </div>
        </div>

        {doc.documentCount > 0 && (
            <div className="paperclip-container">
                <button 
                    className="paperclip-button"
                    onClick={() => onViewAttachments(doc)} 
                    title={`View ${doc.documentCount} attached file(s)`}
                >
                     <span className="document-count-badge">({doc.documentCount}) </span>
                    <i className="fas fa-paperclip"></i>
                </button>
            </div>
        )}
    </div>
))}
                </div>
                
                <div className="whatsapp-footer">
                    <button className="close-chat-button" onClick={onClose}>
                        <i className="fas fa-times"></i>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewNoteModal;