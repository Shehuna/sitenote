import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import "./NotesTab.css";
//import ReplyModal from '../Modals/ReplyModal';

const NotesTab = ({
  viewMode,
  finalDisplayNotes,
  isDataLoaded,
  initialLoading,
  searchLoading,
  loadingFiltered,
  loadingUniques,
  searchTerm,
  getActiveFilterCount,
  handleRowClick,
  handleRowDoubleClick,
  handleAddFromRow,
  handleEdit,
  handleDelete,
  handleViewAttachments,
  selectedRow,
  focusedRow,
  inlineImagesMap,
  loadingImages,
  renderTableImageIcon,
  renderCardImageIcon,
  renderStackedImageIcon,
  setShowPriorityDropdown,
  setSelectedNoteForPriority,
  setPriorityDropdownPosition,
  expandedStacks,
  toggleStackExpansion,
  expandedCardLimit,
  jobs,
  setViewNote,
  setShowViewModal,
  stackedJobs, 
  loadingStackedJobs,
  fetchStackedJobs,
  fetchNotes,
  userId,
  projects,
  hasActiveFilters,
  filteredNotesFromApi,
  searchResults,
}) => {
  const [userStatusMap, setUserStatusMap] = useState({});
  const [loadingUsers, setLoadingUsers] = useState({});
  const [localNotes, setLocalNotes] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const loadingRef = useRef(false);
  const observerRef = useRef(null);
  const lastRowRef = useRef(null);
  const lastCardRef = useRef(null);
  const containerRef = useRef(null);
   const [showReplyModal, setShowReplyModal] = useState(false);
    const [selectedNoteForReply, setSelectedNoteForReply] = useState(null);
  const replyButtonRefs = useRef({});
  const [activeReplyButtonRef, setActiveReplyButtonRef] = useState(null);
  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;
  const [hoveredOriginalNote, setHoveredOriginalNote] = useState(null);
const [originalNoteContent, setOriginalNoteContent] = useState({});
const [loadingOriginalNote, setLoadingOriginalNote] = useState({});
const hoverTimeoutRef = useRef(null);
const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
const [hoveredLinkedNote, setHoveredLinkedNote] = useState(null);
const [linkedNoteContent, setLinkedNoteContent] = useState({});
const [loadingLinkedNote, setLoadingLinkedNote] = useState({});
const linkHoverTimeoutRef = useRef(null);
    
  const pageSize = 15;
  const initialPageNumber = 1;

  // Determine which notes to display based on filters/search
  const displayNotes = useMemo(() => {
    if (searchTerm.trim() || hasActiveFilters) {
      const sourceNotes = searchTerm.trim() ? (searchResults || []) : (filteredNotesFromApi || []);
      
      const seen = new Map();
      const deduplicated = [];
      
      for (const note of sourceNotes) {
        if (note.id && !seen.has(note.id)) {
          seen.set(note.id, note);
          deduplicated.push(note);
        }
      }
      
      return deduplicated.sort((a, b) => b.id - a.id);
    }
    
    if (searchTerm.trim() || hasActiveFilters) {
      return searchTerm.trim() ? (searchResults || []) : (filteredNotesFromApi || []);
    }
    
    if (finalDisplayNotes && finalDisplayNotes.length > 0) {
      if (localNotes.length === 0) {
        return [...finalDisplayNotes].sort((a, b) => b.id - a.id);
      }
      
      const allNotesMap = new Map();
      
      localNotes.forEach(note => {
        allNotesMap.set(note.id, note);
      });
      
      finalDisplayNotes.forEach(note => {
        allNotesMap.set(note.id, note);
      });
      
      return Array.from(allNotesMap.values()).sort((a, b) => b.id - a.id);
    }
    
    return localNotes || [];
  }, [
    searchTerm, 
    hasActiveFilters, 
    searchResults, 
    filteredNotesFromApi, 
    localNotes,
    finalDisplayNotes
  ]);

const HighlightText = ({ text, highlight }) => {
  if (!highlight || !text || typeof text !== 'string') {
    return <span>{text}</span>;
  }

  try {
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <span>
        {parts.map((part, index) => {
          const match = part.toLowerCase() === highlight.toLowerCase();
          
          return match ? (
            <mark 
              key={index} 
              className="search-highlight"
              style={{
                backgroundColor: '#ffeb3b',
                padding: '0 2px',
                borderRadius: '2px',
                fontWeight: 'bold',
                color: '#000'
              }}
            >
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          );
        })}
      </span>
    );
  } catch (error) {
    console.error('Error highlighting text:', error);
    return <span>{text}</span>;
  }
};

const highlightHtmlContent = (html, highlight) => {
  if (!highlight || !html || typeof html !== 'string') {
    return html;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    
    const highlightNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (regex.test(text)) {
          const span = document.createElement('span');
          const parts = text.split(regex);
          
          parts.forEach((part) => {
            if (regex.test(part)) {
              const mark = document.createElement('mark');
              mark.className = 'search-highlight';
              mark.style.cssText = 'background-color: #ffeb3b; padding: 0 2px; border-radius: 2px; font-weight: bold; color: #000;';
              mark.textContent = part;
              span.appendChild(mark);
            } else {
              span.appendChild(document.createTextNode(part));
            }
          });
          
          node.parentNode.replaceChild(span, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && 
                 node.nodeName !== 'SCRIPT' && 
                 node.nodeName !== 'STYLE' &&
                 !node.classList.contains('search-highlight')) {
        Array.from(node.childNodes).forEach(child => highlightNode(child));
      }
    };
    
    highlightNode(doc.body);
    
    return doc.body.innerHTML;
  } catch (error) {
    console.error('Error highlighting HTML:', error);
    return html;
  }
};

  // Determine which jobs to display in stacked view
  const jobsToDisplay = useMemo(() => {
    if (viewMode !== "stacked") return [];
    
    // If filters are active, use filteredStackedJobs (passed as stackedJobs when hasActiveFilters is true)
    // If no filters, use regular stackedJobs
    return stackedJobs || [];
  }, [viewMode, stackedJobs, hasActiveFilters]);

  // Sync finalDisplayNotes from parent to localNotes when appropriate
  useEffect(() => {
    if (finalDisplayNotes && 
        finalDisplayNotes.length > 0 && 
        !hasActiveFilters && 
        !searchTerm.trim()) {
      
      if (isInitialLoad) {
        setLocalNotes([...finalDisplayNotes].sort((a, b) => b.id - a.id));
        setHasMore(finalDisplayNotes.length >= pageSize);
        setIsInitialLoad(false);
      } else {
        const existingIds = new Set(localNotes.map(note => note.id));
        const newNotesFromParent = finalDisplayNotes.filter(note => !existingIds.has(note.id));
        
        if (newNotesFromParent.length > 0) {
          const sortedNewNotes = [...newNotesFromParent].sort((a, b) => b.id - a.id);
          setLocalNotes(prev => [...sortedNewNotes, ...prev]);
          
          const updatedNotes = finalDisplayNotes.filter(note => existingIds.has(note.id));
          if (updatedNotes.length > 0) {
            setLocalNotes(prev => prev.map(note => {
              const updatedNote = updatedNotes.find(u => u.id === note.id);
              return updatedNote || note;
            }));
          }
        }
      }
    }
  }, [finalDisplayNotes, hasActiveFilters, searchTerm, isInitialLoad, localNotes, pageSize]);

  // Reset infinite scroll when filters/search are cleared
  useEffect(() => {
    if (!hasActiveFilters && !searchTerm.trim() && !isInitialLoad) {
      setHasMore(true);
      setPage(1);
      
      if (finalDisplayNotes && finalDisplayNotes.length > 0) {
        setLocalNotes([...finalDisplayNotes].sort((a, b) => b.id - a.id));
        setPage(2);
        setHasMore(finalDisplayNotes.length >= pageSize);
      }
    }
  }, [hasActiveFilters, searchTerm, isInitialLoad, finalDisplayNotes, pageSize]);

  // Function to fetch user status by ID
  const fetchUserStatus = async (userId) => {
    if (!userId || userStatusMap[userId]) return;

    try {
      setLoadingUsers(prev => ({ ...prev, [userId]: true }));
      const response = await fetch(`${apiUrl}/UserManagement/GetUserById/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserStatusMap(prev => ({
          ...prev,
          [userId]: {
            active: data.user?.status === 1,
            name: `${data.user?.fname} ${data.user?.lname}`.trim() || data.user?.userName || 'Unknown'
          }
        }));
      }
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
    } finally {
      setLoadingUsers(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Load initial notes via API (only when parent doesn't provide them)
  const loadInitialNotes = useCallback(async () => {
    if (loadingRef.current || (finalDisplayNotes && finalDisplayNotes.length > 0)) return;
    
    loadingRef.current = true;
    setIsLoadingInitial(true);
    
    try {
      const result = await fetchNotes(initialPageNumber, pageSize);
      if (result && result.notes) {
        setLocalNotes([...result.notes].sort((a, b) => b.id - a.id));
        setHasMore(result.hasMore);
        setPage(initialPageNumber + 1);
      }
    } catch (error) {
      console.error("Error loading initial notes:", error);
    } finally {
      loadingRef.current = false;
      setIsLoadingInitial(false);
      setIsInitialLoad(false);
    }
  }, [fetchNotes, pageSize, finalDisplayNotes]);

  // Load more notes via API
  const loadMoreNotes = useCallback(async () => {
    if (loadingRef.current || !hasMore || hasActiveFilters || searchTerm.trim()) {
      return;
    }
    
    loadingRef.current = true;
    setLoadingMore(true);
    
    try {
      const result = await fetchNotes(page, pageSize);
      if (result && result.notes && result.notes.length > 0) {
        setLocalNotes(prev => {
          const existingIds = new Set(prev.map(note => note.id));
          const newNotes = result.notes.filter(note => !existingIds.has(note.id));
          const sortedNewNotes = [...newNotes].sort((a, b) => b.id - a.id);
          return [...prev, ...sortedNewNotes];
        });
        setHasMore(result.hasMore);
        setPage(prev => prev + 1);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more notes:", error);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchNotes, page, hasMore, hasActiveFilters, searchTerm]);
  const handleReplyToNote = (note, e) => {
  console.log('Reply button clicked!', { noteId: note.id, event: e });
  
  if (e) {
    e.stopPropagation();
    e.preventDefault();
    
    // Store the clicked button's ref
    const buttonIndex = Object.keys(replyButtonRefs.current).find(key => 
      replyButtonRefs.current[key] === e.currentTarget
    );
    
    if (buttonIndex) {
      setActiveReplyButtonRef(replyButtonRefs.current[buttonIndex]);
    }
  }
  
  console.log('Setting selected note and showing modal');
  setSelectedNoteForReply(note);
  setShowReplyModal(true);
};
const handleLinkedNoteClick = (note, e) => {
  console.log('Linked note button clicked!', { 
    noteId: note.id, 
    linkedToNoteId: note.repliedSiteNoteId 
  });
  
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  
  if (note.repliedSiteNoteId) {
    const originalNote = displayNotes.find(n => n.id === note.repliedSiteNoteId);
    
    if (originalNote) {
      handleRowClick(originalNote);
      
      setTimeout(() => {
        const originalNoteElement = document.querySelector(`[data-note-id="${originalNote.id}"]`);
        if (originalNoteElement) {
          originalNoteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          originalNoteElement.style.backgroundColor = '#fff3cd';
          originalNoteElement.style.boxShadow = '0 0 0 3px #ffc107';
          
          setTimeout(() => {
            if (originalNoteElement) {
              originalNoteElement.style.backgroundColor = '';
              originalNoteElement.style.boxShadow = '';
            }
          }, 2000);
        }
      }, 100);
    } else {
      alert(`Original note (ID: ${note.repliedSiteNoteId}) not found in current view.`);
    }
  }
};
const fetchLinkedNoteContent = async (noteId) => {
  if (!noteId || linkedNoteContent[noteId]) return;
  
  try {
    setLoadingLinkedNote(prev => ({ ...prev, [noteId]: true }));
    const response = await fetch(`${apiUrl}/SiteNote/GetNoteById/${noteId}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.note) {
        setLinkedNoteContent(prev => ({
          ...prev,
          [noteId]: {
            content: data.note.note || "No content",
            userName: data.note.userName || "Unknown",
            date: data.note.timeStamp || data.note.date,
            workspace: data.note.workspace || '',
            project: data.note.project || '',
            job: data.note.job || ''
          }
        }));
      }
    }
  } catch (error) {
    console.error(`Error fetching linked note ${noteId}:`, error);
  } finally {
    setLoadingLinkedNote(prev => ({ ...prev, [noteId]: false }));
  }
};
const handleLinkedNoteMouseEnter = (note, e) => {
  if (e) {
    const button = e.currentTarget;
    button.style.backgroundColor = '#3498db';
    button.style.color = 'white';
    button.style.transition = 'all 0.2s ease';
    
    const rect = button.getBoundingClientRect();
    setTooltipPosition({ x: rect.right + 10, y: rect.top });
  }
  
  linkHoverTimeoutRef.current = setTimeout(() => {
    setHoveredLinkedNote(note.id);
    
    if (note.repliedSiteNoteId && !linkedNoteContent[note.repliedSiteNoteId]) {
      fetchLinkedNoteContent(note.repliedSiteNoteId);
    }
  }, 500);
};

const handleLinkedNoteMouseLeave = (e) => {
  if (e) {
    const button = e.currentTarget;
    button.style.backgroundColor = '';
    button.style.color = '#3498db';
  }
  
  if (linkHoverTimeoutRef.current) {
    clearTimeout(linkHoverTimeoutRef.current);
  }
  setHoveredLinkedNote(null);
};

useEffect(() => {
  return () => {
    if (linkHoverTimeoutRef.current) {
      clearTimeout(linkHoverTimeoutRef.current);
    }
  };
}, []);
const handleViewOriginalNote = (note, e) => {
  console.log('View original button clicked!', { 
    noteId: note.id, 
    repliedToNoteId: note.repliedSiteNoteId 
  });
  
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  
  if (note.repliedSiteNoteId) {
    const originalNote = displayNotes.find(n => n.id === note.repliedSiteNoteId);
    
    if (originalNote) {
      handleRowClick(originalNote);
      
      setTimeout(() => {
        const originalNoteElement = document.querySelector(`[data-note-id="${originalNote.id}"]`);
        if (originalNoteElement) {
          originalNoteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          originalNoteElement.classList.add('highlight-original-note');
          setTimeout(() => {
            originalNoteElement.classList.remove('highlight-original-note');
          }, 2000);
        }
      }, 100);
    } else {
      alert(`Original note (ID: ${note.repliedSiteNoteId}) not found in current view.`);
    }
  }
};

const fetchOriginalNoteContent = async (noteId) => {
  if (!noteId || originalNoteContent[noteId]) return;
  
  try {
    setLoadingOriginalNote(prev => ({ ...prev, [noteId]: true }));
    const response = await fetch(`${apiUrl}/Notes/GetNoteById/${noteId}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.note) {
        setOriginalNoteContent(prev => ({
          ...prev,
          [noteId]: {
            content: data.note.note || "No content",
            userName: data.note.userName || "Unknown",
            date: data.note.timeStamp || data.note.date
          }
        }));
      }
    }
  } catch (error) {
    console.error(`Error fetching original note ${noteId}:`, error);
  } finally {
    setLoadingOriginalNote(prev => ({ ...prev, [noteId]: false }));
  }
};

const handleOriginalNoteMouseEnter = (note, e) => {
  if (e) {
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  }
  
  hoverTimeoutRef.current = setTimeout(() => {
    setHoveredOriginalNote(note.id);
    
    if (note.repliedSiteNoteId && !originalNoteContent[note.repliedSiteNoteId]) {
      fetchOriginalNoteContent(note.repliedSiteNoteId);
    }
  }, 500);
};

const handleOriginalNoteMouseLeave = () => {
  if (hoverTimeoutRef.current) {
    clearTimeout(hoverTimeoutRef.current);
  }
  setHoveredOriginalNote(null);
};
useEffect(() => {
  return () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };
}, []);

  useEffect(() => {
    if (isDataLoaded && !hasActiveFilters && !searchTerm.trim() && isInitialLoad) {
      if (!finalDisplayNotes || finalDisplayNotes.length === 0) {
        loadInitialNotes();
      } else {
        setIsInitialLoad(false);
      }
    }
  }, [isDataLoaded, hasActiveFilters, searchTerm, isInitialLoad, loadInitialNotes, finalDisplayNotes]);

  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (hasActiveFilters || searchTerm.trim() || !hasMore || loadingMore) {
      return;
    }

    let targetElement = null;
    if (viewMode === 'table' && lastRowRef.current) {
      targetElement = lastRowRef.current;
    } else if (viewMode === 'cards' && lastCardRef.current) {
      targetElement = lastCardRef.current;
    }

    if (!targetElement) return;

    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loadingMore && !loadingRef.current) {
        loadMoreNotes();
      }
    }, options);

    observer.observe(targetElement);
    observerRef.current = observer;
  }, [viewMode, hasMore, loadingMore, hasActiveFilters, searchTerm, loadMoreNotes]);

  useEffect(() => {
    setupObserver();
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [setupObserver]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setupObserver();
    }, 100);

    return () => clearTimeout(timer);
  }, [displayNotes, setupObserver]);

  useEffect(() => {
  if (displayNotes && displayNotes.length > 0) {
    const uniqueUserIds = [...new Set(displayNotes
      .filter(note => note.userId)
      .map(note => note.userId)
    )];

    uniqueUserIds.forEach(userId => {
      if (!userStatusMap[userId] && !loadingUsers[userId]) {
        fetchUserStatus(userId);
      }
    });
  }
}, [displayNotes, fetchUserStatus, loadingUsers, userStatusMap]);

  const getUserStatusStyle = (userId) => {
    if (userId && userStatusMap[userId] && !userStatusMap[userId].active) {
      return { 
        color: '#95a5a6', 
        fontStyle: 'italic', 
        opacity: 0.7 
      };
    }
    return {};
  };

  const renderUserStatusIndicator = (userId, userName) => {
    if (loadingUsers[userId]) {
      return (
        <span className="user-status-loading" title="Loading user status...">
          <i className="fas fa-spinner fa-spin" style={{ marginLeft: '4px', fontSize: '10px' }} />
        </span>
      );
    }

    return null;
  };

  const renderUserNameWithStatus = (note) => {
    const isInactive = userStatusMap[note.userId] && !userStatusMap[note.userId].active;
    
    if (isInactive) {
      return (
        <span className="inactive-user-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
          <span style={getUserStatusStyle(note.userId)}>{note.userName || "Unknown"}</span>
          <div className="inactive-user-tooltip" style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#333',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            opacity: 0,
            visibility: 'hidden',
            transition: 'opacity 0.2s, visibility 0.2s',
            marginBottom: '5px'
          }}>
            Inactive User
          </div>
        </span>
      );
    }
    
    return <span>{note.userName || "Unknown"}</span>;
  };
  

  const formatRelativeTime = (dateString) => {
    if (!dateString) return "Unknown date";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  const renderTableSkeleton = () => {
    return [...Array(5)].map((_, i) => (
      <tr key={`skeleton-${i}`}>
        <td colSpan={8}>
          <div className="skeleton-row">
            <div className="skeleton-cell short" />
            <div className="skeleton-cell medium" />
            <div className="skeleton-cell medium" />
            <div className="skeleton-cell medium" />
            <div className="skeleton-cell long" />
            <div className="skeleton-cell short" />
            <div className="skeleton-cell short" />
            <div className="skeleton-cell short" />
          </div>
        </td>
      </tr>
    ));
  };

  const renderCardSkeleton = () => {
    return [...Array(8)].map((_, i) => (
      <div key={`card-skeleton-${i}`} className="note-card skeleton">
        <div className="skeleton-header">
          <div className="skeleton-avatar" />
          <div className="skeleton-text short" />
        </div>
        <div className="skeleton-content">
          <div className="skeleton-text long" />
        </div>
        <div className="skeleton-footer">
          <div className="skeleton-actions" />
        </div>
      </div>
    ));
  };

  const renderTableEmptyState = () => {
    return (
      <tr>
        <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#999" }}>
          {isDataLoaded && !initialLoading && !loadingUniques ? (
            <>
              <i className="fas fa-search" style={{ fontSize: 28, marginBottom: 12, display: "block", opacity: 0.5 }} />
              <div>
                {searchTerm.trim()
                  ? "No notes match your search"
                  : getActiveFilterCount() > 0
                  ? "No notes match your filters"
                  : "No notes available"}
              </div>
            </>
          ) : null}
        </td>
      </tr>
    );
  };

  // Render empty state for cards
  const renderCardEmptyState = () => {
    return (
      <div className="empty-state" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px" }}>
        <i className="fas fa-search" style={{ fontSize: 28, marginBottom: 12, display: "block", opacity: 0.5 }} />
        <h3>
          {searchTerm.trim()
            ? "No notes match your search"
            : getActiveFilterCount() > 0
            ? "No notes match your filters"
            : "No notes available"}
        </h3>
        <p>
          {searchTerm.trim()
            ? "Try adjusting your search terms"
            : getActiveFilterCount() > 0
            ? "Try clearing some filters"
            : "Create your first note to get started"}
        </p>
      </div>
    );
  };

  // Render note row for table view
  const renderTableRow = (note, index, isLast = false) => {
    const priorityValue = note.priority || 1;
    const uniqueKey = `${note.id}-${index}`;
    
    return (
      <tr
        key={uniqueKey}
        onClick={() => handleRowClick(note)}
        onDoubleClick={() => {
          handleRowDoubleClick(note);
          const job = jobs.find(j => String(j.id) === String(note.job) || j.name === note.job);
          setViewNote({
            id: note.id,
            jobId: job?.id ?? null,
          });
          setShowViewModal(true);
        }}
        className={`${selectedRow === note.id ? "selected-row" : ""} ${focusedRow === note.id ? "focused-row" : ""}`}
        style={{ cursor: "pointer" }}
        ref={isLast ? lastRowRef : null}
        onMouseEnter={(e) => {
          const inactiveWrapper = e.currentTarget.querySelector('.inactive-user-wrapper');
          if (inactiveWrapper) {
            const tooltip = inactiveWrapper.querySelector('.inactive-user-tooltip');
            if (tooltip) {
              tooltip.style.opacity = '1';
              tooltip.style.visibility = 'visible';
            }
          }
        }}
        onMouseLeave={(e) => {
          const inactiveWrapper = e.currentTarget.querySelector('.inactive-user-wrapper');
          if (inactiveWrapper) {
            const tooltip = inactiveWrapper.querySelector('.inactive-user-tooltip');
            if (tooltip) {
              tooltip.style.opacity = '0';
              tooltip.style.visibility = 'hidden';
            }
          }
        }}
      >
        <td title={new Date(note.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}>
          {formatRelativeTime(note.timeStamp)}
        </td>
        <td>{note.workspace || "—"}</td>
        <td>{note.project || "—"}</td>
        <td>{note.job || "—"}</td>
        <td className="editable" style={{ position: "relative", maxWidth: "300px" }}>
          <div className="note-cell-container" style={{ display: "flex", alignItems: "flex-start", position: "relative", maxWidth: "100%" }}>
            <span
              style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", display: "block", maxWidth: "100%" }}
              dangerouslySetInnerHTML={{ 
        __html: note.note && note.note.length > 69 
          ? highlightHtmlContent(note.note.substring(0, 69) + "...", searchTerm)
          : highlightHtmlContent(note.note || "", searchTerm)
      }}
            />
            <div 
                className="note-hover-popup" 
                dangerouslySetInnerHTML={{ 
                  __html: highlightHtmlContent(note.note, searchTerm) 
                }} 
              />
            {renderPriorityDot(priorityValue, note)}
          </div>
        </td>
        <td>
          {renderUserNameWithStatus(note)}
          {renderUserStatusIndicator(note.userId, note.userName)}
        </td>
        <td className="file-cell" onClick={(e) => { e.stopPropagation(); handleViewAttachments(note); }}>
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
    <i className="fas fa-paperclip" style={{ opacity: note.documentCount > 0 ? 1 : 0.3 }} />
    <span>({note.documentCount || 0})</span>
    
    
      
    {renderTableImageIcon(note)}
  </span>
</td>
        <td className="table-actions">
          <a
            onClick={(e) => {
              e.stopPropagation();
              handleAddFromRow(note);
            }}
            title="Add"
          >
            <i className="fas fa-plus" />
          </a>
          <a
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(note);
            }}
            title="Edit"
          >
            <i className="fas fa-edit" />
          </a>
          <a
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(note);
            }}
            title="Delete"
          >
            <i className="fas fa-trash" />
          </a>
        </td>
      </tr>
    );
  };

  // Render priority dot for table view
  const renderPriorityDot = (priorityValue, note) => {
     if (priorityValue > 1) {
      return (
        <div
          className={`priority-dot priority-dot-${priorityValue}`}
          style={{ 
            width: "10px", 
            height: "10px", 
            borderRadius: "50%", 
            position: "absolute", 
            top: "4px", 
            right: "4px", 
            cursor: "pointer", 
            zIndex: 10 
          }}
          title={priorityValue === 3 ? "Medium Priority - Click to change" : "High Priority - Click to change"}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNoteForPriority(note);
            setPriorityDropdownPosition({ x: e.clientX, y: e.clientY });
            setShowPriorityDropdown(true);
          }}
        />
      );
    }
    
    return (
      <div
        className="priority-dot priority-dot-placeholder"
        style={{ width: "10px", height: "10px", borderRadius: "50%", position: "absolute", top: "4px", right: "4px", cursor: "pointer", zIndex: 10, opacity: 0.2, border: "1px dashed #bdc3c7", backgroundColor: "transparent", transition: "all 0.2s ease" }}
        title="Click to set priority"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNoteForPriority(note);
          setPriorityDropdownPosition({ x: e.clientX, y: e.clientY });
          setShowPriorityDropdown(true);
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.borderColor = "#3498db"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.2"; e.currentTarget.style.borderColor = "#bdc3c7"; }}
      />
    );
  };

  // Render note card for card view
  const renderNoteCard = (note, index, isLast = false) => {
    const priorityValue = note.priority || 1;
    const isInactive = userStatusMap[note.userId] && !userStatusMap[note.userId].active;
    const uniqueKey = `${note.id}-${index}`;
    
    return (
      <div
        key={uniqueKey}
        className={`note-card ${selectedRow === note.id ? "selected" : ""}`}
        onClick={() => handleRowClick(note)}
        onDoubleClick={() => handleRowDoubleClick(note)}
        ref={isLast ? lastCardRef : null}
        onMouseEnter={(e) => {
          if (isInactive) {
            const tooltip = e.currentTarget.querySelector('.inactive-user-tooltip');
            if (tooltip) {
              tooltip.style.opacity = '1';
              tooltip.style.visibility = 'visible';
            }
          }
        }}
        onMouseLeave={(e) => {
          if (isInactive) {
            const tooltip = e.currentTarget.querySelector('.inactive-user-tooltip');
            if (tooltip) {
              tooltip.style.opacity = '0';
              tooltip.style.visibility = 'hidden';
            }
          }
        }}
      >
        <div className="note-header">
          <div className="user-avatar-wrapper">
            <div className="user-avatar">
              {note.userName ? (() => {
                const names = note.userName.trim().split(/\s+/);
                const firstInitial = names[0] ? names[0].charAt(0).toUpperCase() : "";
                const lastInitial = names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : "";
                return firstInitial + lastInitial;
              })() : <i className="fas fa-user" />}
            </div>
            <div className="user-tooltip">{note.userName || "Unknown User"}</div>
          </div>
          <div className="note-meta">
            <div className="note-author" title={note.userName || "Unknown User"}>
              {isInactive ? (
                <span className="inactive-user-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
                  <span style={getUserStatusStyle(note.userId)}>{note.userName || "Unknown"}</span>
                  <div className="inactive-user-tooltip" style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#333',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    zIndex: 1000,
                    opacity: 0,
                    visibility: 'hidden',
                    transition: 'opacity 0.2s, visibility 0.2s',
                    marginBottom: '5px'
                  }}>
                    Inactive User
                  </div>
                </span>
              ) : (
                <span>{note.userName || "Unknown"}</span>
              )}
              {renderUserStatusIndicator(note.userId, note.userName)}
            </div>
            <div className="note-date" title={new Date(note.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}>
              {formatRelativeTime(note.timeStamp)}
            </div>
          </div>
          <div className="note-context">
            <div className="context-item job" title={note.job}><HighlightText text={note.job || "—"} highlight={searchTerm}/></div>
            <div className="context-item workspace-project">
              <span title={note.workspace}><HighlightText text={note.workspace || "—"} highlight={searchTerm} /></span>/
              <span title={note.project}><HighlightText text={note.project || "—"} highlight={searchTerm} /></span>
            </div>
          </div>
        </div>
        <div className="note-content">
          <div className="note-card-content-container" style={{ position: "relative" }}>
            <div className="note-text" dangerouslySetInnerHTML={{ __html: highlightHtmlContent(note.note || "", searchTerm) 
  }} />
            {note.note && note.note.length > 150 && (
              <div className="note-card-popup" dangerouslySetInnerHTML={{ __html: note.note }} />
            )}
          </div>
        </div>
        <div className="note-footer">
          <div className="note-attachments" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {renderCardImageIcon(note)}
            <button className="attachment-btn" onClick={(e) => { e.stopPropagation(); handleViewAttachments(note); }}>
              <i className="fas fa-paperclip" style={{ opacity: note.documentCount > 0 ? 1 : 0.3 }} />
              <span>({note.documentCount || 0})</span>
            </button>
          </div>
          <div className="note-actions">
            {renderCardPriorityIndicator(priorityValue, note)}
            <button className="action-btn add" onClick={(e) => { e.stopPropagation(); handleAddFromRow(note); }} title="Add New Note">
              <i className="fas fa-plus" />
            </button>
            <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); handleEdit(note); }} title="Edit Note">
              <i className="fas fa-edit" />
            </button>
            <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(note); }} title="Delete Note">
              <i className="fas fa-trash" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render priority indicator for card view
  const renderCardPriorityIndicator = (priorityValue, note) => {
    if (priorityValue > 1) {
      return (
        <div
          className={`priority-indicator priority-${priorityValue}`}
          style={{ cursor: "pointer" }}
          title={priorityValue === 3 ? "Medium Priority - Click to change" : "High Priority - Click to change"}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNoteForPriority(note);
            setPriorityDropdownPosition({ x: e.clientX, y: e.clientY });
            setShowPriorityDropdown(true);
          }}
        />
      );
    }
    
    return (
      <div
        className="priority-placeholder"
        style={{ cursor: "pointer", opacity: 0.2, transition: "all 0.2s ease", width: "16px", height: "16px", borderRadius: "50%", border: "1px dashed #ddd", backgroundColor: "transparent" }}
        title="Click to set priority"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNoteForPriority(note);
          setPriorityDropdownPosition({ x: e.clientX, y: e.clientY });
          setShowPriorityDropdown(true);
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.borderColor = "#3498db"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.2"; e.currentTarget.style.borderColor = "#ddd"; }}
      />
    );
  };

  // Handle stacked jobs logic
  const notesByJob = {};
  if (viewMode === "stacked") {
    if (jobsToDisplay && jobsToDisplay.length > 0) {
      jobsToDisplay.forEach(job => {
        if (job.jobName && job.notes && Array.isArray(job.notes)) {
          notesByJob[job.jobName] = job.notes;
        }
      });
    }
  } else {
    displayNotes.forEach((note) => {
      const jobName = note.job || "Unassigned";
      if (!notesByJob[jobName]) {
        notesByJob[jobName] = [];
      }
      notesByJob[jobName].push(note);
    });
  }

  const sortedJobs = viewMode === "stacked" 
    ? (jobsToDisplay && jobsToDisplay.length > 0 
        ? [...jobsToDisplay].sort((a, b) => {
            return (b.noteCount || 0) - (a.noteCount || 0);
          })
        : []) 
    : Object.keys(notesByJob).sort((a, b) => {
        const mostRecentA = notesByJob[a][0] ?
            new Date(notesByJob[a][0].timeStamp || notesByJob[a][0].date || 0).getTime() : 0;
        const mostRecentB = notesByJob[b][0] ?
            new Date(notesByJob[b][0].timeStamp || notesByJob[b][0].date || 0).getTime() : 0;
        return mostRecentB - mostRecentA;
      });

  const isAnyStackExpanded = Object.values(expandedStacks).some((v) => v);

  // Render collapsed stack (without loading notes yet)
const renderCollapsedStack = (job) => {
  const jobName = job.jobName;
  const noteCount = job.noteCount || 0;
  const isLoading = job.isLoadingNotes;
  const hasLastSiteNote = job.lastSiteNote && job.lastSiteNote.trim() !== "";
  
  return (
    <div
      key={`stack-${job.jobId}`}
      className={`collapsed-stack ${isLoading ? 'loading' : ''}`}
      onClick={() => toggleStackExpansion(jobName, job.jobId)}
      style={{
        cursor: "pointer",
        position: "relative",
        height: "280px",
        width: "100%",
      }}
    >
      {isLoading && (
        <div className="stack-loading-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          borderRadius: '8px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#3498db', marginBottom: '10px' }} />
            <div style={{ fontSize: '14px', color: '#666' }}>Loading notes...</div>
          </div>
        </div>
      )}
      
      {[...Array(Math.min(noteCount, 5))].map(
        (_, index) => {
          const isTopCard = index === 0;
          return (
            <div
              key={`layer-${index}`}
              className="stack-layer-card"
              style={{
                position: "absolute",
                right: "0",
                left: `${index * 15}px`,
                transform: `rotate(${index * -2}deg)`,
                zIndex: 5 - index,
                width: "300px",
                height: "250px",
                opacity: 1 - index * 0.2,
                transition: "all 0.3s ease",
                overflow: "hidden",
              }}
              >
                {isTopCard ? (
                  <div
                    style={{
                      padding: "15px",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "10px",
                        paddingBottom: "10px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "5px",
                          }}
                        >
                          <i
                            className="fas fa-briefcase"
                            style={{ color: "#14A2B6" }}
                          />
                          <span
                            style={{
                              fontWeight: 600,
                              color: "#2c3e50",
                              fontSize: "16px",
                            }}
                          >
                            {jobName}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#14A2B6",
                          color: "white",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        <i className="fas fa-layer-group" />
                        <span>{noteCount} notes</span>
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor: "#14A2B6",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                        >
                          {job.lastSiteNoteUserName
                            ? job.lastSiteNoteUserName.charAt(0).toUpperCase()
                            : job.jobName?.charAt(0)?.toUpperCase() || "J"}
                        </div>
                        <span style={{ fontSize: "14px", color: "#555" }}>
                          {job.lastSiteNoteUserName || 
                          (job.notes && job.notes.length > 0 && job.notes[0].userName) || 
                          "Loading..."}
                        </span>
                      </div>
  
  <div
    style={{
      fontSize: "13px",
      color: "#666",
      lineHeight: 1.4,
      flex: 1,
      overflow: "hidden",
      display: "-webkit-box",
      WebkitLineClamp: 3,
      WebkitBoxOrient: "vertical",
      padding: "8px",
      backgroundColor: "#f8f9fa",
      borderRadius: "4px",
      borderLeft: "3px solid #21f869ff",
      marginTop: "8px",
    }}
  >
    
    <div 
      style={{ 
        fontSize: "12px", 
        color: "#666", 
        lineHeight: 1.4,
        maxHeight: "60px",
        overflow: "hidden"
      }}
      dangerouslySetInnerHTML={{ 
        __html: job.lastSiteNote 
          ? job.lastSiteNote 
          : (job.notes && job.notes.length > 0 
              ? (job.notes[0].note || "No note content")
              : (hasActiveFilters && job.hasLoadedNotes 
                  ? "No notes match current filters" 
                  : "Click to load notes"))
      }} 
    />
  </div>
  
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#888",
                          marginTop: "auto",
                          paddingTop: "8px",
                          borderTop: "1px dashed #e9ecef",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <i className="fas fa-clock" style={{ fontSize: "10px" }} />
                        <span>
                          {job.latestTimeStamp ? 
                          formatRelativeTime(job.latestTimeStamp) : "No updates"}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        paddingTop: "10px",
                        borderTop: "1px dashed #e9ecef",
                        marginTop: "10px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#7f8c8d",
                          fontStyle: "italic",
                        }}
                      >
                        {isLoading ? 'Loading...' : 'Click to expand'}
                        {hasActiveFilters && !isLoading && ' (filtered view)'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      height: "100%",
                      background:
                        "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#bdc3c7",
                    }}
                  >
                    <i
                      className="fas fa-sticky-note"
                      style={{ fontSize: "24px" }}
                    />
                  </div>
                )}
              </div>
            );
          }
        )}
    </div>
  );
};

  // Render expanded stack with notes
  const renderExpandedStack = (job) => {
    const jobName = job.jobName;
    const jobNotes = job.notes || [];
    const isLoading = job.isLoadingNotes;
    const hasError = job.errorLoadingNotes;
    const hasLoaded = job.hasLoadedNotes;
    const noteCount = job.noteCount || 0;
    const displayNoteCount = jobNotes.length;
    
    return (
      <div
        key={`stack-${job.jobId}`}
        className={`job-stack-container expanded-full-width`}
      >
        <div className="expanded-stack">
          <div className="expanded-stack-header">
            <div className="expanded-stack-title-section">
              <div className="expanded-stack-title">
                <i className="fas fa-briefcase" />
                {jobName}
               
              </div>
             
            </div>
            <div className="expanded-stack-count">
              <i className="fas fa-layer-group" />
              <span>{displayNoteCount} of {noteCount} notes</span>
            </div>
          </div>
          
          {/* Loading state */}
          {isLoading && (
            <div className="stack-notes-loading" style={{
              padding: "40px",
              textAlign: "center",
              color: "#666",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              margin: "20px 0"
            }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: "24px", marginBottom: "10px", display: "block" }} />
              <div>Loading notes for {jobName}...</div>
            </div>
          )}
          
          {/* Error state */}
          {hasError && !isLoading && (
            <div className="stack-notes-error" style={{
              padding: "20px",
              textAlign: "center",
              color: "#e74c3c",
              backgroundColor: "#fdf2f2",
              borderRadius: "8px",
              margin: "20px 0",
              border: "1px solid #f8d7da"
            }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: "24px", marginBottom: "10px", display: "block" }} />
              <div style={{ marginBottom: "10px" }}>Failed to load notes: {hasError}</div>
              <button
                onClick={() => toggleStackExpansion(jobName, job.jobId)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#3498db",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                <i className="fas fa-redo" style={{ marginRight: "8px" }} />
                Retry Loading
              </button>
            </div>
          )}
          
          {/* Loaded notes */}
          {hasLoaded && !isLoading && !hasError && (
            <>
              {displayNoteCount === 0 ? (
                <div className="no-notes-filtered" style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#999",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  margin: "20px 0"
                }}>
                  <i className="fas fa-search" style={{ fontSize: "24px", marginBottom: "10px", display: "block", opacity: 0.5 }} />
                  <div>No notes match your current filters for this job</div>
                  {hasActiveFilters && (
                    <div style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
                      Try adjusting your filters or clear them to see all notes
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {displayNoteCount > 0 && displayNoteCount < noteCount && (
                    <div className="notes-count-info" style={{
                      padding: "8px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: "4px",
                      margin: "10px 0",
                      fontSize: "12px",
                      color: "#1565c0"
                    }}>
                      <i className="fas fa-info-circle" /> Showing {displayNoteCount} of {noteCount} notes
                      {hasActiveFilters && " that match your filters"}
                    </div>
                  )}
                  
                  <div className="expanded-notes-grid">
                    {jobNotes.map((note) => {
                      const priorityValue = note.priority || 1;
                      
                      return (
                        <div
                          key={note.id}
                          className={`note-card ${
                            selectedRow === note.id ? "selected" : ""
                          } stack-expanded-card`}
                          onClick={() => handleRowClick(note)}
                          onDoubleClick={() => handleRowDoubleClick(note)}
                        >
                          <div className="note-header">
                            <div className="user-avatar-wrapper">
                              <div className="user-avatar">
                                {note.userName ? (
                                  (() => {
                                    const names = note.userName.trim().split(/\s+/);
                                    const firstInitial = names[0]
                                      ? names[0].charAt(0).toUpperCase()
                                      : "";
                                    const lastInitial =
                                      names.length > 1
                                        ? names[names.length - 1].charAt(0).toUpperCase()
                                        : "";
                                    return firstInitial + lastInitial;
                                  })()
                                ) : (
                                  <i className="fas fa-user" />
                                )}
                              </div>
                              <div className="user-tooltip">
                                {note.userName || "Unknown User"}
                              </div>
                            </div>
                            <div className="note-meta">
                              <div
                                className="note-author"
                                title={note.userName || "Unknown User"}
                              >
                                {note.userName}
                              </div>
                              <div
                                className="note-date"
                                title={new Date(note.date).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              >
                                {formatRelativeTime(note.timeStamp)}
                              </div>
                            </div>
                            <div className="note-context">
                              <div
                                className="context-item job"
                                title={note.job}
                              >
                                 <HighlightText text={note.job || "—"} highlight={searchTerm} />
                              </div>
                              <div className="context-item workspace-project">
                                <span title={note.workspace}>
                                  <HighlightText text={note.workspace || "—"} highlight={searchTerm} />
                                </span>
                                /
                                <span title={note.project}>
                                  <HighlightText text={note.project || "—"} highlight={searchTerm} />
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="note-content">
                            <div
                              className="note-card-content-container"
                              style={{ position: "relative" }}
                            >
                              <div
                                className="note-text"
                                dangerouslySetInnerHTML={{
                                  __html: note.note,
                                }}
                              />
                              {note.note && note.note.length > 150 && (
                                <div className="note-card-popup">
                                  {note.note}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="note-footer">
                            <div
                              className="note-attachments"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                              }}
                            >
                              {renderStackedImageIcon(note)}
                              <button
                                className="attachment-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewAttachments(note);
                                }}
                              >
                                <i
                                  className="fas fa-paperclip"
                                  style={{
                                    opacity: note.documentCount > 0 ? 1 : 0.3,
                                  }}
                                />
                                <span>
                                  ({note.documentCount || 0})
                                </span>
                              </button>                          
                            </div>
                            <div className="note-actions">
                              {priorityValue > 1 ? (
                                <div
                                  className={`priority-indicator priority-${priorityValue}`}
                                  style={{ cursor: "pointer" }}
                                  title={
                                    priorityValue === 3
                                      ? "Medium Priority - Click to change"
                                      : priorityValue === 4
                                      ? "High Priority - Click to change"
                                      : "No Priority"
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNoteForPriority(note);
                                    setPriorityDropdownPosition({
                                      x: e.clientX,
                                      y: e.clientY,
                                    });
                                    setShowPriorityDropdown(true);
                                  }}
                                />
                              ) : (
                                <div
                                  className="priority-placeholder"
                                  style={{
                                    cursor: "pointer",
                                    opacity: 0.2,
                                    transition: "all 0.2s ease",
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "50%",
                                    border: "1px dashed #ddd",
                                    backgroundColor: "transparent",
                                  }}
                                  title="Click to set priority"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNoteForPriority(note);
                                    setPriorityDropdownPosition({
                                      x: e.clientX,
                                      y: e.clientY,
                                    });
                                    setShowPriorityDropdown(true);
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = "0.5";
                                    e.currentTarget.style.borderColor = "#3498db";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = "0.2";
                                    e.currentTarget.style.borderColor = "#ddd";
                                  }}
                                />
                              )}
                              <button
                                className="action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddFromRow(note);
                                }}
                                title="Add New Note"
                              >
                                <i className="fas fa-plus" />
                              </button>
                              <button
                                className="action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(note);
                                }}
                                title="Edit Note"
                              >
                                <i className="fas fa-edit" />
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(note);
                                }}
                                title="Delete Note"
                              >
                                <i className="fas fa-trash" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
          
          {/* No notes loaded yet */}
          {!hasLoaded && !isLoading && !hasError && (
            <div className="stack-notes-placeholder" style={{
              padding: "40px",
              textAlign: "center",
              color: "#999",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              margin: "20px 0"
            }}>
              <i className="fas fa-sticky-note" style={{ fontSize: "24px", marginBottom: "10px", display: "block", opacity: 0.5 }} />
              <div>Click "Retry Loading" to load notes for this job</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main render logic
  return (
    <div className="grid-scroll-container" ref={containerRef}>
      {viewMode === "table" ? (
        <div className="responsive-table-container">
          <table>
            <thead>
              <tr>
                {[
                  "date",
                  "workspace",
                  "project",
                  "job",
                  "note",
                  "userName",
                  "Attached Files",
                ].map((c) => (
                  <th key={c} className="filterable-column">
                    {c === "date" && <i className="fas fa-calendar" />}
                    {c === "workspace" && <i className="fas fa-building" />}
                    {c === "project" && (
                      <i className="fas fa-project-diagram" />
                    )}
                    {c === "job" && <i className="fas fa-tasks" />}
                    {c === "note" && <i className="fas fa-sticky-note" />}
                    {c === "userName" && <i className="fas fa-user" />}
                    {c === "Attached Files" && (
                      <i className="fas fa-paperclip" />
                    )}{" "}
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!isDataLoaded || initialLoading || searchLoading || loadingFiltered || loadingUniques || isLoadingInitial ? (
                renderTableSkeleton()
              ) : displayNotes.length === 0 ? (
                renderTableEmptyState()
              ) : (
                <>
                  {displayNotes.map((note, index) => 
                    renderTableRow(note, index, index === displayNotes.length - 1)
                  )}
                  {loadingMore && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "20px" }}>
                        <div className="loading-more">
                          <i className="fas fa-spinner fa-spin" style={{ marginRight: "8px" }} />
                          Loading more notes...
                        </div>
                      </td>
                    </tr>
                  )}
                  {!hasMore && displayNotes.length > 0 && !loadingMore && !hasActiveFilters && !searchTerm.trim() && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "10px", color: "#666", fontStyle: "italic" }}>
                        <i className="fas fa-check-circle" style={{ marginRight: "8px", color: "#75a0f5ff" }} />
                        No more notes to load
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      ) : viewMode === "stacked" ? (
        <div className="stacked-notes-horizontal">
          {loadingStackedJobs ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="job-stack-skeleton">
                <div className="skeleton-stack-header" />
                <div className="skeleton-stack-content" />
              </div>
            ))
          ) : !jobsToDisplay || jobsToDisplay.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-layer-group" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}/>
              <h3>
                {hasActiveFilters 
                  ? "No jobs match your filters" 
                  : "No stacked jobs available"}
              </h3>
              <p>
                {hasActiveFilters
                  ? "Try adjusting your filters to see matching jobs"
                  : "No jobs with notes found."}
              </p>
              {hasActiveFilters ? (
                <button 
                  onClick={() => {
                    // Clear filters would be handled by parent
                  }}
                  style={{ 
                    marginTop: '16px', 
                    padding: '8px 16px',
                    backgroundColor: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-times" style={{ marginRight: '8px' }} />
                  Clear Filters
                </button>
              ) : (
                <button 
                  onClick={() => fetchStackedJobs && fetchStackedJobs()}
                  style={{ 
                    marginTop: '16px', 
                    padding: '8px 16px',
                    backgroundColor: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-redo" style={{ marginRight: '8px' }} />
                  Retry Loading
                </button>
              )}
            </div>
          ) : (
            <div className="stacked-container">
              {isAnyStackExpanded && (
                <div className="fixed-collapse-btn-wrapper">
                  <button
                    className="collapse-all-stacks-btn"
                    onClick={() => {
                      Object.keys(expandedStacks).forEach(jobName => {
                        if (expandedStacks[jobName]) {
                          const job = jobsToDisplay.find(j => j.jobName === jobName);
                          if (job) {
                            toggleStackExpansion(jobName, job.jobId);
                          }
                        }
                      });
                    }}
                  >
                    <i className="fas fa-compress" />
                  </button>
                </div> 
              )}
              {sortedJobs.map((job) => {
                const jobName = job.jobName;
                const isExpanded = expandedStacks[jobName];
                
                if (!isExpanded && isAnyStackExpanded) {
                  return null;
                }
                
                return isExpanded 
                  ? renderExpandedStack(job)
                  : renderCollapsedStack(job);
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="notes-grid">
          {!isDataLoaded || initialLoading || searchLoading || loadingFiltered || isLoadingInitial ? (
            renderCardSkeleton()
          ) : displayNotes.length === 0 ? (
            renderCardEmptyState()
          ) : (
            <>
              {displayNotes.map((note, index) => 
                renderNoteCard(note, index, index === displayNotes.length - 1)
              )}
              {loadingMore && (
                <div className="loading-more-cards">
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: "8px" }} />
                  Loading more notes...
                </div>
              )}
              {!hasMore && displayNotes.length > 0 && !loadingMore && !hasActiveFilters && !searchTerm.trim() && (
                <div className="no-more-notes" style={{ 
                  gridColumn: "1 / -1", 
                  textAlign: "center", 
                  padding: "8px", 
                  color: "#666", 
                  fontStyle: "italic",
                  borderRadius: "8px",
                  margin: "5px 0"
                }}>
                  <i className="fas fa-check-circle" style={{ marginRight: "8px", color: "#75a0f5ff" }} />
                  No more notes to load
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

NotesTab.propTypes = {
  viewMode: PropTypes.string.isRequired,
  finalDisplayNotes: PropTypes.array,
  isDataLoaded: PropTypes.bool.isRequired,
  initialLoading: PropTypes.bool.isRequired,
  searchLoading: PropTypes.bool.isRequired,
  loadingFiltered: PropTypes.bool.isRequired,
  loadingUniques: PropTypes.bool.isRequired,
  searchTerm: PropTypes.string.isRequired,
  getActiveFilterCount: PropTypes.func.isRequired,
  handleRowClick: PropTypes.func.isRequired,
  handleRowDoubleClick: PropTypes.func.isRequired,
  handleAddFromRow: PropTypes.func.isRequired,
  handleEdit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleViewAttachments: PropTypes.func.isRequired,
  selectedRow: PropTypes.any,
  focusedRow: PropTypes.any,
  inlineImagesMap: PropTypes.object.isRequired,
  loadingImages: PropTypes.object.isRequired,
  renderTableImageIcon: PropTypes.func.isRequired,
  renderCardImageIcon: PropTypes.func.isRequired,
  renderStackedImageIcon: PropTypes.func.isRequired,
  setShowPriorityDropdown: PropTypes.func.isRequired,
  setSelectedNoteForPriority: PropTypes.func.isRequired,
  setPriorityDropdownPosition: PropTypes.func.isRequired,
  expandedStacks: PropTypes.object.isRequired,
  toggleStackExpansion: PropTypes.func.isRequired,
  expandedCardLimit: PropTypes.object.isRequired,
  jobs: PropTypes.array.isRequired,
  setViewNote: PropTypes.func.isRequired,
  setShowViewModal: PropTypes.func.isRequired,
  stackedJobs: PropTypes.array,
  loadingStackedJobs: PropTypes.bool,
  fetchStackedJobs: PropTypes.func,
  fetchNotes: PropTypes.func.isRequired,
  userId: PropTypes.number.isRequired,
  hasActiveFilters: PropTypes.bool.isRequired,
  filteredNotesFromApi: PropTypes.array.isRequired,
  searchResults: PropTypes.array.isRequired,
};

NotesTab.defaultProps = {
  finalDisplayNotes: [],
  stackedJobs: [],
  loadingStackedJobs: false,
  fetchStackedJobs: () => {},
  filteredNotesFromApi: [],
  searchResults: [],
};

export default NotesTab;