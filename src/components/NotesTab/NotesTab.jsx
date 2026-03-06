import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import toast from "react-hot-toast";
import './NotesTab.css';

// Hooks
import { useNotesData } from "./hooks/useNotesData";
import { usePriorityManagement } from "./hooks/usePriorityManagement";
import { useNoteReplies } from "./hooks/useNoteReplies";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { useNoteHover } from "./hooks/useNoteHover";
import { useUserStatus } from "./hooks/useUserStatus";
import { useLinkedNoteTooltip } from "./hooks/useLinkedNoteTooltip";
import { usePriorityHover } from "./hooks/usePriorityHover";
import { useStackedView } from "./hooks/useStackedView";

// Components
import { TableView, CardView, StackedView } from "./components/NoteViews";
import { NoteTextPopup } from "./components/Note";
import { PriorityTooltip, LinkedNoteTooltip } from "./components/Tooltips";
import ReplyModal from "../Modals/ReplyModal";
import AiChatDialog from "../ai/AiChatDialog";

// Utils
import { PAGE_SIZE, INITIAL_PAGE_NUMBER } from "./utils/constants";
import { formatTooltipContent, formatPriorityDate } from "./utils/formatUtils";

// Portal component for tooltips
const TooltipPortal = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

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
  renderTableImageIcon,
  renderCardImageIcon,
  renderStackedImageIcon,
  expandedStacks,
  toggleStackExpansion,
  jobs,
  projects,
  handleFilterCheckboxChange, 
  removeFilter, 
  setViewNote,
  setShowViewModal,
  stackedJobs,
  loadingStackedJobs,
  fetchNotes,
  userId,
  hasActiveFilters,
  filteredNotesFromApi,
  searchResults,
  handleFilterChange, 
  selectedFilters,
}) => {
  // State
  const [localNotes, setLocalNotes] = useState([]);
  const [page, setPage] = useState(INITIAL_PAGE_NUMBER);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedNoteForReply, setSelectedNoteForReply] = useState(null);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiJobContext, setAiJobContext] = useState(null);

  const [tasksByJob, setTasksByJob] = useState({});
const [loadingTasksByJob, setLoadingTasksByJob] = useState({});
const [expandedTasks, setExpandedTasks] = useState({});
const [notesByTask, setNotesByTask] = useState({});
const [loadingNotesByTask, setLoadingNotesByTask] = useState({});

const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

  // Refs
  const containerRef = useRef(null);
  const loadingRef = useRef(false);

  // 1. Priority management hook
  const {
    priorityTooltipData = {},
    loadingPriorityData = {},
    manuallyUpdatedPriorities = {},
    fetchPriorityData,
    handlePriorityClick,
    getPriorityValue,
  } = usePriorityManagement();

  // 2. Get base notes data
  const { displayNotes } = useNotesData({
    searchTerm,
    hasActiveFilters,
    searchResults,
    filteredNotesFromApi,
    localNotes,
    finalDisplayNotes,
    manuallyUpdatedPriorities,
  });

  // 3. Create memoized display notes BEFORE useNoteReplies
  const memoizedDisplayNotes = useMemo(() => {
    return displayNotes || [];
  }, [displayNotes]);

  // 4. Note replies hook with memoizedDisplayNotes
  const {
    noteReplies,
    loadingReplies,
    fetchNoteReplies,
    isNoteReply,
    getReplyNoteId,
    isOriginalNoteExists,
  } = useNoteReplies({ userId, displayNotes: memoizedDisplayNotes });

  // 5. All other hooks
const {
  hoveredNoteContent,
  hoveredNoteId,
  notePopupPosition,
  noteElementRect,
  shouldShowNotePopup,
  handleNoteTextMouseEnter,
  handleNoteTextMouseLeave,
  handlePopupMouseEnter, // Add this
  handlePopupMouseLeave, // Add this
} = useNoteHover({ viewMode });

  const {
    userStatusMap,
    loadingUsers,
    fetchUserStatus,
    getUserStatusStyle,
  } = useUserStatus();

  const {
    hoveredLinkedNote,
    tooltipPosition,
    linkedNoteContent,
    loadingLinkedNote,
    handleLinkedNoteMouseEnter,
    handleLinkedNoteMouseLeave,
    handleLinkedNoteClick: handleLinkedNoteClickHook,
  } = useLinkedNoteTooltip({ getReplyNoteId });

  // Create a safe fetchPriorityData function if it doesn't exist
  const safeFetchPriorityData = useCallback((noteId) => {
    if (fetchPriorityData && typeof fetchPriorityData === 'function') {
      return fetchPriorityData(noteId);
    }
    return Promise.resolve();
  }, [fetchPriorityData]);

  // Priority hover hook
  const {
    hoveredPriorityNote,
    priorityTooltipPosition,
    handlePriorityMouseEnter,
    handlePriorityMouseLeave,
  } = usePriorityHover({ 
    fetchPriorityData: safeFetchPriorityData, 
    priorityTooltipData: priorityTooltipData || {} 
  });

  const {
    isStackedViewLoading,
    isFilteringStacked,
  } = useStackedView({ viewMode, hasActiveFilters });

  // Determine which jobs to display in stacked view
  const jobsToDisplay = useMemo(() => {
    if (viewMode !== "stacked") return [];
    return stackedJobs || [];
  }, [viewMode, stackedJobs, hasActiveFilters]);

  // Effect to sync finalDisplayNotes from parent
  useEffect(() => {
    if (
      finalDisplayNotes &&
      finalDisplayNotes.length > 0 &&
      !hasActiveFilters &&
      !searchTerm.trim()
    ) {
      if (isInitialLoad) {
        setLocalNotes([...finalDisplayNotes].sort((a, b) => b.id - a.id));
        setHasMore(finalDisplayNotes.length >= PAGE_SIZE);
        setIsInitialLoad(false);
      } else {
        const existingIds = new Set(localNotes.map((note) => note.id));
        const newNotesFromParent = finalDisplayNotes.filter(
          (note) => !existingIds.has(note.id),
        );

        if (newNotesFromParent.length > 0) {
          const sortedNewNotes = [...newNotesFromParent].sort(
            (a, b) => b.id - a.id,
          );
          setLocalNotes((prev) => [...sortedNewNotes, ...prev]);

          const updatedNotes = finalDisplayNotes.filter((note) =>
            existingIds.has(note.id),
          );
          if (updatedNotes.length > 0) {
            setLocalNotes((prev) =>
              prev.map((note) => {
                const updatedNote = updatedNotes.find((u) => u.id === note.id);
                return updatedNote || note;
              }),
            );
          }
        }
      }
    }
  }, [finalDisplayNotes, hasActiveFilters, searchTerm, isInitialLoad, localNotes]);

  // Reset infinite scroll when filters/search are cleared
  useEffect(() => {
    if (!hasActiveFilters && !searchTerm.trim() && !isInitialLoad) {
      setHasMore(true);
      setPage(1);

      if (finalDisplayNotes && finalDisplayNotes.length > 0) {
        setLocalNotes([...finalDisplayNotes].sort((a, b) => b.id - a.id));
        setPage(2);
        setHasMore(finalDisplayNotes.length >= PAGE_SIZE);
      }
    }
  }, [hasActiveFilters, searchTerm, isInitialLoad, finalDisplayNotes]);

  // Load initial notes
  const loadInitialNotes = useCallback(async () => {
    if (
      loadingRef.current ||
      (finalDisplayNotes && finalDisplayNotes.length > 0)
    ) return;

    loadingRef.current = true;
    setIsLoadingInitial(true);

    try {
      const result = await fetchNotes(INITIAL_PAGE_NUMBER, PAGE_SIZE);
      if (result && result.notes) {
        setLocalNotes([...result.notes].sort((a, b) => b.id - a.id));
        setHasMore(result.hasMore);
        setPage(INITIAL_PAGE_NUMBER + 1);
      }
    } catch (error) {
      console.error("Error loading initial notes:", error);
    } finally {
      loadingRef.current = false;
      setIsLoadingInitial(false);
      setIsInitialLoad(false);
    }
  }, [fetchNotes, finalDisplayNotes]);

// Handler for clicking on project context
const handleProjectClick = (projectName) => {
  console.log('🔵 handleProjectClick called with:', projectName);
  
  const project = (projects || []).find(p => 
    p.name === projectName || 
    p.projectName === projectName ||
    p.text === projectName
  );
  
  if (!project) {
    console.error('Project not found:', projectName);
    return;
  }
  
  const projectId = project.id || project.projectId;
  const projectDisplayText = project.displayName || project.displayText || projectName;
  
  console.log('Found project:', {
    id: projectId,
    name: projectName,
    displayText: projectDisplayText
  });
  
  if (handleFilterCheckboxChange && typeof handleFilterCheckboxChange === 'function') {
    handleFilterCheckboxChange('project', projectId, {
      id: projectId,
      text: projectName,
      displayText: projectDisplayText
    });
  } else {
    console.error('handleFilterCheckboxChange is not available');
    toast.error('Filter functionality is not available');
  }
};

const handleJobClick = (jobName) => {
  console.log('🔵 handleJobClick called with:', jobName);
  
  const job = (jobs || []).find(j => 
    j.name === jobName || 
    j.jobName === jobName ||
    j.text === jobName
  );
  
  if (!job) {
    console.error('Job not found:', jobName);
    return;
  }
  
  const jobId = job.id || job.jobId;
  const jobDisplayText = job.displayName || job.displayText || jobName;
  
  console.log('Found job:', {
    id: jobId,
    name: jobName,
    displayText: jobDisplayText
  });
  
  if (handleFilterCheckboxChange && typeof handleFilterCheckboxChange === 'function') {
    handleFilterCheckboxChange('job', jobId, {
      id: jobId,
      text: jobName,
      displayText: jobDisplayText
    });
  } else {
    console.error('handleFilterCheckboxChange is not available');
    toast.error('Filter functionality is not available');
  }
};

const fetchTasksForJob = useCallback(async (jobId) => {
  if (!jobId || loadingTasksByJob[jobId]) return;
  
  setLoadingTasksByJob(prev => ({ ...prev, [jobId]: true }));
  
  try {
    const response = await fetch(`${apiUrl}/JobTasks/job/${jobId}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      setTasksByJob(prev => ({ ...prev, [jobId]: result.data }));
    }
  } catch (error) {
    console.error('Error fetching tasks:', error);
    toast.error('Failed to load tasks');
  } finally {
    setLoadingTasksByJob(prev => ({ ...prev, [jobId]: false }));
  }
}, [apiUrl]);

const fetchNotesForTask = useCallback(async (taskId, jobId) => {
  if (!taskId || !userId || loadingNotesByTask[taskId]) return;
  
  setLoadingNotesByTask(prev => ({ ...prev, [taskId]: true }));
  
  try {
    const params = new URLSearchParams({
      pageNumber: "1",
      pageSize: "50",
      taskId: taskId,
      userId: userId
    });
    
    const response = await fetch(`${apiUrl}/SiteNote/GetSiteNotesWithFilters?${params.toString()}`);
    const data = await response.json();
    
    const formattedNotes = (data.siteNotes || []).map(n => ({
      ...n,
      id: n.id,
      userName: n.userName || n.UserName,
      documentCount: n.documentCount || 0,
      timeStamp: n.timeStamp || n.date,
      date: n.date || n.createdDate,
      workspace: n.workspace || '',
      project: n.project || '',
      job: n.job || '',
      note: n.note || n.content,
      jobId: n.jobId || jobId,
      taskId: n.taskId
    }));
    
    setNotesByTask(prev => ({ ...prev, [taskId]: formattedNotes }));
  } catch (error) {
    console.error('Error fetching task notes:', error);
  } finally {
    setLoadingNotesByTask(prev => ({ ...prev, [taskId]: false }));
  }
}, [apiUrl, userId]);

const toggleTaskExpansion = useCallback((taskId, jobId) => {
  setExpandedTasks(prev => {
    const isExpanding = !prev[taskId];
    
    // If expanding and no notes loaded, fetch them
    if (isExpanding && (!notesByTask[taskId] || notesByTask[taskId].length === 0)) {
      fetchNotesForTask(taskId, jobId);
    }
    
    return { ...prev, [taskId]: isExpanding };
  });
}, [notesByTask, fetchNotesForTask]);

// Modify the existing toggleStackExpansion to fetch tasks
const handleStackToggle = useCallback((jobName, jobId) => {
  // Call the original toggleStackExpansion from props
  toggleStackExpansion(jobName, jobId);
  
  // If expanding, fetch tasks for this job
  const isExpanding = !expandedStacks[jobName];
  if (isExpanding) {
    fetchTasksForJob(jobId);
  }
}, [toggleStackExpansion, expandedStacks, fetchTasksForJob]);


const isProjectFiltered = (projectName) => {
  console.log('Checking if project is filtered:', projectName);
  console.log('selectedFilters:', selectedFilters);
  console.log('projects:', projects);
  
  if (!selectedFilters || !selectedFilters.project) {
    console.log('No project filters found');
    return false;
  }
  
  const project = (projects || []).find(p => 
    p.name === projectName || 
    p.projectName === projectName ||
    p.text === projectName
  );
  
  console.log('Found project:', project);
  
  if (!project) {
    console.log('Project not found in projects list');
    return false;
  }
  
  const projectId = project.id || project.projectId;
  const isFiltered = selectedFilters.project.includes(projectId);
  console.log('Project ID:', projectId, 'Is filtered?', isFiltered);
  
  return isFiltered;
};

const isJobFiltered = (jobName) => {
  console.log('Checking if job is filtered:', jobName);
  console.log('selectedFilters:', selectedFilters);
  console.log('jobs:', jobs);
  
  if (!selectedFilters || !selectedFilters.job) {
    console.log('No job filters found');
    return false;
  }
  
  const job = (jobs || []).find(j => 
    j.name === jobName || 
    j.jobName === jobName ||
    j.text === jobName
  );
  
  console.log('Found job:', job);
  
  if (!job) {
    console.log('Job not found in jobs list');
    return false;
  }
  
  const jobId = job.id || job.jobId;
  const isFiltered = selectedFilters.job.includes(jobId);
  console.log('Job ID:', jobId, 'Is filtered?', isFiltered);
  
  return isFiltered;
};

const handleUserNameClick = (userName) => {
  
  if (handleFilterCheckboxChange && typeof handleFilterCheckboxChange === 'function') {
    const userNote = memoizedDisplayNotes.find(note => 
      note.userName === userName || 
      note.UserName === userName
    );
    
    let userId = userName; 
    
    if (userNote) {
      userId = userNote.userId || userNote.UserId || userName;
      console.log('Found user note with ID:', userId);
    }
    
    
    
    handleFilterCheckboxChange('userName', userId, {
      id: userId,
      text: userName,
      displayText: userName
    });
  } else {
    console.error('handleFilterCheckboxChange is not available');
    toast.error('Filter functionality is not available');
  }
};

const isUserNameFiltered = (userName) => {
  if (!selectedFilters?.userName) {
    console.log('No username filters in selectedFilters');
    return false;
  }
  
  
  const userNote = memoizedDisplayNotes.find(note => 
    note.userName === userName || 
    note.UserName === userName
  );
  
  let userId = userName; 
  
  if (userNote) {
    userId = userNote.userId || userNote.UserId || userName;
  }
  
  const isFiltered = selectedFilters.userName.includes(userId) || 
                    selectedFilters.userName.includes(userName);
  
  console.log('User ID:', userId, 'Is filtered?', isFiltered);
  return isFiltered;
};

  // Load more notes
  const loadMoreNotes = useCallback(async () => {
    if (
      loadingRef.current ||
      !hasMore ||
      hasActiveFilters ||
      searchTerm.trim()
    ) {
      return;
    }

    loadingRef.current = true;
    setLoadingMore(true);

    try {
      const result = await fetchNotes(page, PAGE_SIZE);
      if (result && result.notes && result.notes.length > 0) {
        setLocalNotes((prev) => {
          const existingIds = new Set(prev.map((note) => note.id));
          const newNotes = result.notes.filter(
            (note) => !existingIds.has(note.id),
          );
          const sortedNewNotes = [...newNotes].sort((a, b) => b.id - a.id);
          return [...prev, ...sortedNewNotes];
        });
        setHasMore(result.hasMore);
        setPage((prev) => prev + 1);
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

  // Initialize useInfiniteScroll
  const {
    lastRowRef,
    lastCardRef,
  } = useInfiniteScroll({
    viewMode,
    hasMore,
    loadingMore,
    hasActiveFilters,
    searchTerm,
    loadMoreNotes,
    displayNotes: memoizedDisplayNotes,
  });

  // Load initial notes on mount
  useEffect(() => {
    if (
      isDataLoaded &&
      !hasActiveFilters &&
      !searchTerm.trim() &&
      isInitialLoad
    ) {
      if (!finalDisplayNotes || finalDisplayNotes.length === 0) {
        loadInitialNotes();
      } else {
        setIsInitialLoad(false);
      }
    }
  }, [isDataLoaded, hasActiveFilters, searchTerm, isInitialLoad, loadInitialNotes, finalDisplayNotes]);

  // Event handlers
  const handleReplyToNote = useCallback((note) => {
    setSelectedNoteForReply(note);
    setShowReplyModal(true);
  }, []);

  const refreshNotesAfterReply = useCallback(async () => {
    try {
      console.log("🔄 Starting refresh...");

      await fetchNoteReplies();

      if (fetchNotes && typeof fetchNotes === "function") {
        const result = await fetchNotes(1, PAGE_SIZE);

        if (result && result.notes) {
          console.log(`✅ Loaded ${result.notes.length} fresh notes`);

          setLocalNotes([...result.notes].sort((a, b) => b.id - a.id));
          setHasMore(result.hasMore);
          setPage(2);
          setIsInitialLoad(false);
        }
      }

      console.log("✅ Refresh completed");
    } catch (error) {
      console.error("❌ Error refreshing notes:", error);
      toast.error("Failed to refresh notes");
    }
  }, [fetchNoteReplies, fetchNotes]);

  const handleOpenAiDialogForJob = useCallback((job) => {
    setAiJobContext({ jobId: job.jobId, jobName: job.jobName });
    setShowAiDialog(true);
  }, []);

  const closeAiDialog = useCallback(() => {
    setShowAiDialog(false);
    setAiJobContext(null);
  }, []);

  const handleLinkedNoteClick = useCallback((replyNoteId, e) => {
    const result = handleLinkedNoteClickHook(replyNoteId, e);
    if (!result || !result.originalNoteId) return;

    const originalNoteId = result.originalNoteId;
    const originalNote = memoizedDisplayNotes.find((n) => n.id === originalNoteId);

    if (originalNote) {
      handleRowClick(originalNote);

      setTimeout(() => {
        let noteElement = null;

        if (viewMode === "table") {
          noteElement = document.querySelector(
            `tr[data-note-id="${originalNoteId}"]`,
          );
        } else if (viewMode === "cards" || viewMode === "stacked") {
          noteElement = document.querySelector(
            `.note-card[data-note-id="${originalNoteId}"]`,
          );
        }

        if (noteElement) {
          noteElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          noteElement.classList.add("highlight-original-note");

          setTimeout(() => {
            noteElement.classList.remove("highlight-original-note");
          }, 2000);
        } else {
          toast.error(
            `Note (ID: ${originalNoteId}) not found in current view.`,
          );
        }
      }, 100);
    } else {
      toast.error(
        `Original note (ID: ${originalNoteId}) not found in current view.`,
      );
    }
  }, [handleLinkedNoteClickHook, memoizedDisplayNotes, handleRowClick, viewMode]);

  // Determine loading state
  const isLoading = !isDataLoaded ||
    initialLoading ||
    searchLoading ||
    loadingFiltered ||
    loadingUniques ||
    isLoadingInitial;

  // Render the appropriate view
  const renderView = () => {
    const commonProps = {
      displayNotes: memoizedDisplayNotes,
      selectedRow,
      searchTerm,      
      handleRowClick,
      handleRowDoubleClick: (note) => {
        handleRowDoubleClick(note);
        if (viewMode === "table") {
          const job = jobs.find(
            (j) => String(j.id) === String(note.job) || j.name === note.job,
          );
          setViewNote({
            id: note.id,
            jobId: job?.id ?? null,
          });
          setShowViewModal(true);
        }
      },
      handleAddFromRow,
      handleEdit,
      handleDelete,
      handleViewAttachments,
      handleReplyToNote,
      handlePriorityClick,
      handlePriorityMouseEnter,
      handlePriorityMouseLeave,
      handleNoteTextMouseEnter,
      handleNoteTextMouseLeave,
      handleLinkedNoteClick,
      handleLinkedNoteMouseEnter,
      handleLinkedNoteMouseLeave,
      isNoteReply,
      getReplyNoteId,
      isOriginalNoteExists, // ADD THIS LINE
      userStatusMap,
      loadingUsers,
      getPriorityValue,
      manuallyUpdatedPriorities,
      shouldShowNotePopup,
      handleProjectClick,
      handleJobClick,
      handleUserNameClick,
      isProjectFiltered,
      isJobFiltered,
      isUserNameFiltered,
    };

    switch (viewMode) {
      case "table":
        return (
          <TableView
            {...commonProps}
            isLoading={isLoading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            hasActiveFilters={hasActiveFilters}
            lastRowRef={lastRowRef}
            jobs={jobs}
            setViewNote={setViewNote}
            setShowViewModal={setShowViewModal}
            renderTableImageIcon={renderTableImageIcon}
            focusedRow={focusedRow}
            userId={userId}
          />
        );
        
      case "stacked":
        return (
          <StackedView
  {...commonProps}
  stackedJobs={stackedJobs}
  loadingStackedJobs={loadingStackedJobs}
  expandedStacks={expandedStacks}
  toggleStackExpansion={handleStackToggle} // Use the wrapper
  hasActiveFilters={hasActiveFilters}
  searchTerm={searchTerm}
  openAiDialogForJob={handleOpenAiDialogForJob}
  renderStackedImageIcon={renderStackedImageIcon}
  isStackedViewLoading={isStackedViewLoading}
  isFilteringStacked={isFilteringStacked}
  jobsToDisplay={jobsToDisplay}
  // New props
  tasksByJob={tasksByJob}
  loadingTasksByJob={loadingTasksByJob}
  expandedTasks={expandedTasks}
  toggleTaskExpansion={toggleTaskExpansion}
  notesByTask={notesByTask}
  loadingNotesByTask={loadingNotesByTask}
  fetchTasksForJob={fetchTasksForJob}
  fetchNotesForTask={fetchNotesForTask}
/>
        );
        
      default: // cards
        return (
          <CardView
            {...commonProps}
            isLoading={isLoading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            hasActiveFilters={hasActiveFilters}
            lastCardRef={lastCardRef}
            renderCardImageIcon={renderCardImageIcon}
            viewMode={viewMode}
            userId={userId}
          />
        );
    }
  };

  // Find the hovered note for tooltip
  const hoveredNote = memoizedDisplayNotes.find((n) => n.id === hoveredLinkedNote);
  const hoveredOriginalNoteId = hoveredNote
    ? getReplyNoteId(hoveredNote.id)
    : null;

  return (
    <div className="grid-scroll-container" ref={containerRef}>
      {renderView()}

      {/* Unified Note Text Popup - SIMPLIFIED */}

{hoveredNoteContent && (
  <div
    onMouseEnter={handlePopupMouseEnter}
    onMouseLeave={handlePopupMouseLeave}
    style={{ pointerEvents: "auto" }} // Allow mouse events on popup
  >
    <NoteTextPopup
      content={hoveredNoteContent}
      position={notePopupPosition}
      elementRect={noteElementRect}
      searchTerm={searchTerm}
      viewMode={viewMode}
      onClose={() => {}}
    />
  </div>
)}
      {/* Global tooltip portal for linked notes */}
      {hoveredLinkedNote && hoveredOriginalNoteId && (
        <TooltipPortal>
          <div
            className="linked-note-tooltip"
            style={{
              position: "fixed",
              top: `${tooltipPosition.y}px`,
              left: `${tooltipPosition.x}px`,
              zIndex: 999999,
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              maxWidth: "350px",
              minWidth: "300px",
              fontSize: "12px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#2c3e50",
                borderBottom: "2px solid #3498db",
                paddingBottom: "6px",
                fontSize: "13px",
              }}
            >
              <i
                className="fas fa-link"
                style={{ marginRight: "6px", color: "#3498db" }}
              />
              Linked to Original Note #{hoveredOriginalNoteId}
            </div>

            {loadingLinkedNote[hoveredOriginalNoteId] ? (
              <div
                style={{
                  color: "#3498db",
                  fontStyle: "italic",
                  padding: "16px",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <i className="fas fa-spinner fa-spin" />
                Loading original note...
              </div>
            ) : linkedNoteContent[hoveredOriginalNoteId] ? (
              <>
                <div
                  style={{
                    margin: "8px 0 12px 0",
                    color: "#555",
                    lineHeight: 1.5,
                    maxHeight: "80px",
                    overflow: "hidden",
                    backgroundColor: "#f8f9fa",
                    padding: "8px",
                    borderRadius: "4px",
                    borderLeft: "3px solid #3498db",
                  }}
                >
                  <strong>Content:</strong>{" "}
                  {formatTooltipContent(
                    linkedNoteContent[hoveredOriginalNoteId].content,
                  )}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#7f8c8d",
                    backgroundColor: "#f5f5f5",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                >
                  <div style={{ marginBottom: "4px" }}>
                    <i
                      className="fas fa-user"
                      style={{ marginRight: "6px", width: "12px" }}
                    />
                    <strong>By:</strong>{" "}
                    {linkedNoteContent[hoveredOriginalNoteId].userName}
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    <i
                      className="far fa-clock"
                      style={{ marginRight: "6px", width: "12px" }}
                    />
                    <strong>Date:</strong>{" "}
                    {new Date(
                      linkedNoteContent[hoveredOriginalNoteId].date,
                    ).toLocaleDateString()}{" "}
                    {new Date(
                      linkedNoteContent[hoveredOriginalNoteId].date,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {(linkedNoteContent[hoveredOriginalNoteId].workspace ||
                    linkedNoteContent[hoveredOriginalNoteId].project ||
                    linkedNoteContent[hoveredOriginalNoteId].job) && (
                    <div>
                      <i
                        className="fas fa-map-marker-alt"
                        style={{ marginRight: "6px", width: "12px" }}
                      />
                      <strong>Location:</strong>{" "}
                      {linkedNoteContent[hoveredOriginalNoteId].workspace} /{" "}
                      {linkedNoteContent[hoveredOriginalNoteId].project} /{" "}
                      {linkedNoteContent[hoveredOriginalNoteId].job}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div
                style={{
                  color: "#3498db",
                  fontStyle: "italic",
                  padding: "16px",
                  textAlign: "center",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "4px",
                }}
              >
                <i
                  className="fas fa-info-circle"
                  style={{ marginRight: "8px" }}
                />
                Hover to load original note preview
              </div>
            )}

            <div
              style={{
                fontSize: "11px",
                color: "#3498db",
                marginTop: "8px",
                fontStyle: "italic",
                paddingTop: "8px",
                borderTop: "1px solid #eee",
              }}
            >
              <i
                className="fas fa-mouse-pointer"
                style={{ marginRight: "6px" }}
              />
              Click to jump to original note
            </div>

            {/* Add a small arrow pointing to the mouse/cursor */}
            <div
              style={{
                position: "absolute",
                top: "-8px",
                left: "20px",
                width: "16px",
                height: "16px",
                backgroundColor: "white",
                borderLeft: "1px solid #ddd",
                borderTop: "1px solid #ddd",
                transform: "rotate(45deg)",
                zIndex: 1,
              }}
            />
          </div>
        </TooltipPortal>
      )}

      {/* Priority Tooltip */}
      {hoveredPriorityNote && (
        <TooltipPortal>
          <div
            className="priority-tooltip"
            style={{
              position: "fixed",
              top: `${priorityTooltipPosition.y}px`,
              left: `${priorityTooltipPosition.x}px`,
              zIndex: 999999,
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              maxWidth: "300px",
              minWidth: "250px",
              fontSize: "12px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#2c3e50",
                borderBottom: "2px solid #3498db",
                paddingBottom: "6px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <i
                className="fas fa-flag"
                style={{
                  color:
                    priorityTooltipData[hoveredPriorityNote]?.priorityValue === 4
                      ? "#e8f628"
                      : priorityTooltipData[hoveredPriorityNote]
                            ?.priorityValue === 3
                        ? "#ef5350"
                        : priorityTooltipData[hoveredPriorityNote]
                              ?.priorityValue === 5
                          ? "#28a745"
                          : "#ccc",
                }}
              />
              {loadingPriorityData[hoveredPriorityNote]
                ? "Loading priority info..."
                : `Priority: ${priorityTooltipData[hoveredPriorityNote]?.priorityText || "No priority"}`}
            </div>

            {loadingPriorityData[hoveredPriorityNote] ? (
              <div
                style={{
                  color: "#3498db",
                  fontStyle: "italic",
                  padding: "16px",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <i className="fas fa-spinner fa-spin" />
                Loading priority information...
              </div>
            ) : priorityTooltipData[hoveredPriorityNote]?.hasPriority ? (
              <>
                <div
                  style={{
                    margin: "8px 0",
                    color: "#555",
                    lineHeight: 1.5,
                    backgroundColor: "#f8f9fa",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                >
                  <div style={{ marginBottom: "4px" }}>
                    <i
                      className="fas fa-user"
                      style={{
                        marginRight: "6px",
                        width: "12px",
                        color: "#7f8c8d",
                      }}
                    />
                    <strong>Set by:</strong>{" "}
                    {priorityTooltipData[hoveredPriorityNote]?.userName ||
                      "Unknown"}
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    <i
                      className="fas fa-calendar-alt"
                      style={{
                        marginRight: "6px",
                        width: "12px",
                        color: "#7f8c8d",
                      }}
                    />
                    <strong>Date:</strong>{" "}
                    {formatPriorityDate(
                      priorityTooltipData[hoveredPriorityNote]?.createdAt,
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  color: "#95a5a6",
                  fontStyle: "italic",
                  padding: "16px",
                  textAlign: "center",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "4px",
                }}
              >
                <i
                  className="fas fa-info-circle"
                  style={{ marginRight: "8px", fontSize: "14px" }}
                />
                No priority set for this note
                <div
                  style={{
                    fontSize: "11px",
                    marginTop: "4px",
                    color: "#7f8c8d",
                  }}
                >
                  Click to set priority
                </div>
              </div>
            )}
          </div>
        </TooltipPortal>
      )}

      {/* Modals */}
      {showAiDialog && aiJobContext && (
        <AiChatDialog
          open={showAiDialog}
          onClose={closeAiDialog}
          job={aiJobContext}
          userId={userId}
        />
      )}

      {showReplyModal && selectedNoteForReply && (
        <ReplyModal
          note={selectedNoteForReply}
          onClose={() => {
            setShowReplyModal(false);
            setSelectedNoteForReply(null);
          }}
          refreshNotes={refreshNotesAfterReply}
        />
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
  renderTableImageIcon: PropTypes.func.isRequired,
  renderCardImageIcon: PropTypes.func.isRequired,
  renderStackedImageIcon: PropTypes.func.isRequired,
  expandedStacks: PropTypes.object.isRequired,
  toggleStackExpansion: PropTypes.func.isRequired,
  jobs: PropTypes.array.isRequired,
  setViewNote: PropTypes.func.isRequired,
  setShowViewModal: PropTypes.func.isRequired,
  stackedJobs: PropTypes.array,
  loadingStackedJobs: PropTypes.bool,
  fetchNotes: PropTypes.func.isRequired,
  userId: PropTypes.number.isRequired,
  hasActiveFilters: PropTypes.bool.isRequired,
  filteredNotesFromApi: PropTypes.array.isRequired,
  searchResults: PropTypes.array.isRequired,
  handleFilterCheckboxChange: PropTypes.func, 
  removeFilter: PropTypes.func, 
  projects: PropTypes.array, 
  selectedFilters: PropTypes.object, 
  handleFilterChange: PropTypes.func,
};

NotesTab.defaultProps = {
  finalDisplayNotes: [],
  stackedJobs: [],
  loadingStackedJobs: false,
  filteredNotesFromApi: [],
  searchResults: [],
  handleFilterCheckboxChange: () => {
    console.warn('handleFilterCheckboxChange not implemented');
  },
  removeFilter: () => {
    console.warn('removeFilter not implemented');
  },
  selectedFilters: {},
  projects: [],
  handleFilterChange: () => {
    console.warn('handleFilterChange not implemented');
  },
};

export default NotesTab;

