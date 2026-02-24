import { useState, useRef, useCallback, useEffect } from "react";
import { useState, useRef, useCallback, useEffect } from "react";

export const useNoteHover = ({ viewMode }) => {
  const [hoveredNoteContent, setHoveredNoteContent] = useState(null);
  const [hoveredNoteId, setHoveredNoteId] = useState(null);
  const [notePopupPosition, setNotePopupPosition] = useState({ x: 0, y: 0 });
  const [noteElementRect, setNoteElementRect] = useState(null);
  const noteHoverTimeoutRef = useRef(null);
  const isMouseInsidePopupRef = useRef(false);
  const isMouseInsideNoteRef = useRef(false);

  const [popupState, setPopupState] = useState({
    content: null,
    position: { x: 0, y: 0 }
  });

  // Use a single ref to track if popup should be visible
  const hoverRef = useRef({
    active: false,
    noteId: null,
    content: null,
    rect: null,
    timer: null
  });

  // Check if should show popup
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
  // Calculate position
  const calculatePosition = useCallback((rect) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = viewMode === "table" ? 400 : 350;
    const popupHeight = 300;

    let x = rect.left + 20;
    let y = rect.top + 20;

    if (x + popupWidth > viewportWidth - 10) {
      x = Math.max(10, rect.right - popupWidth - 20);
    }
    if (y + popupHeight > viewportHeight - 10) {
      y = Math.max(10, rect.top - popupHeight + 200);
    }

    return { 
      x: Math.max(10, Math.min(x, viewportWidth - popupWidth - 10)), 
      y: Math.max(10, Math.min(y, viewportHeight - popupHeight - 10))
    };
  }, [viewMode]);

  // Handle note mouse enter
  const handleNoteTextMouseEnter = useCallback((note, event) => {
    if (!note || !note.note) return;

    const rect = event.currentTarget.getBoundingClientRect();
    
    // Update hover ref
    hoverRef.current.active = true;
    hoverRef.current.noteId = note.id;
    hoverRef.current.content = note.note;
    hoverRef.current.rect = rect;

    // Clear any existing timer
    if (hoverRef.current.timer) {
      clearTimeout(hoverRef.current.timer);
    }

    // Set timer to show popup
    hoverRef.current.timer = setTimeout(() => {
      if (hoverRef.current.active) {
        setPopupState({
          content: hoverRef.current.content,
          position: calculatePosition(hoverRef.current.rect)
        });
      }
      hoverRef.current.timer = null;
    }, 100);
  }, [calculatePosition]);

  // Handle note mouse leave
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
    // Mark as inactive but don't hide immediately
    hoverRef.current.active = false;

    // Clear show timer
    if (hoverRef.current.timer) {
      clearTimeout(hoverRef.current.timer);
      hoverRef.current.timer = null;
    }

    // Hide after a very short delay
    setTimeout(() => {
      if (!hoverRef.current.active) {
        setPopupState({ content: null, position: { x: 0, y: 0 } });
        hoverRef.current.noteId = null;
        hoverRef.current.content = null;
        hoverRef.current.rect = null;
      }
    }, 50);
  }, []);

  // Handle popup mouse enter
  const handlePopupMouseEnter = useCallback(() => {
    hoverRef.current.active = true;
  }, []);

  // Handle popup mouse leave
  const handlePopupMouseLeave = useCallback(() => {
    hoverRef.current.active = false;
    
    setTimeout(() => {
      if (!hoverRef.current.active) {
        setPopupState({ content: null, position: { x: 0, y: 0 } });
        hoverRef.current.noteId = null;
        hoverRef.current.content = null;
        hoverRef.current.rect = null;
      }
    }, 50);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (noteHoverTimeoutRef.current) {
        clearTimeout(noteHoverTimeoutRef.current);
      }
    };
  }, []);

  // Clean up
  useEffect(() => {
    return () => {
      if (hoverRef.current.timer) {
        clearTimeout(hoverRef.current.timer);
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
    handlePopupMouseEnter,
    handlePopupMouseLeave,
    handlePopupClose // Export the close handler
  };
};