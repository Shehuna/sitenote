import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import "./NotesTab.css";
import ReplyModal from "../Modals/ReplyModal";
import AiChatDialog from "../ai/AiChatDialog";
import toast from "react-hot-toast";

// Portal component for tooltips
const TooltipPortal = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

// Function to process HTML content for URLs
const processHtmlForUrls = (html) => {
  if (!html) return html;
  
  try {
    // Create a temporary element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Find all text nodes that aren't already inside links
    const walker = document.createTreeWalker(
      tempDiv,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      // Skip if parent is already an anchor tag
      if (node.parentNode.nodeName !== 'A') {
        textNodes.push(node);
      }
    }
    
    // Process each text node
    textNodes.forEach((textNode) => {
      const text = textNode.textContent;
      if (text && text.match(/(https?:\/\/|www\.)/gi)) {
        const span = document.createElement('span');
        span.innerHTML = text.replace(
          /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi,
          (url) => {
            let href = url;
            if (!href.startsWith('http://') && !href.startsWith('https://')) {
              href = 'https://' + href;
            }
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="note-url-link" onclick="event.stopPropagation()">${url}</a>`;
          }
        );
        textNode.parentNode.replaceChild(span, textNode);
      }
    });
    
    return tempDiv.innerHTML;
  } catch (error) {
    console.error('Error processing HTML for URLs:', error);
    return html;
  }
};

// Unified Note Text Popup Component - SIMPLIFIED VERSION
const NoteTextPopup = ({ 
  content, 
  position, 
  elementRect, 
  searchTerm, 
  onClose,
  viewMode
}) => {
  if (!content || !position) return null;

  // Process HTML content
  const processedContent = processHtmlForUrls(content);
  
  // Highlight search terms
  const highlightHtmlContent = (html, highlight) => {
    if (!html || typeof html !== "string") {
      return html;
    }

    try {
      // If no search highlight, just return with URLs
      if (!highlight) {
        return processedContent;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(processedContent, "text/html");

      const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escapedHighlight})`, "gi");

      const highlightNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (regex.test(text)) {
            const span = document.createElement("span");
            const parts = text.split(regex);

            parts.forEach((part) => {
              if (regex.test(part)) {
                const mark = document.createElement("mark");
                mark.className = "search-highlight";
                mark.style.cssText =
                  "background-color: #ffeb3b; padding: 0 2px; border-radius: 2px; font-weight: bold; color: #000;";
                mark.textContent = part;
                span.appendChild(mark);
              } else {
                span.appendChild(document.createTextNode(part));
              }
            });

            node.parentNode.replaceChild(span, node);
          }
        } else if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.nodeName !== "SCRIPT" &&
          node.nodeName !== "STYLE" &&
          !node.classList.contains("search-highlight") &&
          node.nodeName !== "A"
        ) {
          Array.from(node.childNodes).forEach((child) => highlightNode(child));
        }
      };

      highlightNode(doc.body);
      return doc.body.innerHTML;
    } catch (error) {
      console.error("Error highlighting HTML:", error);
      return processedContent;
    }
  };

  const highlightedContent = highlightHtmlContent(processedContent, searchTerm);

  // Get popup width based on view mode
  const getPopupWidth = () => {
    switch(viewMode) {
      case "table":
        return "400px";
      case "cards":
        return "300px";
      case "stacked":
        return "300px";
      default:
        return "300px";
    }
  };

  return (
    <TooltipPortal>
      <div
        className="note-text-popup"
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
          width: getPopupWidth(),
          maxWidth: getPopupWidth(),
          fontSize: "13px",
          pointerEvents: "none",
          maxHeight: "250px",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content area only - no footer, no arrow */}
        <div
          style={{
            color: "#333",
            lineHeight: 1.5,
            wordBreak: "break-word",
          }}
          dangerouslySetInnerHTML={{
            __html: highlightedContent,
          }}
        />
      </div>
    </TooltipPortal>
  );
};

const NotesTab = ({
  viewMode,
  finalDisplayNotes,
  isDataLoaded,
  initialLoading,
  searchLoading,
  loadingFiltered,
  loadingUniques,
  searchTerm,
  getActiveFilterCount,
  handleRowClick,
  handleRowDoubleClick,
  handleAddFromRow,
  handleEdit,
  handleDelete,
  handleViewAttachments,
  selectedRow,
  focusedRow,
  inlineImagesMap,
  loadingImages,
  renderTableImageIcon,
  renderCardImageIcon,
  renderStackedImageIcon,
  setShowPriorityDropdown,
  setSelectedNoteForPriority,
  setPriorityDropdownPosition,
  expandedStacks,
  toggleStackExpansion,
  expandedCardLimit,
  jobs,
  setViewNote,
  setShowViewModal,
  stackedJobs,
  loadingStackedJobs,
  fetchStackedJobs,
  fetchNotes,
  userId,
  projects,
  hasActiveFilters,
  filteredNotesFromApi,
  searchResults,
  workspaces,
}) => {
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedNoteForReply, setSelectedNoteForReply] = useState(null);
  const [userStatusMap, setUserStatusMap] = useState({});
  const [loadingUsers, setLoadingUsers] = useState({});
  const [localNotes, setLocalNotes] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  
  // New state for stacked view loading
  const [isStackedViewLoading, setIsStackedViewLoading] = useState(false);
  const [isFilteringStacked, setIsFilteringStacked] = useState(false);

  // New states for reply/link functionality
  const [noteReplies, setNoteReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [hoveredLinkedNote, setHoveredLinkedNote] = useState(null);
  const [linkedNoteContent, setLinkedNoteContent] = useState({});
  const [loadingLinkedNote, setLoadingLinkedNote] = useState({});
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // State for note text hover popup - STARTING INSIDE THE NOTES
  const [hoveredNoteContent, setHoveredNoteContent] = useState(null);
  const [notePopupPosition, setNotePopupPosition] = useState({ x: 0, y: 0 });
  const [noteElementRect, setNoteElementRect] = useState(null);

  // AI chat dialog state
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiJobContext, setAiJobContext] = useState(null);
  const [manuallyUpdatedPriorities, setManuallyUpdatedPriorities] = useState({});
  const loadingRef = useRef(false);
  const observerRef = useRef(null);
  const lastRowRef = useRef(null);
  const lastCardRef = useRef(null);
  const containerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const noteHoverTimeoutRef = useRef(null);
  const viewModeRef = useRef(viewMode);
  const hasActiveFiltersRef = useRef(hasActiveFilters);

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;
  const [hoveredOriginalNote, setHoveredOriginalNote] = useState(null);
  const [originalNoteContent, setOriginalNoteContent] = useState({});
  const [loadingOriginalNote, setLoadingOriginalNote] = useState({});
  const linkHoverTimeoutRef = useRef(null); 
  
    
  const pageSize = 25;
  const initialPageNumber = 1;

  // Track view mode changes
  useEffect(() => {
    if (viewModeRef.current !== viewMode && viewMode === "stacked") {
      setIsStackedViewLoading(true);
      const timer = setTimeout(() => {
        setIsStackedViewLoading(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Track filter changes in stacked view
  useEffect(() => {
    if (viewMode === "stacked" && hasActiveFiltersRef.current !== hasActiveFilters) {
      setIsFilteringStacked(true);
      const timer = setTimeout(() => {
        setIsFilteringStacked(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
    hasActiveFiltersRef.current = hasActiveFilters;
  }, [hasActiveFilters, viewMode]);

  // Function to fetch note replies from NEW API
  const fetchNoteReplies = useCallback(async () => {
    setLoadingReplies(true);
    try {
      const response = await fetch(
        `${apiUrl}/SiteNote/GetAllReplies?pageNumber=1&pageSize=1000&userId=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setNoteReplies(data.siteNotes || []);
      }
    } catch (error) {
      console.error("Error fetching note replies:", error);
    } finally {
      setLoadingReplies(false);
    }
  }, [apiUrl, userId]);

  // Fetch note replies on component mount if not already loaded
  useEffect(() => {
    if (!loadingReplies && noteReplies.length === 0) {
      fetchNoteReplies();
    }
  }, [fetchNoteReplies, loadingReplies, noteReplies.length]);

  // Check if a note is a reply - UPDATED logic
  const isNoteReply = useCallback(
    (noteId) => {
      return noteReplies.some((reply) => reply.id === noteId);
    },
    [noteReplies]
  );

  // Get the original note ID for a reply note - UPDATED logic
  const getReplyNoteId = useCallback(
    (replyNoteId) => {
      const reply = noteReplies.find((reply) => reply.id === replyNoteId);
      return reply ? reply.reply : null;
    },
    [noteReplies]
  );

  // Fetch original note content for hover tooltip
  const fetchOriginalNoteContent = async (originalNoteId) => {
    if (!originalNoteId || linkedNoteContent[originalNoteId]) return;

    try {
      setLoadingLinkedNote((prev) => ({ ...prev, [originalNoteId]: true }));
      const response = await fetch(
        `${apiUrl}/SiteNote/GetSiteNoteById/${originalNoteId}`
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
  };

  const openAiDialogForJob = (job) => {
    setAiJobContext({ jobId: job.jobId, jobName: job.jobName });
    setShowAiDialog(true);
  };

  const closeAiDialog = () => {
    setShowAiDialog(false);
    setAiJobContext(null);
  };

  // Handle mouse enter on link button
  const handleLinkedNoteMouseEnter = (noteId, e) => {
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
  };

  // Handle mouse leave on link button
  const handleLinkedNoteMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredLinkedNote(null);
  };

  // Check if should show popup for note text
  const shouldShowNotePopup = (note) => {
    if (!note || !note.note) return false;
    
    // Different thresholds for different view modes
    if (viewMode === "table") {
      return note.note.length > 69;
    } else if (viewMode === "cards" || viewMode === "stacked") {
      return note.note.length > 120;
    }
    
    return false;
  };

  // Handle hover over note text - UPDATED TO START INSIDE THE NOTES
  const handleNoteTextMouseEnter = (note, e) => {
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
      y: popupY
    });

    // Set timeout for hover delay (300ms)
    noteHoverTimeoutRef.current = setTimeout(() => {
      setHoveredNoteContent(note.note);
    }, 300);
  };
  const getPriorityValue = (note) => {
  return manuallyUpdatedPriorities[note.id] !== undefined 
    ? manuallyUpdatedPriorities[note.id] 
    : (note.priority || 1);
};

  // Handle mouse leave from note text
  const handleNoteTextMouseLeave = () => {
    if (noteHoverTimeoutRef.current) {
      clearTimeout(noteHoverTimeoutRef.current);
    }
    setHoveredNoteContent(null);
    setNoteElementRect(null);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (noteHoverTimeoutRef.current) {
        clearTimeout(noteHoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle click on link button - UPDATED logic
  const handleLinkedNoteClick = (replyNoteId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const originalNoteId = getReplyNoteId(replyNoteId);
    if (!originalNoteId) {
      toast.error("No linked note found");
      return;
    }

    // Find the original note in displayNotes
    const originalNote = displayNotes.find(
      (note) => note.id === originalNoteId
    );

    if (originalNote) {
      // 1. Select the original note
      handleRowClick(originalNote);

      // 2. Scroll to the original note
      setTimeout(() => {
        let noteElement = null;

        // Try different selectors based on view mode
        if (viewMode === "table") {
          noteElement = document.querySelector(
            `tr[data-note-id="${originalNoteId}"]`
          );
        } else if (viewMode === "cards" || viewMode === "stacked") {
          noteElement = document.querySelector(
            `.note-card[data-note-id="${originalNoteId}"]`
          );
        }

        if (noteElement) {
          // Scroll to element
          noteElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          // 3. Highlight with yellow background
          noteElement.classList.add("highlight-original-note");

          // Remove highlight after 2 seconds
          setTimeout(() => {
            noteElement.classList.remove("highlight-original-note");
          }, 2000);
        } else {
          toast.error(
            `Note (ID: ${originalNoteId}) not found in current view.`
          );
        }
      }, 100);
    } else {
      toast.error(
        `Original note (ID: ${originalNoteId}) not found in current view.`
      );
    }
  };
  const handlePriorityClick = (note, e) => {
  e.stopPropagation();
  e.preventDefault();
  
  const currentPriority = manuallyUpdatedPriorities[note.id] || note.priority || 1;
  let nextPriority;
  
  console.log(`Current priority for note ${note.id}: ${currentPriority}`);
  
  if (currentPriority === 1) {
    nextPriority = 3; 
  } else if (currentPriority === 3) {
    nextPriority = 4; 
  } else {
    nextPriority = 1; 
  }
  
  console.log(`Next priority for note ${note.id}: ${nextPriority}`);
  
  updateNotePriority(note.id, nextPriority);
};

const updateNotePriority = async (noteId, priorityValue) => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    
    console.log(`API: Updating note ${noteId} to priority ${priorityValue}`);
    
    const checkResponse = await fetch(
      `${process.env.REACT_APP_API_BASE_URL}/api/Priority/GetPriorityByNoteId/${noteId}`
    );
    
    let priorityId = null;
    if (checkResponse.ok) {
      const data = await checkResponse.json();
      console.log('Priority check response:', data);
      if (data.priority || (Array.isArray(data) && data.length > 0)) {
        priorityId = data.priority?.id || (Array.isArray(data) ? data[0]?.id : null);
      }
    }
    
    console.log(`Found priorityId: ${priorityId} for note ${noteId}`);
    
    if (priorityId) {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/Priority/UpdatePriority/${priorityId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priorityValue: priorityValue,
            userId: user.id
          })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update priority error:', errorText);
        throw new Error("Failed to update priority");
      }
      
      const result = await response.json();
      console.log('Update priority result:', result);
      
    } else if (priorityValue > 1) {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/Priority/AddPriority`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priorityValue: priorityValue,
            userId: user.id,
            noteId: noteId
          })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Add priority error:', errorText);
        throw new Error("Failed to add priority");
      }
      
      const result = await response.json();
      console.log('Add priority result:', result);
      toast.success(`Priority set to ${priorityValue === 4 ? 'High' : 'Medium'}`);
    } else {
      console.log('No priority exists and setting to 1, no API call needed');
      toast.success("Priority reset to default");
    }
    
    updateNotePriorityEverywhere(noteId, priorityValue);
    
    setTimeout(() => {
      refreshNotesAfterReply();
    }, 300);
    
  } catch (error) {
    console.error("Error updating priority:", error);
    toast.error("Failed to update priority: " + error.message);
    
    setManuallyUpdatedPriorities(prev => {
      const newState = { ...prev };
      delete newState[noteId];
      return newState;
    });
  }
};

const updateNotePriorityInState = (noteId, newPriority) => {
  
  setLocalNotes(prev => prev.map(note => 
    note.id === noteId ? { ...note, priority: newPriority } : note
  ));
  
  if (finalDisplayNotes && finalDisplayNotes.some(note => note.id === noteId)) {
  }
};

const updateNotePriorityEverywhere = (noteId, newPriority) => {
  console.log(`Updating priority for note ${noteId} to ${newPriority} everywhere`);
  
  setManuallyUpdatedPriorities(prev => ({
    ...prev,
    [noteId]: newPriority
  }));
  
  setLocalNotes(prev => prev.map(note => 
    note.id === noteId ? { ...note, priority: newPriority } : note
  ));
  
  console.log('Priority update applied locally');
};

  // Format tooltip content
  const formatTooltipContent = (content) => {
    if (!content) return "No content";

    // Create temporary div to extract text
    const div = document.createElement("div");
    div.innerHTML = content;
    const text = div.textContent || div.innerText || "";

    // Limit to 150 characters
    if (text.length > 150) {
      return text.substring(0, 150) + "...";
    }

    return text;
  };

  // Handler for replying to a note
  const handleReplyToNote = (note) => {
    setSelectedNoteForReply(note);
    setShowReplyModal(true);
  };

const refreshNotesAfterReply = async () => {
  try {
    console.log("🔄 Starting refresh...");
    
    await fetchNoteReplies();
    
    if (fetchNotes && typeof fetchNotes === 'function') {
      const result = await fetchNotes(1, pageSize);
      
      if (result && result.notes) {
        console.log(`✅ Loaded ${result.notes.length} fresh notes`);
        
        setLocalNotes([...result.notes].sort((a, b) => b.id - a.id));
        setHasMore(result.hasMore);
        setPage(2); 
        setIsInitialLoad(false);
      }
    }
    
    console.log("✅ Refresh completed");
    
  } catch (error) {
    console.error("❌ Error refreshing notes:", error);
    toast.error("Failed to refresh notes");
  }
};

  // Determine which notes to display based on filters/search
  const displayNotes = useMemo(() => {
    if (searchTerm.trim() || hasActiveFilters) {
      const sourceNotes = searchTerm.trim()
        ? searchResults || []
        : filteredNotesFromApi || [];

      const seen = new Map();
      const deduplicated = [];

      for (const note of sourceNotes) {
        if (note.id && !seen.has(note.id)) {
          seen.set(note.id, note);
          deduplicated.push(note);
        }
      }

      return deduplicated.sort((a, b) => b.id - a.id);
    }

    if (searchTerm.trim() || hasActiveFilters) {
      return searchTerm.trim()
        ? searchResults || []
        : filteredNotesFromApi || [];
    }

    if (finalDisplayNotes && finalDisplayNotes.length > 0) {
      if (localNotes.length === 0) {
        return [...finalDisplayNotes].sort((a, b) => b.id - a.id);
      }

      const allNotesMap = new Map();

      localNotes.forEach((note) => {
        allNotesMap.set(note.id, note);
      });

      finalDisplayNotes.forEach((note) => {
        allNotesMap.set(note.id, note);
      });

      return Array.from(allNotesMap.values()).sort((a, b) => b.id - a.id);
    }

    return localNotes || [];
  }, [
    searchTerm,
    hasActiveFilters,
    searchResults,
    filteredNotesFromApi,
    localNotes,
    finalDisplayNotes,
    manuallyUpdatedPriorities,
  ]);

  // FIXED: Determine which jobs to display in stacked view
  const jobsToDisplay = useMemo(() => {
    if (viewMode !== "stacked") return [];

    console.log("Stacked jobs available:", stackedJobs?.length || 0);
    console.log("Has active filters:", hasActiveFilters);
    
    // Always use stackedJobs prop (it will be filteredStackedJobs when hasActiveFilters is true)
    return stackedJobs || [];
  }, [viewMode, stackedJobs, hasActiveFilters]);

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

  // UPDATED: highlightHtmlContent function with URL detection
  const highlightHtmlContent = (html, highlight) => {
    if (!html || typeof html !== "string") {
      return html;
    }

    try {
      // First process URLs
      const withUrls = processHtmlForUrls(html);
      
      // If no search highlight, just return with URLs
      if (!highlight) {
        return withUrls;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(withUrls, "text/html");

      const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escapedHighlight})`, "gi");

      const highlightNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (regex.test(text)) {
            const span = document.createElement("span");
            const parts = text.split(regex);

            parts.forEach((part) => {
              if (regex.test(part)) {
                const mark = document.createElement("mark");
                mark.className = "search-highlight";
                mark.style.cssText =
                  "background-color: #ffeb3b; padding: 0 2px; border-radius: 2px; font-weight: bold; color: #000;";
                mark.textContent = part;
                span.appendChild(mark);
              } else {
                span.appendChild(document.createTextNode(part));
              }
            });

            node.parentNode.replaceChild(span, node);
          }
        } else if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.nodeName !== "SCRIPT" &&
          node.nodeName !== "STYLE" &&
          !node.classList.contains("search-highlight") &&
          node.nodeName !== "A"
        ) {
          Array.from(node.childNodes).forEach((child) => highlightNode(child));
        }
      };

      highlightNode(doc.body);

      return doc.body.innerHTML;
    } catch (error) {
      console.error("Error highlighting HTML:", error);
      return html;
    }
  };

  // Sync finalDisplayNotes from parent to localNotes when appropriate
  useEffect(() => {
    if (
      finalDisplayNotes &&
      finalDisplayNotes.length > 0 &&
      !hasActiveFilters &&
      !searchTerm.trim()
    ) {
      if (isInitialLoad) {
        setLocalNotes([...finalDisplayNotes].sort((a, b) => b.id - a.id));
        setHasMore(finalDisplayNotes.length >= pageSize);
        setIsInitialLoad(false);
      } else {
        const existingIds = new Set(localNotes.map((note) => note.id));
        const newNotesFromParent = finalDisplayNotes.filter(
          (note) => !existingIds.has(note.id)
        );

        if (newNotesFromParent.length > 0) {
          const sortedNewNotes = [...newNotesFromParent].sort(
            (a, b) => b.id - a.id
          );
          setLocalNotes((prev) => [...sortedNewNotes, ...prev]);

          const updatedNotes = finalDisplayNotes.filter((note) =>
            existingIds.has(note.id)
          );
          if (updatedNotes.length > 0) {
            setLocalNotes((prev) =>
              prev.map((note) => {
                const updatedNote = updatedNotes.find((u) => u.id === note.id);
                return updatedNote || note;
              })
            );
          }
        }
      }
    }
  }, [
    finalDisplayNotes,
    hasActiveFilters,
    searchTerm,
    isInitialLoad,
    localNotes,
    pageSize,
  ]);

  // Reset infinite scroll when filters/search are cleared
  useEffect(() => {
    if (!hasActiveFilters && !searchTerm.trim() && !isInitialLoad) {
      setHasMore(true);
      setPage(1);

      if (finalDisplayNotes && finalDisplayNotes.length > 0) {
        setLocalNotes([...finalDisplayNotes].sort((a, b) => b.id - a.id));
        setPage(2);
        setHasMore(finalDisplayNotes.length >= pageSize);
      }
    }
  }, [
    hasActiveFilters,
    searchTerm,
    isInitialLoad,
    finalDisplayNotes,
    pageSize,
  ]);

  // Function to fetch user status by ID
  const fetchUserStatus = async (userId) => {
    if (!userId || userStatusMap[userId]) return;

    try {
      setLoadingUsers((prev) => ({ ...prev, [userId]: true }));
      const response = await fetch(
        `${apiUrl}/UserManagement/GetUserById/${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setUserStatusMap((prev) => ({
          ...prev,
          [userId]: {
            active: data.user?.status === 1,
            name:
              `${data.user?.fname} ${data.user?.lname}`.trim() ||
              data.user?.userName ||
              "Unknown",
          },
        }));
      }
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
    } finally {
      setLoadingUsers((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // Load initial notes via API (only when parent doesn't provide them)
  const loadInitialNotes = useCallback(async () => {
    if (
      loadingRef.current ||
      (finalDisplayNotes && finalDisplayNotes.length > 0)
    )
      return;

    loadingRef.current = true;
    setIsLoadingInitial(true);

    try {
      const result = await fetchNotes(initialPageNumber, pageSize);
      if (result && result.notes) {
        setLocalNotes([...result.notes].sort((a, b) => b.id - a.id));
        setHasMore(result.hasMore);
        setPage(initialPageNumber + 1);
      }
    } catch (error) {
      console.error("Error loading initial notes:", error);
    } finally {
      loadingRef.current = false;
      setIsLoadingInitial(false);
      setIsInitialLoad(false);
    }
  }, [fetchNotes, pageSize, finalDisplayNotes]);

  // Load more notes via API
  const loadMoreNotes = useCallback(async () => {
    if (
      loadingRef.current ||
      !hasMore ||
      hasActiveFilters ||
      searchTerm.trim()
    ) {
      return;
    }

    loadingRef.current = true;
    setLoadingMore(true);

    try {
      const result = await fetchNotes(page, pageSize);
      if (result && result.notes && result.notes.length > 0) {
        setLocalNotes((prev) => {
          const existingIds = new Set(prev.map((note) => note.id));
          const newNotes = result.notes.filter(
            (note) => !existingIds.has(note.id)
          );
          const sortedNewNotes = [...newNotes].sort((a, b) => b.id - a.id);
          return [...prev, ...sortedNewNotes];
        });
        setHasMore(result.hasMore);
        setPage((prev) => prev + 1);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more notes:", error);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchNotes, page, hasMore, hasActiveFilters, searchTerm]);

  const fetchLinkedNoteContent = async (noteId) => {
    if (!noteId || linkedNoteContent[noteId]) return;

    try {
      setLoadingLinkedNote((prev) => ({ ...prev, [noteId]: true }));
      const response = await fetch(`${apiUrl}/SiteNote/GetNoteById/${noteId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.note) {
          setLinkedNoteContent((prev) => ({
            ...prev,
            [noteId]: {
              content: data.note.note || "No content",
              userName: data.note.userName || "Unknown",
              date: data.note.timeStamp || data.note.date,
              workspace: data.note.workspace || "",
              project: data.note.project || "",
              job: data.note.job || "",
            },
          }));
        }
      }
    } catch (error) {
      console.error(`Error fetching linked note ${noteId}:`, error);
    } finally {
      setLoadingLinkedNote((prev) => ({ ...prev, [noteId]: false }));
    }
  };

  const handleViewOriginalNote = (note, e) => {
    console.log("View original button clicked!", {
      noteId: note.id,
      repliedToNoteId: note.repliedSiteNoteId,
    });

    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (note.repliedSiteNoteId) {
      const originalNote = displayNotes.find(
        (n) => n.id === note.repliedSiteNoteId
      );

      if (originalNote) {
        handleRowClick(originalNote);

        setTimeout(() => {
          const originalNoteElement = document.querySelector(
            `[data-note-id="${originalNote.id}"]`
          );
          if (originalNoteElement) {
            originalNoteElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            originalNoteElement.classList.add("highlight-original-note");
            setTimeout(() => {
              originalNoteElement.classList.remove("highlight-original-note");
            }, 2000);
          }
        }, 100);
      } else {
        alert(
          `Original note (ID: ${note.repliedSiteNoteId}) not found in current view.`
        );
      }
    }
  };

  const handleOriginalNoteMouseEnter = (note, e) => {
    if (e) {
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredOriginalNote(note.id);

      if (
        note.repliedSiteNoteId &&
        !originalNoteContent[note.repliedSiteNoteId]
      ) {
        fetchOriginalNoteContent(note.repliedSiteNoteId);
      }
    }, 500);
  };

  const handleOriginalNoteMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredOriginalNote(null);
  };

  useEffect(() => {
    if (
      isDataLoaded &&
      !hasActiveFilters &&
      !searchTerm.trim() &&
      isInitialLoad
    ) {
      if (!finalDisplayNotes || finalDisplayNotes.length === 0) {
        loadInitialNotes();
      } else {
        setIsInitialLoad(false);
      }
    }
  }, [
    isDataLoaded,
    hasActiveFilters,
    searchTerm,
    isInitialLoad,
    loadInitialNotes,
    finalDisplayNotes,
  ]);

  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (hasActiveFilters || searchTerm.trim() || !hasMore || loadingMore) {
      return;
    }

    let targetElement = null;
    if (viewMode === "table" && lastRowRef.current) {
      targetElement = lastRowRef.current;
    } else if (viewMode === "cards" && lastCardRef.current) {
      targetElement = lastCardRef.current;
    }

    if (!targetElement) return;

    const options = {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (
        entry.isIntersecting &&
        hasMore &&
        !loadingMore &&
        !loadingRef.current
      ) {
        loadMoreNotes();
      }
    }, options);

    observer.observe(targetElement);
    observerRef.current = observer;
  }, [
    viewMode,
    hasMore,
    loadingMore,
    hasActiveFilters,
    searchTerm,
    loadMoreNotes,
  ]);

  useEffect(() => {
    setupObserver();

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [setupObserver]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setupObserver();
    }, 100);

    return () => clearTimeout(timer);
  }, [displayNotes, setupObserver]);

  useEffect(() => {
    if (displayNotes && displayNotes.length > 0) {
      const uniqueUserIds = [
        ...new Set(
          displayNotes.filter((note) => note.userId).map((note) => note.userId)
        ),
      ];

      uniqueUserIds.forEach((userId) => {
        if (!userStatusMap[userId] && !loadingUsers[userId]) {
          fetchUserStatus(userId);
        }
      });
    }
  }, [displayNotes, fetchUserStatus, loadingUsers, userStatusMap]);

  const getUserStatusStyle = (userId) => {
    if (userId && userStatusMap[userId] && !userStatusMap[userId].active) {
      return {
        color: "#95a5a6",
        fontStyle: "italic",
        opacity: 0.7,
      };
    }
    return {};
  };

  const renderUserStatusIndicator = (userId, userName) => {
    if (loadingUsers[userId]) {
      return (
        <span className="user-status-loading" title="Loading user status...">
          <i
            className="fas fa-spinner fa-spin"
            style={{ marginLeft: "4px", fontSize: "10px" }}
          />
        </span>
      );
    }

    return null;
  };

  const renderUserNameWithStatus = (note) => {
    const isInactive =
      userStatusMap[note.userId] && !userStatusMap[note.userId].active;

    if (isInactive) {
      return (
        <span
          className="inactive-user-wrapper"
          style={{ position: "relative", display: "inline-block" }}
        >
          <span style={getUserStatusStyle(note.userId)}>
            {note.userName || "Unknown"}
          </span>
          <div
            className="inactive-user-tooltip"
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#333",
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              whiteSpace: "nowrap",
              zIndex: 1000,
              opacity: 0,
              visibility: "hidden",
              transition: "opacity 0.2s, visibility 0.2s",
              marginBottom: "5px",
            }}
          >
            Inactive User
          </div>
        </span>
      );
    }

    return <span>{note.userName || "Unknown"}</span>;
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";

    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  const renderTableSkeleton = () => {
    return [...Array(5)].map((_, i) => (
      <tr key={`skeleton-${i}`}>
        <td colSpan={8}>
          <div className="skeleton-row">
            <div className="skeleton-cell short" />
            <div className="skeleton-cell medium" />
            <div className="skeleton-cell medium" />
            <div className="skeleton-cell medium" />
            <div className="skeleton-cell long" />
            <div className="skeleton-cell short" />
            <div className="skeleton-cell short" />
            <div className="skeleton-cell short" />
          </div>
        </td>
      </tr>
    ));
  };

  const renderCardSkeleton = () => {
    return [...Array(8)].map((_, i) => (
      <div key={`card-skeleton-${i}`} className="note-card skeleton">
        <div className="skeleton-header">
          <div className="skeleton-avatar" />
          <div className="skeleton-text short" />
        </div>
        <div className="skeleton-content">
          <div className="skeleton-text long" />
        </div>
        <div className="skeleton-footer">
          <div className="skeleton-actions" />
        </div>
      </div>
    ));
  };

  const renderTableEmptyState = () => {
    return (
      <tr>
        <td
          colSpan={8}
          style={{ textAlign: "center", padding: 40, color: "#999" }}
        >
          {isDataLoaded && !initialLoading && !loadingUniques ? (
            <>
              <i
                className="fas fa-search"
                style={{
                  fontSize: 28,
                  marginBottom: 12,
                  display: "block",
                  opacity: 0.5,
                }}
              />
              <div>
                {searchTerm.trim()
                  ? "No notes match your search"
                  : getActiveFilterCount() > 0
                  ? "No notes match your filters"
                  : "No notes available"}
              </div>
            </>
          ) : null}
        </td>
      </tr>
    );
  };

  // Render empty state for cards
  const renderCardEmptyState = () => {
    return (
      <div
        className="empty-state"
        style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px" }}
      >
        <i
          className="fas fa-search"
          style={{
            fontSize: 28,
            marginBottom: 12,
            display: "block",
            opacity: 0.5,
          }}
        />
        <h3>
          {searchTerm.trim()
            ? "No notes match your search"
            : getActiveFilterCount() > 0
            ? "No notes match your filters"
            : "No notes available"}
        </h3>
        <p>
          {searchTerm.trim()
            ? "Try adjusting your search terms"
            : getActiveFilterCount() > 0
            ? "Try clearing some filters"
            : "Create your first note to get started"}
        </p>
      </div>
    );
  };

  const renderTableRow = (note, index, isLast = false) => {
    const priorityValue = getPriorityValue(note);
   
    const uniqueKey = `${note.id}-${index}`;
    const isReply = isNoteReply(note.id);
    const originalNoteId = isReply ? getReplyNoteId(note.id) : null;

    return (
      <tr
        key={uniqueKey}
        data-note-id={note.id}
        onClick={() => handleRowClick(note)}
        onDoubleClick={() => {
          handleRowDoubleClick(note);
          const job = jobs.find(
            (j) => String(j.id) === String(note.job) || j.name === note.job
          );
          setViewNote({
            id: note.id,
            jobId: job?.id ?? null,
          });
          setShowViewModal(true);
        }}
        className={`${selectedRow === note.id ? "selected-row" : ""} ${
          focusedRow === note.id ? "focused-row" : ""
        }`}
        style={{ cursor: "pointer" }}
        ref={isLast ? lastRowRef : null}
        onMouseEnter={(e) => {
          const inactiveWrapper = e.currentTarget.querySelector(
            ".inactive-user-wrapper"
          );
          if (inactiveWrapper) {
            const tooltip = inactiveWrapper.querySelector(
              ".inactive-user-tooltip"
            );
            tooltip.style.opacity = "1";
            tooltip.style.visibility = "visible";
          }
        }}
        onMouseLeave={(e) => {
          const inactiveWrapper = e.currentTarget.querySelector(
            ".inactive-user-wrapper"
          );
          if (inactiveWrapper) {
            const tooltip = inactiveWrapper.querySelector(
              ".inactive-user-tooltip"
            );
            if (tooltip) {
              tooltip.style.opacity = "0";
              tooltip.style.visibility = "hidden";
            }
          }
        }}
      >
        <td
          title={new Date(note.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        >
          {formatRelativeTime(note.timeStamp)}
        </td>
        <td>{note.workspace || "—"}</td>
        <td>{note.project || "—"}</td>
        <td>{note.job || "—"}</td>
        <td
          className="editable"
          style={{ position: "relative", maxWidth: "300px" }}
        >
          <div
            className="note-cell-container"
            style={{
              display: "flex",
              alignItems: "flex-start",
              position: "relative",
              maxWidth: "100%",
              cursor: "default",
            }}
            onClick={(e) => {
              // If a link was clicked, don't trigger row selection
              if (e.target.tagName === 'A' && e.target.classList.contains('note-url-link')) {
                e.stopPropagation();
              }
            }}
            onMouseEnter={(e) => shouldShowNotePopup(note) && handleNoteTextMouseEnter(note, e)}
            onMouseLeave={() => shouldShowNotePopup(note) && handleNoteTextMouseLeave()}
          >
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                display: "block",
                maxWidth: "100%",
              }}
              dangerouslySetInnerHTML={{
                __html:
                  note.note && note.note.length > 69
                    ? highlightHtmlContent(
                        note.note.substring(0, 69) + "...",
                        searchTerm
                      )
                    : highlightHtmlContent(note.note || "", searchTerm),
              }}
            />
            <div
              className="note-hover-popup"
              dangerouslySetInnerHTML={{
                __html: highlightHtmlContent(note.note, searchTerm),
              }}
            />
           
          </div>
        </td>
        <td>
          {renderUserNameWithStatus(note)}
          {renderUserStatusIndicator(note.userId, note.userName)}
        </td>
        <td
          className="file-cell"
          onClick={(e) => {
            e.stopPropagation();
            handleViewAttachments(note);
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <i
              className="fas fa-paperclip"
              style={{ opacity: note.documentCount > 0 ? 1 : 0.3 }}
            />
            <span>({note.documentCount || 0})</span>

            {/* Reply button - show for all notes */}
            <i
              className="fas fa-reply"
              style={{
                color: "#3498db",
                cursor: "pointer",
                fontSize: "12px",
              }}
              title="Reply"
              onClick={(e) => {
                e.stopPropagation();
                handleReplyToNote(note);
              }}
            />

            {/* Link button - only for reply notes */}
            {isReply && originalNoteId && (
              <button
                className="link-to-note-btn"
                onClick={(e) => handleLinkedNoteClick(note.id, e)}
                onMouseEnter={(e) => handleLinkedNoteMouseEnter(note.id, e)}
                onMouseLeave={handleLinkedNoteMouseLeave}
                style={{
                  background: "none",
                  border: "1px solid #3498db",
                  color: "#3498db",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  marginLeft: "4px",
                  height: "24px",
                  transition: "all 0.2s ease",
                }}
              >
                <i className="fas fa-link" style={{ fontSize: "10px" }} />
              </button>
            )}

            {renderTableImageIcon(note)}
          </span>
        </td>
        <td className="table-actions">
          <a
            onClick={(e) => {
              e.stopPropagation();
              handleAddFromRow(note);
            }}
            title="Add"
          >
            <i className="fas fa-plus" />
          </a>
          <a
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(note);
            }}
            title="Edit"
          >
            <i className="fas fa-edit" />
          </a>
          <a
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(note);
            }}
            title="Delete"
          >
            <i className="fas fa-trash" />
          </a>
          <a
            onClick={(e) => handlePriorityClick(note, e)}
            title={`${priorityValue === 1 ? 'No Priority - Click to set' : 
                    priorityValue === 3 ? 'Medium Priority - Click to change' : 
                    'High Priority - Click to change'}`}
            style={{
              cursor: 'pointer',
              color: priorityValue === 4 ? '#ef5350' : 
                    priorityValue === 3 ? '#e8f628' : '#ccc',
              opacity: priorityValue > 1 ? 1 : 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px'
            }}
          >
            <i className="fas fa-flag" />
          </a>
        </td>
      </tr>
    );
  };

 // Render priority dot for table view
const renderPriorityDot = (priorityValue, note) => {
  if (priorityValue > 1) {
    const dotColor = priorityValue === 3 ? "#e8f628" : "#ef5350"; 
    
    return (
      <div
        className={`priority-dot priority-dot-${priorityValue}`}
        style={{ 
          width: "10px", 
          height: "10px", 
          borderRadius: "50%", 
          position: "absolute", 
          top: "4px", 
          right: "4px", 
          zIndex: 10,
          backgroundColor: dotColor
        }}
        title={priorityValue === 3 ? "Medium Priority" : "High Priority"}
      />
    );
  }
  
  return (
    <div
      className="priority-dot priority-dot-placeholder"
      style={{ 
        width: "10px", 
        height: "10px", 
        borderRadius: "50%", 
        position: "absolute", 
        top: "4px", 
        right: "4px", 
        zIndex: 10, 
        opacity: 0.2, 
        border: "1px dashed #bdc3c7", 
        backgroundColor: "transparent", 
        transition: "all 0.2s ease" 
      }}
      title="No priority set"
    />
  );
};

  const renderNoteCard = (note, index, isLast = false) => {
    
  const priorityValue = getPriorityValue(note);
    const isInactive =
      userStatusMap[note.userId] && !userStatusMap[note.userId].active;
    const uniqueKey = `${note.id}-${index}`;
    const isReply = isNoteReply(note.id);
    const originalNoteId = isReply ? getReplyNoteId(note.id) : null;

    return (
      <div
        key={uniqueKey}
        data-note-id={note.id}
        className={`note-card ${selectedRow === note.id ? "selected" : ""}`}
        onClick={() => handleRowClick(note)}
        onDoubleClick={() => handleRowDoubleClick(note)}
        ref={isLast ? lastCardRef : null}
        onMouseEnter={(e) => {
          if (isInactive) {
            const tooltip = e.currentTarget.querySelector(
              ".inactive-user-tooltip"
            );
            if (tooltip) {
              tooltip.style.opacity = "1";
              tooltip.style.visibility = "visible";
            }
          }
        }}
        onMouseLeave={(e) => {
          if (isInactive) {
            const tooltip = e.currentTarget.querySelector(
              ".inactive-user-tooltip"
            );
            if (tooltip) {
              tooltip.style.opacity = "0";
              tooltip.style.visibility = "hidden";
            }
          }
        }}
      >
        <div className="note-header">
          <div className="user-avatar-wrapper">
            <div className="user-avatar">
              {note.userName ? (
                (() => {
                  const names = note.userName.trim().split(/\s+/);
                  const firstInitial = names[0]
                    ? names[0].charAt(0).toUpperCase()
                    : "";
                  const lastInitial =
                    names.length > 1
                      ? names[names.length - 1].charAt(0).toUpperCase()
                      : "";
                  return firstInitial + lastInitial;
                })()
              ) : (
                <i className="fas fa-user" />
              )}
            </div>
            <div className="user-tooltip">
              {note.userName || "Unknown User"}
            </div>
          </div>
          <div className="note-meta">
            <div
              className="note-author"
              title={note.userName || "Unknown User"}
            >
              {isInactive ? (
                <span
                  className="inactive-user-wrapper"
                  style={{ position: "relative", display: "inline-block" }}
                >
                  <span style={getUserStatusStyle(note.userId)}>
                    {note.userName || "Unknown"}
                  </span>
                  <div
                    className="inactive-user-tooltip"
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "#333",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      zIndex: 1000,
                      opacity: 0,
                      visibility: "hidden",
                      transition: "opacity 0.2s, visibility 0.2s",
                      marginBottom: "5px",
                    }}
                  >
                    Inactive User
                  </div>
                </span>
              ) : (
                <span>{note.userName || "Unknown"}</span>
              )}
              {renderUserStatusIndicator(note.userId, note.userName)}
            </div>
            <div
              className="note-date"
              title={new Date(note.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            >
              {formatRelativeTime(note.timeStamp)}
            </div>
          </div>
          <div className="note-context">
            <div className="context-item job" title={note.job}>
              <HighlightText text={note.job || "—"} highlight={searchTerm} />
            </div>
            <div className="context-item workspace-project">
              <span title={note.workspace}>
                <HighlightText
                  text={note.workspace || "—"}
                  highlight={searchTerm}
                />
              </span>
              /
              <span title={note.project}>
                <HighlightText
                  text={note.project || "—"}
                  highlight={searchTerm}
                />
              </span>
            </div>
          </div>
        </div>
        <div className="note-content">
          <div
            className="note-card-content-container"
            style={{ position: "relative", height: "100%" }}
            onClick={(e) => {
              // If a link was clicked, don't trigger card selection
              if (e.target.tagName === 'A' && e.target.classList.contains('note-url-link')) {
                e.stopPropagation();
              }
            }}
            onMouseEnter={(e) => shouldShowNotePopup(note) && handleNoteTextMouseEnter(note, e)}
            onMouseLeave={() => shouldShowNotePopup(note) && handleNoteTextMouseLeave()}
          >
            <div
              className="note-text"
              style={{
                maxHeight: "110px",
                overflow: "hidden",
                position: "relative",
              }}
              dangerouslySetInnerHTML={{
                __html: highlightHtmlContent(note.note || "", searchTerm),
              }}
            />
          </div>
        </div>
        <div className="note-footer">
          <div
            className="note-attachments"
            style={{ display: "flex", alignItems: "center", gap: "2px" }}
          >
            {renderCardImageIcon(note)}
            <button
              className="attachment-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleViewAttachments(note);
              }}
            >
              <i
                className="fas fa-paperclip"
                style={{ opacity: note.documentCount > 0 ? 1 : 0.3 }}
              />
              <span>({note.documentCount || 0})</span>
            </button>

            {/* Reply button */}
            <button
              className="attachment-btn"
              style={{
                padding: "4px 8px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#3498db",
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleReplyToNote(note);
              }}
              title="Reply to this note"
            >
              <i className="fas fa-reply" />
            </button>

            {/* Link button - only for reply notes */}
            {isReply && originalNoteId && (
              <button
                className="link-to-note-btn"
                onClick={(e) => handleLinkedNoteClick(note.id, e)}
                onMouseEnter={(e) => handleLinkedNoteMouseEnter(note.id, e)}
                onMouseLeave={handleLinkedNoteMouseLeave}
                style={{
                  background: "none",
                  border: "1px solid #3498db",
                  color: "#3498db",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.2s ease",
                }}
              >
                <i className="fas fa-link" />
              </button>
            )}
          </div>
          <div className="note-actions">
            {renderCardPriorityIndicator(priorityValue, note)}
            <button
              className="action-btn add"
              onClick={(e) => {
                e.stopPropagation();
                handleAddFromRow(note);
              }}
              title="Add New Note"
            >
              <i className="fas fa-plus" />
            </button>
            <button
              className="action-btn edit"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(note);
              }}
              title="Edit Note"
            >
              <i className="fas fa-edit" />
            </button>
            <button
              className="action-btn delete"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(note);
              }}
              title="Delete Note"
            >
              <i className="fas fa-trash" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render priority indicator for card view
const renderCardPriorityIndicator = (priorityValue, note) => {
  const flagColor = priorityValue === 4 ? "#ef5350" : 
                   priorityValue === 3 ? "#e8f628" : "#ccc";
  
  return (
    <i 
      className="fas fa-flag"
      style={{ 
        cursor: "pointer", 
        opacity: priorityValue > 1 ? 1 : 0,
        transition: "all 0.2s ease",
        fontSize: "12px",
        color: flagColor
      }}
      title={priorityValue === 1 ? 'No Priority - Click to set' : 
             priorityValue === 3 ? 'Medium Priority - Click to change' : 
             'High Priority - Click to change'}
      onClick={(e) => {
        e.stopPropagation();
        handlePriorityClick(note, e);
      }}
      onMouseEnter={(e) => { 
        e.currentTarget.style.opacity = "0.9";
        e.currentTarget.style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => { 
        e.currentTarget.style.opacity = priorityValue > 1 ? 1 : 0;
        e.currentTarget.style.transform = "scale(1)";
      }}
    />
  );
};

  // Handle stacked jobs logic
  const notesByJob = {};
  if (viewMode === "stacked") {
    if (jobsToDisplay && jobsToDisplay.length > 0) {
      jobsToDisplay.forEach((job) => {
        if (job && job.jobName && job.notes && Array.isArray(job.notes)) {
          notesByJob[job.jobName] = job.notes;
        }
      });
    }
  } else {
    displayNotes.forEach((note) => {
      const jobName = note.job || "Unassigned";
      if (!notesByJob[jobName]) {
        notesByJob[jobName] = [];
      }
      notesByJob[jobName].push(note);
    });
  }

  // UPDATED: Sort jobs in stacked view by latestTimeStamp (most recent first)
  const sortedJobs =
    viewMode === "stacked"
      ? jobsToDisplay && jobsToDisplay.length > 0
        ? [...jobsToDisplay].filter(job => job).sort((a, b) => {
            // Sort by latestTimeStamp (most recent first), then by noteCount as fallback
            const timeA = a.latestTimeStamp ? new Date(a.latestTimeStamp).getTime() : 0;
            const timeB = b.latestTimeStamp ? new Date(b.latestTimeStamp).getTime() : 0;
            
            // If timestamps are equal or not available, sort by note count
            if (timeB !== timeA) {
              return timeB - timeA; // Most recent first
            }
            return (b.noteCount || 0) - (a.noteCount || 0);
          })
        : []
      : Object.keys(notesByJob).sort((a, b) => {
          const mostRecentA = notesByJob[a][0]
            ? new Date(
                notesByJob[a][0].timeStamp || notesByJob[a][0].date || 0
              ).getTime()
            : 0;
          const mostRecentB = notesByJob[b][0]
            ? new Date(
                notesByJob[b][0].timeStamp || notesByJob[b][0].date || 0
              ).getTime()
            : 0;
          return mostRecentB - mostRecentA;
        });

  const isAnyStackExpanded = Object.values(expandedStacks).some((v) => v);

  // Render collapsed stack (without loading notes yet)
  const renderCollapsedStack = (job) => {
    if (!job) return null;
    
    const jobName = job.jobName;
    const noteCount = job.noteCount || 0;
    const isLoading = job.isLoadingNotes;

    return (
      <div
        key={`stack-${job.jobId || job.jobName}`}
        className={`collapsed-stack ${isLoading ? "loading" : ""}`}
        onClick={() => toggleStackExpansion(jobName, job.jobId)}
        style={{
          cursor: 'pointer',
          position: "relative",
          height: "280px",
          width: "100%",
        }}
      >
        {isLoading && (
          <div
            className="stack-loading-overlay"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              borderRadius: "8px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <i
                className="fas fa-spinner fa-spin"
                style={{
                  fontSize: "24px",
                  color: "#3498db",
                  marginBottom: "10px",
                }}
              />
              <div style={{ fontSize: "14px", color: "#666" }}>
                Loading notes...
              </div>
            </div>
          </div>
        )}

        {[...Array(Math.min(noteCount, 5))].map((_, index) => {
          const isTopCard = index === 0;
          return (
            <div
              key={`layer-${index}`}
              className="stack-layer-card"
              style={{
                position: "absolute",
                right: "0",
                left: `${index * 15}px`,
                transform: `rotate(${index * -2}deg)`,
                zIndex: 5 - index,
                width: "300px",
                height: "250px",
                opacity: 1 - index * 0.2,
                transition: "all 0.3s ease",
                overflow: "hidden",
              }}
            >
              {isTopCard ? (
                <div
                  style={{
                    padding: "15px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "10px",
                      paddingBottom: "10px",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "5px",
                        }}
                      >
                        <i
                          className="fas fa-briefcase"
                          style={{ color: "#14A2B6" }}
                        />
                        <span
                          style={{
                            fontWeight: 600,
                            color: "#2c3e50",
                            fontSize: "16px",
                          }}
                        >
                          {jobName}
                        </span>
                      </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <button
                        className="attachment-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAiDialogForJob(job);
                        }}
                        title="Summarize notes (AI)"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#1976d2' }}
                      >
                        <i className="fas fa-robot" />
                      </button>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#14A2B6",
                          color: "white",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        <i className="fas fa-layer-group" />
                        <span>{noteCount} notes</span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          backgroundColor: "#14A2B6",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {job.lastSiteNoteUserName
                          ? job.lastSiteNoteUserName.charAt(0).toUpperCase()
                          : job.jobName?.charAt(0)?.toUpperCase() || "J"}
                      </div>
                      <span style={{ fontSize: "14px", color: "#555" }}>
                        {job.lastSiteNoteUserName ||
                          (job.notes &&
                            job.notes.length > 0 &&
                            job.notes[0].userName) ||
                          "Loading..."}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        lineHeight: 1.4,
                        flex: 1,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        padding: "8px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "4px",
                        borderLeft: "3px solid #21f869ff",
                        marginTop: "8px",
                        position: "relative",
                      }}
                    >
                      <div
                        className="note-text-preview"
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          lineHeight: 1.4,
                          maxHeight: "60px",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          wordBreak: "break-word",
                        }}
                        dangerouslySetInnerHTML={{
                          __html: highlightHtmlContent(
                            job.lastSiteNote
                              ? job.lastSiteNote
                              : job.notes && job.notes.length > 0
                              ? job.notes[0].note || "No note content"
                              : hasActiveFilters && job.hasLoadedNotes
                              ? "No notes match current filters"
                              : "Click to load notes",
                            searchTerm
                          ),
                        }}
                      />
                    </div>

                    <div
                      style={{
                        fontSize: "11px",
                        color: "#888",
                        marginTop: "auto",
                        paddingTop: "8px",
                        borderTop: "1px dashed #e9ecef",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <i
                        className="fas fa-clock"
                        style={{ fontSize: "10px" }}
                      />
                      <span>
                        {job.latestTimeStamp
                          ? formatRelativeTime(job.latestTimeStamp)
                          : "No updates"}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      paddingTop: "10px",
                      borderTop: "1px dashed #e9ecef",
                      marginTop: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#7f8c8d",
                        fontStyle: "italic",
                      }}
                    >
                      {isLoading ? "Loading..." : "Click to expand"}
                      {hasActiveFilters && !isLoading && " (filtered view)"}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    height: "100%",
                    background:
                      "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#bdc3c7",
                  }}
                >
                  <i
                    className="fas fa-sticky-note"
                    style={{ fontSize: "24px" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render expanded stack with notes - UPDATED to sort notes by timestamp
  const renderExpandedStack = (job) => {
    if (!job) return null;
    
    const jobName = job.jobName;
    // Sort notes by timestamp (most recent first) when displaying
    const jobNotes = job.notes 
      ? [...job.notes].sort((a, b) => {
          const timeA = new Date(a.timeStamp || a.date || 0).getTime();
          const timeB = new Date(b.timeStamp || b.date || 0).getTime();
          return timeB - timeA; // Most recent first
        })
      : [];
    const isLoading = job.isLoadingNotes;
    const hasError = job.errorLoadingNotes;
    const hasLoaded = job.hasLoadedNotes;
    const noteCount = job.noteCount || 0;
    const displayNoteCount = jobNotes.length;

    return (
      <div
        key={`stack-${job.jobId || job.jobName}`}
        className={`job-stack-container expanded-full-width`}
      >
        <div className="expanded-stack">
          <div className="expanded-stack-header">
            <div className="expanded-stack-title-section">
              <div className="expanded-stack-title">
                <i className="fas fa-briefcase" />
                {jobName}
              </div>
            </div>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <button
                    className="attachment-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAiDialogForJob(job);
                    }}
                    title="Summarize notes (AI)"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#1976d2' }}
                  >
                    <i className="fas fa-robot" />
                  </button>

                  <div className="expanded-stack-count">
              <i className="fas fa-layer-group" />
              <span>
                {displayNoteCount} of {noteCount} notes
              </span>
                  </div>
                </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div
              className="stack-notes-loading"
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#666",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                margin: "20px 0",
              }}
            >
              <i
                className="fas fa-spinner fa-spin"
                style={{
                  fontSize: "24px",
                  marginBottom: "10px",
                  display: "block",
                }}
              />
              <div>Loading notes for {jobName}...</div>
            </div>
          )}

          {/* Error state */}
          {hasError && !isLoading && (
            <div
              className="stack-notes-error"
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#e74c3c",
                backgroundColor: "#fdf2f2",
                borderRadius: "8px",
                margin: "20px 0",
                border: "1px solid #f8d7da",
              }}
            >
              <i
                className="fas fa-exclamation-triangle"
                style={{
                  fontSize: "24px",
                  marginBottom: "10px",
                  display: "block",
                }}
              />
              <div style={{ marginBottom: "10px" }}>
                Failed to load notes: {hasError}
              </div>
              <button
                onClick={() => toggleStackExpansion(jobName, job.jobId)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#3498db",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                <i className="fas fa-redo" style={{ marginRight: "8px" }} />
                Retry Loading
              </button>
            </div>
          )}

          {/* Loaded notes */}
          {hasLoaded && !isLoading && !hasError && (
            <>
              {displayNoteCount === 0 ? (
                <div
                  className="no-notes-filtered"
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#999",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    margin: "20px 0",
                  }}
                >
                  <i
                    className="fas fa-search"
                    style={{
                      fontSize: "24px",
                      marginBottom: "10px",
                      display: "block",
                      opacity: 0.5,
                    }}
                  />
                  <div>No notes match your current filters for this job</div>
                  {hasActiveFilters && (
                    <div
                      style={{
                        marginTop: "10px",
                        fontSize: "14px",
                        color: "#666",
                      }}
                    >
                      Try adjusting your filters or clear them to see all notes
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {displayNoteCount > 0 && displayNoteCount < noteCount && (
                    <div
                      className="notes-count-info"
                      style={{
                        padding: "8px",
                        backgroundColor: "#e3f2fd",
                        borderRadius: "4px",
                        margin: "10px 0",
                        fontSize: "12px",
                        color: "#1565c0",
                      }}
                    >
                      <i className="fas fa-info-circle" /> Showing{" "}
                      {displayNoteCount} of {noteCount} notes
                      {hasActiveFilters && " that match your filters"}
                    </div>
                  )}

                  <div className="expanded-notes-grid">
                    {jobNotes.map((note) => {
                      const priorityValue = getPriorityValue(note);
                      const isReply = isNoteReply(note.id);
                      const originalNoteId = isReply
                        ? getReplyNoteId(note.id)
                        : null;

                      return (
                        <div
                          key={note.id}
                          data-note-id={note.id}
                          className={`note-card ${
                            selectedRow === note.id ? "selected" : ""
                          } stack-expanded-card`}
                          onClick={() => handleRowClick(note)}
                          onDoubleClick={() => handleRowDoubleClick(note)}
                        >
                          <div className="note-header">
                            <div className="user-avatar-wrapper">
                              <div className="user-avatar">
                                {note.userName ? (
                                  (() => {
                                    const names = note.userName
                                      .trim()
                                      .split(/\s+/);
                                    const firstInitial = names[0]
                                      ? names[0].charAt(0).toUpperCase()
                                      : "";
                                    const lastInitial =
                                      names.length > 1
                                        ? names[names.length - 1]
                                            .charAt(0)
                                            .toUpperCase()
                                        : "";
                                    return firstInitial + lastInitial;
                                  })()
                                ) : (
                                  <i className="fas fa-user" />
                                )}
                              </div>
                              <div className="user-tooltip">
                                {note.userName || "Unknown User"}
                              </div>
                            </div>
                            <div className="note-meta">
                              <div
                                className="note-author"
                                title={note.userName || "Unknown User"}
                              >
                                {note.userName}
                              </div>
                              <div
                                className="note-date"
                                title={new Date(note.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              >
                                {formatRelativeTime(note.timeStamp)}
                              </div>
                            </div>
                            <div className="note-context">
                              <div
                                className="context-item job"
                                title={note.job}
                              >
                                <HighlightText
                                  text={note.job || "—"}
                                  highlight={searchTerm}
                                />
                              </div>
                              <div className="context-item workspace-project">
                                <span title={note.workspace}>
                                  <HighlightText
                                    text={note.workspace || "—"}
                                    highlight={searchTerm}
                                  />
                                </span>
                                /
                                <span title={note.project}>
                                  <HighlightText
                                    text={note.project || "—"}
                                    highlight={searchTerm}
                                  />
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="note-content">
                            <div
                              className="note-card-content-container"
                              style={{ position: "relative", height: "100%" }}
                              onClick={(e) => {
                                // If a link was clicked, don't trigger card selection
                                if (e.target.tagName === 'A' && e.target.classList.contains('note-url-link')) {
                                  e.stopPropagation();
                                }
                              }}
                              onMouseEnter={(e) => shouldShowNotePopup(note) && handleNoteTextMouseEnter(note, e)}
                              onMouseLeave={() => shouldShowNotePopup(note) && handleNoteTextMouseLeave()}
                            >
                              <div
                                className="note-text"
                                dangerouslySetInnerHTML={{
                                  __html: highlightHtmlContent(note.note, searchTerm),
                                }}
                              />
                            </div>
                          </div>
                          <div className="note-footer">
                            <div
                              className="note-attachments"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                            >
                              {renderStackedImageIcon(note)}
                              <button
                                className="attachment-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewAttachments(note);
                                }}
                              >
                                <i
                                  className="fas fa-paperclip"
                                  style={{
                                    opacity: note.documentCount > 0 ? 1 : 0.3,
                                  }}
                                />
                                <span>({note.documentCount || 0})</span>
                              </button>

                              <button
                                className="attachment-btn"
                                style={{
                                  padding: "4px 8px",
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#3498db",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReplyToNote(note);
                                }}
                                title="Reply to this note"
                              >
                                <i className="fas fa-reply" />
                              </button>

                              {/* Link button - only for reply notes */}
                              {isReply && originalNoteId && (
                                <button
                                  className="link-to-note-btn"
                                  onClick={(e) =>
                                    handleLinkedNoteClick(note.id, e)
                                  }
                                  onMouseEnter={(e) =>
                                    handleLinkedNoteMouseEnter(note.id, e)
                                  }
                                  onMouseLeave={handleLinkedNoteMouseLeave}
                                  style={{
                                    background: "none",
                                    border: "1px solid #3498db",
                                    color: "#3498db",
                                    borderRadius: "4px",
                                    padding: "2px 6px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    transition: "all 0.2s ease",
                                  }}
                                >
                                  <i
                                    className="fas fa-link"
                                    style={{ fontSize: "10px" }}
                                  />
                                </button>
                              )}
                            </div>
                            <div className="note-actions">
                              <i 
                              className="fas fa-flag"
                              style={{ 
                                cursor: "pointer", 
                                opacity: priorityValue > 1 ? 1 : 0,
                                transition: "all 0.2s ease",
                                fontSize: "12px",
                                color: priorityValue === 4 ? "#ef5350" : 
                                      priorityValue === 3 ? "#e8f628" : "#ccc"
                              }}
                              title={priorityValue === 1 ? 'No Priority - Click to set' : 
                                    priorityValue === 3 ? 'Medium Priority - Click to change' : 
                                    'High Priority - Click to change'}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePriorityClick(note, e);
                              }}
                              onMouseEnter={(e) => { 
                                e.currentTarget.style.opacity = "0.9";
                                e.currentTarget.style.transform = "scale(1.1)";
                              }}
                              onMouseLeave={(e) => { 
                                e.currentTarget.style.opacity = priorityValue > 1 ? 1 : 0;
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                            />
                              <button
                                className="action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddFromRow(note);
                                }}
                                title="Add New Note"
                              >
                                <i className="fas fa-plus" />
                              </button>
                              <button
                                className="action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(note);
                                }}
                                title="Edit Note"
                              >
                                <i className="fas fa-edit" />
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(note);
                                }}
                                title="Delete Note"
                              >
                                <i className="fas fa-trash" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* No notes loaded yet */}
          {!hasLoaded && !isLoading && !hasError && (
            <div
              className="stack-notes-placeholder"
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#999",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                margin: "20px 0",
              }}
            >
              <i
                className="fas fa-sticky-note"
                style={{
                  fontSize: "24px",
                  marginBottom: "10px",
                  display: "block",
                  opacity: 0.5,
                }}
              />
              <div>Click "Retry Loading" to load notes for this job</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Find the hovered note for tooltip
  const hoveredNote = displayNotes.find((n) => n.id === hoveredLinkedNote);
  const hoveredOriginalNoteId = hoveredNote
    ? getReplyNoteId(hoveredNote.id)
    : null;

  // Render stacked view loading spinner
  const renderStackedViewLoading = () => {
    return (
      <div
        className="stacked-view-loading"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "400px",
          width: "100%",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
        }}
      >
        <i
          className="fas fa-spinner fa-spin"
          style={{
            fontSize: "48px",
            color: "#3498db",
            marginBottom: "20px",
          }}
        />
        <div
          style={{
            fontSize: "18px",
            color: "#2c3e50",
            marginBottom: "10px",
            fontWeight: "500",
          }}
        >
          {isStackedViewLoading ? "Loading stacked view..." : "Applying filters..."}
        </div>
        <div
          style={{
            fontSize: "14px",
            color: "#7f8c8d",
            textAlign: "center",
            maxWidth: "400px",
          }}
        >
          {isStackedViewLoading
            ? "Please wait while we organize your notes by job..."
            : "Filtering notes across all jobs..."}
        </div>
      </div>
    );
  };

  return (
    <div className="grid-scroll-container" ref={containerRef}>
      {viewMode === "table" ? (
        <div className="responsive-table-container">
          <table>
            <thead>
              <tr>
                {[
                  "date",
                  "workspace",
                  "project",
                  "job",
                  "note",
                  "userName",
                  "Attached Files",
                ].map((c) => (
                  <th key={c} className="filterable-column">
                    {c === "date" && <i className="fas fa-calendar" />}
                    {c === "workspace" && <i className="fas fa-building" />}
                    {c === "project" && (
                      <i className="fas fa-project-diagram" />
                    )}
                    {c === "job" && <i className="fas fa-tasks" />}
                    {c === "note" && <i className="fas fa-sticky-note" />}
                    {c === "userName" && <i className="fas fa-user" />}
                    {c === "Attached Files" && (
                      <i className="fas fa-paperclip" />
                    )}{" "}
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!isDataLoaded ||
              initialLoading ||
              searchLoading ||
              loadingFiltered ||
              loadingUniques ||
              isLoadingInitial ? (
                renderTableSkeleton()
              ) : displayNotes.length === 0 ? (
                renderTableEmptyState()
              ) : (
                <>
                  {displayNotes.map((note, index) =>
                    renderTableRow(
                      note,
                      index,
                      index === displayNotes.length - 1
                    )
                  )}
                  {loadingMore && (
                    <tr>
                      <td
                        colSpan={8}
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        <div className="loading-more">
                          <i
                            className="fas fa-spinner fa-spin"
                            style={{ marginRight: "8px" }}
                          />
                          Loading more notes...
                        </div>
                      </td>
                    </tr>
                  )}
                  {!hasMore &&
                    displayNotes.length > 0 &&
                    !loadingMore &&
                    !hasActiveFilters &&
                    !searchTerm.trim() && (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            textAlign: "center",
                            padding: "10px",
                            color: "#666",
                            fontStyle: "italic",
                          }}
                        >
                          <i
                            className="fas fa-check-circle"
                            style={{ marginRight: "8px", color: "#75a0f5ff" }}
                          />
                          No more notes to load
                        </td>
                      </tr>
                    )}
                </>
              )}
            </tbody>
          </table>
        </div>
      ) : viewMode === "stacked" ? (
        <div className="stacked-notes-horizontal">
          {/* Show loading spinner when switching to stacked view or filtering */}
          {(isStackedViewLoading || isFilteringStacked) ? (
            renderStackedViewLoading()
          ) : loadingStackedJobs && !hasActiveFilters ? (
            // Show skeleton only when loading initial stacked jobs (not during filtering)
            [...Array(3)].map((_, i) => (
              <div key={i} className="job-stack-skeleton">
                <div className="skeleton-stack-header" />
                <div className="skeleton-stack-content" />
              </div>
            ))
          ) : !jobsToDisplay || jobsToDisplay.length === 0 ? (
            <div className="empty-state">
              <i
                className="fas fa-layer-group"
                style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}
              />
              <h3>
                {loadingStackedJobs || loadingFiltered
                  ? "Loading jobs..."
                  : hasActiveFilters
                  ? "No jobs match your filters"
                  : "No stacked jobs available"}
              </h3>
              <p>
                {loadingStackedJobs || loadingFiltered
                  ? "Please wait while we load your jobs..."
                  : hasActiveFilters
                  ? "Try adjusting your filters to see matching jobs"
                  : "No jobs with notes found."}
              </p>
            </div>
          ) : (
            <div className="stacked-container">
              {isAnyStackExpanded && (
                <div className="fixed-collapse-btn-wrapper">
                  <button
                    className="collapse-all-stacks-btn"
                    onClick={() => {
                      Object.keys(expandedStacks).forEach((jobName) => {
                        if (expandedStacks[jobName]) {
                          const job = jobsToDisplay.find(
                            (j) => j && j.jobName === jobName
                          );
                          if (job) {
                            toggleStackExpansion(jobName, job.jobId);
                          }
                        }
                      });
                    }}
                  >
                    <i className="fas fa-compress" />
                  </button>
                </div>
              )}
              {sortedJobs.map((job) => {
                if (!job) return null;
                
                const jobName = job.jobName;
                const isExpanded = expandedStacks[jobName];

                if (!isExpanded && isAnyStackExpanded) {
                  return null;
                }

                return isExpanded
                  ? renderExpandedStack(job)
                  : renderCollapsedStack(job);
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="notes-grid">
          {!isDataLoaded ||
          initialLoading ||
          searchLoading ||
          loadingFiltered ||
          isLoadingInitial ? (
            renderCardSkeleton()
          ) : displayNotes.length === 0 ? (
            renderCardEmptyState()
          ) : (
            <>
              {displayNotes.map((note, index) =>
                renderNoteCard(note, index, index === displayNotes.length - 1)
              )}
              {loadingMore && (
                <div className="loading-more-cards">
                  <i
                    className="fas fa-spinner fa-spin"
                    style={{ marginRight: "8px" }}
                  />
                  Loading more notes...
                </div>
              )}
              {!hasMore &&
                displayNotes.length > 0 &&
                !loadingMore &&
                !hasActiveFilters &&
                !searchTerm.trim() && (
                  <div
                    className="no-more-notes"
                    style={{
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      padding: "8px",
                      color: "#666",
                      fontStyle: "italic",
                      borderRadius: "8px",
                      margin: "5px 0",
                    }}
                  >
                    <i
                      className="fas fa-check-circle"
                      style={{ marginRight: "8px", color: "#75a0f5ff" }}
                    />
                    No more notes to load
                  </div>
                )}
            </>
          )}
        </div>
      )}

      {/* Unified Note Text Popup - SIMPLIFIED */}
      {hoveredNoteContent && (
        <NoteTextPopup
          content={hoveredNoteContent}
          position={notePopupPosition}
          elementRect={noteElementRect}
          searchTerm={searchTerm}
          viewMode={viewMode}
          onClose={() => setHoveredNoteContent(null)}
        />
      )}

      {/* Global tooltip portal for linked notes */}
      {hoveredLinkedNote && hoveredOriginalNoteId && (
        <TooltipPortal>
          <div
            className="linked-note-tooltip"
            style={{
              position: "fixed",
              top: `${tooltipPosition.y}px`,
              left: `${tooltipPosition.x}px`,
              zIndex: 999999,
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              maxWidth: "350px",
              minWidth: "300px",
              fontSize: "12px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#2c3e50",
                borderBottom: "2px solid #3498db",
                paddingBottom: "6px",
                fontSize: "13px",
              }}
            >
              <i
                className="fas fa-link"
                style={{ marginRight: "6px", color: "#3498db" }}
              />
              Linked to Original Note #{hoveredOriginalNoteId}
            </div>

            {loadingLinkedNote[hoveredOriginalNoteId] ? (
              <div
                style={{
                  color: "#3498db",
                  fontStyle: "italic",
                  padding: "16px",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <i className="fas fa-spinner fa-spin" />
                Loading original note...
              </div>
            ) : linkedNoteContent[hoveredOriginalNoteId] ? (
              <>
                <div
                  style={{
                    margin: "8px 0 12px 0",
                    color: "#555",
                    lineHeight: 1.5,
                    maxHeight: "80px",
                    overflow: "hidden",
                    backgroundColor: "#f8f9fa",
                    padding: "8px",
                    borderRadius: "4px",
                    borderLeft: "3px solid #3498db",
                  }}
                >
                  <strong>Content:</strong>{" "}
                  {formatTooltipContent(
                    linkedNoteContent[hoveredOriginalNoteId].content
                  )}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#7f8c8d",
                    backgroundColor: "#f5f5f5",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                >
                  <div style={{ marginBottom: "4px" }}>
                    <i
                      className="fas fa-user"
                      style={{ marginRight: "6px", width: "12px" }}
                    />
                    <strong>By:</strong>{" "}
                    {linkedNoteContent[hoveredOriginalNoteId].userName}
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    <i
                      className="far fa-clock"
                      style={{ marginRight: "6px", width: "12px" }}
                    />
                    <strong>Date:</strong>{" "}
                    {new Date(
                      linkedNoteContent[hoveredOriginalNoteId].date
                    ).toLocaleDateString()}{" "}
                    {new Date(
                      linkedNoteContent[hoveredOriginalNoteId].date
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {(linkedNoteContent[hoveredOriginalNoteId].workspace ||
                    linkedNoteContent[hoveredOriginalNoteId].project ||
                    linkedNoteContent[hoveredOriginalNoteId].job) && (
                    <div>
                      <i
                        className="fas fa-map-marker-alt"
                        style={{ marginRight: "6px", width: "12px" }}
                      />
                      <strong>Location:</strong>{" "}
                      {linkedNoteContent[hoveredOriginalNoteId].workspace} /{" "}
                      {linkedNoteContent[hoveredOriginalNoteId].project} /{" "}
                      {linkedNoteContent[hoveredOriginalNoteId].job}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div
                style={{
                  color: "#3498db",
                  fontStyle: "italic",
                  padding: "16px",
                  textAlign: "center",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "4px",
                }}
              >
                <i
                  className="fas fa-info-circle"
                  style={{ marginRight: "8px" }}
                />
                Hover to load original note preview
              </div>
            )}

            <div
              style={{
                fontSize: "11px",
                color: "#3498db",
                marginTop: "8px",
                fontStyle: "italic",
                paddingTop: "8px",
                borderTop: "1px solid #eee",
              }}
            >
              <i
                className="fas fa-mouse-pointer"
                style={{ marginRight: "6px" }}
              />
              Click to jump to original note
            </div>

            {/* Add a small arrow pointing to the mouse/cursor */}
            <div
              style={{
                position: "absolute",
                top: "-8px",
                left: "20px",
                width: "16px",
                height: "16px",
                backgroundColor: "white",
                borderLeft: "1px solid #ddd",
                borderTop: "1px solid #ddd",
                transform: "rotate(45deg)",
                zIndex: 1,
              }}
            />
          </div>
        </TooltipPortal>
      )}

      {/* Reply Modal */}
      {/* AI Chat Dialog */}
      {showAiDialog && aiJobContext && (
        <AiChatDialog
          open={showAiDialog}
          onClose={closeAiDialog}
          job={aiJobContext}
          userId={userId}
        />
      )}

      {showReplyModal && selectedNoteForReply && (
        <ReplyModal
          note={selectedNoteForReply}
          onClose={() => {
            setShowReplyModal(false);
            setSelectedNoteForReply(null);
          }}
          refreshNotes={refreshNotesAfterReply}
        />
      )}
    </div>
  );
};

NotesTab.propTypes = {
  viewMode: PropTypes.string.isRequired,
  finalDisplayNotes: PropTypes.array,
  isDataLoaded: PropTypes.bool.isRequired,
  initialLoading: PropTypes.bool.isRequired,
  searchLoading: PropTypes.bool.isRequired,
  loadingFiltered: PropTypes.bool.isRequired,
  loadingUniques: PropTypes.bool.isRequired,
  searchTerm: PropTypes.string.isRequired,
  getActiveFilterCount: PropTypes.func.isRequired,
  handleRowClick: PropTypes.func.isRequired,
  handleRowDoubleClick: PropTypes.func.isRequired,
  handleAddFromRow: PropTypes.func.isRequired,
  handleEdit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleViewAttachments: PropTypes.func.isRequired,
  selectedRow: PropTypes.any,
  focusedRow: PropTypes.any,
  inlineImagesMap: PropTypes.object.isRequired,
  loadingImages: PropTypes.object.isRequired,
  renderTableImageIcon: PropTypes.func.isRequired,
  renderCardImageIcon: PropTypes.func.isRequired,
  renderStackedImageIcon: PropTypes.func.isRequired,
  setShowPriorityDropdown: PropTypes.func.isRequired,
  setSelectedNoteForPriority: PropTypes.func.isRequired,
  setPriorityDropdownPosition: PropTypes.func.isRequired,
  expandedStacks: PropTypes.object.isRequired,
  toggleStackExpansion: PropTypes.func.isRequired,
  expandedCardLimit: PropTypes.object.isRequired,
  jobs: PropTypes.array.isRequired,
  setViewNote: PropTypes.func.isRequired,
  setShowViewModal: PropTypes.func.isRequired,
  stackedJobs: PropTypes.array,
  loadingStackedJobs: PropTypes.bool,
  fetchStackedJobs: PropTypes.func,
  fetchNotes: PropTypes.func.isRequired,
  userId: PropTypes.number.isRequired,
  hasActiveFilters: PropTypes.bool.isRequired,
  filteredNotesFromApi: PropTypes.array.isRequired,
  searchResults: PropTypes.array.isRequired,
  projects: PropTypes.array,
  workspaces: PropTypes.array,
};

NotesTab.defaultProps = {
  finalDisplayNotes: [],
  stackedJobs: [],
  loadingStackedJobs: false,
  fetchStackedJobs: () => {},
  filteredNotesFromApi: [],
  searchResults: [],
  projects: [],
  workspaces: [],
};

export default NotesTab;