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
import DashboardHeader from "./Dashbord/DashboardHeader.jsx";

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
  fetchNotes,
  
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
  const [defaultWorkspaceRole, setDefaultWorkspaceRole] = useState(null);
  const [loadingWorkspaceRole, setLoadingWorkspaceRole] = useState(false);
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
  const [stackedJobs, setStackedJobs] = useState([]); 
  const [loadingStackedJobs, setLoadingStackedJobs] = useState(false); 
  const newNoteModalRef = useRef();
  const filterRef = useRef();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

  const fetchWorkspaceRole = useCallback(async () => {
  if (!userid || !defaultUserWorkspaceID) {
    setDefaultWorkspaceRole(null);
    return;
  }

  setLoadingWorkspaceRole(true);
  try {
    const response = await fetch(
      `${apiUrl}/Workspace/GetWorkspacesByUserId/${userid}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch workspaces: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(data)
    const workspaces = data.workspaces || [];
    
    // Find the workspace with matching ID
    const defaultWorkspace = workspaces.find(
      (workspace) => 
        (workspace.id || workspace.workspaceId)?.toString() === defaultUserWorkspaceID?.toString()
    );
    
    if (defaultWorkspace) {
      // Set the role (should be 3 for the example you provided)
      setDefaultWorkspaceRole(defaultWorkspace.role || null);
    } else {
      console.warn(`Default workspace with ID ${defaultUserWorkspaceID} not found in user's workspaces`);
      setDefaultWorkspaceRole(null);
    }
  } catch (error) {
    console.error("Error fetching workspace role:", error);
    setDefaultWorkspaceRole(null);
  } finally {
    setLoadingWorkspaceRole(false);
  }
}, [apiUrl, userid, defaultUserWorkspaceID]);

  // Fetch inline images only when thumbnail is clicked
  const fetchInlineImages = useCallback(
    async (noteId) => {
      // Don't fetch if already loading
      if (!noteId || loadingImages[noteId]) return;
      
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
          return images; // Return images for immediate use
        } else {
          console.error(`Failed to fetch images for note ${noteId}:`, response.status);
          setInlineImagesMap((prev) => ({
            ...prev,
            [noteId]: [],
          }));
          return [];
        }
      } catch (error) {
        console.error(`Error fetching inline images for note ${noteId}:`, error);
        setInlineImagesMap((prev) => ({
          ...prev,
          [noteId]: [],
        }));
        return [];
      } finally {
        setLoadingImages((prev) => ({ ...prev, [noteId]: false }));
      }
    },
    [apiUrl, loadingImages]
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
  // Return notes from App.js (these are the initial notes)
  return notes || [];
}, [searchTerm, searchResults, hasActiveFilters, filteredNotesFromApi, notes]);
  
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

  // Handle image thumbnail click - fetch images on demand
  const handleImageThumbnailClick = useCallback(async (note, imageIndex = 0) => {
    // Check if note has inline images using inlineImageCount
    if (!note.inlineImageCount || note.inlineImageCount <= 0) {
      return;
    }
    
    // Check if images are already loaded
    const existingImages = inlineImagesMap[note.id] || [];
    let images = existingImages;
    
    // If no images loaded yet, fetch them
    if (existingImages.length === 0) {
      setLoadingImages((prev) => ({ ...prev, [note.id]: true }));
      try {
        const fetchedImages = await fetchInlineImages(note.id);
        images = fetchedImages;
        
        if (images.length > 0) {
          setSelectedImageNote(note);
          setSelectedImage({
            image: images[imageIndex],
            index: imageIndex,
            total: images.length,
          });
          setShowImageViewer(true);
        }
      } catch (error) {
        console.error("Error loading images:", error);
        toast.error("Failed to load images");
      }
    } else {
      // Images already loaded, show them
      setSelectedImageNote(note);
      setSelectedImage({
        image: images[imageIndex],
        index: imageIndex,
        total: images.length,
      });
      setShowImageViewer(true);
    }
  }, [inlineImagesMap, fetchInlineImages]);

  // Navigate through images
  const handleNextImage = useCallback(() => {
    if (selectedImage && selectedImageNote) {
      const images = inlineImagesMap[selectedImageNote.id] || [];
      if (images.length > 0) {
        const nextIndex = (selectedImage.index + 1) % images.length;
        setSelectedImage({
          image: images[nextIndex],
          index: nextIndex,
          total: images.length,
        });
      }
    }
  }, [selectedImage, selectedImageNote, inlineImagesMap]);

  const handlePrevImage = useCallback(() => {
    if (selectedImage && selectedImageNote) {
      const images = inlineImagesMap[selectedImageNote.id] || [];
      if (images.length > 0) {
        const prevIndex =
          (selectedImage.index - 1 + images.length) % images.length;
        setSelectedImage({
          image: images[prevIndex],
          index: prevIndex,
          total: images.length,
        });
      }
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

  const fetchStackedJobs = useCallback(async () => {
    if (!userid) return;
    
    setLoadingStackedJobs(true);
    try {
      const jobResponse = await fetch(
        `${apiUrl}/SiteNote/GetStackedJobs?userId=${userid}&pageNumber=1&pageSize=50`
      );
      
      if (!jobResponse.ok) {
        throw new Error(`Failed to fetch stacked jobs: ${jobResponse.status}`);
      }
      
      const jobData = await jobResponse.json();
      
      if (!jobData.jobs || !Array.isArray(jobData.jobs) || jobData.jobs.length === 0) {
        setStackedJobs([]);
        return;
      }
      
      const jobsWithNotes = await Promise.all(
        jobData.jobs.map(async (job) => {
          try {
            const notesResponse = await fetch(
              `${apiUrl}/SiteNote/GetSiteNotesByJobId?` + 
              `jobId=${job.jobId}&userId=${userid}&pageNumber=1&pageSize=100`
            );
            
            if (!notesResponse.ok) {
              console.error(`Failed to fetch notes for job ${job.jobId}:`, notesResponse.status);
              return {
                jobId: job.jobId,
                jobName: job.jobName,
                jobDescription: job.jobDescription || '',
                noteCount: job.totalSiteNotes || 0,
                latestTimeStamp: job.latestTimeStamp,
                notes: []
              };
            }
            
            const notesData = await notesResponse.json();
            
            const transformedNotes = (notesData.siteNotes || []).map(note => ({
              ...note,
              id: note.id,
              userName: note.userName || note.UserName || 'Unknown User',
              documentCount: note.documentCount || note.DocumentCount || 0,
              timeStamp: note.timeStamp || note.date || note.createdDate,
              date: note.date || note.createdDate || new Date().toISOString(),
              workspace: note.workspace || note.workspaceName || '',
              project: note.project || note.projectName || '',
              job: note.job || job.jobName,
              note: note.note || note.content || '',
              jobId: note.jobId || job.jobId
            }));
            
            return {
              jobId: job.jobId,
              jobName: job.jobName,
              jobDescription: job.jobDescription || '',
              noteCount: job.totalSiteNotes || transformedNotes.length,
              latestTimeStamp: job.latestTimeStamp,
              notes: transformedNotes.sort((a, b) => 
                new Date(b.timeStamp || b.date) - new Date(a.timeStamp || a.date)
              )
            };
            
          } catch (error) {
            console.error(`Error fetching notes for job ${job.jobId}:`, error);
            return {
              jobId: job.jobId,
              jobName: job.jobName,
              jobDescription: job.jobDescription || '',
              noteCount: job.totalSiteNotes || 0,
              latestTimeStamp: job.latestTimeStamp,
              notes: []
            };
          }
        })
      );
      
      const jobsWithActualNotes = jobsWithNotes.filter(job => job.notes.length > 0);
      setStackedJobs(jobsWithActualNotes);
      
    } catch (error) {
      console.error('Error in fetchStackedJobs:', error);
      toast.error('Failed to load stacked jobs');
      setStackedJobs([]);
    } finally {
      setLoadingStackedJobs(false);
    }
  }, [apiUrl, userid]);

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
      fetchWorkspaceRole();
      fetchWorkspacesByUserId();
      //fetchPriorities();
    }
  }, [userid, defaultUserWorkspaceID, fetchWorkspaceRole]);

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

  useEffect(() => {
    if (userid && viewMode === 'stacked') {
      fetchStackedJobs();
    }
  }, [userid, viewMode, fetchStackedJobs]);

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
            projectId: selectedNote.projectId,
            job: selectedNote.job,
            jobId: selectedNote.jobId,
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
      if (viewMode === 'stacked') {
        await fetchStackedJobs();
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
      projectId: note.projectId,
      job: note.job,
      jobId: note.jobId,
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

  // Function to render inline image icon for stacked view
  const renderStackedImageIcon = (note) => {
    const imageCount = note.inlineImageCount || 0;
    const isLoading = loadingImages[note.id];
    const hasImages = imageCount > 0;
    
    if (!hasImages) {
      return null;
    }
    
    if (isLoading) {
      return (
        <button
          className="image-icon-btn"
          style={{ opacity: 0.5, marginRight: "4px" }}
          title="Loading images..."
        >
          <i className="fas fa-spinner fa-spin" />
        </button>
      );
    }
    
    return (
      <div
        className="inline-image-icon"
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginRight: "4px",
          position: "relative",
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleImageThumbnailClick(note);
        }}
        title={`${imageCount} inline image${imageCount !== 1 ? "s" : ""} - Click to view`}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <i
            className="fas fa-image"
            style={{
              fontSize: "18px",
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
          {/* Image count badge - using inlineImageCount from note */}
          <div
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              backgroundColor: "#e74c3c",
              color: "white",
              fontSize: "9px",
              fontWeight: "bold",
              minWidth: "16px",
              height: "16px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              padding: "0 2px",
            }}
          >
            {imageCount}
          </div>
        </div>
      </div>
    );
  };

  // Function to render inline image icon for table view
  const renderTableImageIcon = (note) => {
    const imageCount = note.inlineImageCount || 0;
    const isLoading = loadingImages[note.id];
    const hasImages = imageCount > 0;
    
    if (!hasImages) {
      return null;
    }
    
    if (isLoading) {
      return (
        <div style={{ display: "inline-flex", alignItems: "center", marginLeft: "6px" }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: "12px", color: "#666" }} />
        </div>
      );
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
        title={`${imageCount} inline image${imageCount !== 1 ? "s" : ""} - Click to view`}
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
          {/* Image count badge - using inlineImageCount from note */}
         
        </div>
      </div>
    );
  };

  // Function to render inline image icon for card view
  const renderCardImageIcon = (note) => {
    const imageCount = note.inlineImageCount || 0;
    const isLoading = loadingImages[note.id];
    const hasImages = imageCount > 0;
    
    if (!hasImages) {
      return null;
    }
    
    if (isLoading) {
      return (
        <button className="image-icon-btn" style={{ opacity: 0.5 }} title="Loading images...">
          <i className="fas fa-spinner fa-spin" />
        </button>
      );
    }
    
    return (
      <div
        className="inline-image-icon"
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginRight: "4px",
          position: "relative",
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleImageThumbnailClick(note);
        }}
        title={`${imageCount} inline image${imageCount !== 1 ? "s" : ""} - Click to view`}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <i
            className="fas fa-image"
            style={{
              fontSize: "18px",
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
          {/* Image count badge - using inlineImageCount from note */}
          
        </div>
      </div>
    );
  };

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
          onLogout={onLogout}
          userRole={userRole}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchColumn={searchColumn}
          setSearchColumn={setSearchColumn}
          viewMode={viewMode}
          setViewMode={setViewMode}
          handleRefresh={handleRefresh}
          refreshNotes={refreshNotes}
          handleNewNoteClick={handleNewNoteClick}
          defWorkName={defaultUserWorkspaceName}
          role={role}
        />

        <DashboardHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchColumn={searchColumn}
          setSearchColumn={setSearchColumn}
          viewMode={viewMode}
          setViewMode={setViewMode}
          handleRefresh={handleRefresh}
          handleNewNoteClick={handleNewNoteClick}
          isMobile={isMobile}
          mobileFiltersOpen={mobileFiltersOpen}
          setMobileFiltersOpen={setMobileFiltersOpen}
          selectedFilters={selectedFilters}
          filterDropdownOpen={filterDropdownOpen}
          toggleFilterDropdown={toggleFilterDropdown}
          filterSearchTerm={filterSearchTerm}
          setFilterSearchTerm={setFilterSearchTerm}
          handleFilterCheckboxChange={handleFilterCheckboxChange}
          getFilterOptions={getFilterOptions}
          getFilterButtonLabel={getFilterButtonLabel}
          clearAllFilters={clearAllFilters}
          getActiveFilterCount={getActiveFilterCount}
          removeFilter={removeFilter}
          getFilterDisplayValue={getFilterDisplayValue}
          filterRef={filterRef}
          styles={styles}
        />

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
          stackedJobs={stackedJobs}
          loadingStackedJobs={loadingStackedJobs}
          fetchStackedJobs={fetchStackedJobs} 
            fetchNotes={fetchNotes} // Pass fetchNotes function from App.js
          userId={userid} // Pass userid
          hasActiveFilters={hasActiveFilters}
          filteredNotesFromApi={filteredNotesFromApi}
          searchResults={searchResults}
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
          /* projects={projects}
          jobs={jobs} */
          onUploadDocument={onUploadDocument}
          onDeleteDocument={onDeleteDocument}
          defWorkSpaceId={defaultUserWorkspaceID}
          userworksaces={userWorkspace}
          prefilledData={prefilledData}
          source={modalSource}
          defaultWorkspaceRole={defaultWorkspaceRole}
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
  workspaces: PropTypes.array,
  defaultUserWorkspaceID: PropTypes.any,
  defaultUserWorkspaceName: PropTypes.string,
  onUpdateDefaultWorkspace: PropTypes.func.isRequired,
  fetchProjectAndJobs: PropTypes.func.isRequired,
};

Dashboard.defaultProps = { projects: [], jobs: [], fetchNotes: () => {},};

export default Dashboard;
