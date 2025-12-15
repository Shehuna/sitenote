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
import AttachedFileModal from "./Modals/AttachedfileModal.jsx";
import ViewNoteModal from "./Modals/ViewNoteModal";
import toast from "react-hot-toast";
import InlineImageViewer from "./Modals/InlineImageViewer";
import NotesTab from "./Dashbord/NotesTab";
import DashboardMenu from "./Dashbord/DashboardMenu.jsx";

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
  const [filteredNotesFromApi, setFilteredNotesFromApi] = useState([]);
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
  const [isMobile, setIsMobile] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
  const fetchNotesWithFilters = useCallback(
    async (filters) => {
      const storedUser = (() => {
        try {
          return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
          return {};
        }
      })();
      const usernameParam =
        (filters?.userName && filters.userName[0]) ||
        storedUser?.userName ||
        storedUser?.username ||
        storedUser?.name ||
        "";
      const userIdParam = storedUser?.id || userid;
      if (!usernameParam) {
        toast.error("Username is required to filter notes.");
        return;
      }

      const usernameList =
        (filters?.userName && filters.userName.length > 0
          ? filters.userName
          : [usernameParam]).filter(Boolean);

      const makeRequest = async (username, workspaceId, projectId, jobId, dateVal) => {
        const params = new URLSearchParams({
          pageNumber: "1",
          pageSize: "10",
          username,
          userId: userIdParam ?? "",
        });
        if (dateVal) params.append("date", dateVal);
        if (workspaceId) params.append("workspaceId", workspaceId);
        if (projectId) params.append("projectId", projectId);
        if (jobId) params.append("jobId", jobId);

        const response = await fetch(
          `${apiUrl}/SiteNote/GetSiteNotesWithFilters?${params.toString()}`
        );
        const raw = await response.text();
        if (!response.ok) {
          throw new Error(raw || "Failed to fetch filtered notes");
        }
        const data = raw ? JSON.parse(raw) : {};
        return (data.siteNotes || []).map((n) => ({
          ...n,
          userName: n.userName || n.UserName,
          documentCount: n.documentCount ?? n.DocumentCount ?? 0,
        }));
      };

      const dateVals = filters.date?.length ? filters.date : [undefined];
      const workspaceVals = filters.workspace?.length ? filters.workspace : [undefined];
      const projectVals = filters.project?.length ? filters.project : [undefined];
      const jobVals = filters.job?.length ? filters.job : [undefined];

      setLoadingFiltered(true);
      try {
        const allNotes = [];
        for (const u of usernameList) {
          for (const d of dateVals) {
            for (const w of workspaceVals) {
              for (const p of projectVals) {
                for (const j of jobVals) {
                  const chunk = await makeRequest(u, w, p, j, d);
                  allNotes.push(...chunk);
                }
              }
            }
          }
        }
        const dedup = [];
        const seen = new Set();
        allNotes.forEach((n) => {
          const id = n.id;
          if (!seen.has(id)) {
            seen.add(id);
            dedup.push(n);
          }
        });
        setFilteredNotesFromApi(dedup);
      } catch (error) {
        console.error("Filter fetch error:", error);
        toast.error("Failed to fetch filtered notes");
        setFilteredNotesFromApi([]);
      } finally {
        setLoadingFiltered(false);
      }
    },
    [apiUrl, userid]
  );

  const hasActiveFilters = useMemo(
    () => Object.values(selectedFilters).some((arr) => arr?.length > 0),
    [selectedFilters]
  );

  const displayNotes = useMemo(() => {
    if (searchTerm.trim()) {
      return searchResults;
    }
    if (hasActiveFilters) {
      return filteredNotesFromApi;
    }
    return notes || [];
  }, [searchTerm, searchResults, hasActiveFilters, filteredNotesFromApi, notes]);
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
  useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth <= 768);
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
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
    
  mobileFilterButton: {
    display: 'none',
    '@media (max-width: 768px)': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '10px 16px',
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      margin: '10px 0',
      width: '100%',
    }
  },
  
  mobileFiltersContainer: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  
  mobileFiltersPanel: {
    width: '85%',
    maxWidth: '400px',
    height: '100%',
    backgroundColor: 'white',
    overflowY: 'auto',
    padding: '20px',
    boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.1)',
  },
  
  mobileFiltersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid #eee',
  },
  
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
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
  const fetchProjectsByWorkspaces = useCallback(
    async (workspaceIds) => {
      if (!workspaceIds || workspaceIds.length === 0) return;
      const results = [];
      for (const wid of workspaceIds) {
        try {
          const r = await fetch(
            `${apiUrl}/Project/GetProjectsByUserJobPermission/${userid}/${wid}`
          );
          if (r.ok) {
            const data = await r.json();
            if (Array.isArray(data.projects)) {
              results.push(...data.projects);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      const dedup = [];
      const seen = new Set();
      results.forEach((p) => {
        const id = p.id ?? p.projectId ?? p.value;
        if (id && !seen.has(id)) {
          seen.add(id);
          dedup.push(p);
        }
      });
      setUniqueProjects(dedup);
    },
    [apiUrl, userid]
  );
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
  const fetchJobsByProjects = useCallback(
    async (projectIds) => {
      if (!projectIds || projectIds.length === 0) return;
      const results = [];
      for (const pid of projectIds) {
        try {
          const r = await fetch(
            `${apiUrl}/UserJobAuth/GetJobsByUserAndProject/${userid}/${pid}`
          );
          if (r.ok) {
            const data = await r.json();
            if (Array.isArray(data.jobs)) {
              results.push(...data.jobs);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      const dedup = [];
      const seen = new Set();
      results.forEach((j) => {
        const id = j.jobId ?? j.id ?? j.value;
        if (id && !seen.has(id)) {
          seen.add(id);
          dedup.push(j);
        }
      });
      setUniqueJobs(dedup);
    },
    [apiUrl, userid]
  );
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
    if (!hasActiveFilters) {
      setFilteredNotesFromApi(notes || []);
    }
  }, [notes, hasActiveFilters]);

  useEffect(() => {
    if (hasActiveFilters) {
      fetchNotesWithFilters(selectedFilters);
    }
  }, [hasActiveFilters, fetchNotesWithFilters, selectedFilters]);
  useEffect(() => {
    if (userid && defaultUserWorkspaceID) {
      //fetchUserWorkspaceRole();
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
      /* if (defaultUserWorkspaceID) {
        await fetchUserWorkspaceRole();
      } */
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
 

  /* const fetchUserWorkspaceRole = async () => {
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
  }; */

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
    if (filterType === "workspace") {
      let options = (uniqueWorkspaces || []).map((w) => ({
        id:
          w.id ??
          w.workspaceId ??
          w.workspaceID ??
          w.value ??
          w.name ??
          w.text,
        text: w.name ?? w.text ?? String(w.id ?? w.workspaceId ?? w.value ?? w),
        displayText: w.name ?? w.text ?? String(w.id ?? w.workspaceId ?? w.value ?? w),
      }));
      if (filterSearchTerm) {
        options = options.filter(
          (o) =>
            o.displayText &&
            o.displayText.toLowerCase().includes(filterSearchTerm.toLowerCase())
        );
      }
      return options;
    }
    if (filterType === "project") {
      let options = (uniqueProjects || []).map((p) => {
        const id = p.value ?? p.id ?? p.projectId ?? p.projectID;
        const label =
          p.name ?? p.projectName ?? p.text ?? String(id ?? p);
        return {
          id,
          text: label,
          displayText: label,
        };
      });
      if (filterSearchTerm) {
        options = options.filter(o =>
            o.displayText && o.displayText.toLowerCase().includes(filterSearchTerm.toLowerCase())
        );
      }
      return options;
    }
    if (filterType === "job") {
      let options = (uniqueJobs || []).map((j) => {
        const id = j.jobId ?? j.id ?? j.value ?? j.jobID;
        const label =
          j.jobName ?? j.name ?? j.text ?? String(id ?? j);
        return {
          id,
          text: label,
          displayText: label,
        };
      });
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
    if (filterType === "workspace") {
      const hit = (uniqueWorkspaces || []).find(
        (w) =>
          (w.id ?? w.workspaceId ?? w.workspaceID ?? w.value)?.toString() ===
          value?.toString()
      );
      if (hit) return hit.name ?? hit.text ?? value;
    }
    if (filterType === "project") {
      const hit = (uniqueProjects || []).find(
        (p) =>
          (p.id ?? p.projectId ?? p.projectID ?? p.value)?.toString() === value?.toString()
      );
      if (hit) return hit.name ?? hit.projectName ?? hit.text ?? value;
    }
    if (filterType === "job") {
      const hit = (uniqueJobs || []).find(
        (j) => (j.jobId ?? j.jobID ?? j.id ?? j.value)?.toString() === value?.toString()
      );
      if (hit) return hit.jobName ?? hit.name ?? hit.text ?? value;
    }
    return value;
  };
  const getActiveFilterCount = () => {
    return Object.values(selectedFilters).reduce(
      (total, arr) => total + arr.length,
      0
    );
  };
  const handleFilterCheckboxChange = useCallback(
    async (filterType, value) => {
      const currentValues = selectedFilters[filterType] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      let newFilters = {
        ...selectedFilters,
        [filterType]: newValues,
      };

      // Cascading: workspace change clears project/job and refreshes project options
      if (filterType === "workspace") {
        newFilters = {
          ...newFilters,
          project: [],
          job: [],
        };
        setUniqueProjects([]);
        setUniqueJobs([]);
        if (newValues.length === 0) {
          await fetchUniqueProjects();
          await fetchUniqueJobs();
        } else {
          await fetchProjectsByWorkspaces(newValues);
        }
      }

      // Cascading: project change clears job and refreshes job options
      if (filterType === "project") {
        newFilters = {
          ...newFilters,
          job: [],
        };
        setUniqueJobs([]);
        if (newValues.length === 0) {
          await fetchUniqueJobs();
        } else {
          await fetchJobsByProjects(newValues);
        }
      }

      setSelectedFilters(newFilters);

      const active = Object.values(newFilters).some(
        (arr) => Array.isArray(arr) && arr.length > 0
      );
      if (active) {
        fetchNotesWithFilters(newFilters);
      } else {
        setFilteredNotesFromApi(notes || []);
      }
    },
    [
      selectedFilters,
      fetchNotesWithFilters,
      fetchProjectsByWorkspaces,
      fetchJobsByProjects,
      fetchUniqueProjects,
      fetchUniqueJobs,
      notes,
    ]
  );
  const removeFilter = useCallback(
    (filterType, value) => {
      const currentValues = selectedFilters[filterType] || [];
      const newValues = currentValues.filter((v) => v !== value);
      const newFilters = {
        ...selectedFilters,
        [filterType]: newValues,
      };
      setSelectedFilters(newFilters);
      const active = Object.values(newFilters).some(
        (arr) => Array.isArray(arr) && arr.length > 0
      );
      if (active) {
        fetchNotesWithFilters(newFilters);
      } else {
        setFilteredNotesFromApi(notes || []);
      }
    },
    [selectedFilters, notes, fetchNotesWithFilters]
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
    setFilteredNotesFromApi(notes || []);
    setLoadingFiltered(false);
  }, [notes]);
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
  // Check if filter button should show info style
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
  return (
    <div className="main-content">
      <div className="dashboard">
        <DashboardMenu 
        defaultUserWorkspaceID={defaultUserWorkspaceID}
        defaultUserWorkspaceName={defaultUserWorkspaceName}
        fetchProjectAndJobs={fetchProjectAndJobs}
        onUpdateDefaultWorkspace={onUpdateDefaultWorkspace}
        workspaces={workspaces}
        userid={userid}
        onLogout={onLogout}/>

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
          
        {isMobile && (
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '16px',
              position: 'relative',
            }}
            onClick={() => setMobileFiltersOpen(true)}
          >
            <i className="fas fa-filter" />
            
            {(selectedFilters.date.length > 0 || 
              selectedFilters.workspace.length > 0 || 
              selectedFilters.project.length > 0 || 
              selectedFilters.job.length > 0 || 
              selectedFilters.userName.length > 0) && (
              <span style={{
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '5px'
              }}>
                {selectedFilters.date.length + 
                 selectedFilters.workspace.length + 
                 selectedFilters.project.length + 
                 selectedFilters.job.length + 
                 selectedFilters.userName.length}
              </span>
            )}
          </button>
        )}
        </div>
        {isMobile && mobileFiltersOpen && (
          <div style={styles.mobileFiltersContainer} onClick={() => setMobileFiltersOpen(false)}>
            <div style={styles.mobileFiltersPanel} onClick={e => e.stopPropagation()}>
              <div style={styles.mobileFiltersHeader}>
                <h3 style={{ margin: 0 }}>Filters</h3>
                <button
                  style={styles.closeButton}
                  onClick={() => setMobileFiltersOpen(false)}
                >
                  <i className="fas fa-times" />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Date Filter for mobile */}
                <div style={{ marginBottom: '10px' }}>
                  <div
                    style={{
                      ...styles.filterButton,
                      width: '100%',
                      justifyContent: 'space-between',
                      marginBottom: filterDropdownOpen === "date" ? '10px' : '0'
                    }}
                    onClick={() => toggleFilterDropdown("date")}
                  >
                    {getFilterButtonLabel("date")}
                    <i
                      className={`fas fa-chevron-${
                        filterDropdownOpen === "date" ? "up" : "down"
                      }`}
                      style={{ fontSize: "12px" }}
                    />
                  </div>
                  {filterDropdownOpen === "date" && (
                    <div style={{ ...styles.dropdownContent, position: 'static', width: '100%' }}>
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
                
                {/* Workspace Filter for mobile */}
                <div style={{ marginBottom: '10px' }}>
                  <div
                    style={{
                      ...styles.filterButton,
                      width: '100%',
                      justifyContent: 'space-between',
                      marginBottom: filterDropdownOpen === "workspace" ? '10px' : '0'
                    }}
                    onClick={() => toggleFilterDropdown("workspace")}
                  >
                    {getFilterButtonLabel("workspace")}
                    <i
                      className={`fas fa-chevron-${
                        filterDropdownOpen === "workspace" ? "up" : "down"
                      }`}
                      style={{ fontSize: "12px" }}
                    />
                  </div>
                  {filterDropdownOpen === "workspace" && (
                    <div style={{ ...styles.dropdownContent, position: 'static', width: '100%' }}>
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
                
                {/* Project Filter for mobile */}
                <div style={{ marginBottom: '10px' }}>
                  <div
                    style={{
                      ...styles.filterButton,
                      width: '100%',
                      justifyContent: 'space-between',
                      marginBottom: filterDropdownOpen === "project" ? '10px' : '0'
                    }}
                    onClick={() => toggleFilterDropdown("project")}
                  >
                    {getFilterButtonLabel("project")}
                    <i
                      className={`fas fa-chevron-${
                        filterDropdownOpen === "project" ? "up" : "down"
                      }`}
                      style={{ fontSize: "12px" }}
                    />
                  </div>
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
                
                {/* Job Filter for mobile */}
                <div style={{ marginBottom: '10px' }}>
                  <div
                    style={{
                      ...styles.filterButton,
                      width: '100%',
                      justifyContent: 'space-between',
                      marginBottom: filterDropdownOpen === "job" ? '10px' : '0'
                    }}
                    onClick={() => toggleFilterDropdown("job")}
                  >
                    {getFilterButtonLabel("job")}
                    <i
                      className={`fas fa-chevron-${
                        filterDropdownOpen === "job" ? "up" : "down"
                      }`}
                      style={{ fontSize: "12px" }}
                    />
                  </div>
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
                
                {/* User Filter for mobile */}
                <div style={{ marginBottom: '10px' }}>
                  <div
                    style={{
                      ...styles.filterButton,
                      width: '100%',
                      justifyContent: 'space-between',
                      marginBottom: filterDropdownOpen === "userName" ? '10px' : '0'
                    }}
                    onClick={() => toggleFilterDropdown("userName")}
                  >
                    {getFilterButtonLabel("userName")}
                    <i
                      className={`fas fa-chevron-${
                        filterDropdownOpen === "userName" ? "up" : "down"
                      }`}
                      style={{ fontSize: "12px" }}
                    />
                  </div>
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
              
              {/* Clear All Button for mobile */}
              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <button
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                  onClick={clearAllFilters}
                  onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#5a6268";
                  e.currentTarget.style.borderColor = "#545b62";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#6c757d";
                  e.currentTarget.style.borderColor = "#6c757d";
                }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        )}
        
        {!isMobile && (
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
                style={styles.filterButton}
                onClick={() => toggleFilterDropdown("project")}
                title="Filter by project"
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
                style={styles.filterButton}
                onClick={() => toggleFilterDropdown("job")}
                title="Filter by job"
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
        )}
        
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
        
        

        <NotesTab
          viewMode={viewMode}
          finalDisplayNotes={finalDisplayNotes}
          isDataLoaded={isDataLoaded}
          initialLoading={initialLoading}
          searchLoading={searchLoading}
          loadingFiltered={loadingFiltered}
          loadingUniques={loadingUniques}
          searchTerm={searchTerm}
          getActiveFilterCount={getActiveFilterCount}
          handleRowClick={handleRowClick}
          handleRowDoubleClick={handleRowDoubleClick}
          priorities={priorities}
          handleAddFromRow={handleAddFromRow}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          handleViewAttachments={handleViewAttachments}
          selectedRow={selectedRow}
          focusedRow={focusedRow}
          inlineImagesMap={inlineImagesMap}
          loadingImages={loadingImages}
          renderTableImageIcon={renderTableImageIcon}
          renderCardImageIcon={renderCardImageIcon}
          renderStackedImageIcon={renderStackedImageIcon}
          handleImageThumbnailClick={handleImageThumbnailClick}
          handlePriorityChange={handlePriorityChange}
          showPriorityDropdown={showPriorityDropdown}
          setShowPriorityDropdown={setShowPriorityDropdown}
          selectedNoteForPriority={selectedNoteForPriority}
          priorityDropdownPosition={priorityDropdownPosition}
          setSelectedNoteForPriority={setSelectedNoteForPriority}
          setPriorityDropdownPosition={setPriorityDropdownPosition}
          expandedStacks={expandedStacks}
          toggleStackExpansion={toggleStackExpansion}
          expandedCardLimit={expandedCardLimit}
          loadMoreCards={loadMoreCards}
          jobs={jobs}
          setViewNote={setViewNote}
          setShowViewModal={setShowViewModal}
        />
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
  workspaces: PropTypes.array,
  defaultUserWorkspaceID: PropTypes.any,
  defaultUserWorkspaceName: PropTypes.string,
  onUpdateDefaultWorkspace: PropTypes.func.isRequired,
  fetchProjectAndJobs: PropTypes.func.isRequired,
};
Dashboard.defaultProps = { projects: [], jobs: [] };
export default Dashboard