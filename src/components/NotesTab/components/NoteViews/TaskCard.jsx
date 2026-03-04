// components/TaskCard.js
import React from 'react';
import PropTypes from 'prop-types';
import { formatRelativeTime } from '../../utils/formatUtils';

const TaskCard = ({ task, onClick }) => {
  const getStatusBadge = (status) => {
    switch(status) {
      case 0: return { text: 'Pending', color: '#f39c12' };
      case 1: return { text: 'Active', color: '#2ecc71' };
      case 2: return { text: 'In Progress', color: '#3498db' };
      case 3: return { text: 'Review', color: '#9b59b6' };
      case 4: return { text: 'Blocked', color: '#e74c3c' };
      default: return { text: 'Unknown', color: '#95a5a6' };
    }
  };

  const status = getStatusBadge(task.status);

  return (
    <div
      className="task-card"
      onClick={onClick}
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "12px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        border: "1px solid #e9ecef",
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Status indicator line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          backgroundColor: status.color,
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginLeft: "4px" }}>
        {/* Task icon */}
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            backgroundColor: "#f39c12",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontWeight: "bold",
            flexShrink: 0,
          }}
        >
          <i className="fas fa-tasks" />
        </div>

        {/* Task content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title and status row */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            marginBottom: "6px",
            flexWrap: "wrap"
          }}>
            <span style={{ 
              fontWeight: 600, 
              color: "#2c3e50",
              fontSize: "15px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "200px",
            }} title={task.title}>
              {task.title}
            </span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: `${status.color}20`,
                color: status.color,
                fontWeight: 500,
              }}
            >
              {status.text}
            </span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: "#f0f0f0",
                color: "#666",
              }}
            >
              {task.friendlyId}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <p style={{ 
              fontSize: "13px", 
              color: "#666", 
              margin: "8px 0",
              lineHeight: "1.5",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>
              {task.description}
            </p>
          )}

          {/* Meta information */}
          <div style={{ 
            display: "flex", 
            gap: "16px", 
            fontSize: "12px", 
            color: "#888", 
            marginTop: "8px",
            borderTop: "1px solid #f0f0f0",
            paddingTop: "8px",
            flexWrap: "wrap"
          }}>
            {task.assigneeName && (
              <span>
                <i className="fas fa-user" style={{ marginRight: "4px" }} />
                {task.assigneeName}
              </span>
            )}
            {task.dueDate && (
              <span>
                <i className="fas fa-calendar" style={{ marginRight: "4px" }} />
                Due: {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            {task.createdAt && (
              <span>
                <i className="fas fa-clock" style={{ marginRight: "4px" }} />
                {formatRelativeTime(task.createdAt)}
              </span>
            )}
          </div>

          {/* Subtle hint that this is clickable */}
          <div style={{ 
            marginTop: "8px", 
            fontSize: "11px", 
            color: "#999",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "4px"
          }}>
            <span>Click to view notes</span>
            <i className="fas fa-chevron-right" style={{ fontSize: "10px" }} />
          </div>
        </div>
      </div>
    </div>
  );
};

TaskCard.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    friendlyId: PropTypes.string,
    assigneeName: PropTypes.string,
    dueDate: PropTypes.string,
    createdAt: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default TaskCard;