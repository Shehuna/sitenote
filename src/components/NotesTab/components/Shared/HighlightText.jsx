import React from "react";
import PropTypes from "prop-types";

const HighlightText = ({ text, highlight }) => {
  if (!highlight || !text || typeof text !== "string") {
    return <span>{text}</span>;
  }

  try {
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedHighlight})`, "gi");
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, index) => {
          const match = part.toLowerCase() === highlight.toLowerCase();
          
          return match ? (
            <mark
              key={index}
              className="search-highlight"
              style={{
                backgroundColor: "#ffeb3b",
                padding: "0 2px",
                borderRadius: "2px",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          );
        })}
      </span>
    );
  } catch (error) {
    console.error("Error highlighting text:", error);
    return <span>{text}</span>;
  }
};

HighlightText.propTypes = {
  text: PropTypes.string,
  highlight: PropTypes.string,
};

HighlightText.defaultProps = {
  text: "",
  highlight: "",
};

export default HighlightText;