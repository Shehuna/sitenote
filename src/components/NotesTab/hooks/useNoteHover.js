import { useState, useRef, useCallback, useEffect } from "react";

export const useNoteHover = ({ viewMode }) => {
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
    const noteLength = note.note.length;
    return viewMode === "table" ? noteLength > 69 : noteLength > 120;
  }, [viewMode]);

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

  // Add new function to manually close popup
  const handlePopupClose = useCallback(() => {
    setPopupState({ content: null, position: { x: 0, y: 0 } });
    hoverRef.current.active = false;
    hoverRef.current.noteId = null;
    hoverRef.current.content = null;
    hoverRef.current.rect = null;
    
    if (hoverRef.current.timer) {
      clearTimeout(hoverRef.current.timer);
      hoverRef.current.timer = null;
    }
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
    hoveredNoteContent: popupState.content,
    notePopupPosition: popupState.position,
    shouldShowNotePopup,
    handleNoteTextMouseEnter,
    handleNoteTextMouseLeave,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
    handlePopupClose // Export the close handler
  };
};
