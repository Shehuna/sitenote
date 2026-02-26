import React, { forwardRef, useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import toast from "react-hot-toast"; // Add this import
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

// Create a root portal component
const RootPortal = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? ReactDOM.createPortal(children, document.body) : null;
};

// Task Status Mapping
const TASK_STATUS_MAP = {
  1: { id: 1, name: "To Do", icon: "fa-circle", color: "#6c757d", bgColor: "#e9ecef" },
  2: { id: 2, name: "In Progress", icon: "fa-spinner", color: "#fd7e14", bgColor: "#fff3e0" },
  3: { id: 3, name: "Blocked", icon: "fa-exclamation-circle", color: "#dc3545", bgColor: "#f8d7da" },
  4: { id: 4, name: "Done", icon: "fa-check-circle", color: "#28a745", bgColor: "#d4edda" },
};

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
    userId,
    refreshNotes,
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
  
  // Initialize task data from note
  const [selectedDueDate, setSelectedDueDate] = useState(note.dueDate || null);
  const [selectedAssignee, setSelectedAssignee] = useState(
    note.assigneeId ? { id: note.assigneeId, name: note.assigneeName } : null
  );
  const [selectedStatus, setSelectedStatus] = useState(
    TASK_STATUS_MAP[note.taskStatus] || TASK_STATUS_MAP[1]
  );
  
  // Users state
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsersList, setLoadingUsersList] = useState(false);
  const [usersError, setUsersError] = useState(null);
  
  // Loading state for updates
  const [updatingTask, setUpdatingTask] = useState(false);
  
  // Popup position state
  const [popupPosition, setPopupPosition] = useState({
    dueDate: { top: 0, left: 0 },
    assignee: { top: 0, left: 0 },
    status: { top: 0, left: 0 }
  });
  
  // Refs for the icons
  const calendarIconRef = useRef(null);
  const assigneeIconRef = useRef(null);
  const statusIconRef = useRef(null);
  
  // API base URL
  const apiUrl = process.env.REACT_APP_API_BASE_URL || '';
  
  // Determine if this is a task
  const isTask = note.itemType === "Task";

  // Function to update task with toast notifications
 // Function to update task with toast notifications - ONLY FUNCTIONALITY FIXED
const updateTask = useCallback(async (updates) => {
  if (!note.taskId) {
    console.error("No taskId found for note:", note);
    toast.error("Cannot update task: Task ID not found");
    return;
  }

  setUpdatingTask(true);
  
  // Determine what's being updated for the toast message
  let updateType = '';
  if (updates.dueDate !== undefined) updateType = 'Due date';
  else if (updates.assigneeId !== undefined) updateType = 'Assignee';
  else if (updates.status !== undefined) updateType = 'Status';
  
  try {
    // Get the current assignee ID (must be included in all updates)
    const currentAssigneeId = selectedAssignee?.id;
    
    // If we're updating due date or status and there's no assignee, we have a problem
    if ((updates.dueDate !== undefined || updates.status !== undefined) && !currentAssigneeId) {
      toast.error("Please select an assignee first");
      setUpdatingTask(false);
      return;
    }

    // Build the complete task payload - ALWAYS include the current assigneeId
    const payload = {
      title: note.title || note.note || "",
      description: note.note || "",
      startDate: note.startDate || new Date().toISOString(),
      endDate: note.endDate || null,
      dueDate: selectedDueDate || null,
      assigneeId: currentAssigneeId || 0, // Always include assigneeId (use 0 if none, but API will reject)
      createdById: note.userId || userId,
      jobId: note.jobId || 0,
      status: selectedStatus?.id || 1,
      ...updates // Override with any updates passed
    };

    // If this is an assignee update, use the new assigneeId
    if (updates.assigneeId !== undefined) {
      payload.assigneeId = updates.assigneeId;
    }

    console.log("Updating task with payload:", payload);

    const response = await fetch(`${apiUrl}/api/JobTasks/${note.taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Check for specific error about assigneeId
      if (errorText.includes('assigneeId') || errorText.includes('foreign key')) {
        throw new Error('Please select a valid assignee first.');
      }
      
      throw new Error(`Failed to update task: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Task updated successfully:", result);
    
    // Show success toast
    if (updateType) {
      toast.success(`${updateType} updated successfully`);
    } else {
      toast.success("Task updated successfully");
    }
    
    // Call the parent's callback if provided
    if (updates.dueDate !== undefined && onTaskDueDateSelect) {
      onTaskDueDateSelect(note, updates.dueDate);
    }
    if (updates.assigneeId !== undefined && onTaskAssigneeSelect) {
      onTaskAssigneeSelect(note, { id: updates.assigneeId });
    }
    if (updates.status !== undefined && onTaskStatusSelect) {
      onTaskStatusSelect(note, { id: updates.status });
    }
    
    // Trigger refresh if available
    if (refreshNotes) {
      refreshNotes();
    }
    
    return result;
  } catch (error) {
    console.error("Error updating task:", error);
    
    // Show error toast with specific message
    let errorMessage = `Failed to update ${updateType.toLowerCase() || 'task'}`;
    
    if (error.message.includes('Failed to fetch')) {
      errorMessage = "Network error. Please check your connection.";
    } else if (error.message.includes('500')) {
      errorMessage = "Server error. Please try again later.";
    } else if (error.message.includes('foreign key') || error.message.includes('assigneeId')) {
      errorMessage = "Please select a valid assignee first.";
    } else {
      errorMessage = error.message;
    }
    
    toast.error(errorMessage);
  } finally {
    setUpdatingTask(false);
  }
}, [note, selectedDueDate, selectedAssignee, selectedStatus, userId, apiUrl, onTaskDueDateSelect, onTaskAssigneeSelect, onTaskStatusSelect, refreshNotes]);
  // Function to fetch users with toast error
  const fetchUsers = useCallback(async () => {
    if (!userId) {
      console.log("No userId provided");
      setUsersError("User ID not available");
      setLoadingUsersList(false);
      return;
    }
    
    setLoadingUsersList(true);
    setUsersError(null);
    
    try {
      const url = `${apiUrl}/api/SiteNote/GetUniqueUsernames?userId=${userId}`;
      console.log("Fetching users from:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Users data received:", data);
      
      if (data && data.usernames && Array.isArray(data.usernames)) {
        const transformedUsers = data.usernames.map(user => ({
          id: user.id,
          name: user.text,
          value: user.value,
          color: getRandomColor(user.id)
        }));
        console.log("Transformed users:", transformedUsers);
        setAvailableUsers(transformedUsers);
      } else {
        console.log("No usernames array in response");
        setAvailableUsers([]);
        toast.error("No users found");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsersError(error.message);
      setAvailableUsers([]);
      toast.error("Failed to load users list");
    } finally {
      setLoadingUsersList(false);
    }
  }, [userId, apiUrl]);

  // Fetch users when assignee popup is opened
  useEffect(() => {
    if (showTaskAssigneePopup) {
      console.log("Assignee popup opened, fetching users...");
      fetchUsers();
    }
  }, [showTaskAssigneePopup, fetchUsers]);

  // Function to calculate popup position
  const calculatePopupPosition = useCallback((elementRef) => {
    if (!elementRef.current) return { top: 0, left: 0 };
    
    const rect = elementRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupHeight = 320;
    const popupWidth = 240;
    
    let top = rect.bottom + 5;
    let left = rect.left;
    
    if (top + popupHeight > viewportHeight) {
      top = rect.top - popupHeight + 90;
    }
    
    if (left + popupWidth > viewportWidth) {
      left = viewportWidth - popupWidth - 10;
    }
    
    if (top < 0) top = 10;
    
    return { top, left };
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showTaskDueDatePopup || showTaskAssigneePopup || showTaskStatusPopup) {
        const isClickOnCalendar = calendarIconRef.current?.contains(e.target);
        const isClickOnAssignee = assigneeIconRef.current?.contains(e.target);
        const isClickOnStatus = statusIconRef.current?.contains(e.target);
        
        const isClickInsideCalendar = e.target.closest?.('.calendar-popup-root');
        const isClickInsideAssignee = e.target.closest?.('.user-popup-root');
        const isClickInsideStatus = e.target.closest?.('.status-popup-root');
        
        if (!isClickOnCalendar && !isClickInsideCalendar) {
          setShowTaskDueDatePopup(false);
        }
        if (!isClickOnAssignee && !isClickInsideAssignee) {
          setShowTaskAssigneePopup(false);
        }
        if (!isClickOnStatus && !isClickInsideStatus) {
          setShowTaskStatusPopup(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTaskDueDatePopup, showTaskAssigneePopup, showTaskStatusPopup]);

  // Update position on scroll/resize
  useEffect(() => {
    const updatePositions = () => {
      if (showTaskDueDatePopup) {
        setPopupPosition(prev => ({ ...prev, dueDate: calculatePopupPosition(calendarIconRef) }));
      }
      if (showTaskAssigneePopup) {
        setPopupPosition(prev => ({ ...prev, assignee: calculatePopupPosition(assigneeIconRef) }));
      }
      if (showTaskStatusPopup) {
        setPopupPosition(prev => ({ ...prev, status: calculatePopupPosition(statusIconRef) }));
      }
    };

    if (showTaskDueDatePopup || showTaskAssigneePopup || showTaskStatusPopup) {
      window.addEventListener('scroll', updatePositions, true);
      window.addEventListener('resize', updatePositions);
    }

    return () => {
      window.removeEventListener('scroll', updatePositions, true);
      window.removeEventListener('resize', updatePositions);
    };
  }, [showTaskDueDatePopup, showTaskAssigneePopup, showTaskStatusPopup, calculatePopupPosition]);

  // Calendar functions
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateSelect = async (date) => {
    setSelectedDueDate(date);
    setShowTaskDueDatePopup(false);
    
    // Show loading toast
    const toastId = toast.loading(date ? 'Updating due date...' : 'Clearing due date...');
    
    // Update the task with new due date
    await updateTask({ dueDate: date });
    
    // Dismiss loading toast (updateTask will show success/error)
    toast.dismiss(toastId);
  };

  const handleAssigneeSelect = async (user) => {
    setSelectedAssignee(user);
    setShowTaskAssigneePopup(false);
    
    // Show loading toast
    const toastId = toast.loading(user ? `Assigning to ${user.name}...` : 'Removing assignee...');
    
    // Update the task with new assignee
    await updateTask({ assigneeId: user.id });
    
    // Dismiss loading toast
    toast.dismiss(toastId);
  };

  const handleStatusSelect = async (status) => {
    setSelectedStatus(status);
    setShowTaskStatusPopup(false);
    
    // Show loading toast
    const toastId = toast.loading(`Changing status to ${status.name}...`);
    
    // Update the task with new status
    await updateTask({ status: status.id });
    
    // Dismiss loading toast
    toast.dismiss(toastId);
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
        new Date(selectedDueDate).toDateString() === prevMonthDate.toDateString();
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
        new Date(selectedDueDate).toDateString() === date.toDateString();
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

  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getRandomColor = (id) => {
    const colors = ['#1976d2', '#dc3545', '#28a745', '#fd7e14', '#6f42c1', '#20c997', '#e83e8c', '#007bff'];
    return colors[(id || 0) % colors.length];
  };

  const handleDueDateClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowTaskDueDatePopup(!showTaskDueDatePopup);
    setShowTaskAssigneePopup(false);
    setShowTaskStatusPopup(false);
    setPopupPosition(prev => ({ ...prev, dueDate: calculatePopupPosition(calendarIconRef) }));
  };

  const handleAssigneeClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowTaskAssigneePopup(!showTaskAssigneePopup);
    setShowTaskDueDatePopup(false);
    setShowTaskStatusPopup(false);
    setPopupPosition(prev => ({ ...prev, assignee: calculatePopupPosition(assigneeIconRef) }));
  };

  const handleStatusClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowTaskStatusPopup(!showTaskStatusPopup);
    setShowTaskDueDatePopup(false);
    setShowTaskAssigneePopup(false);
    setPopupPosition(prev => ({ ...prev, status: calculatePopupPosition(statusIconRef) }));
  };

  return (
    <>
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
          selectedDueDate={selectedDueDate}
          selectedAssignee={selectedAssignee}
          selectedStatus={selectedStatus}
          onDueDateClick={handleDueDateClick}
          onAssigneeClick={handleAssigneeClick}
          onStatusClick={handleStatusClick}
          calendarIconRef={calendarIconRef}
          assigneeIconRef={assigneeIconRef}
          statusIconRef={statusIconRef}
          updatingTask={updatingTask}
        />
      </div>

      {/* Render popups at root level using portal */}
      <RootPortal>
        {showTaskDueDatePopup && (
          <CalendarPopup
            position={popupPosition.dueDate}
            currentMonth={currentMonth}
            goToPreviousMonth={goToPreviousMonth}
            goToNextMonth={goToNextMonth}
            generateCalendarDays={generateCalendarDays}
            monthNames={monthNames}
            selectedDueDate={selectedDueDate}
            handleDateSelect={handleDateSelect}
            updating={updatingTask}
          />
        )}

        {showTaskAssigneePopup && (
          <AssigneePopup
            position={popupPosition.assignee}
            users={availableUsers}
            loading={loadingUsersList}
            error={usersError}
            selectedUser={selectedAssignee}
            onTaskAssigneeSelect={handleAssigneeSelect}
            getInitials={getInitials}
            getRandomColor={getRandomColor}
            updating={updatingTask}
          />
        )}

        {showTaskStatusPopup && (
          <StatusPopup
            position={popupPosition.status}
            taskStatuses={taskStatuses}
            selectedStatus={selectedStatus}
            onTaskStatusSelect={handleStatusSelect}
            updating={updatingTask}
          />
        )}
      </RootPortal>
    </>
  );
});

// Calendar Popup Component
const CalendarPopup = ({ 
  position, 
  currentMonth, 
  goToPreviousMonth, 
  goToNextMonth, 
  generateCalendarDays, 
  monthNames, 
  selectedDueDate, 
  handleDateSelect,
  updating
}) => {
  return (
    <div
      className="calendar-popup-root"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 999999,
        backgroundColor: "#ffffff",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.2)",
        width: "240px",
        padding: "12px",
        opacity: 1,
        color: "#333333",
        pointerEvents: updating ? "none" : "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {updating && (
        <div style={{ 
          position: "absolute", 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
          zIndex: 1
        }}>
          <i className="fas fa-spinner fa-spin" style={{ color: "#1976d2", fontSize: "24px" }}></i>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <button 
          onClick={goToPreviousMonth} 
          disabled={updating}
          style={{ 
            background: "#f0f0f0", 
            border: "1px solid #ddd", 
            borderRadius: "4px", 
            padding: "4px 8px", 
            cursor: updating ? "not-allowed" : "pointer",
            opacity: updating ? 0.5 : 1
          }}
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        <span style={{ fontWeight: "bold" }}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button 
          onClick={goToNextMonth} 
          disabled={updating}
          style={{ 
            background: "#f0f0f0", 
            border: "1px solid #ddd", 
            borderRadius: "4px", 
            padding: "4px 8px", 
            cursor: updating ? "not-allowed" : "pointer",
            opacity: updating ? 0.5 : 1
          }}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "5px" }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
          <div key={day} style={{ textAlign: "center", fontSize: "11px", fontWeight: "bold", color: "#666" }}>{day}</div>
        ))}
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {generateCalendarDays()}
      </div>
    
    </div>
  );
};

// Assignee Popup Component
const AssigneePopup = ({ 
  position, 
  users, 
  loading, 
  error,
  selectedUser, 
  onTaskAssigneeSelect, 
  getInitials,
  getRandomColor,
  updating
}) => {
  return (
    <div
      className="user-popup-root"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 999999,
        backgroundColor: "#ffffff",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.2)",
        width: "240px",
        maxHeight: "350px", // Increased height for better visibility
        display: "flex",
        flexDirection: "column",
        opacity: 1,
        color: "#333333",
        pointerEvents: updating ? "none" : "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {updating && (
        <div style={{ 
          position: "absolute", 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
          zIndex: 1
        }}>
          <i className="fas fa-spinner fa-spin" style={{ color: "#1976d2", fontSize: "24px" }}></i>
        </div>
      )}
      
      {/* Fixed header - doesn't scroll */}
      <div style={{ 
        padding: "12px", 
        borderBottom: "1px solid #eee", 
        fontWeight: "bold",
        flexShrink: 0,
        backgroundColor: "#fff",
        borderTopLeftRadius: "8px",
        borderTopRightRadius: "8px"
      }}>
        Select Assignee
        {users && users.length > 0 && (
          <span style={{ 
            marginLeft: "8px", 
            fontSize: "12px", 
            color: "#666",
            fontWeight: "normal"
          }}>
            ({users.length})
          </span>
        )}
      </div>
      
      {/* Scrollable content area - with proper max-height */}
      <div style={{ 
        maxHeight: "200px", 
        overflowY: "auto",
        overflowX: "hidden",
        flex: 1
      }}>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: "8px" }}></i>
            Loading users...
          </div>
        ) : error ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#dc3545" }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: "8px" }}></i>
            {error}
          </div>
        ) : users && users.length > 0 ? (
          <>
            
            {users.map(user => (
              <div 
                key={user.id}
                onClick={() => !updating && onTaskAssigneeSelect(user)}
                style={{
                  padding: "10px 12px",
                  cursor: updating ? "not-allowed" : "pointer",
                  backgroundColor: selectedUser?.id === user.id ? "#e3f2fd" : "transparent",
                  borderBottom: "1px solid #f5f5f5",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  opacity: updating ? 0.5 : 1,
                  transition: "background-color 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  if (!updating) {
                    e.currentTarget.style.backgroundColor = selectedUser?.id === user.id ? "#e3f2fd" : "#f5f5f5";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!updating) {
                    e.currentTarget.style.backgroundColor = selectedUser?.id === user.id ? "#e3f2fd" : "transparent";
                  }
                }}
              >
                <div style={{ 
                  width: "30px", 
                  height: "30px", 
                  borderRadius: "50%", 
                  backgroundColor: user.color || getRandomColor(user.id),
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "12px",
                  flexShrink: 0
                }}>
                  {getInitials(user.name)}
                </div>
                <span style={{ 
                  overflow: "hidden", 
                  textOverflow: "ellipsis", 
                  whiteSpace: "nowrap",
                  flex: 1
                }}>
                  {user.name}
                </span>
                {selectedUser?.id === user.id && (
                  <i className="fas fa-check" style={{ marginLeft: "auto", color: "#1976d2", flexShrink: 0 }}></i>
                )}
              </div>
            ))}
          </>
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
            <i className="fas fa-users" style={{ marginRight: "8px", fontSize: "24px", opacity: 0.5 }}></i>
            <div style={{ marginTop: "8px" }}>No users available</div>
          </div>
        )}
      </div>
      
    </div>
  );
};

// Status Popup Component
const StatusPopup = ({ 
  position, 
  taskStatuses, 
  selectedStatus, 
  onTaskStatusSelect,
  updating
}) => {
  const defaultStatuses = [
    { id: 1, name: "To Do", icon: "fa-circle", color: "#6c757d", bgColor: "#e9ecef" },
    { id: 2, name: "In Progress", icon: "fa-spinner", color: "#fd7e14", bgColor: "#fff3e0" },
    { id: 3, name: "Blocked", icon: "fa-exclamation-circle", color: "#dc3545", bgColor: "#f8d7da" },
    { id: 4, name: "Done", icon: "fa-check-circle", color: "#28a745", bgColor: "#d4edda" },
  ];

  const statuses = taskStatuses.length > 0 ? taskStatuses : defaultStatuses;

  return (
    <div
      className="status-popup-root"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 999999,
        backgroundColor: "#ffffff",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.2)",
        width: "200px",
        opacity: 1,
        color: "#333333",
        pointerEvents: updating ? "none" : "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {updating && (
        <div style={{ 
          position: "absolute", 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
          zIndex: 1
        }}>
          <i className="fas fa-spinner fa-spin" style={{ color: "#1976d2", fontSize: "24px" }}></i>
        </div>
      )}
      <div style={{ padding: "12px", borderBottom: "1px solid #eee", fontWeight: "bold" }}>
        Select Status
      </div>
      
      <div>
        {statuses.map(status => (
          <div 
            key={status.id}
            onClick={() => !updating && onTaskStatusSelect(status)}
            style={{
              padding: "10px 12px",
              cursor: updating ? "not-allowed" : "pointer",
              backgroundColor: selectedStatus?.id === status.id ? "#f8f9fa" : "transparent",
              borderBottom: "1px solid #f5f5f5",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              borderLeft: selectedStatus?.id === status.id ? `3px solid ${status.color}` : "3px solid transparent",
              opacity: updating ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!updating) {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
              }
            }}
            onMouseLeave={(e) => {
              if (!updating) {
                e.currentTarget.style.backgroundColor = selectedStatus?.id === status.id ? "#f8f9fa" : "transparent";
              }
            }}
          >
            <div style={{ 
              width: "20px", 
              height: "20px", 
              borderRadius: "4px", 
              backgroundColor: status.bgColor,
              color: status.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              flexShrink: 0
            }}>
              <i className={`fas ${status.icon}`}></i>
            </div>
            <span style={{ flex: 1 }}>{status.name}</span>
            {selectedStatus?.id === status.id && (
              <i className="fas fa-check" style={{ marginLeft: "auto", color: status.color, flexShrink: 0 }}></i>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

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

  // Check if this is a task
  const isTask = note.itemType === "Task";
  const taskName = note.title || note.note || ""; // Use title for task name, fallback to note

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
        {isTask && taskName && (
          <>
            <span style={{ margin: '0 4px', color: '#666', fontWeight: 'normal' }}>/</span>
            <span 
              className="task-name"
              style={{
                color: '#2c3e50',
                fontWeight: '700',
                fontSize: "12px",
                maxWidth: '150px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-block',
                verticalAlign: 'middle'
              }}
              title={taskName}
            >
              {taskName.length > 30 ? `${taskName.substring(0, 30)}...` : taskName}
            </span>
          </>
        )}
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

  // Check if this is a task
  const isTask = note.itemType === "Task";
  
  // For tasks, use description instead of title/note
  const contentToDisplay = isTask ? (note.description || "") : (note.note || "");

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
            __html: highlightHtmlContent(contentToDisplay, searchTerm),
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
  selectedDueDate,
  selectedAssignee,
  selectedStatus,
  onDueDateClick,
  onAssigneeClick,
  onStatusClick,
  calendarIconRef,
  assigneeIconRef,
  statusIconRef,
  updatingTask,
}) => {
  return (
    <div className="note-footer">
      <div className="note-attachments">
        {/* For tasks: only show task-related icons */}
        {isTask ? (
          <>
            <div ref={calendarIconRef} style={{ display: 'inline-block', position: 'relative' }}>
              <div 
                className={`task-icon-item ${selectedDueDate ? 'has-value' : ''} ${updatingTask ? 'updating' : ''}`}
                title="Due Date"
                onClick={onDueDateClick}
                style={{ opacity: updatingTask ? 0.5 : 1, cursor: updatingTask ? 'not-allowed' : 'pointer' }}
              >
                <i className="fas fa-calendar"></i>
              </div>
            </div>

            <div ref={assigneeIconRef} style={{ display: 'inline-block', position: 'relative' }}>
              <div 
                className={`task-icon-item ${selectedAssignee ? 'has-value' : ''} ${updatingTask ? 'updating' : ''}`}
                title="Assignee"
                onClick={onAssigneeClick}
                style={{ opacity: updatingTask ? 0.5 : 1, cursor: updatingTask ? 'not-allowed' : 'pointer' }}
              >
                <i className="fas fa-user"></i>
              </div>
            </div>

            <div ref={statusIconRef} style={{ display: 'inline-block', position: 'relative' }}>
              <div 
                className={`task-icon-item ${selectedStatus ? 'has-value' : ''} ${updatingTask ? 'updating' : ''}`}
                title="Status"
                onClick={onStatusClick}
                style={{ opacity: updatingTask ? 0.5 : 1, cursor: updatingTask ? 'not-allowed' : 'pointer' }}
              >
                <i className="fas fa-tasks"></i>
              </div>
            </div>
          </>
        ) : (
          /* For regular notes: show the original icons */
          <>
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
          </>
        )}
      </div>
      
      <div className="note-actions">
        {/* Priority indicator and action buttons are common for both types */}
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
    <i className="fas fa-paperclip" style={{ opacity: note.documentCount > 0 ? 1 : 0.3 }} />
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
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  refreshNotes: PropTypes.func,
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
  refreshNotes: () => {},
};

export default NoteCard;