// components/TaskCard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import { formatRelativeTime } from '../../utils/formatUtils';

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

const TaskCard = ({
  task,
  isExpanded,
  onToggle,
  onNotesToggle,
  hasNotes,
  children,
  // Task-specific props
  onTaskDueDateSelect,
  onTaskAssigneeSelect,
  onTaskStatusSelect,
  onAddNote,
  onEdit,
  onDelete,
  userId,
  refreshNotes,
}) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  
  // Task popup states
  const [showTaskDueDatePopup, setShowTaskDueDatePopup] = useState(false);
  const [showTaskAssigneePopup, setShowTaskAssigneePopup] = useState(false);
  const [showTaskStatusPopup, setShowTaskStatusPopup] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Initialize task data
  const [selectedDueDate, setSelectedDueDate] = useState(task.dueDate || null);
  const [selectedAssignee, setSelectedAssignee] = useState(
    task.assigneeId ? { id: task.assigneeId, name: task.assigneeName } : null
  );
  const [selectedStatus, setSelectedStatus] = useState(
    TASK_STATUS_MAP[task.status] || TASK_STATUS_MAP[1]
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

  const getStatusBadge = (status) => {
    const statusMap = {
      1: { label: 'To Do', color: '#c2c2c2' },
      2: { label: 'In Progress', color: '#ff8400' },
      3: { label: 'Blocked', color: '#dc3545' }, 
      4: { label: 'Done', color: '#28a745' },
    };
    return statusMap[status] || { label: 'Unknown', color: '#6c757d' };
  };

  const status = getStatusBadge(task.status);
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && task.status !== 2;

  const handleTaskToggle = (e) => {
    e.stopPropagation();
    onToggle(task.id);
  };

  const handleNotesToggle = (e) => {
    e.stopPropagation();
    const newState = !isNotesExpanded;
    setIsNotesExpanded(newState);
    if (onNotesToggle) {
      onNotesToggle(task.id, newState);
    }
  };

  

  // Function to update task with toast notifications
  const updateTask = useCallback(async (updates) => {
    if (!task.id) {
      console.error("No taskId found for task:", task);
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
        title: task.title || "",
        description: task.description || "",
        startDate: task.startDate || new Date().toISOString(),
        endDate: task.endDate || null,
        dueDate: selectedDueDate || null,
        assigneeId: currentAssigneeId || 0, // Always include assigneeId
        createdById: task.createdById || userId,
        jobId: task.jobId || 0,
        status: selectedStatus?.id || 1,
        ...updates // Override with any updates passed
      };

      // If this is an assignee update, use the new assigneeId
      if (updates.assigneeId !== undefined) {
        payload.assigneeId = updates.assigneeId;
      }

      console.log("Updating task with payload:", payload);

      const response = await fetch(`${apiUrl}/api/JobTasks/${task.id}`, {
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
        onTaskDueDateSelect(task, updates.dueDate);
      }
      if (updates.assigneeId !== undefined && onTaskAssigneeSelect) {
        onTaskAssigneeSelect(task, { id: updates.assigneeId });
      }
      if (updates.status !== undefined && onTaskStatusSelect) {
        onTaskStatusSelect(task, { id: updates.status });
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
  }, [task, selectedDueDate, selectedAssignee, selectedStatus, userId, apiUrl, onTaskDueDateSelect, onTaskAssigneeSelect, onTaskStatusSelect, refreshNotes]);

  // Function to fetch users
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

  // Function to render status icon based on status ID
  const renderStatusIcon = () => {
    const statusId = selectedStatus?.id;
    const color = selectedStatus?.color || '#6c757d';
    
    switch(statusId) {
      case 1: // To Do
        return <i className="fas fa-check" style={{ fontSize: '14px', color: color }}></i>;
      case 2: // In Progress
        return <i className="fas fa-check-double" style={{ fontSize: '14px', color: color }}></i>;
      case 3: // Blocked
        return <i className="fas fa-times" style={{ fontSize: '16px', color: color }}></i>;
      case 4: // Done
        return <i className="fas fa-check-circle" style={{ fontSize: '16px', color: color }}></i>;
      default:
        return <i className="fas fa-check" style={{ fontSize: '14px', color: '#6c757d' }}></i>;
    }
  };

  const handleAddNoteClick = (e) => {
    e.stopPropagation();
    if (onAddNote) {
      onAddNote(task);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(task);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(task.id);
    }
  };

  return (
    <>
      <div 
        className="task-card" 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e0e0e0',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <i className="fas fa-tasks" style={{ color: '#14A2B6' }} />
            <span style={{
              fontWeight: 600,
              fontSize: '14px',
              color: '#2c3e50',
            }}>
              {task.friendlyId || `Task #${task.id}`}
            </span>
          </div>
          <div style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: "#14A2B6",
            color: 'white',
          }}>
            {hasNotes || 0} Notes
          </div>
        </div>

        {/* Title */}
        <h4 style={{
          margin: '0 0 8px 0',
          fontSize: '16px',
          fontWeight: 600,
          color: '#333',
          lineHeight: '1.4',
        }}>
          {task.title}
        </h4>

        {/* Description (if exists) */}
        {task.description && (
          <p onClick={handleTaskToggle} style={{
            margin: '0 0 12px 0',
            fontSize: '13px',
            color: '#666',
            lineHeight: '1.5',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {task.description}
          </p>
        )}

        {/* Metadata */}
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #f0f0f0',
        }}>
          {/* Due Date */}
          {task.dueDate && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '6px',
              fontSize: '12px',
              color: isOverdue ? '#dc3545' : '#666',
            }}>
              <i className="fas fa-calendar-alt" style={{ fontSize: '11px' }} />
              <span>
                Due: {dueDate.toLocaleDateString()}
                {isOverdue && ' (Overdue)'}
              </span>
            </div>
          )}

          {/* Assignee */}
          {task.assigneeName && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '6px',
              fontSize: '12px',
              color: '#666',
            }}>
              <i className="fas fa-user" style={{ fontSize: '11px' }} />
              <span>Assignee: {task.assigneeName}</span>
            </div>
          )}

          {/* Created Info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#888',
          }}>
            <i className="fas fa-clock" style={{ fontSize: '10px' }} />
            <span>
              Created {task.createdAt ? formatRelativeTime(task.createdAt) : 'recently'}
            </span>
          </div>
        </div>

        {/* Actions Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: '1px dashed #e9ecef',
        }}>
          {/* Left side - Task icons (calendar, assignee, status) */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Calendar/Due Date Icon */}
            <div ref={calendarIconRef} style={{ display: 'inline-block', position: 'relative' }}>
              <div 
                className={`task-icon-item ${selectedDueDate ? 'has-value' : ''} ${updatingTask ? 'updating' : ''}`}
                title={selectedDueDate ? `Due: ${new Date(selectedDueDate).toLocaleDateString()}` : "Set Due Date"}
                onClick={handleDueDateClick}
                style={{ 
                  opacity: updatingTask ? 0.5 : 1, 
                  cursor: updatingTask ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  backgroundColor: selectedDueDate ? '#e3f2fd' : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fas fa-calendar" style={{ color: selectedDueDate ? '#1976d2' : '#666' }}></i>
              </div>
            </div>

            {/* Assignee Icon */}
            <div ref={assigneeIconRef} style={{ display: 'inline-block', position: 'relative' }}>
              <div 
                className={`task-icon-item ${selectedAssignee ? 'has-value' : ''} ${updatingTask ? 'updating' : ''}`}
                title={`Assignee: ${selectedAssignee?.name || 'Unassigned'}`}
                onClick={handleAssigneeClick}
                style={{ 
                  opacity: updatingTask ? 0.5 : 1, 
                  cursor: updatingTask ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  backgroundColor: selectedAssignee ? '#e3f2fd' : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fas fa-user" style={{ color: selectedAssignee ? '#1976d2' : '#666' }}></i>
              </div>
            </div>

            {/* Status Icon */}
            <div ref={statusIconRef} style={{ display: 'inline-block', position: 'relative' }}>
              <div 
                className={`task-icon-item ${selectedStatus ? 'has-value' : ''} ${updatingTask ? 'updating' : ''}`}
                title={`Status: ${selectedStatus?.name || 'To Do'}`}
                onClick={handleStatusClick}
                style={{ 
                  opacity: updatingTask ? 0.5 : 1, 
                  cursor: updatingTask ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  minWidth: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  backgroundColor: selectedStatus ? `${selectedStatus.bgColor}` : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                {renderStatusIcon()}
              </div>
            </div>
          </div>

          {/* Right side - Action icons (add note, edit, delete) */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={handleAddNoteClick}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#28a745',
                fontSize: '14px',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
              }}
              title="Add Note"
              className="action-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e8f5e9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <i className="fas fa-plus" />
            </button>

            <button
              onClick={handleEditClick}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#007bff',
                fontSize: '14px',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
              }}
              title="Edit Task"
              className="action-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e3f2fd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <i className="fas fa-edit" />
            </button>

            <button
              onClick={handleDeleteClick}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#dc3545',
                fontSize: '14px',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
              }}
              title="Delete Task"
              className="action-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ffebee';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <i className="fas fa-trash" />
            </button>
          </div>
        </div>
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
            taskStatuses={[]}
            selectedStatus={selectedStatus}
            onTaskStatusSelect={handleStatusSelect}
            updating={updatingTask}
          />
        )}
      </RootPortal>
    </>
  );
};

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
        maxHeight: "350px",
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
          users.map(user => (
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
          ))
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

  const statuses = taskStatuses && taskStatuses.length > 0 ? taskStatuses : defaultStatuses;

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

const styles = {
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    marginBottom: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef',
    overflow: 'hidden',
  },
  taskHeader: {
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e9ecef',
  },
  taskHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  expandIcon: {
    width: '20px',
    color: '#7f8c8d',
  },
  taskIcon: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: '6px',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  taskTitle: {
    fontWeight: 600,
    fontSize: '15px',
    color: '#2c3e50',
  },
  friendlyId: {
    fontSize: '11px',
    color: '#7f8c8d',
    backgroundColor: '#f0f0f0',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  taskDescription: {
    fontSize: '13px',
    color: '#666',
  },
  taskHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'white',
  },
  dueDate: {
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  notesToggleBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#3498db',
    position: 'relative',
    padding: '4px 8px',
  },
  notesCount: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#e74c3c',
    color: 'white',
    fontSize: '9px',
    fontWeight: 'bold',
    minWidth: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    padding: '16px',
  },
  taskDetails: {
    marginBottom: '16px',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#555',
  },
  detailIcon: {
    width: '14px',
    color: '#7f8c8d',
  },
  notesSection: {
    borderTop: '1px solid #e9ecef',
    paddingTop: '16px',
  },
  notesHeader: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#2c3e50',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
  },
  notesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
};

TaskCard.propTypes = {
  task: PropTypes.object.isRequired,
  isExpanded: PropTypes.bool,
  onToggle: PropTypes.func,
  onNotesToggle: PropTypes.func,
  hasNotes: PropTypes.number,
  children: PropTypes.node,
  searchTerm: PropTypes.string,
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
  renderStackedImageIcon: PropTypes.func,
  // Task-specific props
  onTaskDueDateSelect: PropTypes.func,
  onTaskAssigneeSelect: PropTypes.func,
  onTaskStatusSelect: PropTypes.func,
  onAddNote: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  refreshNotes: PropTypes.func,
};

TaskCard.defaultProps = {
  isExpanded: false,
  onToggle: () => {},
  onNotesToggle: () => {},
  hasNotes: 0,
  onTaskDueDateSelect: () => {},
  onTaskAssigneeSelect: () => {},
  onTaskStatusSelect: () => {},
  onAddNote: () => {},
  onEdit: () => {},
  onDelete: () => {},
  userId: null,
  refreshNotes: () => {},
};

export default TaskCard;