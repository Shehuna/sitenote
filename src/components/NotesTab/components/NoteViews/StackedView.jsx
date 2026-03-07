// components/NoteViews/StackedView.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { formatRelativeTime } from "../../utils/formatUtils";
import { highlightHtmlContent } from "../../utils/htmlUtils";
import { CardSkeleton } from "../Skeleton";
import { NoteCard } from "../Note";
import TaskCard from "./TaskCard";
import EditJobModal from "./EditJobModal";
import TaskModal from "../../../Modals/TaskModal";
import SlideshowModal from "./SlideshowModal";
import TaskModal from "../../../Modals/TaskModal";
import SlideshowModal from "./SlideshowModal";
import { PRIORITY_VALUES, PRIORITY_LABELS, PRIORITY_COLORS } from "../../utils/constants";
import toast from "react-hot-toast";
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
  userId,
  // Task hierarchy props
  tasksByJob = {},
  loadingTasksByJob = {},
  expandedTasks = {},
  toggleTaskExpansion,
  notesByTask = {},
  loadingNotesByTask = {},
  fetchTasksForJob,
  fetchNotesForTask,
  // Task action handlers
  onTaskEdit,
  onTaskDelete,
  onTaskStatusChange,
  onTaskClick,
  
}) => {
  const [localExpandedStacks, setLocalExpandedStacks] = useState({});
  const [editJobModalOpen, setEditJobModalOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedJobForTask, setSelectedJobForTask] = useState(null);
  const [isSavingTask, setIsSavingTask] = useState(false);
  
  // Slideshow state
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowNotes, setSlideshowNotes] = useState([]);
  const [slideshowJobName, setSlideshowJobName] = useState('');
  const [slideshowStartIndex, setSlideshowStartIndex] = useState(0);

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
      if (onSaveTask) {
        await onSaveTask(taskData);
        toast.success(`Task "${taskData.taskName}" created successfully!`);
        setTaskModalOpen(false);
        setSelectedJobForTask(null);
        
        // Refresh tasks for the job
        if (selectedJobForTask && fetchTasksForJob) {
          await fetchTasksForJob(selectedJobForTask.id);
        }
      }
    } catch (error) {
      console.error("Failed to save task:", error);
      toast.error(`Failed to create task: ${error.message}`);
    } finally {
      setIsSavingTask(false);
    }
  };

  // Function to handle opening slideshow
  const handleOpenSlideshow = (job, startIndex = 0) => {
    if (job.notes && job.notes.length > 0) {
      setSlideshowNotes(job.notes);
      setSlideshowJobName(job.jobName);
      setSlideshowStartIndex(startIndex);
      setSlideshowOpen(true);
    } else {
      toast.error('No notes available for slideshow');
    }
  };

  // Handle task card click to toggle expansion
  const handleTaskCardClick = (task) => {
    if (onTaskClick) {
      onTaskClick(task);
    } else if (toggleTaskExpansion) {
      // Toggle expansion: when expanded, show notes; when collapsed, show tasks
      toggleTaskExpansion(task.id, task.jobId);
    }
  };

  // Handle task toggle for TaskCard component
  const handleTaskToggle = (taskId) => {
    if (toggleTaskExpansion) {
      // Find the jobId for this task
      let jobId = null;
      for (const [jId, tasks] of Object.entries(tasksByJob)) {
        if (tasks.some(t => t.id === taskId)) {
          jobId = parseInt(jId);
          break;
        }
      }
      if (jobId) {
        toggleTaskExpansion(taskId, jobId);
      }
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
              : "No jobs with tasks or notes found."}
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
  
  // Check if any task is expanded across all jobs
  const hasAnyTaskExpanded = Object.values(expandedTasks).some(isExpanded => isExpanded);

  return (
    <div className="stacked-notes-horizontal">
      <div className="stacked-container">
        {/* Only show collapse button when stacks are expanded AND no task is expanded */}
        {isAnyStackExpanded && !hasAnyTaskExpanded && (
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
          const jobTasks = tasksByJob[job.jobId] || [];
          const expandedTaskId = Object.keys(expandedTasks).find(
            taskId => expandedTasks[taskId] && jobTasks.some(t => t.id.toString() === taskId)
          );
          const expandedTask = expandedTaskId ? jobTasks.find(t => t.id.toString() === expandedTaskId) : null;

          if (!isExpanded && isAnyStackExpanded) {
            return null;
          }

          return isExpanded
            ? renderExpandedStackWithTasks({
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
                userId,
                onOpenEdit: (j) => {
                  setJobToEdit(j);
                  setEditJobModalOpen(true);
                },
                onCreateTask: handleCreateTask,
                onOpenSlideshow: handleOpenSlideshow,
                // Task props
                tasks: jobTasks,
                loadingTasks: loadingTasksByJob[job.jobId] || false,
                expandedTasks,
                expandedTask, // The currently expanded task (if any)
                onTaskToggle: handleTaskToggle, // Pass the toggle function
                onTaskClick: handleTaskCardClick,
                onTaskEdit,
                onTaskDelete,
                onTaskStatusChange,
                notesByTask,
                loadingNotesByTask,
                onCollapseTask: () => {
                  if (expandedTaskId) {
                    toggleTaskExpansion(expandedTaskId, job.jobId);
                  }
                },
                onCreateTask: handleCreateTask,
                onOpenSlideshow: handleOpenSlideshow, // Pass slideshow handler
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
                onOpenSlideshow: handleOpenSlideshow,
                onCreateTask: handleCreateTask,
                onOpenSlideshow: handleOpenSlideshow, // Pass slideshow handler
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

        {/* Slideshow Modal */}
        <SlideshowModal
          isOpen={slideshowOpen}
          onClose={() => setSlideshowOpen(false)}
          notes={slideshowNotes}
          currentNoteIndex={slideshowStartIndex}
          jobName={slideshowJobName}
        />
      </div>
    </div>
  );
};

const renderExpandedStackWithTasks = ({
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
  onOpenSlideshow,
  // Task props
  tasks,
  loadingTasks,
  expandedTasks,
  expandedTask,
  onTaskToggle,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onTaskStatusChange,
  notesByTask,
  loadingNotesByTask,
  onCollapseTask,
  userId,
}) => {
  if (!job) return null;

  const jobName = job.jobName;
  const projectName = job.projectName || job.project?.name || job.project?.projectName || job.project?.project?.name || job.projectName;
  const taskCount = tasks ? tasks.length : 0;

  // Calculate task counts by status for summary
  const taskSummary = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});

  // Get note count for expanded task
  const expandedTaskNoteCount = expandedTask ? (notesByTask[expandedTask.id]?.length || 0) : 0;

  return (
    <div
      key={`stack-${job.jobId || job.jobName}`}
      className="job-stack-container expanded-full-width"
      style={styles.expandedContainer}
    >
      <div className="expanded-stack">
        {/* Header Section */}
        <div className="expanded-stack-header" style={styles.expandedHeader}>
          <div className="expanded-stack-title-section">
            <div className="expanded-stack-title" style={styles.titleSection}>
              <i className="fas fa-briefcase" style={styles.briefcaseIcon} />
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
          
          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Task Count Badge - Show when not in expanded task view */}
            {!expandedTask && taskCount > 0 && (
              <div style={styles.taskCountBadge}>
                <i className="fas fa-tasks" style={{ marginRight: '6px' }} />
                <span>{taskCount} {taskCount === 1 ? 'Task' : 'Tasks'}</span>
              </div>
            )}
            
            {/* Slideshow button */}
            <button
              className="attachment-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSlideshow(job, 0);
              }}
              title="View slideshow"
              style={styles.actionButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(155, 89, 182, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <i className="fas fa-images" style={{ color: '#9b59b6' }} />
            </button>

            {/* Create Task button - hide when task is expanded */}
            {!expandedTask && (
              <button
                className="create-task-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof onCreateTask === 'function') onCreateTask(job);
                }}
                title="Create Task"
                style={styles.actionButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(40, 167, 69, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <i className="fas fa-plus-circle" style={{ color: '#28a745' }} />
              </button>
            )}
            
            {/* AI Summarize button */}
            <button
              className="attachment-btn"
              onClick={(e) => {
                e.stopPropagation();
                openAiDialogForJob(job);
              }}
              title="Summarize notes (AI)"
              style={styles.actionButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(25, 118, 210, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <i className="fas fa-comments" style={{ color: '#1976d2' }} />
            </button>
            
            {/* Settings button (Edit Job) */}
            <button
              className="attachment-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onOpenEdit === 'function') onOpenEdit(job);
              }}
              title="Edit job"
              style={styles.actionButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(68, 68, 68, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <i className="fas fa-cog" style={{ color: '#444' }} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="tasks-container" style={styles.tasksContainer}>
          {loadingTasks ? (
            <div style={styles.loadingState}>
              <i className="fas fa-spinner fa-spin" style={styles.spinner} />
              <div>Loading tasks for {jobName}...</div>
            </div>
          ) : (
            <>
              {tasks.length === 0 ? (
                <div style={styles.emptyState}>
                  <i className="fas fa-tasks" style={styles.emptyIcon} />
                  <p>No tasks found for this job</p>
                  <button
                    onClick={() => onCreateTask(job)}
                    style={styles.createButton}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#2980b9';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#3498db';
                    }}
                  >
                    <i className="fas fa-plus" style={{ marginRight: '6px' }} />
                    Create First Task
                  </button>
                </div>
              ) : (
                <>
                  {/* Show expanded task notes if a task is expanded */}
                  {expandedTask ? (
                    <div style={styles.expandedTaskSection}>
                      {/* Mini task header */}
                      <div style={styles.expandedTaskHeader}>
                        <div style={styles.expandedTaskInfo}>
                          <i className="fas fa-tasks" style={{ color: '#3498db', marginRight: '10px' }} />
                          <div>
                            <div style={styles.expandedTaskTitle}>
                              
                              {expandedTask.friendlyId && (
                                <span style={styles.expandedTaskFriendlyId}>
                                  {expandedTask.friendlyId}
                                </span>
                              )}
                              {expandedTask.title}
                            </div>
                          </div>
                        </div>
                        <div style={styles.expandedTaskActions}>
                          {/* Note Count Badge - Show next to back button */}
                          {expandedTaskNoteCount > 0 && (
                            <div style={styles.noteCountBadge}>
                              <i className="fas fa-sticky-note" style={{ marginRight: '4px' }} />
                              <span>{expandedTaskNoteCount} {expandedTaskNoteCount === 1 ? 'Note' : 'Notes'}</span>
                            </div>
                          )}
                          {expandedTask && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCollapseTask();
                              }}
                              style={styles.collapseButton}
                              title="Back to tasks"
                            >
                              <i className="fas fa-arrow-left" style={{ marginRight: '6px' }} />
                              
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Notes for expanded task */}
                      <div style={styles.taskNotesSection}>
                        {loadingNotesByTask[expandedTask.id] ? (
                          <div style={styles.noteLoadingState}>
                            <i className="fas fa-spinner fa-spin" style={styles.smallSpinner} />
                            <span>Loading notes...</span>
                          </div>
                        ) : (
                          <div style={styles.notesGrid}>
                            {notesByTask[expandedTask.id]?.length > 0 ? (
                              notesByTask[expandedTask.id].map((note) => (
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
                              ))
                            ) : (
                              <div style={styles.noNotesMessage}>
                                <i className="fas fa-sticky-note" style={{ opacity: 0.5, marginRight: '8px' }} />
                                No notes yet for this task
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Show all tasks in grid when no task is expanded */
                    <div style={styles.tasksGrid}>
                      {tasks.map((task) => (
                        <div key={task.id} style={styles.taskWrapper}>
                          <TaskCard
                            task={task}
                            onEdit={onTaskEdit}
                            onDelete={onTaskDelete}
                            onStatusChange={onTaskStatusChange}
                            onClick={onTaskClick}
                            onToggle={onTaskToggle}
                            isExpanded={false}
                            showToggle={true}
                            userId={userId}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const renderCollapsedStack = ({ 
  job, 
  searchTerm, 
  hasActiveFilters, 
  openAiDialogForJob, 
  toggleStackExpansion, 
  onOpenEdit,
  onCreateTask,
  onOpenSlideshow 
}) => {
const renderCollapsedStack = ({ 
  job, 
  searchTerm, 
  hasActiveFilters, 
  openAiDialogForJob, 
  toggleStackExpansion, 
  onOpenEdit,
  onCreateTask,
  onOpenSlideshow 
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
              Loading...
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
                    flexShrink: 0, 
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                        style={{ color: "#14A2B6", flexShrink: 0 }}
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
                          minWidth: 0, 
                          width: "100%",
                        }}
                      >
                        <span 
                          style={{ 
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "160px", 
                            display: "block",
                          }}
                          title={job.jobName}
                        >
                          {job.jobName}
                        </span>
                        {projectName && (
                          <span 
                            title={projectName}
                          <span 
                            title={projectName}
                            style={{
                              fontSize: "12px",
                              color: "#7f8c8d",
                              fontWeight: 400,
                              marginTop: "2px",
                              whiteSpace: "nowrap", 
                              overflow: "hidden", 
                              textOverflow: "ellipsis", 
                              maxWidth: "140px", 
                              display: "block",
                              whiteSpace: "nowrap", 
                              overflow: "hidden", 
                              textOverflow: "ellipsis", 
                              maxWidth: "140px", 
                              display: "block",
                            }}
                          >
                            {projectName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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
                        whiteSpace: "nowrap", 
                        flexShrink: 0,
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
                    minHeight: 0, 
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexShrink: 0, 
                      flexShrink: 0, 
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
                        flexShrink: 0,
                        flexShrink: 0,
                      }}
                    >
                      {job.lastSiteNoteUserName
                        ? job.lastSiteNoteUserName.charAt(0).toUpperCase()
                        : job.jobName?.charAt(0)?.toUpperCase() || "J"}
                    </div>
                    <span style={{ fontSize: "14px", color: "#555", flexShrink: 0 }}>
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
                      maxHeight: "70px", 
                      flexShrink: 0, 
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
                                : "Click to load",
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
                      {/* Slideshow button */}
                      <button
                        className="attachment-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSlideshow(job, 0);
                        }}
                        title="View slideshow"
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          cursor: 'pointer', 
                          color: '#9b59b6', 
                          fontSize: '14px'
                        }}
                      >
                        <i className="fas fa-images" />
                      </button>

                      {/* AI Summarize button */}
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
                      
                      {/* Create Task button */}
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
                        <i className="fas fa-plus-circle" style={{ color: '#28a745' }} />
                      </button>
                      
                      {/* Settings button */}
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
                    flexShrink: 0,
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
                  background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                  background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#bdc3c7",
                }}
              >
                <i className="fas fa-sticky-note" style={{ fontSize: "24px" }} />
              </div>
            )}
          </div>
        );
      })}
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
      Please wait while we organize your data...
    </div>
  </div>
);

const styles = {
  expandedContainer: {
    width: '100%',
    marginBottom: '20px',
  },
  expandedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e9ecef',
    borderRadius: '8px 8px 0 0',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  briefcaseIcon: {
    color: '#14A2B6',
    fontSize: '18px',
  },
  collapseButton: {
    background: 'transparent',
    border: '1px solid #3498db',
    color: '#3498db',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#3498db',
      color: 'white',
    },
  },
  actionButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '8px 12px',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
  },
  taskCountBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#3498db',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 600,
    marginRight: '8px',
  },
  noteCountBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#f39c12',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    marginRight: '8px',
  },
  taskSummary: {
    display: 'flex',
    gap: '4px',
    marginLeft: '8px',
  },
  statusBadge: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  tasksContainer: {
    marginTop: '20px',
    padding: '0 20px 20px 20px',
  },
  tasksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  taskWrapper: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  taskNoteBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: '#3498db',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    zIndex: 2,
  },
  loadingState: {
    padding: '40px',
    textAlign: 'center',
    color: '#666',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  spinner: {
    fontSize: '24px',
    color: '#3498db',
    marginBottom: '10px',
    display: 'block',
  },
  smallSpinner: {
    fontSize: '14px',
    color: '#3498db',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#999',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '10px',
    opacity: 0.5,
    display: 'block',
  },
  createButton: {
    marginTop: '10px',
    padding: '8px 16px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background-color 0.2s ease',
  },
  expandedTaskSection: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  expandedTaskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e9ecef',
  },
  expandedTaskInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    flex: 1,
  },
  expandedTaskTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2c3e50',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  expandedTaskFriendlyId: {
    fontSize: '12px',
    color: '#7f8c8d',
    backgroundColor: '#f0f0f0',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  expandedTaskDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.5,
  },
  expandedTaskActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  taskActionButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#3498db',
    padding: '6px 10px',
    borderRadius: '4px',
  },
  taskNotesSection: {
    marginTop: '16px',
  },
  notesHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#2c3e50',
  },
  addNoteButton: {
    background: '#3498db',
    border: 'none',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  notesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  noteLoadingState: {
    padding: '30px',
    textAlign: 'center',
    color: '#666',
    backgroundColor: 'white',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  noNotesMessage: {
    padding: '30px',
    textAlign: 'center',
    color: '#999',
    backgroundColor: 'white',
    borderRadius: '8px',
    fontSize: '13px',
  },
  noteCountBadge: {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  background: '#3498db',
  color: 'white',
  padding: '4px 10px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 600,
  marginRight: '8px',
},
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
  // Task hierarchy props
  tasksByJob: PropTypes.object,
  loadingTasksByJob: PropTypes.object,
  expandedTasks: PropTypes.object,
  toggleTaskExpansion: PropTypes.func,
  notesByTask: PropTypes.object,
  loadingNotesByTask: PropTypes.object,
  fetchTasksForJob: PropTypes.func,
  fetchNotesForTask: PropTypes.func,
  // Task action handlers
  onTaskEdit: PropTypes.func,
  onTaskDelete: PropTypes.func,
  onTaskStatusChange: PropTypes.func,
  onTaskClick: PropTypes.func,
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
  // Task hierarchy default props
  tasksByJob: {},
  loadingTasksByJob: {},
  expandedTasks: {},
  toggleTaskExpansion: () => {},
  notesByTask: {},
  loadingNotesByTask: {},
  fetchTasksForJob: () => {},
  fetchNotesForTask: () => {},
  // Task action handlers
  onTaskEdit: () => {},
  onTaskDelete: () => {},
  onTaskStatusChange: () => {},
  onTaskClick: () => {},
};

export default StackedView;