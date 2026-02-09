import React from "react";
import PropTypes from "prop-types";
import TooltipPortal from "../Shared/TooltipPortal"; // Changed from named import
import { formatPriorityDate } from "../../utils/formatUtils";
import { PRIORITY_LABELS, PRIORITY_COLORS } from "../../utils/constants";

const PriorityTooltip = ({ noteId, position, data, loading }) => {
  if (!noteId || !position) return null;

  return (
    <TooltipPortal>
      <div
        className="priority-tooltip"
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
          maxWidth: "300px",
          minWidth: "250px",
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
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <i
            className="fas fa-flag"
            style={{
              color: data?.priorityValue ? PRIORITY_COLORS[data.priorityValue] : "#ccc",
            }}
          />
          {loading ? "Loading priority info..." : `Priority: ${data?.priorityText || "No priority"}`}
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
            Loading priority information...
          </div>
        ) : data?.hasPriority ? (
          <>
            <div
              style={{
                margin: "8px 0",
                color: "#555",
                lineHeight: 1.5,
                backgroundColor: "#f8f9fa",
                padding: "8px",
                borderRadius: "4px",
              }}
            >
              <div style={{ marginBottom: "4px" }}>
                <i
                  className="fas fa-user"
                  style={{
                    marginRight: "6px",
                    width: "12px",
                    color: "#7f8c8d",
                  }}
                />
                <strong>Set by:</strong> {data?.userName || "Unknown"}
              </div>
              <div style={{ marginBottom: "4px" }}>
                <i
                  className="fas fa-calendar-alt"
                  style={{
                    marginRight: "6px",
                    width: "12px",
                    color: "#7f8c8d",
                  }}
                />
                <strong>Date:</strong> {formatPriorityDate(data?.createdAt)}
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              color: "#95a5a6",
              fontStyle: "italic",
              padding: "16px",
              textAlign: "center",
              backgroundColor: "#f8f9fa",
              borderRadius: "4px",
            }}
          >
            <i
              className="fas fa-info-circle"
              style={{ marginRight: "8px", fontSize: "14px" }}
            />
            No priority set for this note
            <div
              style={{
                fontSize: "11px",
                marginTop: "4px",
                color: "#7f8c8d",
              }}
            >
              Click to set priority
            </div>
          </div>
        )}
      </div>
    </TooltipPortal>
  );
};

PriorityTooltip.propTypes = {
  noteId: PropTypes.string,
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  data: PropTypes.shape({
    priorityValue: PropTypes.number,
    priorityText: PropTypes.string,
    userName: PropTypes.string,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
    hasPriority: PropTypes.bool,
  }),
  loading: PropTypes.bool,
};

PriorityTooltip.defaultProps = {
  noteId: null,
  position: { x: 0, y: 0 },
  data: null,
  loading: false,
};

export default PriorityTooltip;