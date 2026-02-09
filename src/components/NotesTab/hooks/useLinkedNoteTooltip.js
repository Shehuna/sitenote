import { useState, useRef, useCallback } from "react";
import { API_BASE_URL } from "../utils/constants";
import toast from "react-hot-toast";

export const useLinkedNoteTooltip = ({ getReplyNoteId }) => {
  const [hoveredLinkedNote, setHoveredLinkedNote] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [linkedNoteContent, setLinkedNoteContent] = useState({});
  const [loadingLinkedNote, setLoadingLinkedNote] = useState({});
  const hoverTimeoutRef = useRef(null);

  const fetchOriginalNoteContent = useCallback(async (originalNoteId) => {
    if (!originalNoteId || linkedNoteContent[originalNoteId]) return;

    try {
      setLoadingLinkedNote((prev) => ({ ...prev, [originalNoteId]: true }));
      const response = await fetch(
        `${API_BASE_URL}/api/SiteNote/GetSiteNoteById/${originalNoteId}`,
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.siteNote) {
          setLinkedNoteContent((prev) => ({
            ...prev,
            [originalNoteId]: {
              id: data.siteNote.id,
              content: data.siteNote.note || "No content",
              userName: data.siteNote.userName || "Unknown",
              date: data.siteNote.timeStamp || data.siteNote.date,
              workspace: data.siteNote.workspace || "",
              project: data.siteNote.project || "",
              job: data.siteNote.job || "",
            },
          }));
        }
      }
    } catch (error) {
      console.error(`Error fetching original note ${originalNoteId}:`, error);
    } finally {
      setLoadingLinkedNote((prev) => ({ ...prev, [originalNoteId]: false }));
    }
  }, [linkedNoteContent]);

  const handleLinkedNoteMouseEnter = useCallback((noteId, e) => {
    if (e) {
      // Get mouse position relative to viewport
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Tooltip dimensions
      const tooltipWidth = 350;
      const tooltipHeight = 200;

      let x, y;

      // Check if there's enough space on the right of the mouse
      if (mouseX + tooltipWidth + 10 <= viewportWidth) {
        // Show to the right of mouse
        x = mouseX + 10;
      } else if (mouseX - tooltipWidth - 10 >= 0) {
        // Show to the left of mouse
        x = mouseX - tooltipWidth - 10;
      } else {
        // Not enough space on either side, show to the right anyway
        x = Math.max(10, viewportWidth - tooltipWidth - 10);
      }

      // Vertical positioning
      y = mouseY + 15;

      // Adjust if tooltip goes off screen vertically
      if (y + tooltipHeight > viewportHeight) {
        // Not enough space below, show above mouse
        y = mouseY - tooltipHeight - 10;
      }

      // Ensure positions are within bounds
      x = Math.max(10, Math.min(x, viewportWidth - tooltipWidth - 10));
      y = Math.max(10, Math.min(y, viewportHeight - tooltipHeight - 10));

      setTooltipPosition({
        x,
        y,
      });
    }

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set timeout for hover delay (500ms)
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredLinkedNote(noteId);

      // Fetch original note content if not already loaded
      const originalNoteId = getReplyNoteId(noteId);
      if (originalNoteId && !linkedNoteContent[originalNoteId]) {
        fetchOriginalNoteContent(originalNoteId);
      }
    }, 500);
  }, [getReplyNoteId, linkedNoteContent, fetchOriginalNoteContent]);

  const handleLinkedNoteMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredLinkedNote(null);
  }, []);

  const handleLinkedNoteClick = useCallback((replyNoteId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const originalNoteId = getReplyNoteId(replyNoteId);
    if (!originalNoteId) {
      toast.error("No linked note found");
      return null;
    }

    return { originalNoteId };
  }, [getReplyNoteId]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  return {
    hoveredLinkedNote,
    tooltipPosition,
    linkedNoteContent,
    loadingLinkedNote,
    handleLinkedNoteMouseEnter,
    handleLinkedNoteMouseLeave,
    handleLinkedNoteClick,
    fetchOriginalNoteContent,
    cleanup,
  };
};