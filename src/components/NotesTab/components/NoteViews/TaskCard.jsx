// components/TaskCard.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { formatRelativeTime } from '../../utils/formatUtils';

const TaskCard = ({
  task,
  isExpanded,
  onToggle,
  onNotesToggle,
  hasNotes,
  children,
}) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

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


  return (
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
          12 Notes
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

      {/* Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        marginTop: '12px',
        paddingTop: '8px',
        borderTop: '1px dashed #e9ecef',
      }}>
        {/* Status dropdown */}
        <select
          value={task.status}
         // onChange={(e) => onStatusChange(task.id, parseInt(e.target.value))}
          onClick={(e) => e.stopPropagation()}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '12px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          <option value={1}>To Do</option>
          <option value={2}>In Progress</option>
          <option value={3}>Blocked</option>
          <option value={4}>Done</option>
        </select>

        <button
         /*  onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }} */
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#007bff',
            fontSize: '14px',
            padding: '4px 8px',
          }}
          title="Edit task"
          className="action-btn"
        >
          <i className="fas fa-edit" />
        </button>

        <button
          /* onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }} */
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#dc3545',
            fontSize: '14px',
            padding: '4px 8px',
          }}
          title="Delete task"
          className="action-btn"
        >
          <i className="fas fa-trash" />
        </button>
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
};

TaskCard.defaultProps = {
  isExpanded: false,
  onToggle: () => {},
  onNotesToggle: () => {},
  hasNotes: 0,
};

export default TaskCard;