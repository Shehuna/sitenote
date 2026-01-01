import React, { useState, useEffect, useRef } from "react";
import "./ViewNoteModal.css";
import toast from "react-hot-toast";

const ViewNoteModal = ({
  noteId,
  jobId,
  onClose,
  currentTheme,
  onViewAttachments,
  userid,
  scrollToNoteId,
}) => {
  const [currentNote, setCurrentNote] = useState(null);
  const [relatedNotes, setRelatedNotes] = useState([]);
  const [noteImages, setNoteImages] = useState({}); // Store images by noteId
  const [loadingImages, setLoadingImages] = useState({}); // Track image loading state per note
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentLightboxImage, setCurrentLightboxImage] = useState(null);
  const [currentLightboxImages, setCurrentLightboxImages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [jobDetails, setJobDetails] = useState(null);
  const [showJobInfo, setShowJobInfo] = useState(false);
  const [managerInfo, setManagerInfo] = useState(null);

  const noteRefs = useRef({});
  const chatContainerRef = useRef(null);
  const lightboxRef = useRef(null);

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

  // Fetch inline images for a specific note
  const fetchInlineImages = async (siteNoteId) => {
    if (!siteNoteId) return [];
    
    setLoadingImages(prev => ({ ...prev, [siteNoteId]: true }));
    
    try {
      const response = await fetch(
        `${apiUrl}/InlineImages/GetInlineImagesBySiteNote?siteNoteId=${siteNoteId}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch images for note ${siteNoteId}`);
      }
      
      const data = await response.json();
      return data.images || [];
    } catch (error) {
      console.error(`Error fetching images for note ${siteNoteId}:`, error);
      return [];
    } finally {
      setLoadingImages(prev => ({ ...prev, [siteNoteId]: false }));
    }
  };

  // Fetch images for all related notes
  const fetchImagesForAllNotes = async (notes) => {
    const imagesMap = {};
    
    // Fetch images for each note in parallel
    const promises = notes.map(async (note) => {
      if (note.id) {
        const images = await fetchInlineImages(note.id);
        imagesMap[note.id] = images;
      }
    });
    
    await Promise.all(promises);
    setNoteImages(imagesMap);
  };

  const fetchNoteAndRelated = async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      const noteRes = await fetch(
        `${apiUrl}/SiteNote/GetSiteNoteById/${noteId}`
      );
      if (!noteRes.ok) throw new Error("Failed to fetch note");
      const noteData = await noteRes.json();

      const note = {
        ...noteData,
        userName: noteData.UserName || noteData.userName,
        documentCount: noteData.DocumentCount || noteData.documentCount || 0,
        date: noteData.date || "",
        timeStamp: noteData.timeStamp || "",
      };
      setCurrentNote(note);

      if (jobId) {
        // Fetch job details
        const jobRes = await fetch(`${apiUrl}/Job/GetJobById/${jobId}`);
        if (!jobRes.ok) throw new Error("Failed to fetch job details");
        const jobData = await jobRes.json();
        setJobDetails(jobData.job || jobData);
      }

      if (!jobId) {
        const notes = [note];
        setRelatedNotes(notes);
        // Fetch images for the single note
        await fetchImagesForAllNotes(notes);
        setLoading(false);
        return;
      }

      const url = `${apiUrl}/SiteNote/GetSiteNotesByJobId?pageNumber=1&pageSize=100&jobId=${jobId}&userId=${userid}`;
      console.log("Fetching all notes for job ->", url);
      const relRes = await fetch(url);
      if (!relRes.ok) throw new Error("Failed to fetch related notes");
      const relData = await relRes.json();

      const related = (relData.siteNotes || [])
        .map((n) => ({
          ...n,
          userName: n.UserName || n.userName,
          documentCount: n.DocumentCount || n.documentCount || 0,
          date: n.date || "",
          timeStamp: n.timeStamp || "",
        }))
        .sort((a, b) => {
          const now = new Date();
          const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          const da = new Date(a.date);
          const db = new Date(b.date);
          const aF = da > today;
          const bF = db > today;
          if (aF && !bF) return 1;
          if (!aF && bF) return -1;
          if (da.getTime() !== db.getTime()) return da - db;
          return a.id - b.id;
        });

      setRelatedNotes(related);
      // Fetch images for all related notes
      await fetchImagesForAllNotes(related);
    } catch (err) {
      console.error("ViewNoteModal error:", err);
      toast.error("Failed to load note");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const scrollToCurrentNote = () => {
    const target = scrollToNoteId || noteId;
    const el = noteRefs.current[target];
    if (el && chatContainerRef.current) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.transition = "background .4s ease";
        el.style.background = "#e3f2fd";
        setTimeout(() => {
          el.style.background = "";
          el.style.borderLeft = "";
        }, 2000);
      });
    }
  };

  // Open lightbox with specific image
  const openLightbox = (image, noteId) => {
    // Get all images from the current note
    const images = noteImages[noteId] || [];
    const imageIndex = images.findIndex(img => img.id === image.id);
    
    setCurrentLightboxImage({
      ...image,
      noteId,
      index: imageIndex,
      total: images.length
    });
    setCurrentLightboxImages(images);
    setLightboxOpen(true);
    
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
  };

  // Close lightbox
  const closeLightbox = () => {
    setLightboxOpen(false);
    setCurrentLightboxImage(null);
    setCurrentLightboxImages([]);
    
    // Restore body scroll
    document.body.style.overflow = 'auto';
  };

  // Navigate to next/previous image
  const navigateLightbox = (direction) => {
    if (!currentLightboxImage || currentLightboxImages.length === 0) return;
    
    const currentIndex = currentLightboxImage.index;
    let newIndex;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % currentLightboxImages.length;
    } else {
      newIndex = (currentIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
    }
    
    const newImage = currentLightboxImages[newIndex];
    setCurrentLightboxImage({
      ...newImage,
      noteId: currentLightboxImage.noteId,
      index: newIndex,
      total: currentLightboxImages.length
    });
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return;
      
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          navigateLightbox('prev');
          break;
        case 'ArrowRight':
          navigateLightbox('next');
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, currentLightboxImage]);

  useEffect(() => {
    fetchNoteAndRelated();
  }, [noteId, jobId, userid]);

  // Fetch manager details when jobDetails.managerId changes
  useEffect(() => {
    const fetchManager = async (id) => {
      if (!id) {
        setManagerInfo(null);
        return;
      }
      try {
        const res = await fetch(`${apiUrl}/UserManagement/GetUserById/${id}`);
        if (!res.ok) throw new Error('Failed to fetch manager');
        const data = await res.json();
        // API may return { message, user }
        setManagerInfo(data.user || data);
      } catch (err) {
        console.error('Failed to fetch manager info', err);
        setManagerInfo(null);
      }
    };

    if (jobDetails?.managerId) fetchManager(jobDetails.managerId);
  }, [jobDetails]);

  useEffect(() => {
    if (!loading && relatedNotes.length) scrollToCurrentNote();
  }, [loading, relatedNotes, scrollToNoteId, noteId]);

  const formatDate = (iso) => {
    if (!iso) return "Invalid Date";
    const d = new Date(iso);
    return isNaN(d)
      ? "Invalid Date"
      : d.toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  };

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - messageTime) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
    }

    return messageTime.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to render images for a note
  const renderNoteImages = (noteId) => {
    const images = noteImages[noteId] || [];
    
    if (loadingImages[noteId]) {
      return (
        <div className="images-loading">
          <i className="fas fa-spinner fa-spin" /> Loading images...
        </div>
      );
    }

    if (images.length === 0) {
      return null;
    }

    return (
      <div className="note-images-container">
        <div className="images-grid">
          {images.map((image) => (
            <div key={image.id} className="image-item">
              <img
                src={`${apiUrl}/InlineImages/GetInlineImage/${image.id}`}
                alt={image.fileName}
                className="inline-image"
                loading="lazy"
                decoding="async"
                fetchpriority="low"
                onClick={() => openLightbox(image, noteId)}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/150x100?text=Image+Not+Found";
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`view-note-modal-overlay theme-${currentTheme}`}>
        <div className="view-note-modal loading">
          <div className="loading-spinner">
          </div>
            <p>Loading note...</p>
        </div>
      </div>
    );
  }

  if (!currentNote) return null;

  return (
    <>
      <div
        className={`view-note-modal-overlay theme-${currentTheme}`}
        onClick={onClose}
      >
        <div className="view-note-modal" onClick={(e) => e.stopPropagation()}>
          <div className="whatsapp-header">
            <div className="header-left">
              <button className="back-button" onClick={onClose}>
                <i className="fas fa-arrow-left" />
              </button>
              <div className="contact-info">
                <div className="contact-name">
                  Workspace: {currentNote.siteNote.workspace}
                </div>
                <div className="contact-project">
                  Project: {currentNote.siteNote.project}
                </div>
                <div className="contact-status">
                  Job: {currentNote.siteNote.job}
                </div>
                
              </div>
            </div>
            <div className="header-right">
              <button
                className="more-info-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowJobInfo((s) => !s);
                }}
                title="More job info"
              >
                <i className="fas fa-info-circle" />
              </button>

              {showJobInfo && (
                <div className="job-attributes">
                  {jobDetails?.type && (
                    <div className="attr">
                      <span className="attr-key">Type:</span>
                      <span className="attr-value">{jobDetails.type}</span>
                    </div>
                  )}

                  

                  {jobDetails?.priorityName && (
                    <div className="attr">
                      <span className="attr-key">Priority:</span>
                      <span className="attr-value">{jobDetails.priorityName}</span>
                    </div>
                  )}

                  {jobDetails?.startDate && (
                    <div className="attr">
                      <span className="attr-key">Start:</span>
                      <span className="attr-value">{formatDate(jobDetails.startDate)}</span>
                    </div>
                  )}

                  {jobDetails?.endDate && (
                    <div className="attr">
                      <span className="attr-key">End:</span>
                      <span className="attr-value">{formatDate(jobDetails.endDate)}</span>
                    </div>
                  )}

                  {jobDetails?.actualEndDate && (
                    <div className="attr">
                      <span className="attr-key">Actual End:</span>
                      <span className="attr-value">{formatDate(jobDetails.actualEndDate)}</span>
                    </div>
                  )}

                  {jobDetails?.managerId != null && (
                    <div className="attr manager-info">
                      <span className="attr-key">Manager:</span>
                      <div className="attr-value">
                        <div className="manager-name">
                          {managerInfo
                            ? `${managerInfo.fname || managerInfo.firstName || ''} ${managerInfo.lname || managerInfo.lastName || ''}`.trim()
                            : `ID: ${jobDetails.managerId}`}
                        </div>
                        {managerInfo?.email && (
                          <div className="manager-email">{managerInfo.email}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {jobDetails?.createdDate && (
                    <div className="attr">
                      <span className="attr-key">Created:</span>
                      <span className="attr-value">{formatDate(jobDetails.createdDate)}</span>
                    </div>
                  )}
                </div>
              )}

              <button className="header-button">
                <i className="fas fa-ellipsis-v" />
              </button>
            </div>
          </div>

          <div className="whatsapp-chat" ref={chatContainerRef}>
            {relatedNotes.map((doc) => (
              <div
                key={doc.id}
                ref={(el) => (noteRefs.current[doc.id] = el)}
                className="message-row"
                id={`related-note-${doc.id}`}
              >
                <div
                  className={`message received ${
                    doc.id === noteId ? "selected" : ""
                  }`}
                  style={{
                    borderLeft: doc.id === noteId ? "4px solid #3498db" : "none",
                    border: "solid 1px #555",
                    background: doc.id === noteId ? "#f0f8ff" : "white",
                  }}
                >
                  <div className="message-content">
                    <div className="message-header">
                      <span className="sender-name">{doc.userName}</span>
                      <span
                        className="message-time"
                        title={new Date(doc.timeStamp).toLocaleString()}
                      >
                        {" "}
                        {formatRelativeTime(doc.timeStamp)}{" "}
                      </span>
                    </div>
                    <div className="message-date-below">
                      {formatDate(doc.date)}
                    </div>
                    <div 
                      className="message-text" 
                      dangerouslySetInnerHTML={{ __html: doc.note }} 
                    />
                    
                    {/* Render images below the note text */}
                    {renderNoteImages(doc.id)}
                  </div>
                </div>

                {doc.documentCount > 0 && (
                  <div className="paperclip-container">
                    <button
                      className="paperclip-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewAttachments(doc);
                      }}
                      title={`View ${doc.documentCount} attached file(s)`}
                    >
                      <span className="document-count-badge">
                        ({doc.documentCount}){" "}
                      </span>
                      <i className="fas fa-paperclip" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="whatsapp-footer">
            <button className="close-chat-button" onClick={onClose}>
              <i className="fas fa-times" /> Close
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Lightbox */}
      {lightboxOpen && currentLightboxImage && (
        <div className="fullscreen-lightbox">
          <div className="lightbox-background" onClick={closeLightbox}></div>
          
          <div className="lightbox-image-wrapper" ref={lightboxRef}>
            {/* Close button */}
            <button className="lightbox-close" onClick={closeLightbox}>
              <i className="fas fa-times" />
            </button>
            
            {/* Image counter */}
            <div className="lightbox-counter">
              {currentLightboxImage.index + 1} / {currentLightboxImage.total}
            </div>
            
            {/* Main image */}
            <img
              src={`${apiUrl}/InlineImages/GetInlineImage/${currentLightboxImage.id}`}
              alt={currentLightboxImage.fileName}
              className="lightbox-full-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/800x600?text=Image+Not+Found";
              }}
            />
            
            {/* Navigation buttons */}
            {currentLightboxImages.length > 1 && (
              <>
                <button 
                  className="lightbox-nav lightbox-prev" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateLightbox('prev');
                  }}
                >
                  <i className="fas fa-chevron-left" />
                </button>
                
                <button 
                  className="lightbox-nav lightbox-next" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateLightbox('next');
                  }}
                >
                  <i className="fas fa-chevron-right" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ViewNoteModal;