// SlideshowModal.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './SlideshowModal.css';

const SlideshowModal = ({ isOpen, onClose, notes, currentNoteIndex = 0, jobName }) => {
  const [currentIndex, setCurrentIndex] = useState(currentNoteIndex);
  const [isFullscreen, setIsFullscreen] = useState(true);

  useEffect(() => {
    setCurrentIndex(currentNoteIndex);
  }, [currentNoteIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, notes.length]);

  const handleNext = () => {
    if (currentIndex < notes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  const currentNote = notes[currentIndex];

  return (
    <div className="slideshow-modal-overlay" onClick={onClose}>
      <div className="slideshow-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="slideshow-modal-header">
          <div className="slideshow-title">
            <i className="fas fa-images" />
            <span>{jobName || 'Notes'} - Slideshow</span>
          </div>
          <div className="slideshow-controls">
            <button className="slideshow-btn" onClick={onClose} title="Close (Esc)">
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="slideshow-body">
          {/* Navigation buttons */}
          <button 
            className="slideshow-nav prev" 
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            title="Previous (←)"
          >
            <i className="fas fa-chevron-left" />
          </button>

          {/* Note display */}
          <div className="slideshow-note-container">
            <div className="slideshow-note">
              <div className="slideshow-note-header">
                <div className="slideshow-note-meta">
                  <span className="slideshow-note-index">
                    {currentIndex + 1} / {notes.length}
                  </span>
                  <span className="slideshow-note-user">
                    <i className="fas fa-user" /> {currentNote?.userName || 'Unknown'}
                  </span>
                  <span className="slideshow-note-date">
                    <i className="fas fa-calendar" /> {formatDate(currentNote?.date || currentNote?.timeStamp)}
                  </span>
                </div>
                {(currentNote?.project || currentNote?.job) && (
                  <div className="slideshow-note-location">
                    {currentNote?.project && <span><i className="fas fa-folder" /> {currentNote.project}</span>}
                    {currentNote?.job && <span><i className="fas fa-briefcase" /> {currentNote.job}</span>}
                  </div>
                )}
              </div>
              
              <div className="slideshow-note-content">
                {currentNote?.note || currentNote?.content || 'No content'}
              </div>

              {currentNote?.imageUrl && (
                <div className="slideshow-note-image">
                  <img src={currentNote.imageUrl} alt="Note attachment" />
                </div>
              )}
            </div>
          </div>

          <button 
            className="slideshow-nav next" 
            onClick={handleNext}
            disabled={currentIndex === notes.length - 1}
            title="Next (→)"
          >
            <i className="fas fa-chevron-right" />
          </button>
        </div>

        {/* Footer with thumbnails */}
        {notes.length > 1 && (
          <div className="slideshow-footer">
            <div className="slideshow-thumbnails">
              {notes.map((note, idx) => (
                <div
                  key={note.id || idx}
                  className={`slideshow-thumbnail ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                  title={`Go to note ${idx + 1}`}
                >
                  <div className="thumbnail-content">
                    <span className="thumbnail-index">{idx + 1}</span>
                    <span className="thumbnail-preview">
                      {(note.note || note.content || '').substring(0, 20)}...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

SlideshowModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  notes: PropTypes.array.isRequired,
  currentNoteIndex: PropTypes.number,
  jobName: PropTypes.string,
};

export default SlideshowModal;