import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { formatRelativeTime } from "../../utils/formatUtils";
import { highlightHtmlContent } from "../../utils/htmlUtils";
import { CardSkeleton } from "../Skeleton";
import { NoteCard } from "../Note";
import EditJobModal from "./EditJobModal";
import TaskModal from "../../../Modals/TaskModal";
import { PRIORITY_VALUES, PRIORITY_LABELS, PRIORITY_COLORS } from "../../utils/constants";
import toast from "react-hot-toast";

const StackedView = ({
  stackedJobs,
  loadingStackedJobs,
  expandedStacks,
  toggleStackExpansion,
  hasActiveFilters,
  searchTerm,
  openAiDialogForJob,
  renderStackedImageIcon,
  displayNotes,
  selectedRow,
  handleRowClick,
  handleRowDoubleClick,
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
  isOriginalNoteExists,
  userStatusMap,
  loadingUsers,
  getPriorityValue,
  manuallyUpdatedPriorities,
  shouldShowNotePopup,
  isStackedViewLoading,
  isFilteringStacked,
  jobsToDisplay,
  onSaveTask,
}) => {
  const [localExpandedStacks, setLocalExpandedStacks] = useState({});
  const [editJobModalOpen, setEditJobModalOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedJobForTask, setSelectedJobForTask] = useState(null);
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Track view mode changes
  useEffect(() => {
    const timer = setTimeout(() => {}, 500);
    return () => clearTimeout(timer);
  }, []);

  // Track filter changes in stacked view
  useEffect(() => {
    if (hasActiveFilters) {
      const timer = setTimeout(() => {}, 500);
      return () => clearTimeout(timer);
    }
  }, [hasActiveFilters]);

  // Function to handle task creation
  const handleCreateTask = (job) => {
    setSelectedJobForTask({
      id: job.jobId || job.id || job.jobID,
      name: job.jobName,
    });
    setTaskModalOpen(true);
  };

  // Function to handle task save
  const handleSaveTask = async (taskData) => {
    setIsSavingTask(true);
    try {
      // Call the provided onSaveTask function
      if (onSaveTask) {
        await onSaveTask(taskData);
        
        // Show success message
        toast.success(`Task "${taskData.taskName}" created successfully!`);
        
        // Close the modal
        setTaskModalOpen(false);
        setSelectedJobForTask(null);
      }
    } catch (error) {
      console.error("Failed to save task:", error);
      toast.error(`Failed to create task: ${error.message}`);
    } finally {
      setIsSavingTask(false);
    }
  };

  // Show loading spinner when switching to stacked view or filtering
  if (isStackedViewLoading || isFilteringStacked) {
    return renderStackedViewLoading();
  }

  if (loadingStackedJobs && !hasActiveFilters) {
    return (
      <div className="stacked-notes-horizontal">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="job-stack-skeleton">
            <div className="skeleton-stack-header" />
            <div className="skeleton-stack-content" />
          </div>
        ))}
      </div>
    );
  }

  if (!stackedJobs || stackedJobs.length === 0) {
    return (
      <div className="empty-state">
        <i
          className="fas fa-layer-group"
          style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}
        />
        <h3>
          {loadingStackedJobs
            ? "Loading jobs..."
            : hasActiveFilters
              ? "No jobs match your filters"
              : "No stacked jobs available"}
        </h3>
        <p>
          {loadingStackedJobs
            ? "Please wait while we load your jobs..."
            : hasActiveFilters
              ? "Try adjusting your filters to see matching jobs"
              : "No jobs with notes found."}
        </p>
      </div>
    );
  }

  const sortedJobs = [...stackedJobs]
    .filter((job) => job)
    .sort((a, b) => {
      const timeA = a.latestTimeStamp ? new Date(a.latestTimeStamp).getTime() : 0;
      const timeB = b.latestTimeStamp ? new Date(b.latestTimeStamp).getTime() : 0;
      
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return (b.noteCount || 0) - (a.noteCount || 0);
    });

  const isAnyStackExpanded = Object.values(expandedStacks).some((v) => v);

  return (
    <div className="stacked-notes-horizontal">
      <div className="stacked-container">
        {isAnyStackExpanded && (
          <div className="fixed-collapse-btn-wrapper">
            <button
              className="collapse-all-stacks-btn"
              onClick={() => {
                Object.keys(expandedStacks).forEach((jobName) => {
                  if (expandedStacks[jobName]) {
                    const job = stackedJobs.find(
                      (j) => j && j.jobName === jobName,
                    );
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
          if (!job) return null;

          const jobName = job.jobName;
          const isExpanded = expandedStacks[jobName];

          if (!isExpanded && isAnyStackExpanded) {
            return null;
          }

          return isExpanded
            ? renderExpandedStack({
                job,
                searchTerm,
                hasActiveFilters,
                openAiDialogForJob,
                renderStackedImageIcon,
                selectedRow,
                handleRowClick,
                handleRowDoubleClick,
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
                isOriginalNoteExists,
                userStatusMap,
                loadingUsers,
                getPriorityValue,
                manuallyUpdatedPriorities,
                shouldShowNotePopup,
                toggleStackExpansion,
                onOpenEdit: (j) => {
                  setJobToEdit(j);
                  setEditJobModalOpen(true);
                },
                onCreateTask: handleCreateTask,
              })
            : renderCollapsedStack({
                job,
                searchTerm,
                hasActiveFilters,
                openAiDialogForJob,
                toggleStackExpansion,
                onOpenEdit: (j) => {
                  setJobToEdit(j);
                  setEditJobModalOpen(true);
                },
                onCreateTask: handleCreateTask,
              });
        })}

        {editJobModalOpen && jobToEdit && (
          <EditJobModal
            isOpen={editJobModalOpen}
            onClose={() => {
              setEditJobModalOpen(false);
              setJobToEdit(null);
            }}
            jobId={jobToEdit.jobId || jobToEdit.id || jobToEdit.jobID}
            workspaceId={jobToEdit.workspaceId || jobToEdit.workspace || jobToEdit.defWorkId || null}
            projectId={jobToEdit.projectId || jobToEdit.project?.id || null}
            projectName={jobToEdit.projectName || jobToEdit.project?.name || ''}
            userId={jobToEdit.userId}
            onJobUpdated={() => {
              setEditJobModalOpen(false);
              setJobToEdit(null);
            }}
          />
        )}

        {/* Task Modal */}
        {taskModalOpen && selectedJobForTask && (
          <TaskModal
            isOpen={taskModalOpen}
            onClose={() => {
              setTaskModalOpen(false);
              setSelectedJobForTask(null);
            }}
            jobId={selectedJobForTask.id}
            jobName={selectedJobForTask.name}
            onSaveTask={handleSaveTask}
            isLoading={isSavingTask}
          />
        )}
      </div>
    </div>
  );
};

const renderStackedViewLoading = () => (
  <div
    className="stacked-view-loading"
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "400px",
      width: "100%",
      backgroundColor: "#f8f9fa",
      borderRadius: "8px",
    }}
  >
    <i
      className="fas fa-spinner fa-spin"
      style={{
        fontSize: "48px",
        color: "#3498db",
        marginBottom: "20px",
      }}
    />
    <div
      style={{
        fontSize: "18px",
        color: "#2c3e50",
        marginBottom: "10px",
        fontWeight: "500",
      }}
    >
      Loading stacked view...
    </div>
    <div
      style={{
        fontSize: "14px",
        color: "#7f8c8d",
        textAlign: "center",
        maxWidth: "400px",
      }}
    >
      Please wait while we organize your notes by job...
    </div>
  </div>
);

const renderCollapsedStack = ({ 
  job, 
  searchTerm, 
  hasActiveFilters, 
  openAiDialogForJob, 
  toggleStackExpansion, 
  onOpenEdit,
  onCreateTask 
}) => {
  if (!job) return null;

  const jobName = job.jobName;
  const noteCount = job.noteCount || 0;
  const isLoading = job.isLoadingNotes;
  const projectName = job.projectName || job.project?.name || job.project?.projectName || job.project?.project?.name || job.projectName;

  return (
    <div
      key={`stack-${job.jobId || job.jobName}`}
      className={`collapsed-stack ${isLoading ? "loading" : ""}`}
      onClick={() => toggleStackExpansion(jobName, job.jobId)}
      style={{
        cursor: "pointer",
        position: "relative",
        height: "280px",
        width: "100%",
      }}
    >
      {isLoading && (
        <div
          className="stack-loading-overlay"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            borderRadius: "8px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <i
              className="fas fa-spinner fa-spin"
              style={{
                fontSize: "24px",
                color: "#3498db",
                marginBottom: "10px",
              }}
            />
            <div style={{ fontSize: "14px", color: "#666" }}>
              Loading notes...
            </div>
          </div>
        </div>
      )}

      {[...Array(Math.min(noteCount, 5))].map((_, index) => {
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
                  <div style={{ flex: 1 }}>
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
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#2c3e50",
                          fontSize: "16px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: "2px",
                        }}
                      >
                        <span style={{ lineHeight: 1 }}>{job.jobName}</span>
                        {projectName && (
                          <span title={projectName}
                            style={{
                              fontSize: "12px",
                              color: "#7f8c8d",
                              fontWeight: 400,
                              marginTop: "2px",
                            }}
                          >
                            {projectName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                      position: "relative",
                    }}
                  >
                    <div
                      className="note-text-preview"
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        lineHeight: 1.4,
                        maxHeight: "60px",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        wordBreak: "break-word",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: highlightHtmlContent(
                          job.lastSiteNote
                            ? job.lastSiteNote
                            : job.notes && job.notes.length > 0
                              ? job.notes[0].note || "No note content"
                              : hasActiveFilters && job.hasLoadedNotes
                                ? "No notes match current filters"
                                : "Click to load notes",
                          searchTerm,
                        ),
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
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="fas fa-clock" style={{ fontSize: "10px" }} />
                      <span>
                        {job.latestTimeStamp
                          ? formatRelativeTime(job.latestTimeStamp)
                          : "No updates"}
                      </span>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        className="attachment-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAiDialogForJob(job);
                        }}
                        title="Summarize notes (AI)"
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          cursor: 'pointer', 
                          color: '#1976d2', 
                          fontSize: '14px'
                        }}
                      >
                        <i className="fas fa-comments" />   
                      </button>
                      
                      <button
                        className="create-task-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof onCreateTask === 'function') onCreateTask(job);
                        }}
                        title="Create Task"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className="fas fa-plus-circle" />
                        
                      </button>
                      
                      <button
                        className="attachment-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof onOpenEdit === 'function') onOpenEdit(job);
                        }}
                        title="Edit job"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#444',
                          fontSize: '14px'
                        }}
                      >
                        <i className="fas fa-cog" />
                      </button>
                    </div>
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
                    {isLoading ? "Loading..." : "Click to expand"}
                    {hasActiveFilters && !isLoading && " (filtered view)"}
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
      })}
    </div>
  );
};

const renderExpandedStack = ({
  job,
  searchTerm,
  hasActiveFilters,
  openAiDialogForJob,
  renderStackedImageIcon,
  selectedRow,
  handleRowClick,
  handleRowDoubleClick,
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
  isOriginalNoteExists,
  userStatusMap,
  loadingUsers,
  getPriorityValue,
  manuallyUpdatedPriorities,
  shouldShowNotePopup,
  toggleStackExpansion,
  onOpenEdit,
  onCreateTask,
}) => {
  if (!job) return null;

  const jobName = job.jobName;
  const projectName = job.projectName || job.project?.name || job.project?.projectName || job.project?.project?.name || job.projectName;
  const jobNotes = job.notes
    ? [...job.notes].sort((a, b) => {
        const timeA = new Date(a.timeStamp || a.date || 0).getTime();
        const timeB = new Date(b.timeStamp || b.date || 0).getTime();
        return timeB - timeA;
      })
    : [];
  const isLoading = job.isLoadingNotes;
  const hasError = job.errorLoadingNotes;
  const hasLoaded = job.hasLoadedNotes;
  const noteCount = job.noteCount || 0;
  const displayNoteCount = jobNotes.length;

  return (
    <div
      key={`stack-${job.jobId || job.jobName}`}
      className={`job-stack-container expanded-full-width`}
    >
      <div className="expanded-stack">
        <div className="expanded-stack-header">
          <div className="expanded-stack-title-section">
            <div className="expanded-stack-title">
              <i className="fas fa-briefcase" />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{jobName}</span>
                {projectName && (
                  <small title={projectName} style={{ fontSize: 12, color: '#7f8c8d', fontWeight: 400 }}>
                    {projectName}
                  </small>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="create-task-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onCreateTask === 'function') onCreateTask(job);
              }}
              title="Create Task"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "4px",
                
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(40, 167, 69, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(40, 167, 69, 0.1)";
              }}
            >
              <i className="fas fa-plus-circle" />
             
            </button>
            
            <button
              className="attachment-btn"
              onClick={(e) => {
                e.stopPropagation();
                openAiDialogForJob(job);
              }}
              title="Summarize notes (AI)"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#1976d2",
              }}
            >
              <i className="fas fa-robot" />
            </button>
            
            <button
              className="attachment-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onOpenEdit === 'function') onOpenEdit(job);
              }}
              title="Edit job"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#444",
              }}
            >
              <i className="fas fa-cog" />
            </button>

            <div className="expanded-stack-count">
              <i className="fas fa-layer-group" />
              <span>
                {displayNoteCount} of {noteCount} notes
              </span>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div
            className="stack-notes-loading"
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#666",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              margin: "20px 0",
            }}
          >
            <i
              className="fas fa-spinner fa-spin"
              style={{
                fontSize: "24px",
                marginBottom: "10px",
                display: "block",
              }}
            />
            <div>Loading notes for {jobName}...</div>
          </div>
        )}

        {/* Error state */}
        {hasError && !isLoading && (
          <div
            className="stack-notes-error"
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#e74c3c",
              backgroundColor: "#fdf2f2",
              borderRadius: "8px",
              margin: "20px 0",
              border: "1px solid #f8d7da",
            }}
          >
            <i
              className="fas fa-exclamation-triangle"
              style={{
                fontSize: "24px",
                marginBottom: "10px",
                display: "block",
              }}
            />
            <div style={{ marginBottom: "10px" }}>
              Failed to load notes: {hasError}
            </div>
            <button
              onClick={() => toggleStackExpansion(jobName, job.jobId)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#3498db",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
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
              <div
                className="no-notes-filtered"
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#999",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  margin: "20px 0",
                }}
              >
                <i
                  className="fas fa-search"
                  style={{
                    fontSize: "24px",
                    marginBottom: "10px",
                    display: "block",
                    opacity: 0.5,
                  }}
                />
                <div>No notes match your current filters for this job</div>
                {hasActiveFilters && (
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "14px",
                      color: "#666",
                    }}
                  >
                    Try adjusting your filters or clear them to see all notes
                  </div>
                )}
              </div>
            ) : (
              <>
                {displayNoteCount > 0 && displayNoteCount < noteCount && (
                  <div
                    className="notes-count-info"
                    style={{
                      padding: "8px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: "4px",
                      margin: "10px 0",
                      fontSize: "12px",
                      color: "#1565c0",
                    }}
                  >
                    <i className="fas fa-info-circle" /> Showing{" "}
                    {displayNoteCount} of {noteCount} notes
                    {hasActiveFilters && " that match your filters"}
                  </div>
                )}

                <div className="expanded-notes-grid">
                  {jobNotes.map((note) => {
                    const priorityValue = getPriorityValue(note);
                    const isReply = isNoteReply(note.id);
                    const originalNoteId = isReply
                      ? getReplyNoteId(note.id)
                      : null;

                    return (
                      <NoteCard
                        key={note.id}
                        note={note}
                        selectedRow={selectedRow}
                        searchTerm={searchTerm}
                        viewMode="stacked"
                        handleRowClick={handleRowClick}
                        handleRowDoubleClick={handleRowDoubleClick}
                        handleAddFromRow={handleAddFromRow}
                        handleEdit={handleEdit}
                        handleDelete={handleDelete}
                        handleViewAttachments={handleViewAttachments}
                        handleReplyToNote={handleReplyToNote}
                        handlePriorityClick={handlePriorityClick}
                        handlePriorityMouseEnter={handlePriorityMouseEnter}
                        handlePriorityMouseLeave={handlePriorityMouseLeave}
                        handleNoteTextMouseEnter={handleNoteTextMouseEnter}
                        handleNoteTextMouseLeave={handleNoteTextMouseLeave}
                        handleLinkedNoteClick={handleLinkedNoteClick}
                        handleLinkedNoteMouseEnter={handleLinkedNoteMouseEnter}
                        handleLinkedNoteMouseLeave={handleLinkedNoteMouseLeave}
                        renderCardImageIcon={renderStackedImageIcon}
                        isNoteReply={isNoteReply}
                        getReplyNoteId={getReplyNoteId}
                        isOriginalNoteExists={isOriginalNoteExists}
                        userStatusMap={userStatusMap}
                        loadingUsers={loadingUsers}
                        getPriorityValue={getPriorityValue}
                        manuallyUpdatedPriorities={manuallyUpdatedPriorities}
                        shouldShowNotePopup={shouldShowNotePopup}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* No notes loaded yet */}
        {!hasLoaded && !isLoading && !hasError && (
          <div
            className="stack-notes-placeholder"
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#999",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              margin: "20px 0",
            }}
          >
            <i
              className="fas fa-sticky-note"
              style={{
                fontSize: "24px",
                marginBottom: "10px",
                display: "block",
                opacity: 0.5,
              }}
            />
            <div>Click "Retry Loading" to load notes for this job</div>
          </div>
        )}
      </div>
    </div>
  );
};

StackedView.propTypes = {
  stackedJobs: PropTypes.array,
  loadingStackedJobs: PropTypes.bool,
  expandedStacks: PropTypes.object.isRequired,
  toggleStackExpansion: PropTypes.func.isRequired,
  hasActiveFilters: PropTypes.bool,
  searchTerm: PropTypes.string,
  openAiDialogForJob: PropTypes.func.isRequired,
  renderStackedImageIcon: PropTypes.func,
  displayNotes: PropTypes.array,
  selectedRow: PropTypes.any,
  handleRowClick: PropTypes.func,
  handleRowDoubleClick: PropTypes.func,
  handleAddFromRow: PropTypes.func,
  handleEdit: PropTypes.func,
  handleDelete: PropTypes.func,
  handleViewAttachments: PropTypes.func,
  handleReplyToNote: PropTypes.func,
  handlePriorityClick: PropTypes.func,
  handlePriorityMouseEnter: PropTypes.func,
  handlePriorityMouseLeave: PropTypes.func,
  handleNoteTextMouseEnter: PropTypes.func,
  handleNoteTextMouseLeave: PropTypes.func,
  handleLinkedNoteClick: PropTypes.func,
  handleLinkedNoteMouseEnter: PropTypes.func,
  handleLinkedNoteMouseLeave: PropTypes.func,
  isNoteReply: PropTypes.func,
  getReplyNoteId: PropTypes.func,
  isOriginalNoteExists: PropTypes.func,
  userStatusMap: PropTypes.object,
  loadingUsers: PropTypes.object,
  getPriorityValue: PropTypes.func,
  manuallyUpdatedPriorities: PropTypes.object,
  shouldShowNotePopup: PropTypes.func,
  isStackedViewLoading: PropTypes.bool,
  isFilteringStacked: PropTypes.bool,
  jobsToDisplay: PropTypes.array,
  onSaveTask: PropTypes.func,
};

StackedView.defaultProps = {
  stackedJobs: [],
  loadingStackedJobs: false,
  hasActiveFilters: false,
  searchTerm: "",
  renderStackedImageIcon: () => null,
  displayNotes: [],
  selectedRow: null,
  isStackedViewLoading: false,
  isFilteringStacked: false,
  jobsToDisplay: [],
  isOriginalNoteExists: () => false,
  onSaveTask: () => {},
};

export default StackedView;