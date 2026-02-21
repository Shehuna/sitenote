import React, { useEffect, useRef, useState } from "react";
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
  const [isVisible, setIsVisible] = useState(true);
  const popupRef = useRef(null);

  if (!content || !isVisible) return null;

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

  const handleClose = (e) => {
    e.stopPropagation();
    setIsVisible(false);
  };

  // Check if device is mobile/small screen
  const isSmallDevice = () => {
    return window.innerWidth <= 768; // You can adjust this breakpoint
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
        pointerEvents: "auto", 
        maxHeight: "200px",
        overflowY: "auto",
        opacity: 1,
        userSelect: "text", 
        cursor: "text", 
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close button - only shown on small devices */}
      {isSmallDevice() && (
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            color: "#666",
            fontSize: "18px",
            lineHeight: 1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            transition: "all 0.2s ease",
            zIndex: 1000,
            fontWeight: "bold",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
            e.currentTarget.style.color = "#000";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#666";
          }}
          aria-label="Close popup"
        >
          ×
        </button>
      )}
      
      <div
        style={{
          color: "#333",
          lineHeight: 1.5,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          paddingRight: isSmallDevice() ? "24px" : "0", // Only add padding on small devices
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