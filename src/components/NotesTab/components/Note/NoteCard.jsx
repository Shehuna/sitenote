import React, { forwardRef, useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  formatRelativeTime,
  getFullDate,
} from "../../utils/formatUtils";
import {
  highlightHtmlContent,
} from "../../utils/htmlUtils";
import {
  getNoteInitials,
} from "../../utils/noteUtils";
import PriorityIndicator from "./PriorityIndicator";
import UserStatusIndicator from "../Tooltips/UserStatusIndicator";

const NoteCard = forwardRef((props, ref) => {
  const {
    note,
    displayNotes, 
    isOriginalNoteExists,
    selectedRow,
    searchTerm,
    viewMode,
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
    renderCardImageIcon,
    isNoteReply,
    getReplyNoteId,
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
    // Task-specific props
    taskData = {},
    onTaskDueDateSelect,
    onTaskAssigneeSelect,
    onTaskStatusSelect,
    taskUsers = [],
    taskStatuses = [],
    loadingTaskUsers = false,
  } = props;

  const priorityValue = getPriorityValue(note, manuallyUpdatedPriorities);
  const isReply = isNoteReply(note.id);
  const originalNoteId = isReply ? getReplyNoteId(note.id) : null;
  const originalNoteExists = isReply && originalNoteId 
    ? isOriginalNoteExists(originalNoteId)
    : false;

  const shouldShowLink = isReply && originalNoteId && originalNoteExists;
  const [showJobTooltip, setShowJobTooltip] = useState(false);
  const [showProjectTooltip, setShowProjectTooltip] = useState(false);
  
  // Task popup states
  const [showTaskDueDatePopup, setShowTaskDueDatePopup] = useState(false);
  const [showTaskAssigneePopup, setShowTaskAssigneePopup] = useState(false);
  const [showTaskStatusPopup, setShowTaskStatusPopup] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDueDate, setSelectedDueDate] = useState(taskData.dueDate || null);
  
  // Refs for popups
  const calendarRef = useRef(null);
  const calendarIconRef = useRef(null);
  const assigneeIconRef = useRef(null);
  const assigneePopupRef = useRef(null);
  const statusIconRef = useRef(null);
  const statusPopupRef = useRef(null);
  
  // Determine if this is a task
  const isTask = note.itemType === "Task";

  // Handle click outside to close popups
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target) && 
          calendarIconRef.current && !calendarIconRef.current.contains(e.target)) {
        setShowTaskDueDatePopup(false);
      }
      
      if (assigneePopupRef.current && !assigneePopupRef.current.contains(e.target) && 
          assigneeIconRef.current && !assigneeIconRef.current.contains(e.target)) {
        setShowTaskAssigneePopup(false);
      }
      
      if (statusPopupRef.current && !statusPopupRef.current.contains(e.target) && 
          statusIconRef.current && !statusIconRef.current.contains(e.target)) {
        setShowTaskStatusPopup(false);
      }
    };

    if (showTaskDueDatePopup || showTaskAssigneePopup || showTaskStatusPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTaskDueDatePopup, showTaskAssigneePopup, showTaskStatusPopup]);

  // Calendar functions
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateSelect = (date) => {
    setSelectedDueDate(date);
    if (onTaskDueDateSelect) {
      onTaskDueDateSelect(note, date);
    }
    setShowTaskDueDatePopup(false);
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Add days from previous month
    for (let i = startingDay - 1; i >= 0; i--) {
      const prevMonthDate = new Date(year, month - 1, daysInPrevMonth - i);
      prevMonthDate.setHours(0, 0, 0, 0);
      const isSelected = selectedDueDate && 
        prevMonthDate.toDateString() === selectedDueDate.toDateString();
      const isDisabled = prevMonthDate < today;
      
      days.push(
        <div 
          key={`prev-${i}`} 
          className={`calendar-day other-month ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
          onClick={() => !isDisabled && handleDateSelect(prevMonthDate)}
        >
          {daysInPrevMonth - i}
        </div>
      );
    }
    
    // Add days of the current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      date.setHours(0, 0, 0, 0);
      const isSelected = selectedDueDate && 
        date.toDateString() === selectedDueDate.toDateString();
      const isToday = date.toDateString() === today.toDateString();
      const isDisabled = date < today;
      
      days.push(
        <div 
          key={d} 
          className={`calendar-day current-month ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isDisabled ? 'disabled' : ''}`}
          onClick={() => !isDisabled && handleDateSelect(date)}
        >
          {d}
        </div>
      );
    }
    
   
    
    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper functions for assignee
  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getRandomColor = (id) => {
    const colors = ['#1976d2', '#dc3545', '#28a745', '#fd7e14', '#6f42c1', '#20c997', '#e83e8c', '#007bff'];
    return colors[(id || 0) % colors.length];
  };

  return (
    <div
      ref={ref}  
      data-note-id={note.id}
      data-item-type={note.itemType}
      className={`note-card ${isTask ? 'task-card' : ''} ${selectedRow === note.id ? "selected" : ""}`}
      onClick={() => handleRowClick(note)}
      onDoubleClick={() => handleRowDoubleClick(note)}
    >
      <NoteHeader 
        note={note}
        searchTerm={searchTerm}
        userStatusMap={userStatusMap}
        loadingUsers={loadingUsers}
        handleProjectClick={handleProjectClick}
        handleJobClick={handleJobClick}
        handleUserNameClick={handleUserNameClick}
        isProjectFiltered={isProjectFiltered}
        isJobFiltered={isJobFiltered}
        isUserNameFiltered={isUserNameFiltered}
        showJobTooltip={showJobTooltip}
        setShowJobTooltip={setShowJobTooltip}
        showProjectTooltip={showProjectTooltip}
        setShowProjectTooltip={setShowProjectTooltip}
      />
      
      <NoteContent
        note={note}
        searchTerm={searchTerm}
        viewMode={viewMode}
        onMouseEnter={handleNoteTextMouseEnter}
        onMouseLeave={handleNoteTextMouseLeave}
        shouldShowNotePopup={shouldShowNotePopup}
      />
      
      <NoteFooter
        note={note}
        priorityValue={priorityValue}
        shouldShowLink={shouldShowLink} 
        originalNoteId={originalNoteId}
        onViewAttachments={handleViewAttachments}
        onReply={handleReplyToNote}
        onAdd={handleAddFromRow}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPriorityClick={handlePriorityClick}
        onPriorityMouseEnter={handlePriorityMouseEnter}
        onPriorityMouseLeave={handlePriorityMouseLeave}
        onLinkedNoteClick={handleLinkedNoteClick}
        onLinkedNoteMouseEnter={handleLinkedNoteMouseEnter}
        onLinkedNoteMouseLeave={handleLinkedNoteMouseLeave}
        renderImageIcon={renderCardImageIcon}
        isTask={isTask}
        taskData={taskData}
        selectedDueDate={selectedDueDate}
        onTaskAssigneeSelect={onTaskAssigneeSelect}
        onTaskStatusSelect={onTaskStatusSelect}
        taskUsers={taskUsers}
        taskStatuses={taskStatuses}
        loadingTaskUsers={loadingTaskUsers}
        // Popup states
        showTaskDueDatePopup={showTaskDueDatePopup}
        setShowTaskDueDatePopup={setShowTaskDueDatePopup}
        showTaskAssigneePopup={showTaskAssigneePopup}
        setShowTaskAssigneePopup={setShowTaskAssigneePopup}
        showTaskStatusPopup={showTaskStatusPopup}
        setShowTaskStatusPopup={setShowTaskStatusPopup}
        // Refs
        calendarRef={calendarRef}
        calendarIconRef={calendarIconRef}
        assigneeIconRef={assigneeIconRef}
        assigneePopupRef={assigneePopupRef}
        statusIconRef={statusIconRef}
        statusPopupRef={statusPopupRef}
        // Calendar functions
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        goToPreviousMonth={goToPreviousMonth}
        goToNextMonth={goToNextMonth}
        generateCalendarDays={generateCalendarDays}
        monthNames={monthNames}
        handleDateSelect={handleDateSelect}
        // Helper functions
        getInitials={getInitials}
        getRandomColor={getRandomColor}
      />
    </div>
  );
});

const NoteHeader = ({ note, searchTerm, userStatusMap, loadingUsers,
  handleProjectClick,
  handleJobClick,
  handleUserNameClick,
  isProjectFiltered,
  isJobFiltered,
  isUserNameFiltered,
  showJobTooltip,
  setShowJobTooltip,
  showProjectTooltip,
  setShowProjectTooltip }) => (
  <div className="note-header">
    <UserAvatar note={note} 
      handleUserNameClick={handleUserNameClick} 
      isUserNameFiltered={isUserNameFiltered}
      />
    <NoteMeta 
      note={note} 
      userStatusMap={userStatusMap} 
      loadingUsers={loadingUsers} 
      handleUserNameClick={handleUserNameClick} 
      isUserNameFiltered={isUserNameFiltered}
      />
    <NoteContext 
      note={note}
      searchTerm={searchTerm}
      handleProjectClick={handleProjectClick}
      handleJobClick={handleJobClick}
      isProjectFiltered={isProjectFiltered}
      isJobFiltered={isJobFiltered}
      showJobTooltip={showJobTooltip}
      setShowJobTooltip={setShowJobTooltip}
      showProjectTooltip={showProjectTooltip}
      setShowProjectTooltip={setShowProjectTooltip}
      />
  </div>
);

const UserAvatar = ({ note, handleUserNameClick, isUserNameFiltered }) => {
  const initials = getNoteInitials(note.userName);
  
  const userNameFiltered = isUserNameFiltered && typeof isUserNameFiltered === 'function' 
    ? isUserNameFiltered(note.userName) 
    : false;
  
  const handleClick = (e) => {
    e.stopPropagation();
    if (handleUserNameClick && note.userName) {
      handleUserNameClick(note.userName);
    }
  };
  
  return (
    <div 
      className="user-avatar-wrapper"
      onClick={handleClick}
      style={{
        cursor: handleUserNameClick ? 'pointer' : 'default',
        position: 'relative'
      }}
      title={`Click to filter by user: ${note.userName || "Unknown User"}`}
    >
      <div 
        className="user-avatar"
        style={{
          border: userNameFiltered ? '2px solid #3498db' : 'none',
          boxShadow: userNameFiltered ? '0 0 0 2px rgba(52, 152, 219, 0.3)' : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        {initials ? initials : <i className="fas fa-user" />}
      </div>
      <div className="user-tooltip">
        {note.userName || "Unknown User"}
        {userNameFiltered }
      </div>
    </div>
  );
};

const NoteMeta = ({ 
  note, 
  userStatusMap, 
  loadingUsers,
  handleUserNameClick,
  isUserNameFiltered 
}) => {
  const userNameFiltered = isUserNameFiltered && typeof isUserNameFiltered === 'function' 
    ? isUserNameFiltered(note.userName) 
    : false;
  
  const handleUserNameClickHandler = (e) => {
    e.stopPropagation();
    if (handleUserNameClick && note.userName) {
      handleUserNameClick(note.userName);
    }
  };
  
  return (
    <div className="note-meta">
      <div 
        className="note-author" 
        title={note.userName || "Unknown User"}
        onClick={handleUserNameClickHandler}
        style={{
          cursor: handleUserNameClick ? 'pointer' : 'default',
          color: userNameFiltered ? '#3498db' : 'inherit',
          fontWeight: userNameFiltered ? '600' : '700',
          textDecoration: userNameFiltered ? 'underline' : 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 4px',
          marginLeft: '-4px', 
          borderRadius: '3px',
          backgroundColor: userNameFiltered ? 'rgba(52, 152, 219, 0.1)' : 'transparent',
          transition: 'all 0.2s ease'
        }}
      >
        <UserStatusIndicator
          userId={note.userId}
          userName={note.userName}
          userStatusMap={userStatusMap}
          loadingUsers={loadingUsers}
        />
        {userNameFiltered }
      </div>
      <div className="note-date" title={getFullDate(note.timeStamp)}>
        {formatRelativeTime(note.timeStamp)}
      </div>
    </div>
  );
};

const NoteContext = ({ 
  note, 
  searchTerm,
  handleProjectClick,
  handleJobClick,
  isProjectFiltered,
  isJobFiltered
}) => {
  const projectFiltered = isProjectFiltered && typeof isProjectFiltered === 'function' 
    ? isProjectFiltered(note.project) 
    : false;
  
  const jobFiltered = isJobFiltered && typeof isJobFiltered === 'function' 
    ? isJobFiltered(note.job) 
    : false;

  return (
    <div className="note-context">
      <div 
        className="context-item job"
        title={`Click to filter by job: ${note.job}`}
        onClick={(e) => {
          e.stopPropagation();
          if (handleJobClick && note.job) {
            handleJobClick(note.job);
          }
        }}
        style={{
          cursor: 'pointer',
          color: jobFiltered ? '#3498db' : 'inherit',
          fontWeight: jobFiltered ? '600' : 'normal',
          textDecoration: jobFiltered ? 'underline' : 'none'
        }}
      >
        {note.job || "—"}
      </div>
      <div className="context-item workspace-project">
        <span title={note.workspace}>{note.workspace || "—"}</span>/
        <span 
          title={`Click to filter by project: ${note.project}`}
          onClick={(e) => {
            e.stopPropagation();
            if (handleProjectClick && note.project) {
              handleProjectClick(note.project);
            }
          }}
          style={{
            cursor: 'pointer',
            fontWeight: projectFiltered ? '650' : 'normal',
            textDecoration: projectFiltered ? 'underline' : 'none'
          }}
        >
          {note.project || "—"}
        </span>
      </div>
    </div>
  );
};

const NoteContent = ({ note, searchTerm, viewMode, onMouseEnter, onMouseLeave, shouldShowNotePopup }) => {
  const handleMouseEnter = (e) => {
    if (typeof shouldShowNotePopup === 'function' && shouldShowNotePopup(note)) {
      onMouseEnter(note, e);
    }
  };

  const handleMouseLeave = () => {
    if (typeof shouldShowNotePopup === 'function' && shouldShowNotePopup(note)) {
      onMouseLeave();
    }
  };

  return (
    <div className="note-content">
      <div
        className="note-card-content-container"
        style={{ position: "relative", height: "100%" }}
        onClick={(e) => {
          if (e.target.tagName === "A" && e.target.classList.contains("note-url-link")) {
            e.stopPropagation();
          }
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="note-text"
          style={{ maxHeight: "110px", overflow: "hidden", position: "relative" }}
          dangerouslySetInnerHTML={{
            __html: highlightHtmlContent(note.note || "", searchTerm),
          }}
        />
      </div>
    </div>
  );
};

const NoteFooter = ({
  note,
  priorityValue,
  shouldShowLink,
  originalNoteId,
  onViewAttachments,
  onReply,
  onAdd,
  onEdit,
  onDelete,
  onPriorityClick,
  onPriorityMouseEnter,
  onPriorityMouseLeave,
  onLinkedNoteClick,
  onLinkedNoteMouseEnter,
  onLinkedNoteMouseLeave,
  renderImageIcon,
  isTask,
  taskData,
  selectedDueDate,
  onTaskAssigneeSelect,
  onTaskStatusSelect,
  taskUsers,
  taskStatuses,
  loadingTaskUsers,
  // Popup states
  showTaskDueDatePopup,
  setShowTaskDueDatePopup,
  showTaskAssigneePopup,
  setShowTaskAssigneePopup,
  showTaskStatusPopup,
  setShowTaskStatusPopup,
  // Refs
  calendarRef,
  calendarIconRef,
  assigneeIconRef,
  assigneePopupRef,
  statusIconRef,
  statusPopupRef,
  // Calendar functions
  currentMonth,
  setCurrentMonth,
  goToPreviousMonth,
  goToNextMonth,
  generateCalendarDays,
  monthNames,
  handleDateSelect,
  // Helper functions
  getInitials,
  getRandomColor,
}) => {
  const selectedUser = taskData.assignee;
  const selectedStatus = taskData.status;

  const defaultStatuses = [
    { id: 1, name: "To Do", icon: "fa-circle", color: "#6c757d", bgColor: "#e9ecef" },
    { id: 2, name: "In Progress", icon: "fa-spinner", color: "#fd7e14", bgColor: "#fff3e0" },
    { id: 3, name: "Blocked", icon: "fa-exclamation-circle", color: "#dc3545", bgColor: "#f8d7da" },
    { id: 4, name: "Done", icon: "fa-check-circle", color: "#28a745", bgColor: "#d4edda" },
  ];

  const statuses = taskStatuses.length > 0 ? taskStatuses : defaultStatuses;

  return (
    <div className="note-footer">
      <div className="note-attachments">
        {renderImageIcon && renderImageIcon(note)}
        <AttachmentButton note={note} onClick={onViewAttachments} />
        <ReplyButton note={note} onClick={onReply} />
        {shouldShowLink && originalNoteId && (
          <LinkButton
            noteId={note.id}
            onClick={onLinkedNoteClick}
            onMouseEnter={onLinkedNoteMouseEnter}
            onMouseLeave={onLinkedNoteMouseLeave}
          />
        )}
      </div>
      
      <div className="note-actions">
        {/* Task-specific buttons - only show for tasks */}
        {isTask && (
          <>
            {/* Due Date Button */}
            <div style={{ position: 'relative' }} ref={calendarIconRef}>
              <div 
                className={`task-icon-item ${selectedDueDate ? 'has-value' : ''}`}
                title="Due Date"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTaskDueDatePopup(!showTaskDueDatePopup);
                  setShowTaskAssigneePopup(false);
                  setShowTaskStatusPopup(false);
                }}
              >
                <i className="fas fa-calendar"></i>
                {selectedDueDate && (
                  <span className="icon-value">
                    {new Date(selectedDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              
              {/* Calendar Popup */}
              {showTaskDueDatePopup && (
                <div 
                  className="calendar-popup task-popup" 
                  ref={calendarRef}
                >
                  <div className="calendar-header">
                    <button className="calendar-nav-button" onClick={goToPreviousMonth}>
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    <span className="calendar-month-year">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </span>
                    <button className="calendar-nav-button" onClick={goToNextMonth}>
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                  
                  <div className="calendar-weekdays">
                    <div className="weekday">Su</div>
                    <div className="weekday">Mo</div>
                    <div className="weekday">Tu</div>
                    <div className="weekday">We</div>
                    <div className="weekday">Th</div>
                    <div className="weekday">Fr</div>
                    <div className="weekday">Sa</div>
                  </div>
                  
                  <div className="calendar-days">
                    {generateCalendarDays()}
                  </div>
                  
                  {selectedDueDate && (
                    <div className="calendar-footer">
                      <button 
                        className="clear-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateSelect(null);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assignee Button */}
            <div style={{ position: 'relative' }} ref={assigneeIconRef}>
              <div 
                className={`task-icon-item ${selectedUser ? 'has-value' : ''} ${loadingTaskUsers ? 'loading' : ''}`}
                title="Assignee"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTaskAssigneePopup(!showTaskAssigneePopup);
                  setShowTaskDueDatePopup(false);
                  setShowTaskStatusPopup(false);
                }}
              >
                <i className={`fas ${loadingTaskUsers ? 'fa-spinner fa-spin' : 'fa-user'}`}></i>
                {selectedUser && (
                  <span className="icon-value user-avatar-small" style={{ backgroundColor: selectedUser.color || getRandomColor(selectedUser.id) }}>
                    {selectedUser.avatar || getInitials(selectedUser.name)}
                  </span>
                )}
              </div>
              
              {/* User Selection Popup */}
              {showTaskAssigneePopup && (
                <div 
                  className="user-popup task-popup" 
                  ref={assigneePopupRef}
                >
                  <div className="user-popup-header">
                    <span className="user-popup-title">Select Assignee</span>
                  </div>
                  
                  <div className="user-list-container">
                    {loadingTaskUsers ? (
                      <div className="loading-users">
                        <i className="fas fa-spinner fa-spin"></i> Loading users...
                      </div>
                    ) : taskUsers.length > 0 ? (
                      taskUsers.map(user => (
                        <div 
                          key={user.id}
                          className={`user-item ${selectedUser?.id === user.id ? 'selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onTaskAssigneeSelect) {
                              onTaskAssigneeSelect(note, user);
                            }
                            setShowTaskAssigneePopup(false);
                          }}
                        >
                          <div className="user-avatar" style={{ backgroundColor: user.color || getRandomColor(user.id) }}>
                            {user.avatar || getInitials(user.name)}
                          </div>
                          <div className="user-name">{user.name}</div>
                          {selectedUser?.id === user.id && (
                            <i className="fas fa-check user-check-icon"></i>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="no-users">No users available</div>
                    )}
                  </div>
                  
                  {selectedUser && (
                    <div className="user-popup-footer">
                      <button 
                        className="clear-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTaskAssigneeSelect) {
                            onTaskAssigneeSelect(note, null);
                          }
                          setShowTaskAssigneePopup(false);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status Button */}
            <div style={{ position: 'relative' }} ref={statusIconRef}>
              <div 
                className={`task-icon-item ${selectedStatus ? 'has-value' : ''}`}
                title="Status"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTaskStatusPopup(!showTaskStatusPopup);
                  setShowTaskDueDatePopup(false);
                  setShowTaskAssigneePopup(false);
                }}
              >
                <i className="fas fa-tasks"></i>
                {selectedStatus && (
                  <span className="icon-value status-badge" style={{ 
                    backgroundColor: selectedStatus.bgColor,
                    color: selectedStatus.color,
                    border: `1px solid ${selectedStatus.color}`
                  }}>
                    <i className={`fas ${selectedStatus.icon}`} style={{ marginRight: '4px' }}></i>
                    {selectedStatus.name}
                  </span>
                )}
              </div>
              
              {/* Status Selection Popup */}
              {showTaskStatusPopup && (
                <div 
                  className="status-popup task-popup" 
                  ref={statusPopupRef}
                >
                  <div className="status-popup-header">
                    <span className="status-popup-title">Select Status</span>
                  </div>
                  
                  <div className="status-list-container">
                    {statuses.map(status => (
                      <div 
                        key={status.id}
                        className={`status-item ${selectedStatus?.id === status.id ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTaskStatusSelect) {
                            onTaskStatusSelect(note, status);
                          }
                          setShowTaskStatusPopup(false);
                        }}
                        style={selectedStatus?.id === status.id ? { borderLeftColor: status.color } : {}}
                      >
                        <div className="status-icon-wrapper" style={{ 
                          backgroundColor: status.bgColor,
                          color: status.color
                        }}>
                          <i className={`fas ${status.icon}`}></i>
                        </div>
                        <div className="status-name">{status.name}</div>
                        {selectedStatus?.id === status.id && (
                          <i className="fas fa-check status-check-icon" style={{ color: status.color }}></i>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {selectedStatus && (
                    <div className="status-popup-footer">
                      <button 
                        className="clear-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTaskStatusSelect) {
                            onTaskStatusSelect(note, null);
                          }
                          setShowTaskStatusPopup(false);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        
        <PriorityIndicator
          priorityValue={priorityValue}
          note={note}
          onClick={onPriorityClick}
          onMouseEnter={onPriorityMouseEnter}
          onMouseLeave={onPriorityMouseLeave}
        />
        <ActionButton icon="fas fa-plus" title="Add New Note" onClick={() => onAdd(note)} />
        <ActionButton icon="fas fa-edit" title="Edit Note" onClick={() => onEdit(note)} />
        <ActionButton icon="fas fa-trash" title="Delete Note" onClick={() => onDelete(note)} />
      </div>
    </div>
  );
};

const AttachmentButton = ({ note, onClick }) => (
  <button 
    className="attachment-btn" 
    onClick={(e) => { 
      e.stopPropagation(); 
      onClick(note); 
    }}
  >
    <i 
      className="fas fa-paperclip" 
      style={{ opacity: note.documentCount > 0 ? 1 : 0.3 }} 
    />
    <span>({note.documentCount || 0})</span>
  </button>
);

const ReplyButton = ({note, onClick }) => (
  <button
    className="attachment-btn"
    onClick={(e) => { 
      e.stopPropagation(); 
      onClick(note); 
    }}
    title="Reply to this note"
  >
    <i className="fas fa-reply" />
  </button>
);

const LinkButton = ({ noteId, onClick, onMouseEnter, onMouseLeave }) => (
  <button
    className="link-to-note-btn"
    onClick={(e) => onClick(noteId, e)}
    onMouseEnter={(e) => onMouseEnter(noteId, e)}
    onMouseLeave={onMouseLeave}
  >
    <i className="fas fa-link" />
  </button>
);

const ActionButton = ({ icon, title, onClick }) => (
  <button 
    className="action-btn" 
    onClick={(e) => { 
      e.stopPropagation(); 
      onClick(); 
    }} 
    title={title}
  >
    <i className={icon} />
  </button>
);

NoteCard.propTypes = {
  note: PropTypes.object.isRequired,
  displayNotes: PropTypes.array, 
  isOriginalNoteExists: PropTypes.func,
  selectedRow: PropTypes.any,
  searchTerm: PropTypes.string,
  viewMode: PropTypes.string,
  handleRowClick: PropTypes.func.isRequired,
  handleRowDoubleClick: PropTypes.func.isRequired,
  handleAddFromRow: PropTypes.func.isRequired,
  handleEdit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleViewAttachments: PropTypes.func.isRequired,
  handleReplyToNote: PropTypes.func.isRequired,
  handlePriorityClick: PropTypes.func.isRequired,
  handlePriorityMouseEnter: PropTypes.func.isRequired,
  handlePriorityMouseLeave: PropTypes.func.isRequired,
  handleNoteTextMouseEnter: PropTypes.func.isRequired,
  handleNoteTextMouseLeave: PropTypes.func.isRequired,
  handleLinkedNoteClick: PropTypes.func.isRequired,
  handleLinkedNoteMouseEnter: PropTypes.func.isRequired,
  handleLinkedNoteMouseLeave: PropTypes.func.isRequired,
  renderCardImageIcon: PropTypes.func,
  isNoteReply: PropTypes.func.isRequired,
  getReplyNoteId: PropTypes.func.isRequired,
  userStatusMap: PropTypes.object.isRequired,
  loadingUsers: PropTypes.object.isRequired,
  getPriorityValue: PropTypes.func.isRequired,
  manuallyUpdatedPriorities: PropTypes.object.isRequired,
  shouldShowNotePopup: PropTypes.func.isRequired,
  handleProjectClick: PropTypes.func,
  handleJobClick: PropTypes.func,
  handleUserNameClick: PropTypes.func, 
  isUserNameFiltered: PropTypes.func,
  isProjectFiltered: PropTypes.func,
  isJobFiltered: PropTypes.func,
  // Task-specific props
  taskData: PropTypes.object,
  onTaskDueDateSelect: PropTypes.func,
  onTaskAssigneeSelect: PropTypes.func,
  onTaskStatusSelect: PropTypes.func,
  taskUsers: PropTypes.array,
  taskStatuses: PropTypes.array,
  loadingTaskUsers: PropTypes.bool,
};

NoteCard.defaultProps = {
  displayNotes: [],
  isOriginalNoteExists: () => false,
  selectedRow: null,
  searchTerm: "",
  viewMode: "cards",
  renderCardImageIcon: () => null,
  handleProjectClick: () => {},
  handleJobClick: () => {},
  handleUserNameClick: () => {},
  isProjectFiltered: () => false, 
  isJobFiltered: () => false,
  isUserNameFiltered: () => false,
  // Task-specific default props
  taskData: {},
  onTaskDueDateSelect: () => {},
  onTaskAssigneeSelect: () => {},
  onTaskStatusSelect: () => {},
  taskUsers: [],
  taskStatuses: [],
  loadingTaskUsers: false,
};

export default NoteCard;