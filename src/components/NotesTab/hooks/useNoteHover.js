import { useState, useRef, useCallback, useEffect } from "react";

export const useNoteHover = ({ viewMode }) => {
  const [hoveredNoteContent, setHoveredNoteContent] = useState(null);
  const [hoveredNoteId, setHoveredNoteId] = useState(null);
  const [notePopupPosition, setNotePopupPosition] = useState({ x: 0, y: 0 });
  const [noteElementRect, setNoteElementRect] = useState(null);
  const noteHoverTimeoutRef = useRef(null);
  const isMouseInsidePopupRef = useRef(false);
  const isMouseInsideNoteRef = useRef(false);

  const shouldShowNotePopup = useCallback((note) => {
    if (!note || !note.note) return false;

    if (viewMode === "table") {
      return note.note.length > 69;
    } else if (viewMode === "cards" || viewMode === "stacked") {
      return note.note.length > 120;
    }

    return false;
  }, [viewMode]);

  const calculatePopupPosition = useCallback((elementRect, viewMode) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Popup dimensions
    const popupWidth = viewMode === "table" ? 400 : 350;
    const popupHeight = 300; // Match the maxHeight from CSS

    // Calculate position - start inside the note element
    let popupX, popupY;

    if (viewMode === "table") {
      popupX = elementRect.left + 5;
      popupY = elementRect.top + 5;
    } else {
      popupX = elementRect.left + 10;
      popupY = elementRect.top + 10;
    }

    // Keep popup within viewport bounds
    popupX = Math.max(10, Math.min(popupX, viewportWidth - popupWidth - 10));
    popupY = Math.max(10, Math.min(popupY, viewportHeight - popupHeight - 10));

    return { x: popupX, y: popupY };
  }, []);

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

    // Store hover state
    isMouseInsideNoteRef.current = true;
    setHoveredNoteId(note.id);
    setNoteElementRect(rect);

    // Set timeout for hover delay (300ms)
    noteHoverTimeoutRef.current = setTimeout(() => {
      // Only show popup if mouse is still inside the note and not inside popup
      if (isMouseInsideNoteRef.current && !isMouseInsidePopupRef.current) {
        const position = calculatePopupPosition(rect, viewMode);
        setNotePopupPosition(position);
        setHoveredNoteContent(note.note);
      }
    }, 300);
  }, [viewMode, shouldShowNotePopup, calculatePopupPosition]);

  const handleNoteTextMouseLeave = useCallback(() => {
    isMouseInsideNoteRef.current = false;
    
    // Don't clear immediately - give user time to move to popup
    setTimeout(() => {
      if (!isMouseInsidePopupRef.current && !isMouseInsideNoteRef.current) {
        if (noteHoverTimeoutRef.current) {
          clearTimeout(noteHoverTimeoutRef.current);
        }
        setHoveredNoteContent(null);
        setHoveredNoteId(null);
        setNoteElementRect(null);
      }
    }, 100);
  }, []);

  // New handler for popup mouse enter/leave
  const handlePopupMouseEnter = useCallback(() => {
    isMouseInsidePopupRef.current = true;
  }, []);

  const handlePopupMouseLeave = useCallback(() => {
    isMouseInsidePopupRef.current = false;
    // Close popup when mouse leaves both note and popup
    if (!isMouseInsideNoteRef.current) {
      setHoveredNoteContent(null);
      setHoveredNoteId(null);
      setNoteElementRect(null);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (noteHoverTimeoutRef.current) {
        clearTimeout(noteHoverTimeoutRef.current);
      }
    };
  }, []);

  return {
    hoveredNoteContent,
    hoveredNoteId,
    notePopupPosition,
    noteElementRect,
    shouldShowNotePopup,
    handleNoteTextMouseEnter,
    handleNoteTextMouseLeave,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
    cleanup: () => {
      if (noteHoverTimeoutRef.current) {
        clearTimeout(noteHoverTimeoutRef.current);
      }
      setHoveredNoteContent(null);
      setHoveredNoteId(null);
      setNoteElementRect(null);
    },
  };
};