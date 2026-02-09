import React from "react";
import PropTypes from "prop-types";
import { PRIORITY_COLORS, PRIORITY_VALUES } from "../../utils/constants";

const PriorityIndicator = ({
  priorityValue,
  note,
  onClick,
  onMouseEnter,
  onMouseLeave,
  size = "medium",
  showFlag = true,
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return { fontSize: "10px", width: "16px", height: "16px" };
      case "medium":
        return { fontSize: "12px", width: "20px", height: "20px" };
      case "large":
        return { fontSize: "14px", width: "24px", height: "24px" };
      default:
        return { fontSize: "12px", width: "20px", height: "20px" };
    }
  };

  const sizeStyles = getSizeStyles();
  const color = PRIORITY_COLORS[priorityValue] || "#ccc";
  const hasPriority = priorityValue > 1;

/*   const getPriorityTitle = () => {
    if (priorityValue === PRIORITY_VALUES.HIGH) return "High Priority";
    if (priorityValue === PRIORITY_VALUES.MEDIUM) return "Medium Priority";
    if (priorityValue === PRIORITY_VALUES.COMPLETED) return "Completed";
    return "No priority set";
  }; */

  if (showFlag) {
    return (
      <i
        className="fas fa-flag"
        style={{
          cursor: "pointer",
          color,
          opacity: hasPriority ? 1 : 0.5,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          ...sizeStyles,
          transition: "all 0.2s ease",
        }}
        //title={getPriorityTitle()}
        onClick={(e) => onClick && onClick(note, e)}
        onMouseEnter={(e) => {
          if (onMouseEnter) onMouseEnter(note, e);
          if (hasPriority) {
            e.currentTarget.style.opacity = "0.9";
            e.currentTarget.style.transform = "scale(1.1)";
          }
        }}
        onMouseLeave={(e) => {
          if (onMouseLeave) onMouseLeave();
          e.currentTarget.style.opacity = hasPriority ? 1 : 0.5;
          e.currentTarget.style.transform = "scale(1)";
        }}
      />
    );
  }

  // Alternative: Priority dot
  return (
    <div
      className={`priority-dot priority-dot-${priorityValue}`}
      style={{
        width: sizeStyles.width,
        height: sizeStyles.height,
        borderRadius: "50%",
        backgroundColor: color,
        cursor: "pointer",
        opacity: hasPriority ? 1 : 0.5,
        transition: "all 0.2s ease",
      }}
      //title={getPriorityTitle()}
      onClick={(e) => onClick && onClick(note, e)}
      onMouseEnter={(e) => {
        if (onMouseEnter) onMouseEnter(note, e);
        if (hasPriority) {
          e.currentTarget.style.opacity = "0.9";
          e.currentTarget.style.transform = "scale(1.1)";
        }
      }}
      onMouseLeave={(e) => {
        if (onMouseLeave) onMouseLeave();
        e.currentTarget.style.opacity = hasPriority ? 1 : 0.5;
        e.currentTarget.style.transform = "scale(1)";
      }}
    />
  );
};

PriorityIndicator.propTypes = {
  priorityValue: PropTypes.number.isRequired,
  note: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  showFlag: PropTypes.bool,
};

PriorityIndicator.defaultProps = {
  size: "medium",
  showFlag: true,
};

export default PriorityIndicator;