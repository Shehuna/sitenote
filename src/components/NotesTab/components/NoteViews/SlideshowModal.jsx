// SlideshowModal.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import './SlideshowModal.css';

const SlideshowModal = ({ isOpen, onClose, notes, currentNoteIndex = 0, jobName }) => {
  const [currentIndex, setCurrentIndex] = useState(currentNoteIndex);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    setCurrentIndex(currentNoteIndex);
  }, [currentNoteIndex]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'h' || e.key === 'H') {
        setShowControls(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, notes.length, isFullscreen]);

  // Auto-hide controls
  useEffect(() => {
    if (!isOpen) return;

    const resetTimer = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    resetTimer();

    const handleMouseMove = () => resetTimer();
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (currentIndex < notes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, notes.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const toggleFullscreen = useCallback(() => {
    const element = document.querySelector('.slideshow-modal-content');
    if (!document.fullscreenElement) {
      element.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleString();
  };

  // Function to strip HTML and get plain text for thumbnail preview
  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  if (!isOpen) return null;

  const currentNote = notes[currentIndex];

  return (
    <div className="slideshow-modal-overlay" onClick={onClose}>
      <div className="slideshow-modal-content" onClick={e => e.stopPropagation()}>
        {/* Top Controls Bar - PowerPoint style */}
        <div className={`slideshow-top-bar ${showControls ? 'visible' : 'hidden'}`}>
          <div className="slideshow-top-bar-left">
            <button className="slideshow-btn" onClick={onClose} title="Close (Esc)">
              <i className="fas fa-times" />
            </button>
            <span className="slideshow-title">
              <i className="fas fa-images" />
              {jobName || 'Notes'} - Slide {currentIndex + 1} of {notes.length}
            </span>
          </div>
          <div className="slideshow-top-bar-right">
            <button 
              className="slideshow-btn" 
              onClick={toggleFullscreen} 
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`} />
            </button>
           
          </div>
        </div>

        {/* Main content area */}
        <div className="slideshow-body">
          {/* Note display - centered like PowerPoint */}
          <div className="slideshow-note-container">
            <div className="slideshow-note">
              <div className="slideshow-note-header">
                <div className="slideshow-note-meta">
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
              
              <div 
                className="slideshow-note-content"
                dangerouslySetInnerHTML={{ 
                  __html: currentNote?.note || currentNote?.content || 'No content' 
                }}
              />

              {currentNote?.imageUrl && (
                <div className="slideshow-note-image">
                  <img src={currentNote.imageUrl} alt="Note attachment" />
                </div>
              )}
            </div>
          </div>

          {/* Navigation arrows - PowerPoint style */}
          <button 
            className={`slideshow-nav prev ${showControls ? 'visible' : 'hidden'}`} 
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            title="Previous (←)"
          >
            <i className="fas fa-chevron-left" />
          </button>

          <button 
            className={`slideshow-nav next ${showControls ? 'visible' : 'hidden'}`} 
            onClick={handleNext}
            disabled={currentIndex === notes.length - 1}
            title="Next (→)"
          >
            <i className="fas fa-chevron-right" />
          </button>
        </div>

        {/* Bottom thumbnails bar - PowerPoint style */}
        <div className={`slideshow-footer ${showControls ? 'visible' : 'hidden'}`}>
          <div className="slideshow-thumbnails-container">
            <button 
              className="thumbnails-nav prev" 
              onClick={() => {
                const container = document.querySelector('.slideshow-thumbnails');
                container.scrollBy({ left: -200, behavior: 'smooth' });
              }}
              title="Scroll left"
            >
              <i className="fas fa-chevron-left" />
            </button>
            
            <div className="slideshow-thumbnails">
              {notes.map((note, idx) => {
                const noteContent = note.note || note.content || '';
                return (
                  <div
                    key={note.id || idx}
                    className={`slideshow-thumbnail ${idx === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(idx)}
                  >
                    <div className="thumbnail-number">{idx + 1}</div>
                    <div className="thumbnail-preview">
                      {stripHtml(noteContent).substring(0, 30)}...
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              className="thumbnails-nav next" 
              onClick={() => {
                const container = document.querySelector('.slideshow-thumbnails');
                container.scrollBy({ left: 200, behavior: 'smooth' });
              }}
              title="Scroll right"
            >
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        </div>

        {/* Bottom progress bar - PowerPoint style */}
        <div className="slideshow-progress">
          <div 
            className="slideshow-progress-bar" 
            style={{ width: `${((currentIndex + 1) / notes.length) * 100}%` }}
          />
        </div>

        {/* Slide number indicator - bottom right */}
        <div className="slideshow-slide-number">
          {currentIndex + 1} / {notes.length}
        </div>
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