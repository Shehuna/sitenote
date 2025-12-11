import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import PropTypes from "prop-types";
import "./Dashboard.css";
import NewNoteModal from "./Modals/NewNoteModal";
import EditNoteModal from "./Modals/EditNoteModal";
import SettingsModal from "./Modals/SettingsModal";
import AttachedFileModal from "./Modals/AttachedfileModal.jsx";
import ViewNoteModal from "./Modals/ViewNoteModal";
import toast from "react-hot-toast";
import InlineImageViewer from "./Modals/InlineImageViewer";

const Dashboard = ({
  notes,
  userid,
  userRole,
  refreshNotes,
  addSiteNote,
  updateNote,
  projects,
  jobs,
  onUploadDocument,
  onDeleteDocument,
  onLogout,
  workspaces,
  defaultUserWorkspaceID,
  defaultUserWorkspaceName,
  onUpdateDefaultWorkspace,
  fetchProjectAndJobs,
}) => {
  const [searchTerm, setSearchTerm] = useState(() => {
    const saved = localStorage.getItem("dashboardSearchTerm");
    return saved || "";
  });
  const [searchResults, setSearchResults] = useState(() => {
    const saved = localStorage.getItem("dashboardSearchResults");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedFilters, setSelectedFilters] = useState(() => {
    const saved = localStorage.getItem("dashboardSelectedFilters");
    return saved
      ? JSON.parse(saved)
      : {
          date: [],
          workspace: [],
          project: [],
          job: [],
          userName: [],
        };
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showAttachedFileModal, setShowAttachedFileModal] = useState(false);
  const [selectedFileNote, setSelectedFileNote] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewNote, setViewNote] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(null);
  const [filterSearchTerm, setFilterSearchTerm] = useState("");
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueJobs, setUniqueJobs] = useState([]);
  const [uniqueWorkspaces, setUniqueWorkspaces] = useState([]);
  const [uniqueDates, setUniqueDates] = useState([]);
  const [uniqueUsernames, setUniqueUsernames] = useState([]);
  const [loadingFiltered, setLoadingFiltered] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [priorities, setPriorities] = useState([]);
  const [role, setRole] = useState(null);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [loadingUniques, setLoadingUniques] = useState(true);
  const [userWorkspaces, setUserWorkspaces] = useState();
  const [userWorkspace, setUserWorkspace] = useState();
  const [focusedRow, setFocusedRow] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchColumn, setSearchColumn] = useState("");
  const [prefilledData, setPrefilledData] = useState(null);
  const [showRequestWorkspaceModal, setShowRequestWorkspaceModal] =
    useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [priorityDropdownPosition, setPriorityDropdownPosition] = useState({
    x: 0,
    y: 0,
  });
  const [selectedNoteForPriority, setSelectedNoteForPriority] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem("dashboardViewMode");
    return saved || "cards";
  });
  const [modalSource, setModalSource] = useState("dashboard");
  const [expandedStacks, setExpandedStacks] = useState({});
  const [expandedCardLimit, setExpandedCardLimit] = useState({});

  const [inlineImagesMap, setInlineImagesMap] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageNote, setSelectedImageNote] = useState(null);

  const newNoteModalRef = useRef();
  const filterRef = useRef();

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

  // Fetch inline images for a note
  const fetchInlineImages = useCallback(
    async (noteId) => {
      if (!noteId || inlineImagesMap[noteId]) return;

      setLoadingImages((prev) => ({ ...prev, [noteId]: true }));

      try {
        const response = await fetch(
          `${apiUrl}/InlineImages/GetInlineImagesBySiteNote?siteNoteId=${noteId}`
        );

        if (response.ok) {
          const data = await response.json();
          const images = data.images || [];

          setInlineImagesMap((prev) => ({
            ...prev,
            [noteId]: images,
          }));
        }
      } catch (error) {
        console.error(
          `Error fetching inline images for note ${noteId}:`,
          error
        );
        setInlineImagesMap((prev) => ({
          ...prev,
          [noteId]: [],
        }));
      } finally {
        setLoadingImages((prev) => ({ ...prev, [noteId]: false }));
      }
    },
    [apiUrl, inlineImagesMap]
  );


  // Simple client-side filtering function
  const applyFilters = useCallback((notesToFilter, filters) => {
    if (
      !notesToFilter ||
      !Array.isArray(notesToFilter) ||
      notesToFilter.length === 0
    ) {
      return notesToFilter;
    }

    // Check if any filters are active
    const hasActiveFilters = Object.keys(filters).some(
      (key) =>
        filters[key] && Array.isArray(filters[key]) && filters[key].length > 0
    );

    if (!hasActiveFilters) {
      return notesToFilter;
    }

    return notesToFilter.filter((note) => {
      // Check each filter type
      let passesAllFilters = true;

      // Date filter
      if (filters.date && filters.date.length > 0) {
        const noteDate = note.date ? note.date.toString() : "";
        passesAllFilters =
          passesAllFilters &&
          filters.date.some((date) => noteDate.includes(date.toString()));
      }

      // Workspace filter
      if (filters.workspace && filters.workspace.length > 0) {
        const noteWorkspace = note.workspace ? note.workspace.toString() : "";
        passesAllFilters =
          passesAllFilters &&
          filters.workspace.some(
            (workspace) => noteWorkspace === workspace.toString()
          );
      }

      // Project filter
      if (filters.project && filters.project.length > 0) {
        const noteProject = note.project ? note.project.toString() : "";
        passesAllFilters =
          passesAllFilters &&
          filters.project.some((project) => noteProject === project.toString());
      }

      // Job filter
      if (filters.job && filters.job.length > 0) {
        const noteJob = note.job ? note.job.toString() : "";
        passesAllFilters =
          passesAllFilters &&
          filters.job.some((job) => noteJob === job.toString());
      }

      // User filter
      if (filters.userName && filters.userName.length > 0) {
        const noteUser = note.userName ? note.userName.toString() : "";
        passesAllFilters =
          passesAllFilters &&
          filters.userName.some((user) => noteUser === user.toString());
      }

      return passesAllFilters;
    });
  }, []);

  // Get filtered notes based on selected filters
  const filteredNotes = useMemo(() => {
    if (!notes || !Array.isArray(notes)) {
      return [];
    }

    return applyFilters(notes, selectedFilters);
  }, [notes, selectedFilters, applyFilters]);

  // Get display notes (search results OR filtered notes)
  const displayNotes = useMemo(() => {
    if (searchTerm.trim()) {
      return searchResults;
    }

    return filteredNotes;
  }, [searchTerm, searchResults, filteredNotes]);

  // Filter out archived jobs from display notes
  const finalDisplayNotes = useMemo(() => {
    if (!displayNotes || !Array.isArray(displayNotes)) {
      return [];
    }

    return displayNotes
      .filter((n) => {
        const job = jobs?.find(
          (j) => j.id.toString() === n.jobId?.toString() || j.name === n.job
        );
        return job && job.status !== 3;
      })
      .sort((a, b) => b.id - a.id);
  }, [displayNotes, jobs]);

  // Fetch inline images when notes are loaded
  useEffect(() => {
    if (isDataLoaded && finalDisplayNotes && finalDisplayNotes.length > 0) {
      finalDisplayNotes.forEach((note) => {
        if (!inlineImagesMap[note.id] && !loadingImages[note.id]) {
          fetchInlineImages(note.id);
        }
      });
    }
  }, [
    isDataLoaded,
    finalDisplayNotes,
    inlineImagesMap,
    loadingImages,
    fetchInlineImages,
  ]);

  // Handle image thumbnail click
  const handleImageThumbnailClick = useCallback(
    (note, imageIndex = 0) => {
      const images = inlineImagesMap[note.id] || [];
      if (images.length > 0) {
        setSelectedImageNote(note);
        setSelectedImage({
          image: images[imageIndex],
          index: imageIndex,
          total: images.length,
        });
        setShowImageViewer(true);
      }
    },
    [inlineImagesMap]
  );

  // Navigate through images
  const handleNextImage = useCallback(() => {
    if (selectedImage && selectedImageNote) {
      const images = inlineImagesMap[selectedImageNote.id] || [];
      const nextIndex = (selectedImage.index + 1) % images.length;
      setSelectedImage({
        image: images[nextIndex],
        index: nextIndex,
        total: images.length,
      });
    }
  }, [selectedImage, selectedImageNote, inlineImagesMap]);

  const handlePrevImage = useCallback(() => {
    if (selectedImage && selectedImageNote) {
      const images = inlineImagesMap[selectedImageNote.id] || [];
      const prevIndex =
        (selectedImage.index - 1 + images.length) % images.length;
      setSelectedImage({
        image: images[prevIndex],
        index: prevIndex,
        total: images.length,
      });
    }
  }, [selectedImage, selectedImageNote, inlineImagesMap]);

  useEffect(() => {
    localStorage.setItem("dashboardSearchTerm", searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem(
      "dashboardSearchResults",
      JSON.stringify(searchResults)
    );
  }, [searchResults]);

  useEffect(() => {
    localStorage.setItem(
      "dashboardSelectedFilters",
      JSON.stringify(selectedFilters)
    );
  }, [selectedFilters]);

  useEffect(() => {
    localStorage.setItem("dashboardViewMode", viewMode);
  }, [viewMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterDropdownOpen(null);
        setFilterSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const styles = {
    searchBox: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "20px",
      flexWrap: "wrap",
    },
    searchInput: {
      flex: 1,
      minWidth: "200px",
      padding: "8px 12px",
      border: "1px solid #ddd",
      borderRadius: "4px",
    },
    searchHint: {
      background: "#f0f0f0",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "0.9em",
      display: "flex",
      alignItems: "center",
      gap: "5px",
    },
    clearGroupBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#666",
      padding: 0,
      fontSize: "1.1em",
      lineHeight: 1,
    },
    clearGroupBtnHover: {
      color: "#333",
    },
    workspaceHeader: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "2px",
    },
    workspaceTopRow: {
      display: "flex",
      alignItems: "center",
      gap: "2px",
    },
    workspaceName: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#2c3e50",
      padding: "8px 2px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      minWidth: "0px",
      justifyContent: "center",
    },
    filterContainer: {
      display: "flex",
      flexWrap: "wrap",
      gap: "12px",
      marginBottom: "20px",
      padding: "16px",
      backgroundColor: "#f8f9fa",
      borderRadius: "10px",
      border: "1px solid #e9ecef",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      alignItems: "center",
    },
    filterDropdown: {
      position: "relative",
      flex: "1 1 200px",
      minWidth: "200px",
    },
    filterButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 14px",
      backgroundColor: "white",
      border: "1px solid #ddd",
      borderRadius: "6px",
      cursor: "pointer",
      width: "100%",
      textAlign: "left",
      transition: "all 0.2s ease",
      fontSize: "14px",
      fontWeight: "500",
      color: "#333",
    },
    filterButtonHover: {
      borderColor: "#3498db",
      boxShadow: "0 0 0 2px rgba(52, 152, 219, 0.2)",
    },
    filterButtonInfo: {
      borderColor: "#17a2b8",
      backgroundColor: "#e3f2fd",
    },
    dropdownContent: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      backgroundColor: "white",
      border: "1px solid #ddd",
      borderRadius: "6px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      zIndex: 1000,
      maxHeight: "360px",
      overflow: "hidden",
      marginTop: "4px",
    },
    dropdownSearch: {
      padding: "10px 14px",
      borderBottom: "1px solid #eee",
      backgroundColor: "#f8f9fa",
      position: "sticky",
      top: 0,
      zIndex: 1,
    },
    dropdownSearchInput: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #ddd",
      borderRadius: "4px",
      fontSize: "14px",
      boxSizing: "border-box",
    },
    dropdownList: {
      maxHeight: "280px",
      overflowY: "auto",
      padding: "4px 0",
    },
    checkboxItem: {
      padding: "10px 14px",
      borderBottom: "1px solid #f5f5f5",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
    },
    checkboxItemHover: {
      backgroundColor: "#f8f9fa",
    },
    checkbox: {
      width: "16px",
      height: "16px",
      cursor: "pointer",
      accentColor: "#3498db",
    },
    filterTag: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      backgroundColor: "#e3f2fd",
      padding: "6px 10px",
      borderRadius: "6px",
      fontSize: "0.85em",
      marginRight: "6px",
      marginBottom: "6px",
      border: "1px solid #bbdefb",
      fontWeight: "500",
    },
    filterTagRemove: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: "1.1em",
      lineHeight: 1,
      color: "#666",
      padding: "0 2px",
      transition: "color 0.2s ease",
    },
    filterTagRemoveHover: {
      color: "#e74c3c",
    },
    clearAllButton: {
      padding: "8px 16px",
      backgroundColor: "#6c757d",
      color: "#fff",
      border: "1px solid #6c757d",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      whiteSpace: "nowrap",
      height: "36px",
    },
    clearAllButtonHover: {
      backgroundColor: "#5a6268",
      borderColor: "#545b62",
    },
    activeFiltersContainer: {
      marginBottom: "15px",
      padding: "12px 16px",
      backgroundColor: "#f8f9fa",
      borderRadius: "8px",
      border: "1px solid #e9ecef",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "10px",
    },
    activeFiltersTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#495057",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      flex: 1,
      minWidth: "200px",
    },
    activeFiltersContent: {
      display: "flex",
      flexWrap: "wrap",
      gap: "5px",
      alignItems: "center",
      flex: 2,
    },
    emptyFilterMessage: {
      padding: "16px",
      textAlign: "center",
      color: "#999",
      fontSize: "14px",
    },
    filterInfoBadge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "18px",
      height: "18px",
      borderRadius: "50%",
      backgroundColor: "#17a2b8",
      color: "white",
      fontSize: "10px",
      marginLeft: "6px",
      cursor: "help",
    },
  };
  const toggleStackExpansion = (jobName) => {
    setExpandedStacks((prev) => ({ ...prev, [jobName]: !prev[jobName] }));
    if (!expandedStacks[jobName]) {
      setExpandedCardLimit((prev) => ({ ...prev, [jobName]: 50 }));
    } else {
      setExpandedCardLimit((prev) => {
        const newState = { ...prev };
        delete newState[jobName];
        return newState;
      });
    }
  };

  const loadMoreCards = (jobName) => {
    setExpandedCardLimit((prev) => {
      const currentLimit = prev[jobName] ?? 50;

      return {
        ...prev,
        [jobName]: currentLimit + 10,
      };
    });
  };

  // Define handleViewAttachments function
  const handleViewAttachments = useCallback((note) => {
    setSelectedFileNote(note);
    setShowAttachedFileModal(true);
  }, []);

  const handleRequestWorkspace = () => {
    setShowRequestWorkspaceModal(true);
    toast.success("Workspace request feature coming soon!");
  };

 const handleRowDoubleClick = useCallback(
    (note) => {
      
      let job = jobs.find((j) => j.name && note.job && j.name === note.job);
      if (!job && note.jobId) {
        job = jobs.find((j) => (j.id || j.jobId)?.toString() === note.jobId.toString());
      }

      setViewNote({
        id: note.id,
        jobId: job?.id ?? null,
      });
      setShowViewModal(true);
    },
    [jobs]
  );

  const fetchUniqueProjects = async () => {
    try {
      const r = await fetch(
        `${apiUrl}/SiteNote/GetUniqueProjects?userId=${userid}`
      );
      if (r.ok) setUniqueProjects((await r.json()).projects || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUniqueJobs = async () => {
    try {
      const r = await fetch(
        `${apiUrl}/SiteNote/GetUniqueJobs?userId=${userid}`
      );
      if (r.ok) setUniqueJobs((await r.json()).jobs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUniqueWorkspaces = async () => {
    try {
      const r = await fetch(
        `${apiUrl}/SiteNote/GetUniqueWorkspaces?userId=${userid}`
      );
      if (r.ok) setUniqueWorkspaces((await r.json()).workspaces || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUniqueDates = async () => {
    try {
      const r = await fetch(
        `${apiUrl}/SiteNote/GetUniqueDates?userId=${userid}`
      );
      if (r.ok) setUniqueDates((await r.json()).dates || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUniqueUsernames = async () => {
    try {
      const r = await fetch(
        `${apiUrl}/SiteNote/GetUniqueUsernames?userId=${userid}`
      );
      if (r.ok) setUniqueUsernames((await r.json()).usernames || []);
    } catch (e) {
      console.error(e);
    }
  };

  const getHash = (str) => {
    if (!str) return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/UserManagement/GetUserById/${userid}`
        );
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    if (userid) {
      fetchCurrentUser();
    }
  }, [userid, apiUrl]);

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
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

  // Apply filters when selectedFilters changes
  useEffect(() => {
    if (isDataLoaded && notes && notes.length > 0) {
      setLoadingFiltered(false);
    }
  }, [selectedFilters, notes, isDataLoaded]);

  useEffect(() => {
    if (userid && defaultUserWorkspaceID) {
      fetchUserWorkspaceRole();
      fetchWorkspacesByUserId();
      fetchPriorities();
    }
  }, [userid, defaultUserWorkspaceID]);

  useEffect(() => {
    const fetchAllUniques = async () => {
      if (userid) {
        await Promise.all([
          fetchUniqueProjects(),
          fetchUniqueJobs(),
          fetchUniqueWorkspaces(),
          fetchUniqueDates(),
          fetchUniqueUsernames(),
        ]);
        setLoadingUniques(false);
      }
    };
    fetchAllUniques();
  }, [userid]);

  useEffect(() => {
    if (notes !== undefined) {
      setIsDataLoaded(true);
      setInitialLoading(false);
    }
  }, [notes]);

  const handlePriorityUpdate = () => {
    fetchPriorities();
  };

  const handlePriorityChange = async (priorityValue) => {
    if (!selectedNoteForPriority) return;

    try {
      const user = JSON.parse(localStorage.getItem("user"));

      const existingPriority = priorities.find(
        (p) => p.noteID == selectedNoteForPriority.id
      );

      let response;

      if (existingPriority && existingPriority.id) {
        const updateUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Priority/UpdatePriority/${existingPriority.id}`;
        response = await fetch(updateUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priorityValue: priorityValue,
          }),
        });
      } else {
        const createUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Priority/AddPriority`;
        response = await fetch(createUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            noteID: selectedNoteForPriority.id,
            priorityValue: priorityValue,
            userId: user.id,
          }),
        });
      }

      if (response.ok) {
        toast.success("Priority updated successfully");
        handlePriorityUpdate();
        await refreshNotes();
      } else {
        const errorText = await response.text();
        console.error("API Error response:", errorText);
        throw new Error(
          `Failed to update priority: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error updating priority:", error);
      toast.error("Failed to update priority. Please try again.");
    } finally {
      setShowPriorityDropdown(false);
      setSelectedNoteForPriority(null);
    }
  };

  const handleRowClick = useCallback((note, event) => {
    setFocusedRow(note.id);
    setSelectedRow(note.id);
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (!focusedRow) return;

      const currentIndex = finalDisplayNotes.findIndex(
        (note) => note.id === focusedRow
      );

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = Math.min(
          currentIndex + 1,
          finalDisplayNotes.length - 1
        );
        if (nextIndex !== currentIndex) {
          setFocusedRow(finalDisplayNotes[nextIndex].id);
          setSelectedRow(finalDisplayNotes[nextIndex].id);
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (prevIndex !== currentIndex) {
          setFocusedRow(finalDisplayNotes[prevIndex].id);
          setSelectedRow(finalDisplayNotes[prevIndex].id);
        }
      } else if (event.ctrlKey && event.key === "a" && focusedRow) {
        event.preventDefault();
        const selectedNote = finalDisplayNotes.find(
          (note) => note.id === focusedRow
        );
        if (selectedNote) {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, "0");
          const day = String(today.getDate()).padStart(2, "0");
          const currentDateFormatted = `${year}-${month}-${day}`;

          setPrefilledData({
            date: currentDateFormatted,
            project: selectedNote.project,
            job: selectedNote.job,
            workspace: selectedNote.workspace,
          });
          setModalSource("grid");
          setShowNewModal(true);
        }
      }
    },
    [focusedRow, finalDisplayNotes]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleRefresh = async () => {
    setInitialLoading(true);
    try {
      await refreshNotes();
      await Promise.all([
        fetchUniqueProjects(),
        fetchUniqueJobs(),
        fetchUniqueWorkspaces(),
        fetchUniqueDates(),
        fetchUniqueUsernames(),
      ]);
      if (defaultUserWorkspaceID) {
        await fetchUserWorkspaceRole();
      }
    } catch {
      toast.error("Refresh error");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleAddFromRow = (note) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const currentDateFormatted = `${year}-${month}-${day}`;

    setPrefilledData({
      date: currentDateFormatted,
      project: note.project,
      job: note.job,
      workspace: note.workspace,
      userId: note.userId,
    });

    setModalSource("grid");
    setShowNewModal(true);
  };

  const handleNewNoteClick = () => {
    setPrefilledData(null);
    setModalSource("dashboard");
    setShowNewModal(true);
  };

  useEffect(() => {
    if (showNewModal && modalSource === "grid" && newNoteModalRef.current) {
      const timer = setTimeout(() => {
        if (newNoteModalRef.current) {
          newNoteModalRef.current.focusTextarea();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [showNewModal, modalSource]);

  const handleEdit = (note) => {
    setSelectedNote(note);
    setShowEditModal(true);
  };

  const handleDelete = (note) => {
    // Check if current user is the note creator
    const currentUser = JSON.parse(localStorage.getItem("user"));
    if (note.userId && Number(note.userId) !== Number(currentUser.id)) {
      toast.error("You can only delete notes that you created.");
      return;
    }

    const hrs = (Date.now() - new Date(note.timeStamp)) / 36e5;
    if (hrs > 24) {
      toast.error("Cannot delete notes older than 24 hours");
    } else {
      setNoteToDelete(note);
      setShowDeleteConfirm(true);
    }
  };

  // Function to delete inline images associated with a note
  const deleteInlineImages = async (noteId) => {
    try {
      // Get inline images for the note
      const imagesResponse = await fetch(
        `${apiUrl}/InlineImages/GetInlineImagesBySiteNote?siteNoteId=${noteId}`
      );

      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        const images = imagesData.images || [];

        // Delete each image
        for (const image of images) {
          const deleteImageResponse = await fetch(
            `${apiUrl}/InlineImages/DeleteInlineImage/${image.id}`,
            {
              method: "DELETE",
            }
          );

          if (!deleteImageResponse.ok) {
            console.error(`Failed to delete image ${image.id}`);
            // Continue with other deletions even if one fails
          }
        }

        console.log(
          `Deleted ${images.length} inline images for note ${noteId}`
        );
        return true;
      } else {
        console.error(`Failed to fetch images for note ${noteId}`);
        return false;
      }
    } catch (error) {
      console.error("Error deleting inline images:", error);
      return false;
    }
  };

  // Function to delete attached documents associated with a note
  const deleteAttachedDocuments = async (noteId) => {
    try {
      // Get documents for the note
      const docsResponse = await fetch(
        `${apiUrl}/Documents/GetDocumentMetadataByReference?siteNoteId=${noteId}`
      );

      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        const documents = docsData.documents || [];

        // Delete each document
        for (const document of documents) {
          const deleteDocResponse = await fetch(
            `${apiUrl}/Documents/DeleteDocument/${document.id}`,
            {
              method: "DELETE",
            }
          );

          if (!deleteDocResponse.ok) {
            console.error(`Failed to delete document ${document.id}`);
            // Continue with other deletions even if one fails
          }
        }

        console.log(`Deleted ${documents.length} documents for note ${noteId}`);
        return true;
      } else {
        console.error(`Failed to fetch documents for note ${noteId}`);
        return false;
      }
    } catch (error) {
      console.error("Error deleting documents:", error);
      return false;
    }
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;

    setIsDeleting(true);

    try {
      // 1. First delete inline images
      const imagesDeleted = await deleteInlineImages(noteToDelete.id);
      if (!imagesDeleted) {
        toast.error("Failed to delete inline images. Please try again.");
        setIsDeleting(false);
        return;
      }

      // 2. Then delete attached documents
      const documentsDeleted = await deleteAttachedDocuments(noteToDelete.id);
      if (!documentsDeleted) {
        toast.error("Failed to delete attached documents. Please try again.");
        setIsDeleting(false);
        return;
      }

      // 3. Finally delete the note itself
      const url = new URL(
        `${apiUrl}/SiteNote/DeleteSiteNote/${noteToDelete.id}`
      );
      url.searchParams.append("userId", userid);

      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Delete failed");
      }

      toast.success("Note and associated files deleted successfully");
      await refreshNotes();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        error.message || "Failed to delete note and associated files"
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setNoteToDelete(null);
    }
  };

  useEffect(() => {
    const run = async () => {
      const t = searchTerm.trim();
      if (!t || !userid) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      try {
        const r = await fetch(
          `${apiUrl}/SiteNote/SearchSiteNotes?searchTerm=${encodeURIComponent(
            t
          )}&pageNumber=1&pageSize=50&userId=${userid}`
        );
        if (!r.ok) throw new Error();
        const d = await r.json();
        setSearchResults(
          (d.siteNotes || []).map((n) => ({
            ...n,
            userName: n.UserName || n.userName,
            documentCount: n.DocumentCount || n.documentCount || 0,
          }))
        );
      } catch {
        toast.error("Search failed");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };
    run();
  }, [searchTerm, userid, apiUrl]);

  const fetchUserWorkspaceRole = async () => {
    setIsRoleLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}/UserWorkspace/GetWorkspacesByUserId/${userid}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const userWorkspaces = data.userWorkspaces || data || [];
        setUserWorkspaces(userWorkspaces);

        const workspace = userWorkspaces.find(
          (ws) =>
            (ws.workspaceID &&
              ws.workspaceID.toString() ===
                defaultUserWorkspaceID.toString()) ||
            (ws.workspaceId &&
              ws.workspaceId.toString() ===
                defaultUserWorkspaceID.toString()) ||
            (ws.id && ws.id.toString() === defaultUserWorkspaceID.toString())
        );

        const newRole = workspace?.role || null;
        setRole(newRole);
      } else {
        console.error("API response not OK:", response.status);
      }
    } catch (error) {
      console.error("Error:", error);
      setRole(null);
    } finally {
      setIsRoleLoading(false);
    }
  };

  const fetchWorkspacesByUserId = async () => {
    try {
      const response = await fetch(
        `${apiUrl}/Workspace/GetActiveWorkspacesNameByUserId/${userid}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const userWorkspaces = data.workspaces || data || [];
        setUserWorkspace(userWorkspaces);
      } else {
        console.error("API response not OK:", response.status);
      }
    } catch (error) {
      console.error("Error:", error);
      setRole(null);
    } finally {
      setIsRoleLoading(false);
    }
  };

  const fetchPriorities = async () => {
    try {
      const response = await fetch(`${apiUrl}/Priority/GetPriorities`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      });

      if (response.ok) {
        const result = await response.json();
        setPriorities(result.priorities || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Helper function to get filter options with cascading logic
  const getFilterOptions = (filterType) => {
    if (filterType === "project") {
      let options = (uniqueProjects || []).map(p => ({
        id: p.value ?? p.id ?? p.projectId ?? p.name ?? p.text,
        text: p.text ?? p.name ?? String(p.value ?? p.id ?? p.projectId ?? p),
        displayText: p.text ?? p.name ?? String(p.value ?? p.id ?? p.projectId ?? p)
      }));

      if (filterSearchTerm) {
        options = options.filter(o =>
            o.displayText && o.displayText.toLowerCase().includes(filterSearchTerm.toLowerCase())
        );
      }

      return options;
    }

    if (filterType === "job") {
      let options = (uniqueJobs || []).map(j => ({
        id: j.value ?? j.id ?? j.jobId ?? j.valueId ?? j.text,
        text: j.text ?? j.name ?? String(j.value ?? j.id ?? j.jobId ?? j),
        displayText: j.text ?? j.name ?? String(j.value ?? j.id ?? j.jobId ?? j)
      }));

      if (filterSearchTerm) {
        options = options.filter(o =>
            o.displayText && o.displayText.toLowerCase().includes(filterSearchTerm.toLowerCase())
        );
      }

      return options;
    }
    let options = [];

    if (!notes || !Array.isArray(notes) || notes.length === 0) {
      return options;
    }

    const uniqueValues = new Set();

    notes.forEach((note) => {
      let value;
      let include = true;

      switch (filterType) {
        case "date":
          if (note.date) {
            const dateObj = new Date(note.date);
            if (!isNaN(dateObj.getTime())) {
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, "0");
              const day = String(dateObj.getDate()).padStart(2, "0");
              value = `${year}-${month}-${day}`;
            } else {
              value = note.date.toString().split("T")[0];
            }
          }
          break;
        case "workspace":
          value = note.workspace;
          break;
        case "project":
          // Only filter by workspace if workspace filter is active
          if (
            selectedFilters.workspace &&
            selectedFilters.workspace.length > 0
          ) {
            const noteWorkspace = note.workspace
              ? note.workspace.toString()
              : "";
            if (selectedFilters.workspace.includes(noteWorkspace)) {
              value = note.project;
            } else {
              include = false;
            }
          } else {
            value = note.project;
          }
          break;
        case "job":
          // Filter by project if project filter is active
          if (selectedFilters.project && selectedFilters.project.length > 0) {
            const noteProject = note.project ? note.project.toString() : "";
            if (selectedFilters.project.includes(noteProject)) {
              value = note.job;
            } else {
              include = false;
            }
          }
          // If no project filter but workspace filter is active, filter by workspace
          else if (
            selectedFilters.workspace &&
            selectedFilters.workspace.length > 0
          ) {
            const noteWorkspace = note.workspace
              ? note.workspace.toString()
              : "";
            if (selectedFilters.workspace.includes(noteWorkspace)) {
              value = note.job;
            } else {
              include = false;
            }
          } else {
            value = note.job;
          }
          break;
        case "userName":
          value = note.userName;
          break;
        default:
          value = null;
      }

      if (value && include) {
        uniqueValues.add(value.toString());
      }
    });

    options = Array.from(uniqueValues)
      .sort()
      .map((value) => ({
        id: value,
        text: value,
        displayText:
          filterType === "date"
            ? (() => {
                try {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                  }
                } catch (e) {}
                return value;
              })()
            : value,
      }));

    // Filter by search term
    if (filterSearchTerm) {
      options = options.filter(
        (option) =>
          option.displayText &&
          option.displayText
            .toLowerCase()
            .includes(filterSearchTerm.toLowerCase())
      );
    }

    return options;
  };

  const getFilterDisplayValue = (filterType, value) => {
    if (filterType === "date") {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
      } catch (e) {}
    }
    return value;
  };

  const getActiveFilterCount = () => {
    return Object.values(selectedFilters).reduce(
      (total, arr) => total + arr.length,
      0
    );
  };

  // Cascading filter logic - automatically clears child filters when parent changes
  const handleFilterCheckboxChange = useCallback(
    (filterType, value) => {
      const currentValues = selectedFilters[filterType] || [];
      let newValues;

      if (currentValues.includes(value)) {
        // Remove the value if it already exists
        newValues = currentValues.filter((v) => v !== value);
      } else {
        // Add the value
        newValues = [...currentValues, value];
      }

      const newFilters = {
        ...selectedFilters,
        [filterType]: newValues,
      };

      // Handle cascading filter clearing
      if (filterType === "workspace") {
        // When workspace changes, clear project and job filters if they're no longer valid
        if (newValues.length === 0) {
          // If all workspaces are cleared, keep other filters
        } else {
          // Check which projects are still valid for selected workspaces
          const validProjects = new Set();
          notes.forEach((note) => {
            const noteWorkspace = note.workspace
              ? note.workspace.toString()
              : "";
            const noteProject = note.project ? note.project.toString() : "";
            if (newValues.includes(noteWorkspace) && noteProject) {
              validProjects.add(noteProject);
            }
          });

          // Remove project filters that are no longer valid
          const currentProjectFilters = newFilters.project || [];
          const filteredProjectFilters = currentProjectFilters.filter(
            (project) => validProjects.has(project)
          );
          newFilters.project = filteredProjectFilters;

          // Also update job filters based on remaining projects
          if (filteredProjectFilters.length > 0) {
            const validJobs = new Set();
            notes.forEach((note) => {
              const noteProject = note.project ? note.project.toString() : "";
              const noteJob = note.job ? note.job.toString() : "";
              if (filteredProjectFilters.includes(noteProject) && noteJob) {
                validJobs.add(noteJob);
              }
            });

            const currentJobFilters = newFilters.job || [];
            const filteredJobFilters = currentJobFilters.filter((job) =>
              validJobs.has(job)
            );
            newFilters.job = filteredJobFilters;
          } else {
            // If no projects selected, filter jobs by selected workspaces
            const validJobs = new Set();
            notes.forEach((note) => {
              const noteWorkspace = note.workspace
                ? note.workspace.toString()
                : "";
              const noteJob = note.job ? note.job.toString() : "";
              if (newValues.includes(noteWorkspace) && noteJob) {
                validJobs.add(noteJob);
              }
            });

            const currentJobFilters = newFilters.job || [];
            const filteredJobFilters = currentJobFilters.filter((job) =>
              validJobs.has(job)
            );
            newFilters.job = filteredJobFilters;
          }
        }
      } else if (filterType === "project") {
        // When project changes, clear job filters if they're no longer valid
        if (newValues.length === 0) {
          // If all projects are cleared, keep job filters only if workspace is selected
          if (newFilters.workspace && newFilters.workspace.length > 0) {
            const validJobs = new Set();
            notes.forEach((note) => {
              const noteWorkspace = note.workspace
                ? note.workspace.toString()
                : "";
              const noteJob = note.job ? note.job.toString() : "";
              if (newFilters.workspace.includes(noteWorkspace) && noteJob) {
                validJobs.add(noteJob);
              }
            });

            const currentJobFilters = newFilters.job || [];
            const filteredJobFilters = currentJobFilters.filter((job) =>
              validJobs.has(job)
            );
            newFilters.job = filteredJobFilters;
          }
        } else {
          const validJobs = new Set();
          notes.forEach((note) => {
            const noteProject = note.project ? note.project.toString() : "";
            const noteJob = note.job ? note.job.toString() : "";
            if (newValues.includes(noteProject) && noteJob) {
              validJobs.add(noteJob);
            }
          });

          const currentJobFilters = newFilters.job || [];
          const filteredJobFilters = currentJobFilters.filter((job) =>
            validJobs.has(job)
          );
          newFilters.job = filteredJobFilters;
        }
      }

      setSelectedFilters(newFilters);
    },
    [selectedFilters, notes]
  );

  const removeFilter = useCallback(
    (filterType, value) => {
      const currentValues = selectedFilters[filterType] || [];
      const newValues = currentValues.filter((v) => v !== value);

      const newFilters = {
        ...selectedFilters,
        [filterType]: newValues,
      };

      // Also handle cascading clearing when removing filters
      if (filterType === "workspace") {
        // Check which projects are still valid
        const validProjects = new Set();
        if (newValues.length > 0) {
          notes.forEach((note) => {
            const noteWorkspace = note.workspace
              ? note.workspace.toString()
              : "";
            const noteProject = note.project ? note.project.toString() : "";
            if (newValues.includes(noteWorkspace) && noteProject) {
              validProjects.add(noteProject);
            }
          });

          // Remove invalid project filters
          const currentProjectFilters = newFilters.project || [];
          const filteredProjectFilters = currentProjectFilters.filter(
            (project) => validProjects.has(project)
          );
          newFilters.project = filteredProjectFilters;

          // Update job filters
          if (filteredProjectFilters.length > 0) {
            const validJobs = new Set();
            notes.forEach((note) => {
              const noteProject = note.project ? note.project.toString() : "";
              const noteJob = note.job ? note.job.toString() : "";
              if (filteredProjectFilters.includes(noteProject) && noteJob) {
                validJobs.add(noteJob);
              }
            });

            const currentJobFilters = newFilters.job || [];
            const filteredJobFilters = currentJobFilters.filter((job) =>
              validJobs.has(job)
            );
            newFilters.job = filteredJobFilters;
          }
        }
      } else if (filterType === "project") {
        // Update job filters
        const validJobs = new Set();
        if (newValues.length > 0) {
          notes.forEach((note) => {
            const noteProject = note.project ? note.project.toString() : "";
            const noteJob = note.job ? note.job.toString() : "";
            if (newValues.includes(noteProject) && noteJob) {
              validJobs.add(noteJob);
            }
          });

          const currentJobFilters = newFilters.job || [];
          const filteredJobFilters = currentJobFilters.filter((job) =>
            validJobs.has(job)
          );
          newFilters.job = filteredJobFilters;
        }
      }

      setSelectedFilters(newFilters);
    },
    [selectedFilters, notes]
  );

  const clearAllFilters = useCallback(() => {
    const emptyFilters = {
      date: [],
      workspace: [],
      project: [],
      job: [],
      userName: [],
    };
    setSelectedFilters(emptyFilters);
  }, []);

  const toggleFilterDropdown = (filterType) => {
    if (filterDropdownOpen === filterType) {
      setFilterDropdownOpen(null);
      setFilterSearchTerm("");
    } else {
      setFilterDropdownOpen(filterType);
      setFilterSearchTerm("");
    }
  };

  // Check if filter has restricted options due to parent selection
  const getFilterInfoMessage = (filterType) => {
    if (
      filterType === "project" &&
      selectedFilters.workspace &&
      selectedFilters.workspace.length > 0
    ) {
      return `Showing projects from ${selectedFilters.workspace.length} selected workspace(s)`;
    }
    if (filterType === "job") {
      if (selectedFilters.project && selectedFilters.project.length > 0) {
        return `Showing jobs from ${selectedFilters.project.length} selected project(s)`;
      }
      if (selectedFilters.workspace && selectedFilters.workspace.length > 0) {
        return `Showing jobs from ${selectedFilters.workspace.length} selected workspace(s)`;
      }
    }
    return null;
  };

  // Check if filter button should show info style
  const hasFilterInfo = (filterType) => {
    if (
      filterType === "project" &&
      selectedFilters.workspace &&
      selectedFilters.workspace.length > 0
    ) {
      return true;
    }
    if (filterType === 'job' && (selectedFilters.project && selectedFilters.project.length > 0) || 
        (selectedFilters.workspace && selectedFilters.workspace.length > 0)) {
      fetchUniqueJobs();
      //
      // return true;
    }
    return false;
  };

  const getFilterButtonLabel = (filterType) => {
    const count = selectedFilters[filterType]?.length || 0;
    const baseLabels = {
      date: "Date",
      workspace: "Workspace",
      project: "Project",
      job: "Job",
      userName: "User",
    };

    const iconMap = {
      date: "calendar",
      workspace: "building",
      project: "project-diagram",
      job: "tasks",
      userName: "user",
    };

    return (
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <i
          className={`fas fa-${iconMap[filterType]}`}
          style={{ fontSize: "14px", color: "#3498db" }}
        />
        {baseLabels[filterType]} {count > 0 && `(${count})`}
        {hasFilterInfo(filterType) && (
          <span
            style={styles.filterInfoBadge}
            title={getFilterInfoMessage(filterType)}
          >
            i
          </span>
        )}
      </span>
    );
  };
  // Function to render inline image icon for stacked view (similar to card view)
  const renderStackedImageIcon = (note) => {
    const images = inlineImagesMap[note.id] || [];
    const isLoading = loadingImages[note.id];

    if (isLoading) {
      return (
        <button
          className="image-icon-btn"
          style={{ opacity: 0.5, marginRight: "4px" }}
        >
          <i className="fas fa-spinner fa-spin" />
        </button>
      );
    }

    if (images.length === 0) {
      return null;
    }

    return (
      <div
        className="inline-image-icon"
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginRight: "4px",
          position: "relative",
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleImageThumbnailClick(note);
        }}
        title={`${images.length} inline image${
          images.length !== 1 ? "s" : ""
        } - Click to view`}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <i
            className="fas fa-image"
            style={{
              fontSize: "18px",
              color: "#3498db",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.2)";
              e.target.style.color = "#2980b9";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.color = "#3498db";
            }}
          />

          {/* Image count badge */}
          {images.length > 1 && (
            <div
              style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                backgroundColor: "#e74c3c",
                color: "white",
                fontSize: "9px",
                fontWeight: "bold",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid white",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            >
              {images.length}
            </div>
          )}
        </div>
      </div>
    );
  };
  // Function to render inline image icon for table view (inside Attached Files column)
  const renderTableImageIcon = (note) => {
    const images = inlineImagesMap[note.id] || [];
    const isLoading = loadingImages[note.id];

    if (isLoading) {
      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginLeft: "6px",
          }}
        >
          <i
            className="fas fa-spinner fa-spin"
            style={{ fontSize: "12px", color: "#666" }}
          />
        </div>
      );
    }

    if (images.length === 0) {
      return null;
    }

    return (
      <div
        className="inline-image-icon"
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginLeft: "6px",
          cursor: "pointer",
          position: "relative",
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleImageThumbnailClick(note);
        }}
        title={`${images.length} inline image${
          images.length !== 1 ? "s" : ""
        } - Click to view`}
      >
        <div style={{ position: "relative" }}>
          <i
            className="fas fa-image"
            style={{
              fontSize: "16px",
              color: "#3498db",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.2)";
              e.target.style.color = "#2980b9";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.color = "#3498db";
            }}
          />

          {/* Image count badge */}
          {images.length > 1 && (
            <div
              style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                backgroundColor: "#e74c3c",
                color: "white",
                fontSize: "9px",
                fontWeight: "bold",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid white",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            >
              {images.length}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Function to render inline image icon for card view (inside Attachments section)
  const renderCardImageIcon = (note) => {
    const images = inlineImagesMap[note.id] || [];
    const isLoading = loadingImages[note.id];

    if (isLoading) {
      return (
        <button className="image-icon-btn" style={{ opacity: 0.5 }}>
          F
          <i className="fas fa-spinner fa-spin" />
        </button>
      );
    }

    if (images.length === 0) {
      return null;
    }

    return (
      <div
        className="inline-image-icon"
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginRight: "4px",
          position: "relative",
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleImageThumbnailClick(note);
        }}
        title={`${images.length} inline image${
          images.length !== 1 ? "s" : ""
        } - Click to view`}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <i
            className="fas fa-image"
            style={{
              fontSize: "18px",
              color: "#3498db",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.2)";
              e.target.style.color = "#2980b9";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.color = "#3498db";
            }}
          />

          {/* Image count badge */}
          {images.length > 1 && (
            <div
              style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                backgroundColor: "#e74c3c",
                color: "white",
                fontSize: "9px",
                fontWeight: "bold",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid white",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            >
              {images.length}
            </div>
          )}
        </div>
      </div>
    );
  };

  const notesByJob = {};
  finalDisplayNotes.forEach(note => {
    const jobName = note.job || "Unassigned";
    if (!notesByJob[jobName]) {
      notesByJob[jobName] = [];
    }
    notesByJob[jobName].push(note);
  });
  Object.keys(notesByJob).forEach(jobName => {
    notesByJob[jobName].sort((a, b) => {
      const timeA = new Date(a.timeStamp || a.date || 0).getTime();
      const timeB = new Date(b.timeStamp || b.date || 0).getTime();
      return timeB - timeA;
    });
  });
  const isAnyStackExpanded = Object.values(expandedStacks).some(v => v);
  const sortedJobs = Object.keys(notesByJob).sort((a, b) =>{
    const mostRecentA = notesByJob[a][0] ?
        new Date(notesByJob[a][0].timeStamp || notesByJob[a][0].date || 0).getTime() : 0;
    const mostRecentB = notesByJob[b][0] ?
        new Date(notesByJob[b][0].timeStamp || notesByJob[b][0].date || 0).getTime() : 0;

    return mostRecentB - mostRecentA;
  });


  return (
    <div className="main-content">
      <div className="dashboard">
        <div
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.95),rgba(199,194,194,.95)),url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            padding: "20px 30px",
            borderRadius: "8px",
            marginBottom: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 3px 10px rgba(0,0,0,.08)",
            border: "1px solid rgba(0,0,0,.05)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 600,
              color: "#2c3e50",
              display: "flex",
              alignItems: "center",
              gap: "15px",
            }}
          >
            <i
              className="fas fa-clipboard-list"
              style={{ color: "#3498db", fontSize: "32px" }}
            />{" "}
            Site Notes Dashboard:{" "}
            {JSON.parse(localStorage.getItem("user"))?.userName}
          </h1>

          <div style={styles.workspaceHeader}>
            <div style={styles.workspaceTopRow}>
              <div style={styles.workspaceName}>
                {defaultUserWorkspaceName || "No Workspace"}
              </div>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              style={{
                background: "rgba(52,152,219,.1)",
                border: "1px solid rgba(52,152,219,.2)",
                width: 42,
                height: 42,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#3498db",
                fontSize: 18,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(52,152,219,.2)";
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "rgba(52,152,219,.1)";
                e.target.style.transform = "scale(1)";
              }}
            >
              <i className="fas fa-sliders-h" />
            </button>
          </div>
        </div>
        <div className="top-fixed-section">
          <div style={styles.searchBox}>
            <div
              style={{
                position: "relative",
                flex: 1,
                minWidth: "200px",
              }}
            >
              <input
                id="searchInput"
                type="text"
                placeholder={
                  searchColumn
                    ? `Search by ${searchColumn}...`
                    : "Search notes..."
                }
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                style={{
                  ...styles.searchInput,
                  paddingRight: searchTerm ? "30px" : "12px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                  }}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#666",
                    fontSize: "18px",
                    padding: "4px",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#f0f0f0";
                    e.target.style.color = "#333";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#666";
                  }}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            {searchColumn && (
              <span style={styles.searchHint}>
                Searching in: {searchColumn}
                <button
                  onClick={() => {
                    setSearchColumn("");
                    setSearchTerm("");
                  }}
                  style={styles.clearGroupBtn}
                >
                  ×
                </button>
              </span>
            )}
            <div
              className="view-toggle-container"
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                height: "36px",
              }}
            >
              <button
                onClick={() => setViewMode("table")}
                className={`view-toggle-btn ${
                  viewMode === "table" ? "active" : ""
                }`}
                style={{
                  border: "1px solid #ddd",
                  background: viewMode === "table" ? "#1976d2" : "white",
                  color: viewMode === "table" ? "white" : "#333",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  height: "36px",
                  width: "36px",
                }}
                title="Table View"
              >
                <i className="fas fa-table" />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`view-toggle-btn ${
                  viewMode === "cards" ? "active" : ""
                }`}
                style={{
                  border: "1px solid #ddd",
                  background: viewMode === "cards" ? "#1976d2" : "white",
                  color: viewMode === "cards" ? "white" : "#333",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  height: "36px",
                  width: "36px",
                }}
                title="Card View"
              >
                <i className="fas fa-th" />
              </button>
              <button
                onClick={() => setViewMode("stacked")}
                className={`view-toggle-btn ${
                  viewMode === "stacked" ? "active" : ""
                }`}
                style={{
                  border: "1px solid #ddd",
                  background: viewMode === "stacked" ? "#1976d2" : "white",
                  color: viewMode === "stacked" ? "white" : "#333",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  height: "36px",
                  width: "36px",
                }}
                title="Stacked View"
              >
                <i className="fas fa-layer-group" />
              </button>
            </div>
            <button
              onClick={handleRefresh}
              style={{
                background: "#1976d2",
                border: "none",
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <i className="fas fa-sync-alt" />
            </button>
            <button
              onClick={handleNewNoteClick}
              style={{
                backgroundColor: "#1976d2",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              <i className="fas fa-plus-circle" /> New Note
            </button>
          </div>

          {/* New Filter Section */}
          <div ref={filterRef} style={styles.filterContainer}>
            {/* Date Filter */}
            <div style={styles.filterDropdown}>
              <button
                style={styles.filterButton}
                onClick={() => toggleFilterDropdown("date")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3498db";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px rgba(52, 152, 219, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#ddd";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {getFilterButtonLabel("date")}
                <i
                  className={`fas fa-chevron-${
                    filterDropdownOpen === "date" ? "up" : "down"
                  }`}
                  style={{ fontSize: "12px" }}
                />
              </button>
              {filterDropdownOpen === "date" && (
                <div style={styles.dropdownContent}>
                  <div style={styles.dropdownSearch}>
                    <input
                      type="text"
                      placeholder="Search dates..."
                      value={filterSearchTerm}
                      onChange={(e) => setFilterSearchTerm(e.target.value)}
                      style={styles.dropdownSearchInput}
                    />
                  </div>
                  <div style={styles.dropdownList}>
                    {getFilterOptions("date").map((option) => (
                      <div
                        key={option.id || option.text}
                        style={styles.checkboxItem}
                        onClick={() =>
                          handleFilterCheckboxChange(
                            "date",
                            option.id || option.text
                          )
                        }
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f8f9fa";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFilters.date.includes(
                            option.id || option.text
                          )}
                          onChange={() => {}}
                          style={styles.checkbox}
                        />
                        <span style={{ fontSize: "14px" }}>
                          {option.displayText}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Workspace Filter */}
            <div style={styles.filterDropdown}>
              <button
                style={styles.filterButton}
                onClick={() => toggleFilterDropdown("workspace")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3498db";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px rgba(52, 152, 219, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#ddd";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {getFilterButtonLabel("workspace")}
                <i
                  className={`fas fa-chevron-${
                    filterDropdownOpen === "workspace" ? "up" : "down"
                  }`}
                  style={{ fontSize: "12px" }}
                />
              </button>
              {filterDropdownOpen === "workspace" && (
                <div style={styles.dropdownContent}>
                  <div style={styles.dropdownSearch}>
                    <input
                      type="text"
                      placeholder="Search workspaces..."
                      value={filterSearchTerm}
                      onChange={(e) => setFilterSearchTerm(e.target.value)}
                      style={styles.dropdownSearchInput}
                    />
                  </div>
                  <div style={styles.dropdownList}>
                    {getFilterOptions("workspace").map((option) => (
                      <div
                        key={option.id}
                        style={styles.checkboxItem}
                        onClick={() =>
                          handleFilterCheckboxChange("workspace", option.id)
                        }
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f8f9fa";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFilters.workspace.includes(
                            option.id
                          )}
                          onChange={() => {}}
                          style={styles.checkbox}
                        />
                        <span style={{ fontSize: "14px" }}>{option.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Project Filter */}
            <div style={styles.filterDropdown}>
              <button
                style={{
                  ...styles.filterButton,
                  ...(hasFilterInfo("project") ? styles.filterButtonInfo : {}),
                }}
                onClick={() => toggleFilterDropdown("project")}
                title={
                  hasFilterInfo("project")
                    ? getFilterInfoMessage("project")
                    : "Filter by project"
                }
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3498db";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px rgba(52, 152, 219, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = hasFilterInfo("project")
                    ? "#17a2b8"
                    : "#ddd";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {getFilterButtonLabel("project")}
                <i
                  className={`fas fa-chevron-${
                    filterDropdownOpen === "project" ? "up" : "down"
                  }`}
                  style={{ fontSize: "12px" }}
                />
              </button>
              {filterDropdownOpen === "project" && (
                <div style={styles.dropdownContent}>
                  <div style={styles.dropdownSearch}>
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={filterSearchTerm}
                      onChange={(e) => setFilterSearchTerm(e.target.value)}
                      style={styles.dropdownSearchInput}
                    />
                  </div>
                  <div style={styles.dropdownList}>
                    {getFilterOptions("project").length > 0 ? (
                      getFilterOptions("project").map((option) => (
                        <div
                          key={option.id}
                          style={styles.checkboxItem}
                          onClick={() =>
                            handleFilterCheckboxChange("project", option.id)
                          }
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f8f9fa";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFilters.project.includes(
                              option.id
                            )}
                            onChange={() => {}}
                            style={styles.checkbox}
                          />
                          <span style={{ fontSize: "14px" }}>
                            {option.text}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={styles.emptyFilterMessage}>
                        {selectedFilters.workspace &&
                        selectedFilters.workspace.length > 0
                          ? "No projects found for the selected workspace(s)"
                          : "No projects available"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Job Filter */}
            <div style={styles.filterDropdown}>
              <button
                style={{
                  ...styles.filterButton,
                  ...(hasFilterInfo("job") ? styles.filterButtonInfo : {}),
                }}
                onClick={() => toggleFilterDropdown("job")}
                title={
                  hasFilterInfo("job")
                    ? getFilterInfoMessage("job")
                    : "Filter by job"
                }
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3498db";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px rgba(52, 152, 219, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = hasFilterInfo("job")
                    ? "#17a2b8"
                    : "#ddd";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {getFilterButtonLabel("job")}
                <i
                  className={`fas fa-chevron-${
                    filterDropdownOpen === "job" ? "up" : "down"
                  }`}
                  style={{ fontSize: "12px" }}
                />
              </button>
              {filterDropdownOpen === "job" && (
                <div style={styles.dropdownContent}>
                  <div style={styles.dropdownSearch}>
                    <input
                      type="text"
                      placeholder="Search jobs..."
                      value={filterSearchTerm}
                      onChange={(e) => setFilterSearchTerm(e.target.value)}
                      style={styles.dropdownSearchInput}
                    />
                  </div>
                  <div style={styles.dropdownList}>
                    {getFilterOptions("job").length > 0 ? (
                      getFilterOptions("job").map((option) => (
                        <div
                          key={option.id}
                          style={styles.checkboxItem}
                          onClick={() =>
                            handleFilterCheckboxChange("job", option.id)
                          }
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f8f9fa";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFilters.job.includes(option.id)}
                            onChange={() => {}}
                            style={styles.checkbox}
                          />
                          <span style={{ fontSize: "14px" }}>
                            {option.text}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={styles.emptyFilterMessage}>
                        {selectedFilters.project &&
                        selectedFilters.project.length > 0
                          ? "No jobs found for the selected project(s)"
                          : selectedFilters.workspace &&
                            selectedFilters.workspace.length > 0
                          ? "No jobs found for the selected workspace(s)"
                          : "No jobs available"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Filter */}
            <div style={styles.filterDropdown}>
              <button
                style={styles.filterButton}
                onClick={() => toggleFilterDropdown("userName")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3498db";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px rgba(52, 152, 219, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#ddd";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {getFilterButtonLabel("userName")}
                <i
                  className={`fas fa-chevron-${
                    filterDropdownOpen === "userName" ? "up" : "down"
                  }`}
                  style={{ fontSize: "12px" }}
                />
              </button>
              {filterDropdownOpen === "userName" && (
                <div style={styles.dropdownContent}>
                  <div style={styles.dropdownSearch}>
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={filterSearchTerm}
                      onChange={(e) => setFilterSearchTerm(e.target.value)}
                      style={styles.dropdownSearchInput}
                    />
                  </div>
                  <div style={styles.dropdownList}>
                    {getFilterOptions("userName").map((option) => (
                      <div
                        key={option.id || option.text}
                        style={styles.checkboxItem}
                        onClick={() =>
                          handleFilterCheckboxChange(
                            "userName",
                            option.id || option.text
                          )
                        }
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f8f9fa";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFilters.userName.includes(
                            option.id || option.text
                          )}
                          onChange={() => {}}
                          style={styles.checkbox}
                        />
                        <span style={{ fontSize: "14px" }}>{option.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Filters Display with Clear All Button */}
          {getActiveFilterCount() > 0 && (
            <div style={styles.activeFiltersContainer}>
              <div style={styles.activeFiltersContent}>
                {Object.entries(selectedFilters).map(([filterType, values]) =>
                  values.map((value) => (
                    <span
                      key={`${filterType}-${value}`}
                      style={styles.filterTag}
                    >
                      <span style={{ textTransform: "capitalize" }}>
                        {filterType}
                      </span>
                      : {getFilterDisplayValue(filterType, value)}
                      <button
                        onClick={() => removeFilter(filterType, value)}
                        style={styles.filterTagRemove}
                        title="Remove filter"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#e74c3c";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#666";
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <button
                onClick={clearAllFilters}
                style={styles.clearAllButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#5a6268";
                  e.currentTarget.style.borderColor = "#545b62";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#6c757d";
                  e.currentTarget.style.borderColor = "#6c757d";
                }}
              >
                <i className="fas fa-times-circle" />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
        <div className="grid-scroll-container">
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
                  loadingUniques ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
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
                    ))
                  ) : finalDisplayNotes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          textAlign: "center",
                          padding: 40,
                          color: "#999",
                        }}
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
                            />{" "}
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
                  ) : (
                    finalDisplayNotes.map((n) => {
                      const notePriority = priorities.find(
                        (p) => Number(p.noteID) === Number(n.id)
                      );
                      const inlineImages = inlineImagesMap[n.id] || [];

                      return (
                        <tr
                          key={n.id}
                          onClick={() => {
                            handleRowClick(n);
                          }}
                          onDoubleClick={() => {
                            handleRowDoubleClick(n);
                            const job = jobs.find((j) => j.id === n.job);
                            setViewNote({
                              id: n.id,
                              jobId: job?.id ?? null,
                            });
                            setShowViewModal(true);
                          }}
                          className={`${
                            selectedRow === n.id ? "selected-row" : ""
                          } ${focusedRow === n.id ? "focused-row" : ""}`}
                          style={{ cursor: "pointer" }}
                        >
                          <td
                            title={new Date(n.date).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          >
                            {formatRelativeTime(n.timeStamp)}
                          </td>
                          <td>{n.workspace}</td>
                          <td>{n.project}</td>
                          <td>{n.job}</td>
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
                              }}
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
                                    n.note.length > 69
                                      ? n.note.substring(0, 69) + "..."
                                      : n.note,
                                }}
                              />

                              {n.note.length > 69 && (
                                <div
                                  className="note-hover-popup"
                                  dangerouslySetInnerHTML={{ __html: n.note }}
                                />
                              )}

                              {notePriority &&
                              notePriority.priorityValue > 1 ? (
                                <div
                                  className={`priority-dot priority-dot-${notePriority.priorityValue}`}
                                  style={{
                                    width: "10px",
                                    height: "10px",
                                    borderRadius: "50%",
                                    position: "absolute",
                                    top: "4px",
                                    right: "4px",
                                    cursor: "pointer",
                                    zIndex: 10,
                                  }}
                                  title={
                                    notePriority.priorityValue === 3
                                      ? "Medium Priority - Click to change"
                                      : notePriority.priorityValue === 4
                                      ? "High Priority - Click to change"
                                      : "Low Priority"
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNoteForPriority(n);
                                    setPriorityDropdownPosition({
                                      x: e.clientX,
                                      y: e.clientY,
                                    });
                                    setShowPriorityDropdown(true);
                                  }}
                                />
                              ) : (
                                <div
                                  className="priority-dot priority-dot-placeholder"
                                  style={{
                                    width: "10px",
                                    height: "10px",
                                    borderRadius: "50%",
                                    position: "absolute",
                                    top: "4px",
                                    right: "4px",
                                    cursor: "pointer",
                                    zIndex: 10,
                                    opacity: 0.2,
                                    border: "1px dashed #bdc3c7",
                                    backgroundColor: "transparent",
                                    transition: "all 0.2s ease",
                                  }}
                                  title="Click to set priority"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNoteForPriority(n);
                                    setPriorityDropdownPosition({
                                      x: e.clientX,
                                      y: e.clientY,
                                    });
                                    setShowPriorityDropdown(true);
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = "0.5";
                                    e.currentTarget.style.borderColor =
                                      "#3498db";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = "0.2";
                                    e.currentTarget.style.borderColor =
                                      "#bdc3c7";
                                  }}
                                />
                              )}
                            </div>
                          </td>
                          <td>{n.userName}</td>
                          <td
                            className="file-cell"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewAttachments(n);
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <i
                                className="fas fa-paperclip"
                                style={{
                                  opacity: n.documentCount > 0 ? 1 : 0.3,
                                }}
                              />
                              <span>({n.documentCount || 0})</span>

                              {/* Inline Images Icon */}
                              {renderTableImageIcon(n)}
                            </span>
                          </td>
                          <td className="table-actions">
                            <a
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddFromRow(n);
                              }}
                              title="Add"
                            >
                              <i className="fas fa-plus" />
                            </a>
                            <a
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(n);
                              }}
                              title="Edit"
                            >
                              <i className="fas fa-edit" />
                            </a>
                            <a
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(n);
                              }}
                              title="Delete"
                            >
                              <i className="fas fa-trash" />
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : viewMode === "stacked" ? (
            <div className="stacked-notes-horizontal">
              {!isDataLoaded ||
              initialLoading ||
              searchLoading ||
              loadingFiltered ? (
                [...Array(8)].map((_, i) => (
                  <div key={i} className="note-card skeleton">
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
                ))
              ) : finalDisplayNotes.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-search" />
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
              ) : (

                  <div className="stacked-notes-container">
                    {isAnyStackExpanded && (
                        <div className="fixed-collapse-btn-wrapper">
                          <button
                              className="collapse-all-stacks-btn"
                              onClick={() => {
                                Object.keys(expandedStacks).forEach(jobName => {
                                  if (expandedStacks[jobName]) {
                                    toggleStackExpansion(jobName);
                                  }
                                });
                              }}
                          >
                            <i className="fas fa-compress" />
                          </button>
                        </div> )}

                <div className="stacked-container">
                  {sortedJobs.map((jobName) => {
                    const jobNotes = notesByJob[jobName];
                    const isExpanded = expandedStacks[jobName];
                    const noteCount = jobNotes.length;

                    const currentLimit = expandedCardLimit[jobName] ?? 50;
                    console.log(`Job: ${jobName}, Limit Used: ${currentLimit}`);

                    const displayNotes = isExpanded
                      ? jobNotes.slice(0, Math.min(currentLimit, noteCount))
                      : [];

                    const remainingNotes = noteCount - currentLimit;

                    if (!isExpanded && isAnyStackExpanded) {
                      return null;
                    }

                    return (
                      <div
                        key={`stack-${jobName}`}
                        className={`job-stack-container ${
                          isExpanded
                            ? "expanded-full-width"
                            : "collapsed-vertical-stack"
                        }`}
                      >
                        {isExpanded ? (
                          <div className="expanded-stack">
                           <div className="expanded-stack-header">
                              <div className="expanded-stack-title">
                                <i className="fas fa-briefcase" />
                                {jobName}
                              </div>
                              <div className="expanded-stack-count">
                                <i className="fas fa-layer-group" />
                                {noteCount} notes
                              </div>
                            </div>

                            <div className="expanded-notes-grid">
                              {displayNotes.map((note) => {
                                const notePriority = priorities.find(
                                  (p) => p.noteID === note.id
                                );

                                return (
                                  <div
                                    key={note.id}
                                    className={`note-card ${
                                      selectedRow === note.id ? "selected" : ""
                                    } stack-expanded-card`}
                                    onClick={() => handleRowClick(note)}
                                    onDoubleClick={() =>
                                      handleRowDoubleClick(note)
                                    }
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
                                                ? names[0]
                                                    .charAt(0)
                                                    .toUpperCase()
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
                                          title={
                                            note.userName || "Unknown User"
                                          }
                                        >
                                          {note.userName}
                                        </div>
                                        <div
                                          className="note-date"
                                          title={new Date(
                                            note.date
                                          ).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        >
                                          {formatRelativeTime(note.timeStamp)}
                                        </div>
                                      </div>

                                      <div className="note-context">
                                        <div
                                          className="context-item job"
                                          title={note.job}
                                        >
                                          {note.job}
                                        </div>
                                        <div className="context-item workspace-project">
                                          <span title={note.workspace}>
                                            {note.workspace}
                                          </span>
                                          /
                                          <span title={note.project}>
                                            {note.project}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="note-content">
                                      <div
                                        className="note-card-content-container"
                                        style={{ position: "relative" }}
                                      >
                                        <div
                                          className="note-text"
                                          dangerouslySetInnerHTML={{
                                            __html: note.note,
                                          }}
                                        />
                                        {note.note.length > 150 && (
                                          <div className="note-card-popup">
                                            {note.note}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="note-footer">
                                      <div
                                        className="note-attachments"
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "12px",
                                        }}
                                      >
                                        {/* Inline Images Icon */}
                                        {renderStackedImageIcon(note)}

                                        {/* Attached Files */}
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
                                              opacity:
                                                note.documentCount > 0
                                                  ? 1
                                                  : 0.3,
                                            }}
                                          />
                                          <span>
                                            ({note.documentCount || 0})
                                          </span>
                                        </button>
                                      </div>
                                      <div className="note-actions">
                                        {notePriority &&
                                        notePriority.priorityValue > 1 ? (
                                          <div
                                            className={`priority-indicator priority-${notePriority.priorityValue}`}
                                            style={{ cursor: "pointer" }}
                                            title={
                                              notePriority.priorityValue === 3
                                                ? "Medium Priority - Click to change"
                                                : notePriority.priorityValue ===
                                                  4
                                                ? "High Priority - Click to change"
                                                : "No Priority"
                                            }
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedNoteForPriority(note);
                                              setPriorityDropdownPosition({
                                                x: e.clientX,
                                                y: e.clientY,
                                              });
                                              setShowPriorityDropdown(true);
                                            }}
                                          />
                                        ) : (
                                          <div
                                            className="priority-placeholder"
                                            style={{
                                              cursor: "pointer",
                                              opacity: 0.2,
                                              transition: "all 0.2s ease",
                                              width: "16px",
                                              height: "16px",
                                              borderRadius: "50%",
                                              border: "1px dashed #ddd",
                                              backgroundColor: "transparent",
                                            }}
                                            title="Click to set priority"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedNoteForPriority(note);
                                              setPriorityDropdownPosition({
                                                x: e.clientX,
                                                y: e.clientY,
                                              });
                                              setShowPriorityDropdown(true);
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.opacity =
                                                "0.5";
                                              e.currentTarget.style.borderColor =
                                                "#3498db";
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.opacity =
                                                "0.2";
                                              e.currentTarget.style.borderColor =
                                                "#ddd";
                                            }}
                                          />
                                        )}
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

                            {remainingNotes > 0 && (
                              <div className="load-more-container">
                                <button
                                  className="load-more-btn"
                                  onClick={() => loadMoreCards(jobName)}
                                >
                                  Load {Math.min(remainingNotes, 10)} more notes
                                  <i
                                    className="fas fa-caret-down"
                                    style={{ marginLeft: "5px" }}
                                  />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="collapsed-stack"
                            onClick={() => toggleStackExpansion(jobName)}
                            style={{
                              cursor: "pointer",
                              position: "relative",
                              height: "280px",
                              width: "100%",
                            }}
                          >
                            {[...Array(Math.min(noteCount, 5))].map(
                              (_, index) => {
                                const note = jobNotes[index];
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
                                            alignItems: "center",
                                            marginBottom: "15px",
                                            paddingBottom: "10px",
                                            borderBottom: "1px solid #f0f0f0",
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "8px",
                                            }}
                                          >
                                            <i
                                              className="fas fa-briefcase"
                                              style={{ color: "#3498db" }}
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
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "6px",
                                              background: "#3498db",
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
                                                backgroundColor: "#3498db",
                                                color: "white",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "12px",
                                                fontWeight: "bold",
                                              }}
                                            >
                                              {note.userName
                                                ? note.userName
                                                    .charAt(0)
                                                    .toUpperCase()
                                                : "U"}
                                            </div>
                                            <span
                                              style={{
                                                fontSize: "14px",
                                                color: "#555",
                                              }}
                                            >
                                              {note.userName || "Unknown User"}
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
                                            }}
                                            dangerouslySetInnerHTML={{
                                              __html: note.note,
                                            }}
                                          />

                                          <div
                                            style={{
                                              fontSize: "11px",
                                              color: "#888",
                                              marginTop: "auto",
                                            }}
                                          >
                                            {formatRelativeTime(note.timeStamp)}
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
                                            Click to expand
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
                              }
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                  </div>
              )}
            </div>
          ) : (
            <div className="notes-grid">
              {!isDataLoaded ||
              initialLoading ||
              searchLoading ||
              loadingFiltered ? (
                [...Array(8)].map((_, i) => (
                  <div key={i} className="note-card skeleton">
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
                ))
              ) : finalDisplayNotes.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-search" />
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
              ) : (
                finalDisplayNotes.map((note) => {
                  const notePriority = priorities.find(
                    (p) => p.noteID === note.id
                  );
                  const inlineImages = inlineImagesMap[note.id] || [];

                  return (
                    <div
                      key={note.id}
                      className={`note-card ${
                        selectedRow === note.id ? "selected" : ""
                      }`}
                      onClick={() => handleRowClick(note)}
                      onDoubleClick={() => handleRowDoubleClick(note)}
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
                          <div className="context-item job" title={note.job}>
                            {note.job}
                          </div>
                          <div className="context-item workspace-project">
                            <span title={note.workspace}>{note.workspace}</span>
                            /<span title={note.project}>{note.project}</span>
                          </div>
                        </div>
                      </div>
                      <div className="note-content">
                        <div
                          className="note-card-content-container"
                          style={{ position: "relative" }}
                        >
                          <div
                            className="note-text"
                            dangerouslySetInnerHTML={{ __html: note.note }}
                          />

                          {/* Hover Popup for Card View - only show if note is long */}
                          {note.note.length > 150 && (
                            <div
                              className="note-card-popup"
                              dangerouslySetInnerHTML={{ __html: note.note }}
                            />
                          )}
                        </div>
                      </div>

                      <div className="note-footer">
                        <div
                          className="note-attachments"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          {/* Inline Images Icon */}
                          {renderCardImageIcon(note)}

                          {/* Attached Files */}
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
                        </div>

                        <div className="footer-priority"></div>
                        <div className="note-actions">
                          {notePriority && notePriority.priorityValue > 1 ? (
                            <div
                              className={`priority-indicator priority-${notePriority.priorityValue}`}
                              style={{ cursor: "pointer" }}
                              title={
                                notePriority.priorityValue === 3
                                  ? "Medium Priority - Click to change"
                                  : notePriority.priorityValue === 4
                                  ? "High Priority - Click to change"
                                  : "No Priority"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNoteForPriority(note);
                                setPriorityDropdownPosition({
                                  x: e.clientX,
                                  y: e.clientY,
                                });
                                setShowPriorityDropdown(true);
                              }}
                            />
                          ) : (
                            <div
                              className="priority-placeholder"
                              style={{
                                cursor: "pointer",
                                opacity: 0.2,
                                transition: "all 0.2s ease",
                                width: "16px",
                                height: "16px",
                                borderRadius: "50%",
                                border: "1px dashed #ddd",
                                backgroundColor: "transparent",
                              }}
                              title="Click to set priority"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNoteForPriority(note);
                                setPriorityDropdownPosition({
                                  x: e.clientX,
                                  y: e.clientY,
                                });
                                setShowPriorityDropdown(true);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "0.5";
                                e.currentTarget.style.borderColor = "#3498db";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "0.2";
                                e.currentTarget.style.borderColor = "#ddd";
                              }}
                            />
                          )}
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
                })
              )}
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: 24, maxWidth: 400 }}
          >
            <i
              className="fas fa-exclamation-triangle"
              style={{ fontSize: 48, color: "#f39c12" }}
            />
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to delete this note and all associated
              files? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "10px 20px",
                  background: "#fff",
                  border: "1px solid #bdc3c7",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  background: "#e74c3c",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                }}
              >
                {isDeleting ? "Deleting..." : "Delete Note & Files"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showPriorityDropdown && selectedNoteForPriority && (
        <div
          className="priority-dropdown-overlay"
          onClick={() => setShowPriorityDropdown(false)}
        >
          <div
            className="priority-dropdown"
            style={{
              position: "fixed",
              left: Math.min(
                priorityDropdownPosition.x,
                window.innerWidth - 200
              ),
              top: Math.min(
                priorityDropdownPosition.y,
                window.innerHeight - 200
              ),
              zIndex: 1000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="priority-option"
              onClick={() => handlePriorityChange(1)}
            >
              <div className="priority-color-dot priority-1" />
              <span className="priority-label">No Priority</span>
            </div>
            <div
              className="priority-option"
              onClick={() => handlePriorityChange(3)}
            >
              <div className="priority-color-dot priority-3" />
              <span className="priority-label">Medium Priority</span>
            </div>
            <div
              className="priority-option"
              onClick={() => handlePriorityChange(4)}
            >
              <div className="priority-color-dot priority-4" />
              <span className="priority-label">High Priority</span>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onLogout={onLogout}
          defWorkID={defaultUserWorkspaceID}
          defWorkName={defaultUserWorkspaceName}
          onUpdateDefaultWorkspace={onUpdateDefaultWorkspace}
          role={role}
          userWorkspaces={workspaces}
          updateProjectsAndJobs={fetchProjectAndJobs}
        />
      )}
      {showViewModal && viewNote && (
        <ViewNoteModal
          noteId={viewNote.id}
          jobId={viewNote.jobId}
          workspace={viewNote.workspace}
          job={viewNote.job}
          project={viewNote.project}
          onClose={() => {
            setShowViewModal(false);
            setViewNote(null);
          }}
          onViewAttachments={handleViewAttachments}
          currentTheme="gray"
          priorities={priorities}
          userid={userid}
          scrollToNoteId={viewNote.id}
        />
      )}
      {showNewModal && (
        <NewNoteModal
          ref={newNoteModalRef}
          isOpen={showNewModal}
          onClose={() => {
            setPrefilledData(null);
            setShowNewModal(false);
          }}
          refreshNotes={refreshNotes}
          refreshFilteredNotes={() => {}}
          addSiteNote={addSiteNote}
          projects={projects}
          jobs={jobs}
          onUploadDocument={onUploadDocument}
          onDeleteDocument={onDeleteDocument}
          defWorkSpaceId={defaultUserWorkspaceID}
          userworksaces={userWorkspace}
          prefilledData={prefilledData}
          source={modalSource}
        />
      )}
      {showEditModal && selectedNote && (
        <EditNoteModal
          note={selectedNote}
          onClose={() => {
            setShowEditModal(false);
            fetchPriorities();
            refreshNotes();
          }}
          refreshNotes={refreshNotes}
          updateNote={updateNote}
          deleteDocument={onDeleteDocument}
          uploadDocument={onUploadDocument}
          projects={projects}
          jobs={jobs}
          priorities={priorities}
          defaultUserWorkspaceID={defaultUserWorkspaceID}
          onPriorityUpdate={handlePriorityUpdate}
          openToPriorityTab={true}
        />
      )}
      {showAttachedFileModal && selectedFileNote && (
        <AttachedFileModal
          note={selectedFileNote}
          onClose={() => {
            setShowAttachedFileModal(false);
            setSelectedFileNote(null);
          }}
          refreshNotes={refreshNotes}
          updateNote={updateNote}
          projects={projects}
          jobs={jobs}
          uploadDocument={onUploadDocument}
          onDeleteDocument={onDeleteDocument}
        />
      )}

      {showImageViewer && selectedImage && selectedImageNote && (
        <InlineImageViewer
          image={selectedImage.image}
          note={selectedImageNote}
          currentIndex={selectedImage.index}
          totalImages={selectedImage.total}
          onClose={() => {
            setShowImageViewer(false);
            setSelectedImage(null);
            setSelectedImageNote(null);
          }}
          onNext={handleNextImage}
          onPrev={handlePrevImage}
          apiUrl={apiUrl}
        />
      )}
    </div>
  );
};

Dashboard.propTypes = {
  notes: PropTypes.array.isRequired,
  refreshNotes: PropTypes.func.isRequired,
  addSiteNote: PropTypes.func.isRequired,
  updateNote: PropTypes.func.isRequired,
  projects: PropTypes.array,
  jobs: PropTypes.array,
  onUploadDocument: PropTypes.func.isRequired,
  onDeleteDocument: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  userData: PropTypes.object,
};

Dashboard.defaultProps = { projects: [], jobs: [], userData: null };

export default Dashboard;
