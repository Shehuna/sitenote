import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import "./NotesTab.css";

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
  priorities,
  handleAddFromRow,
  handleEdit,
  handleDelete,
  handleViewAttachments,
  selectedRow,
  focusedRow,
  inlineImagesMap,
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
  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;
  
  const pageSize = 50;
  const initialPageNumber = 1;

  // Determine which notes to display based on filters/search
  const displayNotes = useMemo(() => {
    // If we have active filters or search term, use those results from parent
    if (searchTerm.trim() || hasActiveFilters) {
      return searchTerm.trim() ? (searchResults || []) : (filteredNotesFromApi || []);
    }
    
    // Otherwise, use localNotes for infinite scroll OR finalDisplayNotes if we have them
    // Prefer localNotes for infinite scroll, but also include any new notes from parent
    if (finalDisplayNotes && finalDisplayNotes.length > 0) {
      // When localNotes is empty but we have finalDisplayNotes, use them
      if (localNotes.length === 0) {
        return [...finalDisplayNotes].sort((a, b) => b.id - a.id);
      }
      
      // Merge and deduplicate notes from both sources
      const allNotesMap = new Map();
      
      // First add all localNotes
      localNotes.forEach(note => {
        allNotesMap.set(note.id, note);
      });
      
      // Then add/update with finalDisplayNotes (these are newer/more up-to-date)
      finalDisplayNotes.forEach(note => {
        allNotesMap.set(note.id, note);
      });
      
      // Convert back to array and sort by ID descending (newest first)
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

  // Sync finalDisplayNotes from parent to localNotes when appropriate
  useEffect(() => {
    // Only sync when we have finalDisplayNotes and no active filters/search
    if (finalDisplayNotes && 
        finalDisplayNotes.length > 0 && 
        !hasActiveFilters && 
        !searchTerm.trim()) {
      
      // If this is initial load, set localNotes directly
      if (isInitialLoad) {
        setLocalNotes([...finalDisplayNotes].sort((a, b) => b.id - a.id));
        setHasMore(finalDisplayNotes.length >= pageSize);
        setIsInitialLoad(false);
      } else {
        // Merge new notes from parent with existing local notes
        const existingIds = new Set(localNotes.map(note => note.id));
        const newNotesFromParent = finalDisplayNotes.filter(note => !existingIds.has(note.id));
        
        if (newNotesFromParent.length > 0) {
          // Sort new notes by ID descending and add to beginning (newest first)
          const sortedNewNotes = [...newNotesFromParent].sort((a, b) => b.id - a.id);
          setLocalNotes(prev => [...sortedNewNotes, ...prev]);
          
          // Also update any existing notes that might have changed
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
      
      // If we have finalDisplayNotes, use them as base
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

  // Load initial notes via API (only when parent doesn't provide data)
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
          // Filter out duplicates
          const existingIds = new Set(prev.map(note => note.id));
          const newNotes = result.notes.filter(note => !existingIds.has(note.id));
          // Sort by ID descending (newest first)
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

  // Initialize notes on mount if parent doesn't provide them
  useEffect(() => {
    if (isDataLoaded && !hasActiveFilters && !searchTerm.trim() && isInitialLoad) {
      if (!finalDisplayNotes || finalDisplayNotes.length === 0) {
        loadInitialNotes();
      } else {
        // Parent already provided notes
        setIsInitialLoad(false);
      }
    }
  }, [isDataLoaded, hasActiveFilters, searchTerm, isInitialLoad, loadInitialNotes, finalDisplayNotes]);

  // Setup intersection observer for infinite scroll
  const setupObserver = useCallback(() => {
    // Clean up existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Don't setup observer if we shouldn't be loading more
    if (hasActiveFilters || searchTerm.trim() || !hasMore || loadingMore) {
      return;
    }

    // Determine which element to observe based on view mode
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

  // Update observer when dependencies change
  useEffect(() => {
    setupObserver();
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [setupObserver]);

  // Re-setup observer when displayNotes changes
  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      setupObserver();
    }, 100);

    return () => clearTimeout(timer);
  }, [displayNotes, setupObserver]);

  // Fetch user statuses when displayNotes changes
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
  }, [displayNotes]);

  // Helper function to get user status style
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

  // New function to render user name with hover tooltip for inactive users
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

  // Render loading skeleton for table view
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

  // Render loading skeleton for card view
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

  // Render empty state for table
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
  const renderTableRow = (note, isLast = false) => {
    const notePriority = priorities.find(p => Number(p.noteID) === Number(note.id));
    
    return (
      <tr
        key={note.id}
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
          // Show tooltip on hover for inactive users
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
          // Hide tooltip when mouse leaves
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
              dangerouslySetInnerHTML={{ __html: note.note && note.note.length > 69 ? note.note.substring(0, 69) + "..." : note.note || "" }}
            />
            {note.note && note.note.length > 69 && (
              <div className="note-hover-popup" dangerouslySetInnerHTML={{ __html: note.note }} />
            )}
            {renderPriorityDot(notePriority, note)}
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
  const renderPriorityDot = (notePriority, note) => {
    if (notePriority && notePriority.priorityValue > 1) {
      return (
        <div
          className={`priority-dot priority-dot-${notePriority.priorityValue}`}
          style={{ width: "10px", height: "10px", borderRadius: "50%", position: "absolute", top: "4px", right: "4px", cursor: "pointer", zIndex: 10 }}
          title={notePriority.priorityValue === 3 ? "Medium Priority - Click to change" : "High Priority - Click to change"}
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
  const renderNoteCard = (note, isLast = false) => {
    const notePriority = priorities.find(p => p.noteID === note.id);
    const isInactive = userStatusMap[note.userId] && !userStatusMap[note.userId].active;
    
    return (
      <div
        key={note.id}
        className={`note-card ${selectedRow === note.id ? "selected" : ""}`}
        onClick={() => handleRowClick(note)}
        onDoubleClick={() => handleRowDoubleClick(note)}
        ref={isLast ? lastCardRef : null}
        onMouseEnter={(e) => {
          // Show tooltip on hover for inactive users
          if (isInactive) {
            const tooltip = e.currentTarget.querySelector('.inactive-user-tooltip');
            if (tooltip) {
              tooltip.style.opacity = '1';
              tooltip.style.visibility = 'visible';
            }
          }
        }}
        onMouseLeave={(e) => {
          // Hide tooltip when mouse leaves
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
            <div className="context-item job" title={note.job}>{note.job || "—"}</div>
            <div className="context-item workspace-project">
              <span title={note.workspace}>{note.workspace || "—"}</span>/
              <span title={note.project}>{note.project || "—"}</span>
            </div>
          </div>
        </div>
        <div className="note-content">
          <div className="note-card-content-container" style={{ position: "relative" }}>
            <div className="note-text" dangerouslySetInnerHTML={{ __html: note.note || "" }} />
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
            {renderCardPriorityIndicator(notePriority, note)}
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
  const renderCardPriorityIndicator = (notePriority, note) => {
    if (notePriority && notePriority.priorityValue > 1) {
      return (
        <div
          className={`priority-indicator priority-${notePriority.priorityValue}`}
          style={{ cursor: "pointer" }}
          title={notePriority.priorityValue === 3 ? "Medium Priority - Click to change" : "High Priority - Click to change"}
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
    if (stackedJobs && stackedJobs.length > 0) {
      stackedJobs.forEach(job => {
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
    ? (stackedJobs && stackedJobs.length > 0 
        ? [...stackedJobs].sort((a, b) => {
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
                    renderTableRow(note, index === displayNotes.length - 1)
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
    ) : !stackedJobs || stackedJobs.length === 0 ? (
      <div className="empty-state">
        <i className="fas fa-layer-group" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}/>
        <h3>No stacked jobs available</h3>
        <p>
          {stackedJobs && stackedJobs.length === 0 
            ? "No jobs with notes found."
            : "Failed to load stacked jobs. Please try refreshing."}
        </p>
        <button 
          onClick={() => fetchStackedJobs && fetchStackedJobs()} // Safe call
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
                    toggleStackExpansion(jobName);
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
          const jobNotes = job.notes || [];
          const noteCount = job.noteCount || job.totalSiteNotes || jobNotes.length || 0;
          const actualNoteCount = jobNotes.length;
          const apiNoteCount = job.noteCount || job.totalSiteNotes || 0;
          
          const displayNoteCount = jobNotes.length > 0 ? jobNotes.length : apiNoteCount;
          const isExpanded = expandedStacks[jobName];
          const currentLimit = expandedCardLimit[jobName] ?? 50;
          const displayNotes = isExpanded ? jobNotes : [];
          const remainingNotes = noteCount - currentLimit;
            console.log(`Job: ${jobName}, API Count: ${apiNoteCount}, Actual Notes: ${jobNotes.length}`);
                    
          
          if (!isExpanded && isAnyStackExpanded) {
            return null;
          }
          
          return (
            <div
              key={`stack-${job.jobId || jobName}`}
              className={`job-stack-container ${
                isExpanded
                  ? "expanded-full-width"
                  : "collapsed-vertical-stack"
              }`}
            >
              {isExpanded ? (
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
                      <span>{displayNoteCount} notes</span>
                    </div>
                  </div>
                  {displayNotes.length > 0 && displayNotes.length < apiNoteCount && (
                    <div className="notes-count-info" style={{
                      padding: "8px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: "4px",
                      margin: "10px 0",
                      fontSize: "12px",
                      color: "#1565c0"
                    }}>
                      <i className="fas fa-info-circle" /> Showing {displayNotes.length} of {apiNoteCount} notes
                    </div>
                  )}
                  <div className="expanded-notes-grid">
                    
                    {displayNotes.map((note) => {
                      const notePriority = priorities.find(
                        (p) => p.noteID === note.id
                      );
                      return (
                        <div
                          key={note.id}
                          className={`note-card ${
                            selectedRow === note.id ? "selected" : ""
                          } stack-expanded-card`}
                          onClick={() => handleRowClick(note)}
                          onDoubleClick={() =>
                            handleRowDoubleClick(note)
                          }
                        >
                          <div className="note-header">
                            <div className="user-avatar-wrapper">
                              <div className="user-avatar">
                                {note.userName ? (
                                  (() => {
                                    const names = note.userName
                                      .trim()
                                      .split(/\s+/);
                                    const firstInitial = names[0]
                                      ? names[0]
                                          .charAt(0)
                                          .toUpperCase()
                                      : "";
                                    const lastInitial =
                                      names.length > 1
                                        ? names[names.length - 1]
                                            .charAt(0)
                                            .toUpperCase()
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
                                title={
                                  note.userName || "Unknown User"
                                }
                              >
                                {note.userName}
                              </div>
                              <div
                                className="note-date"
                                title={new Date(
                                  note.date
                                ).toLocaleDateString("en-US", {
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
                                {note.job}
                              </div>
                              <div className="context-item workspace-project">
                                <span title={note.workspace}>
                                  {note.workspace}
                                </span>
                                /
                                <span title={note.project}>
                                  {note.project}
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
                              {note.note.length > 150 && (
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
                                    opacity:
                                      note.documentCount > 0
                                        ? 1
                                        : 0.3,
                                  }}
                                />
                                <span>
                                  ({note.documentCount || 0})
                                </span>
                              </button>
                            </div>
                            <div className="note-actions">
                              {notePriority &&
                              notePriority.priorityValue > 1 ? (
                                <div
                                  className={`priority-indicator priority-${notePriority.priorityValue}`}
                                  style={{ cursor: "pointer" }}
                                  title={
                                    notePriority.priorityValue === 3
                                      ? "Medium Priority - Click to change"
                                      : notePriority.priorityValue ===
                                        4
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
                                    e.currentTarget.style.opacity =
                                      "0.5";
                                    e.currentTarget.style.borderColor =
                                      "#3498db";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity =
                                      "0.2";
                                    e.currentTarget.style.borderColor =
                                      "#ddd";
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
                    }
                  )}
                  </div>
                  
                </div>
              ) : (
                  <div
                    className="collapsed-stack"
                    onClick={() => toggleStackExpansion(jobName)}
                    style={{
                      cursor: "pointer",
                      position: "relative",
                      height: "280px",
                      width: "100%",
                    }}
                  >
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
                                  backgroundColor: " #14A2B6",
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
                                (job.notes && job.notes[0] && job.notes[0].userName) }
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
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                                         
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4 }}>
                      {job.jobDescription || "No description available for this job."}
                    </div>
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
                                Click to expand
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
            )}
                        </div>
                      );
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
                renderNoteCard(note, index === displayNotes.length - 1)
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
  priorities: PropTypes.array.isRequired,
  handleAddFromRow: PropTypes.func.isRequired,
  handleEdit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleViewAttachments: PropTypes.func.isRequired,
  selectedRow: PropTypes.any,
  focusedRow: PropTypes.any,
  inlineImagesMap: PropTypes.object.isRequired,
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