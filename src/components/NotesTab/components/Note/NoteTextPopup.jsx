import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import { highlightHtmlContent } from "../../utils/htmlUtils";

const NoteTextPopup = ({
  content,
  position,
  searchTerm,
  viewMode,
  onMouseEnter,
  onMouseLeave,
}) => {
  const popupRef = useRef(null);

  if (!content) return null;

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

  return ReactDOM.createPortal(
    <div
      ref={popupRef}
      className="note-text-popup"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
        pointerEvents: "auto", // Important: allow interaction
        maxHeight: "200px",
        overflowY: "auto",
        opacity: 1,
        userSelect: "text", // Allow text selection
        cursor: "text", // Show text cursor
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          color: "#333",
          lineHeight: 1.5,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
        dangerouslySetInnerHTML={{
          __html: highlightHtmlContent(content, searchTerm),
        }}
      />
    </div>,
    document.body
  );
};

NoteTextPopup.propTypes = {
  content: PropTypes.string,
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  searchTerm: PropTypes.string,
  viewMode: PropTypes.string,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
};

NoteTextPopup.defaultProps = {
  content: "",
  position: { x: 0, y: 0 },
  searchTerm: "",
  viewMode: "table",
  onMouseEnter: () => {},
  onMouseLeave: () => {},
};

export default NoteTextPopup;