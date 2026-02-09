import React from "react";
import PropTypes from "prop-types";
import TooltipPortal from "../Shared/TooltipPortal"; // Changed from named import
import { formatTooltipContent, getFullDate } from "../../utils/formatUtils";

const LinkedNoteTooltip = ({ noteId, originalNoteId, position, content, loading }) => {
  if (!noteId || !originalNoteId || !position) return null;

  const noteContent = content[originalNoteId];

  return (
    <TooltipPortal>
      <div
        className="linked-note-tooltip"
        style={{
          position: "fixed",
          top: `${position.y}px`,
          left: `${position.x}px`,
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
          Linked to Original Note #{originalNoteId}
        </div>

        {loading ? (
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
        ) : noteContent ? (
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
              <strong>Content:</strong> {formatTooltipContent(noteContent.content)}
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
                <strong>By:</strong> {noteContent.userName}
              </div>
              <div style={{ marginBottom: "4px" }}>
                <i
                  className="far fa-clock"
                  style={{ marginRight: "6px", width: "12px" }}
                />
                <strong>Date:</strong> {getFullDate(noteContent.date)}{" "}
                {new Date(noteContent.date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              
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
          Click to jump to original note...
        </div>

        {/* Arrow pointing to the mouse */}
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
  );
};

LinkedNoteTooltip.propTypes = {
  noteId: PropTypes.string,
  originalNoteId: PropTypes.string,
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  content: PropTypes.object,
  loading: PropTypes.bool,
};

LinkedNoteTooltip.defaultProps = {
  noteId: null,
  originalNoteId: null,
  position: { x: 0, y: 0 },
  content: {},
  loading: false,
};

export default LinkedNoteTooltip;