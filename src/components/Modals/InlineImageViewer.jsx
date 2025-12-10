import React, { useState, useEffect } from "react";
import "./InlineImageViewer.css";

const InlineImageViewer = ({
  image,
  note,
  currentIndex,
  totalImages,
  onClose,
  onNext,
  onPrev,
  apiUrl
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const imageUrl = `${apiUrl}/InlineImages/GetInlineImage/${image.id}`;

  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
  }, [image.id]);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case "Escape":
        onClose();
        break;
      case "ArrowRight":
        onNext();
        break;
      case "ArrowLeft":
        onPrev();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  return (
    <div className="inline-image-viewer-overlay" onClick={onClose}>
      <div className="inline-image-viewer-container" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header">
          <div className="viewer-title">
            <h3>
              {image.fileName} ({currentIndex + 1} of {totalImages})
            </h3>
            <div className="note-info">
              <span className="workspace-badge">{note.workspace}</span>
              <span className="project-badge">{note.project}</span>
              <span className="job-badge">{note.job}</span>
              <span className="date-badge">
                {new Date(note.date).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="viewer-content">
          {isLoading && (
            <div className="loading-container">
              <i className="fas fa-spinner fa-spin" />
              <p>Loading image...</p>
            </div>
          )}
          
          {imageError ? (
            <div className="error-container">
              <i className="fas fa-exclamation-triangle" />
              <p>Failed to load image</p>
              <button className="retry-btn" onClick={() => {
                setIsLoading(true);
                setImageError(false);
              }}>
                <i className="fas fa-redo" /> Retry
              </button>
            </div>
          ) : (
            <div className="image-container">
              <img
                src={imageUrl}
                alt={image.fileName}
                className="full-size-image"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          )}

          {totalImages > 1 && (
            <div className="navigation-controls">
              <button className="nav-btn prev-btn" onClick={onPrev}>
                <i className="fas fa-chevron-left" />
                
              </button>
              
              <button className="nav-btn next-btn" onClick={onNext}>
                
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}
        </div>

        <div className="viewer-footer">
          <div className="image-details">
            <div className="detail-item">
              <i className="fas fa-file" />
              <span>{image.fileName}</span>
            </div>
            <div className="detail-item">
              <i className="fas fa-calendar" />
              <span>{new Date(image.timeStamp).toLocaleString()}</span>
            </div>
            <div className="detail-item">
              <i className="fas fa-image" />
              <span>{image.contentType}</span>
            </div>
           
          </div>
          
          <div className="action-buttons">
            <button 
              className="action-btn download-btn"
              onClick={() => window.open(imageUrl, "_blank")}
            >
              <i className="fas fa-download" /> Download
            </button>
           
          </div>
        </div>
      </div>
    </div>
  );
};

export default InlineImageViewer;