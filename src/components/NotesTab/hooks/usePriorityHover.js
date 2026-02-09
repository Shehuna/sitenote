import { useState, useRef, useCallback } from "react";

export const usePriorityHover = ({ fetchPriorityData, priorityTooltipData }) => {
  const [hoveredPriorityNote, setHoveredPriorityNote] = useState(null);
  const [priorityTooltipPosition, setPriorityTooltipPosition] = useState({ x: 0, y: 0 });
  const priorityHoverTimeoutRef = useRef(null);

  const handlePriorityMouseEnter = useCallback((note, e) => {
    if (e) {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Tooltip dimensions
      const tooltipWidth = 300;
      const tooltipHeight = 150;

      let x, y;

      // Check if there's enough space on the right of the mouse
      if (mouseX + tooltipWidth + 10 <= viewportWidth) {
        x = mouseX + 10;
      } else if (mouseX - tooltipWidth - 10 >= 0) {
        x = mouseX - tooltipWidth - 10;
      } else {
        x = Math.max(10, viewportWidth - tooltipWidth - 10);
      }

      // Vertical positioning
      y = mouseY + 15;

      // Adjust if tooltip goes off screen vertically
      if (y + tooltipHeight > viewportHeight) {
        y = mouseY - tooltipHeight - 10;
      }

      // Ensure positions are within bounds
      x = Math.max(10, Math.min(x, viewportWidth - tooltipWidth - 10));
      y = Math.max(10, Math.min(y, viewportHeight - tooltipHeight - 10));

      setPriorityTooltipPosition({ x, y });
    }

    // Clear any existing timeout
    if (priorityHoverTimeoutRef.current) {
      clearTimeout(priorityHoverTimeoutRef.current);
    }

    // Set timeout for hover delay (500ms)
    priorityHoverTimeoutRef.current = setTimeout(() => {
      setHoveredPriorityNote(note.id);

      // Fetch priority data if not already loaded
      if (!priorityTooltipData[note.id]) {
        fetchPriorityData(note.id);
      }
    }, 500);
  }, [fetchPriorityData, priorityTooltipData]);

  const handlePriorityMouseLeave = useCallback(() => {
    if (priorityHoverTimeoutRef.current) {
      clearTimeout(priorityHoverTimeoutRef.current);
    }
    setHoveredPriorityNote(null);
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (priorityHoverTimeoutRef.current) {
      clearTimeout(priorityHoverTimeoutRef.current);
    }
  }, []);

  return {
    hoveredPriorityNote,
    priorityTooltipPosition,
    handlePriorityMouseEnter,
    handlePriorityMouseLeave,
    cleanup,
  };
};