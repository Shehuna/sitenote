import React from "react";
import PropTypes from "prop-types";
import TooltipPortal from "../Shared/TooltipPortal";
import { highlightHtmlContent } from "../../utils/htmlUtils";

const NoteTextPopup = ({
  content,
  position,
  elementRect,
  searchTerm,
  onClose,
  viewMode,
}) => {
  if (!content || !position) return null;

  // Get popup width based on view mode
  const getPopupWidth = () => {
    switch (viewMode) {
      case "table":
        return "400px";
      case "cards":
        return "300px";
      case "stacked":
        return "350px";
      default:
        return "350px";
    }
  };

  const popupWidth = getPopupWidth();

  return (
    <TooltipPortal>
      <div
        className="note-text-popup"
        style={{
          position: "fixed",
          top: `${position.y}px`,
          left: `${position.x}px`,
          zIndex: 999999,
          backgroundColor: "white",
          border: "1px solid #e0e0e0",
          borderRadius: "6px",
          padding: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          width: popupWidth,
          maxWidth: popupWidth,
          fontSize: "13px",
          pointerEvents: "none",
          maxHeight: "200px", 
          overflowY: "auto", 
          opacity: "0.97"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            color: "#333",
            lineHeight: 1.5,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap", // Preserve whitespace and wrap text
          }}
          dangerouslySetInnerHTML={{
            __html: highlightHtmlContent(content, searchTerm),
          }}
        />
      </div>
    </TooltipPortal>
  );
};

NoteTextPopup.propTypes = {
  content: PropTypes.string,
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  elementRect: PropTypes.object,
  searchTerm: PropTypes.string,
  onClose: PropTypes.func,
  viewMode: PropTypes.string,
};

NoteTextPopup.defaultProps = {
  content: "",
  position: { x: 0, y: 0 },
  searchTerm: "",
  viewMode: "table",
};

export default NoteTextPopup;