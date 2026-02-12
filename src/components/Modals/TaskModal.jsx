import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import "./TaskModal.css";

const TaskModal = ({
  isOpen,
  onClose,
  jobId,
  jobName,
  onSaveTask,
  isLoading = false,
}) => {
  const [taskData, setTaskData] = useState({
    taskId: "",
    taskName: "",
  });
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedDueDate, setSelectedDueDate] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const [userPopupPosition, setUserPopupPosition] = useState({ top: 0, left: 0 });
  const [statusPopupPosition, setStatusPopupPosition] = useState({ top: 0, left: 0 });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const modalRef = useRef(null);
  const headerRef = useRef(null);
  const calendarRef = useRef(null);
  const calendarIconRef = useRef(null);
  const userIconRef = useRef(null);
  const userPopupRef = useRef(null);
  const statusIconRef = useRef(null);
  const statusPopupRef = useRef(null);

  // Dummy users data
  const dummyUsers = [
    { id: 1, name: "Binyam Daniel", avatar: "BD", color: "#1976d2" },
    { id: 2, name: "Daniel Leul", avatar: "DL", color: "#dc3545" },
    { id: 3, name: "Shimeles String", avatar: "SS", color: "#28a745" },
    { id: 4, name: "Shehun Ayele", avatar: "SA", color: "#fd7e14" },
    { id: 5, name: "Bitanya Nigussie", avatar: "BN", color: "#6f42c1" },
    { id: 6, name: "Test User", avatar: "TU", color: "#20c997" },
  ];

  // Dummy status data
  const dummyStatuses = [
    { id: 1, name: "To Do", icon: "fa-circle", color: "#6c757d", bgColor: "#e9ecef" },
    { id: 2, name: "In Progress", icon: "fa-spinner", color: "#fd7e14", bgColor: "#fff3e0" },
    { id: 3, name: "Blocked", icon: "fa-exclamation-circle", color: "#dc3545", bgColor: "#f8d7da" },
    { id: 4, name: "Done", icon: "fa-check-circle", color: "#28a745", bgColor: "#d4edda" },
    { id: 5, name: "Approved", icon: "fa-check-double", color: "#1976d2", bgColor: "#e3f2fd" },
  ];

  // Initialize modal position
  useEffect(() => {
    if (isOpen) {
      const centerX = window.innerWidth / 2 - 200;
      const centerY = window.innerHeight / 2 - 150;
      setPosition({ x: centerX, y: centerY });
      
      setTaskData({
        taskId: "",
        taskName: "",
      });
      setSelectedDueDate(null);
      setSelectedUser(null);
      setSelectedStatus(null);
      setShowCalendar(false);
      setShowUserPopup(false);
      setShowStatusPopup(false);
      setCurrentMonth(new Date());
      setErrors({});
    }
  }, [isOpen]);

  // Handle click outside to close popups
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Calendar click outside
      if (calendarRef.current && !calendarRef.current.contains(e.target) && 
          calendarIconRef.current && !calendarIconRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
      
      // User popup click outside
      if (userPopupRef.current && !userPopupRef.current.contains(e.target) && 
          userIconRef.current && !userIconRef.current.contains(e.target)) {
        setShowUserPopup(false);
      }
      
      // Status popup click outside
      if (statusPopupRef.current && !statusPopupRef.current.contains(e.target) && 
          statusIconRef.current && !statusIconRef.current.contains(e.target)) {
        setShowStatusPopup(false);
      }
    };

    if (showCalendar || showUserPopup || showStatusPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar, showUserPopup, showStatusPopup]);

  // Handle mouse down for dragging
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (headerRef.current && headerRef.current.contains(e.target)) {
        setIsDragging(true);
        const rect = modalRef.current.getBoundingClientRect();
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        e.preventDefault();
      }
    };

    const handleMouseMove = (e) => {
      if (isDragging && modalRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        const maxX = window.innerWidth - modalRef.current.offsetWidth;
        const maxY = window.innerHeight - modalRef.current.offsetHeight;
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleMouseDown);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      
      return () => {
        document.removeEventListener("mousedown", handleMouseDown);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isOpen, isDragging, dragOffset]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!taskData.taskId.trim()) {
      newErrors.taskId = "Task ID is required";
    }
    
    if (!taskData.taskName.trim()) {
      newErrors.taskName = "Task Name is required";
    }
    
    return newErrors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSave = () => {
    const validationErrors = validateForm();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    if (onSaveTask) {
      onSaveTask({
        ...taskData,
        jobId: jobId,
        jobName: jobName,
        dueDate: selectedDueDate,
        assignee: selectedUser,
        status: selectedStatus
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Calendar positioning - exactly above the icon
  const toggleCalendar = (e) => {
    e.stopPropagation();
    
    if (!showCalendar && calendarIconRef.current && modalRef.current) {
      setShowUserPopup(false);
      setShowStatusPopup(false);
      
      const iconRect = calendarIconRef.current.getBoundingClientRect();
      const modalRect = modalRef.current.getBoundingClientRect();
      const calendarHeight = 280;
      
      setCalendarPosition({
        top: iconRect.top - modalRect.top - calendarHeight - 5,
        left: iconRect.left - modalRect.left
      });
    }
    
    setShowCalendar(!showCalendar);
  };

  // User popup positioning - exactly like calendar (above the icon)
  const toggleUserPopup = (e) => {
    e.stopPropagation();
    
    if (!showUserPopup && userIconRef.current && modalRef.current) {
      setShowCalendar(false);
      setShowStatusPopup(false);
      
      const iconRect = userIconRef.current.getBoundingClientRect();
      const modalRect = modalRef.current.getBoundingClientRect();
      const popupHeight = 280;
      
      setUserPopupPosition({
        top: iconRect.top - modalRect.top - popupHeight - 5,
        left: iconRect.left - modalRect.left
      });
    }
    
    setShowUserPopup(!showUserPopup);
  };

  // Status popup positioning - exactly like calendar and user popup
  const toggleStatusPopup = (e) => {
    e.stopPropagation();
    
    if (!showStatusPopup && statusIconRef.current && modalRef.current) {
      setShowCalendar(false);
      setShowUserPopup(false);
      
      const iconRect = statusIconRef.current.getBoundingClientRect();
      const modalRect = modalRef.current.getBoundingClientRect();
      const popupHeight = 280;
      
      setStatusPopupPosition({
        top: iconRect.top - modalRect.top - popupHeight - 5,
        left: iconRect.left - modalRect.left
      });
    }
    
    setShowStatusPopup(!showStatusPopup);
  };

  const handleDateSelect = (date) => {
    setSelectedDueDate(date);
    setShowCalendar(false);
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setShowUserPopup(false);
  };

  const handleStatusSelect = (status) => {
    setSelectedStatus(status);
    setShowStatusPopup(false);
  };

  // Calendar navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
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
          style={isDisabled ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
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
          style={isDisabled ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
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

  if (!isOpen) return null;

  return (
    <div className="task-modal-overlay">
      <div 
        ref={modalRef}
        className={`task-modal ${isDragging ? 'dragging' : ''}`}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(0, 0)',
          zIndex: 1000,
        }}
        onKeyDown={handleKeyDown}
      >
        <div 
          ref={headerRef}
          className="task-modal-header"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <h3>New Task</h3>
          <button 
            className="close-button"
            onClick={onClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className="task-modal-content">
          <div className="form-group">
            <label htmlFor="taskId">
              Task ID *
              {errors.taskId && (
                <span className="error-message"> - {errors.taskId}</span>
              )}
            </label>
            <input
              type="text"
              id="taskId"
              name="taskId"
              value={taskData.taskId}
              onChange={handleInputChange}
              placeholder="Enter Task ID"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="taskName">
              Task Name *
              {errors.taskName && (
                <span className="error-message"> - {errors.taskName}</span>
              )}
            </label>
            <input
              type="text"
              id="taskName"
              name="taskName"
              value={taskData.taskName}
              onChange={handleInputChange}
              placeholder="Enter Task Name"
              disabled={isLoading}
            />
          </div>

          {/* Icons section */}
          <div className="task-icons-section">
            <div 
              className={`task-icon-item ${selectedDueDate ? 'has-value' : ''}`}
              title="Due Date"
              onClick={toggleCalendar}
              ref={calendarIconRef}
            >
              <i className="fas fa-calendar"></i>
              {selectedDueDate && (
                <span className="icon-value">
                  {selectedDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            
            <div 
              className={`task-icon-item ${selectedUser ? 'has-value' : ''}`}
              title="Assignee"
              onClick={toggleUserPopup}
              ref={userIconRef}
            >
              <i className="fas fa-user"></i>
              {selectedUser && (
                <span className="icon-value user-avatar-small" style={{ backgroundColor: selectedUser.color }}>
                  {selectedUser.avatar}
                </span>
              )}
            </div>
            
            <div 
              className={`task-icon-item ${selectedStatus ? 'has-value' : ''}`}
              title="Status"
              onClick={toggleStatusPopup}
              ref={statusIconRef}
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
          </div>

          {/* Calendar Popup */}
          {showCalendar && (
            <div 
              className="calendar-popup" 
              ref={calendarRef}
              style={{
                position: 'absolute',
                top: `${calendarPosition.top}px`,
                left: `${calendarPosition.left}px`
              }}
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
                      setSelectedDueDate(null);
                      setShowCalendar(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* User Selection Popup */}
          {showUserPopup && (
            <div 
              className="user-popup" 
              ref={userPopupRef}
              style={{
                position: 'absolute',
                top: `${userPopupPosition.top}px`,
                left: `${userPopupPosition.left}px`
              }}
            >
              <div className="user-popup-header">
                <span className="user-popup-title">Select Assignee</span>
              </div>
              
              <div className="user-list-container">
                {dummyUsers.map(user => (
                  <div 
                    key={user.id}
                    className={`user-item ${selectedUser?.id === user.id ? 'selected' : ''}`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="user-avatar" style={{ backgroundColor: user.color }}>
                      {user.avatar}
                    </div>
                    <div className="user-name">{user.name}</div>
                    {selectedUser?.id === user.id && (
                      <i className="fas fa-check user-check-icon"></i>
                    )}
                  </div>
                ))}
              </div>
              
              {selectedUser && (
                <div className="user-popup-footer">
                  <button 
                    className="clear-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUser(null);
                      setShowUserPopup(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Status Selection Popup */}
          {showStatusPopup && (
            <div 
              className="status-popup" 
              ref={statusPopupRef}
              style={{
                position: 'absolute',
                top: `${statusPopupPosition.top}px`,
                left: `${statusPopupPosition.left}px`
              }}
            >
              <div className="status-popup-header">
                <span className="status-popup-title">Select Status</span>
              </div>
              
              <div className="status-list-container">
                {dummyStatuses.map(status => (
                  <div 
                    key={status.id}
                    className={`status-item ${selectedStatus?.id === status.id ? 'selected' : ''}`}
                    onClick={() => handleStatusSelect(status)}
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
                      setSelectedStatus(null);
                      setShowStatusPopup(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="task-modal-footer">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="save-button"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} />
                Saving...
              </>
            ) : (
              "Save Task"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

TaskModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  jobId: PropTypes.string,
  jobName: PropTypes.string,
  onSaveTask: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

TaskModal.defaultProps = {
  jobId: '',
  jobName: '',
  isLoading: false,
};

export default TaskModal;