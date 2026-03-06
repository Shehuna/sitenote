// TaskCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { formatRelativeTime } from '../../utils/formatUtils';

const TaskCard = ({ task, onEdit, onDelete, onStatusChange, onClick }) => {
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

  const handleCardClick = (e) => {
    // Don't trigger if clicking on buttons or select
    if (e.target.tagName === 'BUTTON' || 
        e.target.tagName === 'SELECT' || 
        e.target.closest('button') || 
        e.target.closest('select') ||
        e.target.closest('.action-btn') ||
        e.target.closest('.attachment-btn')) {
      return;
    }
    if (onClick) {
      console.log('Task card clicked:', task.id, task.title);
      onClick(task);
    }
  };

  return (
    <div 
      className="task-card" 
      onClick={handleCardClick}
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
          backgroundColor: status.color,
          color: 'white',
        }}>
          {status.label}
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
        <p style={{
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
          onChange={(e) => onStatusChange(task.id, parseInt(e.target.value))}
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
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
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
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
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

TaskCard.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.number.isRequired,
    dueDate: PropTypes.string,
    assigneeName: PropTypes.string,
    friendlyId: PropTypes.string,
    createdAt: PropTypes.string,
  }).isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onStatusChange: PropTypes.func,
  onClick: PropTypes.func, // Added onClick prop
};

TaskCard.defaultProps = {
  onEdit: () => {},
  onDelete: () => {},
  onStatusChange: () => {},
  onClick: () => {}, // Added default
};

export default TaskCard;

