import { useState, useRef, useCallback } from "react";

export const useNoteHover = ({ viewMode }) => {
  const [hoveredNoteContent, setHoveredNoteContent] = useState(null);
  const [notePopupPosition, setNotePopupPosition] = useState({ x: 0, y: 0 });
  const [noteElementRect, setNoteElementRect] = useState(null);
  const noteHoverTimeoutRef = useRef(null);

  const shouldShowNotePopup = useCallback((note) => {
    if (!note || !note.note) return false;

    if (viewMode === "table") {
      return note.note.length > 69;
    } else if (viewMode === "cards" || viewMode === "stacked") {
      return note.note.length > 120;
    }

    return false;
  }, [viewMode]);

  const handleNoteTextMouseEnter = useCallback((note, e) => {
    if (!note || !shouldShowNotePopup(note)) {
      return;
    }

    // Clear any existing timeout
    if (noteHoverTimeoutRef.current) {
      clearTimeout(noteHoverTimeoutRef.current);
    }

    // Get the element and its position
    const noteTextElement = e.currentTarget;
    const rect = noteTextElement.getBoundingClientRect();

    // Store element rect for positioning
    setNoteElementRect(rect);

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Popup dimensions - START INSIDE THE NOTES CONTAINER
    const popupWidth = viewMode === "table" ? 400 : 350;
    const popupHeight = 200;

    // Calculate position to start INSIDE the notes container
    // Position popup inside the note element, not outside
    let popupX, popupY;

    // For table view, position inside the table cell
    if (viewMode === "table") {
      // Position inside the table cell, aligned with the text
      popupX = rect.left + 5;
      popupY = rect.top + 5;
    }
    // For card view, position inside the card
    else if (viewMode === "cards" || viewMode === "stacked") {
      // Position inside the card, slightly offset from the top
      popupX = rect.left + 10;
      popupY = rect.top + 10;
    }
    // Default fallback
    else {
      popupX = rect.left;
      popupY = rect.top;
    }

    // Ensure popup stays within the note element bounds
    // Don't let it extend beyond the right edge of the note element
    if (popupX + popupWidth > rect.right) {
      popupX = rect.right - popupWidth - 10;
    }

    // Ensure popup stays within the note element bounds vertically
    if (popupY + popupHeight > rect.bottom) {
      popupY = rect.bottom - popupHeight - 10;
    }

    // Final bounds check against viewport
    popupX = Math.max(10, Math.min(popupX, viewportWidth - popupWidth - 10));
    popupY = Math.max(10, Math.min(popupY, viewportHeight - popupHeight - 10));

    setNotePopupPosition({
      x: popupX,
      y: popupY,
    });

    // Set timeout for hover delay (300ms)
    noteHoverTimeoutRef.current = setTimeout(() => {
      setHoveredNoteContent(note.note);
    }, 300);
  }, [viewMode, shouldShowNotePopup]);

  const handleNoteTextMouseLeave = useCallback(() => {
    if (noteHoverTimeoutRef.current) {
      clearTimeout(noteHoverTimeoutRef.current);
    }
    setHoveredNoteContent(null);
    setNoteElementRect(null);
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (noteHoverTimeoutRef.current) {
      clearTimeout(noteHoverTimeoutRef.current);
    }
  }, []);

  return {
    hoveredNoteContent,
    notePopupPosition,
    noteElementRect,
    shouldShowNotePopup,
    handleNoteTextMouseEnter,
    handleNoteTextMouseLeave,
    cleanup,
  };
};