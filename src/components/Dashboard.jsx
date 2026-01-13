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
  const [loadingFiltered, setLoadingFiltered] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [role, setRole] = useState(null);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
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
  const [filteredStackedJobs, setFilteredStackedJobs] = useState([]);
  const [loadingStackedJobs, setLoadingStackedJobs] = useState(false);
  const newNoteModalRef = useRef();
  const filterRef = useRef();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

  // New state for Excel-like filter logic
  const [filterOptions, setFilterOptions] = useState({
    date: [],
    workspace: [],
    project: [],
    job: [],
    userName: [],
  });

  const [loadingFilterOptions, setLoadingFilterOptions] = useState({
    date: false,
    workspace: false,
    project: false,
    job: false,
    userName: false,
  });

  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState({
    date: false,
    workspace: false,
    project: false,
    job: false,
    userName: false,
  });

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
      const workspaces = data.workspaces || [];

      const defaultWorkspace = workspaces.find(
        (workspace) =>
          (workspace.id || workspace.workspaceId)?.toString() ===
          defaultUserWorkspaceID?.toString()
      );

      if (defaultWorkspace) {
        setDefaultWorkspaceRole(defaultWorkspace.role || null);
      } else {
        console.warn(
          `Default workspace with ID ${defaultUserWorkspaceID} not found in user's workspaces`
        );
        setDefaultWorkspaceRole(null);
      }
    } catch (error) {
      console.error("Error fetching workspace role:", error);
      setDefaultWorkspaceRole(null);
    } finally {
      setLoadingWorkspaceRole(false);
    }
  }, [apiUrl, userid, defaultUserWorkspaceID]);

  // Helper function to generate all filter combinations for OR logic
  const generateFilterCombinations = useCallback((filters) => {
    const combinations = [];

    // Get all possible values for each filter
    const workspaceValues =
      filters.workspace.length > 0 ? filters.workspace : [null];
    const projectValues = filters.project.length > 0 ? filters.project : [null];
    const jobValues = filters.job.length > 0 ? filters.job : [null];
    const dateValues = filters.date.length > 0 ? filters.date : [null];
    const userValues = filters.userName.length > 0 ? filters.userName : [null];

    // Generate all combinations
    for (const workspace of workspaceValues) {
      for (const project of projectValues) {
        for (const job of jobValues) {
          for (const date of dateValues) {
            for (const user of userValues) {
              const combination = {};
              if (workspace !== null) combination.workspace = workspace;
              if (project !== null) combination.project = project;
              if (job !== null) combination.job = job;
              if (date !== null) combination.date = date;
              if (user !== null) combination.userName = user;

              // Only add combination if it has at least one filter
              if (Object.keys(combination).length > 0) {
                combinations.push(combination);
              }
            }
          }
        }
      }
    }

    // If no combinations (all filters are null), return empty array
    return combinations.length > 0 ? combinations : [];
  }, []);

  // Helper function to fetch simple options (no filters)
  const fetchSimpleOptions = useCallback(
    async (filterType) => {
      let endpoint = "";
      let responseField = "jobs";

      switch (filterType) {
        case "date":
          endpoint = `${apiUrl}/Filters/GetFilteredSiteNoteDate/${userid}`;
          break;
        case "workspace":
          endpoint = `${apiUrl}/Filters/GetFilteredWorkspace/${userid}`;
          break;
        case "project":
          endpoint = `${apiUrl}/Filters/GetFilteredProject/${userid}`;
          break;
        case "job":
          endpoint = `${apiUrl}/Filters/GetFilteredJob/${userid}`;
          break;
        case "userName":
          endpoint = `${apiUrl}/Filters/GetFilteredSiteNoteUser/${userid}`;
          break;
        default:
          return [];
      }

      const response = await fetch(endpoint);
      if (!response.ok)
        throw new Error(
          `Failed to fetch ${filterType} options: ${response.status}`
        );
      const data = await response.json();
      return data[responseField] || [];
    },
    [apiUrl, userid]
  );

  // Helper function to fetch filtered options with specific combination
  const fetchFilteredOptions = useCallback(
    async (filterType, combination) => {
      let endpoint = "";
      let responseField = "jobs";

      switch (filterType) {
        case "date":
          endpoint = `${apiUrl}/Filters/GetFilteredSiteNoteDate/${userid}`;
          break;
        case "workspace":
          endpoint = `${apiUrl}/Filters/GetFilteredWorkspace/${userid}`;
          break;
        case "project":
          endpoint = `${apiUrl}/Filters/GetFilteredProject/${userid}`;
          break;
        case "job":
          endpoint = `${apiUrl}/Filters/GetFilteredJob/${userid}`;
          break;
        case "userName":
          endpoint = `${apiUrl}/Filters/GetFilteredSiteNoteUser/${userid}`;
          break;
        default:
          return [];
      }

      // Build query parameters from combination
      const queryParams = new URLSearchParams();

      if (combination.workspace) {
        queryParams.append("WorkspaceId", combination.workspace);
      }
      if (combination.project) {
        queryParams.append("ProjectId", combination.project);
      }
      if (combination.job) {
        queryParams.append("JobId", combination.job);
      }
      if (combination.date) {
        queryParams.append("NoteDate", combination.date);
      }
      if (combination.userName) {
        queryParams.append("UserId", combination.userName);
      }

      // Make the API call
      const fullUrl = queryParams.toString()
        ? `${endpoint}?${queryParams.toString()}`
        : endpoint;

      const response = await fetch(fullUrl);
      if (!response.ok) {
        console.error(
          `Failed to fetch ${filterType} options for combination ${fullUrl}:`,
          response.status
        );
        return [];
      }

      const data = await response.json();
      return data[responseField] || [];
    },
    [apiUrl, userid]
  );

  // Helper function to remove duplicates from combined results
  const removeDuplicates = useCallback((items, filterType) => {
    const seen = new Set();
    const uniqueItems = [];

    for (const item of items) {
      let id;

      switch (filterType) {
        case "date":
          const dateStr = item.siteNoteDate;
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");
              id = `${year}-${month}-${day}`;
            } else {
              id = dateStr.split("T")[0];
            }
          } catch (e) {
            id = dateStr.split("T")[0];
          }
          break;
        case "workspace":
          id = item.workspaceId;
          break;
        case "project":
          id = item.projectId;
          break;
        case "job":
          id = item.jobId;
          break;
        case "userName":
          id = item.siteNoteUserId;
          break;
        default:
          id = JSON.stringify(item);
      }

      if (!seen.has(id)) {
        seen.add(id);
        uniqueItems.push(item);
      }
    }

    return uniqueItems;
  }, []);

  // Helper function to transform items to options
  const transformOptions = useCallback((filterType, items) => {
    switch (filterType) {
      case "date":
        return items.map((item) => {
          const dateStr = item.siteNoteDate;
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");
              const value = `${year}-${month}-${day}`;
              return {
                id: value,
                text: date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }),
                displayText: date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }),
                rawValue: dateStr,
              };
            }
          } catch (e) {
            console.error("Error parsing date:", e);
          }
          return {
            id: dateStr.split("T")[0],
            text: dateStr.split("T")[0],
            displayText: dateStr.split("T")[0],
            rawValue: dateStr,
          };
        });

      case "workspace":
        return items.map((item) => ({
          id: item.workspaceId,
          text: item.workspaceName,
          displayText: item.workspaceName,
          rawValue: item,
        }));

      case "project":
        return items.map((item) => ({
          id: item.projectId,
          text: item.projectName,
          displayText: item.projectName,
          rawValue: item,
        }));

      case "job":
        return items.map((item) => ({
          id: item.jobId,
          text: item.jobName,
          displayText: item.jobName,
          rawValue: item,
        }));

      case "userName":
        return items.map((item) => ({
          id: item.siteNoteUserId,
          text: item.siteNoteUserName,
          displayText: item.siteNoteUserName,
          rawValue: item,
        }));

      default:
        return [];
    }
  }, []);

  // Fetch filter options
  const fetchFilterOptions = useCallback(
    async (filterType) => {
      if (loadingFilterOptions[filterType] || !userid) {
        return;
      }

      setLoadingFilterOptions((prev) => ({ ...prev, [filterType]: true }));

      try {
        const otherFilters = {
          workspace:
            filterType !== "workspace" ? selectedFilters.workspace : [],
          project: filterType !== "project" ? selectedFilters.project : [],
          job: filterType !== "job" ? selectedFilters.job : [],
          date: filterType !== "date" ? selectedFilters.date : [],
          userName: filterType !== "userName" ? selectedFilters.userName : [],
        };

        const hasFilters = Object.values(otherFilters).some(
          (arr) => arr.length > 0
        );

        let allItems = [];

        if (!hasFilters) {
          const items = await fetchSimpleOptions(filterType);
          allItems = items;
        } else {
          const combinations = generateFilterCombinations(otherFilters);

          const promises = combinations.map((combination) =>
            fetchFilteredOptions(filterType, combination)
          );

          const results = await Promise.all(promises);

          results.forEach((items) => {
            allItems.push(...items);
          });

          allItems = removeDuplicates(allItems, filterType);
        }

        let transformedOptions = transformOptions(filterType, allItems);

        const uniqueOptions = Array.from(
          new Map(transformedOptions.map((item) => [item.id, item])).values()
        ).sort((a, b) => {
          if (typeof a.text === "string" && typeof b.text === "string") {
            return a.text.localeCompare(b.text);
          }
          return 0;
        });

        setFilterOptions((prev) => ({
          ...prev,
          [filterType]: uniqueOptions,
        }));

        setFilterOptionsLoaded((prev) => ({
          ...prev,
          [filterType]: true,
        }));

        return uniqueOptions;
      } catch (error) {
        console.error(`Error fetching ${filterType} options:`, error);
        toast.error(`Failed to load ${filterType} options`);
        return [];
      } finally {
        setLoadingFilterOptions((prev) => ({ ...prev, [filterType]: false }));
      }
    },
    [
      apiUrl,
      userid,
      loadingFilterOptions,
      selectedFilters,
      fetchSimpleOptions,
      fetchFilteredOptions,
      generateFilterCombinations,
      removeDuplicates,
      transformOptions,
    ]
  );

  // Function to reload all filters based on current selections
  const reloadAllFilters = useCallback(async () => {
    const filterTypes = ["date", "workspace", "project", "job", "userName"];

    const promises = filterTypes.map((filterType) =>
      fetchFilterOptions(filterType)
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error("Error reloading filters:", error);
    }
  }, [fetchFilterOptions]);

  // Function to group filtered notes by job for stacked view
  const groupFilteredNotesByJob = useCallback((notes) => {
    const groupedByJob = {};
    
    notes.forEach((note) => {
      const jobName = note.job || "Unassigned";
      const jobId = note.jobId || note.job;
      
      if (!groupedByJob[jobName]) {
        groupedByJob[jobName] = {
          jobId: jobId,
          jobName: jobName,
          jobDescription: note.jobDescription || "",
          noteCount: 0,
          notes: [],
          hasLoadedNotes: true,
          isLoadingNotes: false,
          errorLoadingNotes: null,
          latestTimeStamp: note.timeStamp || note.date,
          lastSiteNoteUserName: note.userName || note.UserName
        };
      }
      
      groupedByJob[jobName].notes.push(note);
      groupedByJob[jobName].noteCount++;
      
      // Update latest timestamp if this note is newer
      const noteTime = new Date(note.timeStamp || note.date).getTime();
      const currentLatest = new Date(groupedByJob[jobName].latestTimeStamp || 0).getTime();
      if (noteTime > currentLatest) {
        groupedByJob[jobName].latestTimeStamp = note.timeStamp || note.date;
      }
    });
    
    // Convert to array and sort by note count (descending)
    return Object.values(groupedByJob).sort((a, b) => b.noteCount - a.noteCount);
  }, []);

  // UPDATED: fetchNotesWithFilters now also updates filteredStackedJobs
  const fetchNotesWithFilters = useCallback(
    async (filters) => {
      const storedUser = (() => {
        try {
          return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
          return {};
        }
      })();

      const loggedInUserId = storedUser?.id || userid || "";
      const siteNoteUserIds = filters?.userName?.length > 0 
        ? filters.userName 
        : [];

      const dateVals = filters.date?.length ? filters.date : [undefined];
      const workspaceVals = filters.workspace?.length ? filters.workspace : [undefined];
      const projectVals = filters.project?.length ? filters.project : [undefined];
      const jobVals = filters.job?.length ? filters.job : [undefined];
      const siteNoteUserVals = siteNoteUserIds.length > 0 
        ? siteNoteUserIds 
        : [undefined];

      const makeRequest = async (siteNoteUserId, workspaceId, projectId, jobId, dateVal) => {
        const params = new URLSearchParams({
          pageNumber: "1",
          pageSize: "50",
          userId: loggedInUserId,
        });
        
        if (siteNoteUserId) {
          params.append("siteNoteUserId", siteNoteUserId);
        }
        
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
          note: n.note || n.content || "", // Ensure note content is included
        }));
      };

      setLoadingFiltered(true);
      try {
        const allNotes = [];
        const seenIds = new Set();
        
        for (const siteNoteUserId of siteNoteUserVals) {
          for (const d of dateVals) {
            for (const w of workspaceVals) {
              for (const p of projectVals) {
                for (const j of jobVals) {
                  const chunk = await makeRequest(siteNoteUserId, w, p, j, d);
                  
                  const uniqueChunk = chunk.filter(note => {
                    if (!note.id) return false;
                    if (seenIds.has(note.id)) {
                      return false;
                    }
                    seenIds.add(note.id);
                    return true;
                  });
                  
                  allNotes.push(...uniqueChunk);
                }
              }
            }
          }
        }
        
        const sortedNotes = allNotes.sort((a, b) => b.id - a.id);
        setFilteredNotesFromApi(sortedNotes);
        
        // NEW: Group filtered notes by job for stacked view
        const groupedJobs = groupFilteredNotesByJob(sortedNotes);
        setFilteredStackedJobs(groupedJobs);
        
      } catch (error) {
        console.error("Filter fetch error:", error);
        toast.error("Failed to fetch filtered notes");
        setFilteredNotesFromApi([]);
        setFilteredStackedJobs([]);
      } finally {
        setLoadingFiltered(false);
      }
    },
    [apiUrl, userid, groupFilteredNotesByJob]
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
  }, [
    searchTerm,
    searchResults,
    hasActiveFilters,
    filteredNotesFromApi,
    notes,
  ]);

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

  // NEW: Function to fetch notes for a single job (with optional filters)
  const fetchNotesForJob = useCallback(async (jobId, filters = null) => {
    if (!userid || !jobId) return [];
    
    try {
      const params = new URLSearchParams({
        jobId: jobId,
        userId: userid,
        pageNumber: "1",
        pageSize: "100"
      });
      
      // Add filter parameters if provided
      if (filters && hasActiveFilters) {
        if (filters.date?.length) {
          params.append("date", filters.date[0]);
        }
        if (filters.workspace?.length) {
          params.append("workspaceId", filters.workspace[0]);
        }
        if (filters.project?.length) {
          params.append("projectId", filters.project[0]);
        }
        if (filters.userName?.length) {
          params.append("siteNoteUserId", filters.userName[0]);
        }
      }
      
      const notesResponse = await fetch(
        `${apiUrl}/SiteNote/GetSiteNotesByJobId?${params.toString()}`
      );

      if (!notesResponse.ok) {
        throw new Error(`Failed to fetch notes for job ${jobId}: ${notesResponse.status}`);
      }

      const notesData = await notesResponse.json();

      return (notesData.siteNotes || []).map((note) => ({
        ...note,
        id: note.id,
        userName: note.userName || note.UserName || "Unknown User",
        documentCount: note.documentCount || note.DocumentCount || 0,
        timeStamp: note.timeStamp || note.date || note.createdDate,
        date: note.date || note.createdDate || new Date().toISOString(),
        workspace: note.workspace || note.workspaceName || "",
        project: note.project || note.projectName || "",
        job: note.job || "",
        note: note.note || note.content || "", // Ensure note content is included
        jobId: note.jobId || jobId,
      }));
    } catch (error) {
      console.error(`Error fetching notes for job ${jobId}:`, error);
      throw error;
    }
  }, [apiUrl, userid, hasActiveFilters]);

  // NEW: Updated toggleStackExpansion with filter support
  const toggleStackExpansion = useCallback(async (jobName, jobId) => {
    const isExpanding = !expandedStacks[jobName];
    
    // If collapsing, just update UI state
    if (!isExpanding) {
      setExpandedStacks(prev => ({ ...prev, [jobName]: false }));
      return;
    }
    
    // Determine which data source to use based on filters
    const jobsSource = hasActiveFilters ? filteredStackedJobs : stackedJobs;
    const jobIndex = jobsSource.findIndex(j => j.jobId === jobId);
    
    if (jobIndex === -1) return;
    
    const job = jobsSource[jobIndex];
    
    // If notes already loaded, just expand
    if (job.hasLoadedNotes && job.notes) {
      setExpandedStacks(prev => ({ ...prev, [jobName]: true }));
      return;
    }
    
    // Set loading state
    if (hasActiveFilters) {
      setFilteredStackedJobs(prev => {
        const updated = [...prev];
        if (updated[jobIndex]) {
          updated[jobIndex] = {
            ...updated[jobIndex],
            isLoadingNotes: true,
            errorLoadingNotes: null
          };
        }
        return updated;
      });
    } else {
      setStackedJobs(prev => {
        const updated = [...prev];
        if (updated[jobIndex]) {
          updated[jobIndex] = {
            ...updated[jobIndex],
            isLoadingNotes: true,
            errorLoadingNotes: null
          };
        }
        return updated;
      });
    }
    
    try {
      // Load notes for this specific job with current filters
      const notes = await fetchNotesForJob(jobId, selectedFilters);
      
      // Update job with loaded notes
      if (hasActiveFilters) {
        setFilteredStackedJobs(prev => {
          const updated = [...prev];
          if (updated[jobIndex]) {
            updated[jobIndex] = {
              ...updated[jobIndex],
              notes: notes,
              isLoadingNotes: false,
              hasLoadedNotes: true,
              errorLoadingNotes: null,
              noteCount: notes.length // Update count based on filtered notes
            };
          }
          return updated;
        });
      } else {
        setStackedJobs(prev => {
          const updated = [...prev];
          if (updated[jobIndex]) {
            updated[jobIndex] = {
              ...updated[jobIndex],
              notes: notes,
              isLoadingNotes: false,
              hasLoadedNotes: true,
              errorLoadingNotes: null
            };
          }
          return updated;
        });
      }
      
      // Expand the stack
      setExpandedStacks(prev => ({ ...prev, [jobName]: true }));
      
    } catch (error) {
      // Handle error
      if (hasActiveFilters) {
        setFilteredStackedJobs(prev => {
          const updated = [...prev];
          if (updated[jobIndex]) {
            updated[jobIndex] = {
              ...updated[jobIndex],
              isLoadingNotes: false,
              errorLoadingNotes: error.message || "Failed to load notes"
            };
          }
          return updated;
        });
      } else {
        setStackedJobs(prev => {
          const updated = [...prev];
          if (updated[jobIndex]) {
            updated[jobIndex] = {
              ...updated[jobIndex],
              isLoadingNotes: false,
              errorLoadingNotes: error.message || "Failed to load notes"
            };
          }
          return updated;
        });
      }
      
      toast.error(`Failed to load notes for ${jobName}`);
    }
  }, [expandedStacks, stackedJobs, filteredStackedJobs, hasActiveFilters, fetchNotesForJob, selectedFilters]);

  // UPDATED: fetchStackedJobs - now only fetches metadata (no notes)
// In Dashboard.js - fetchStackedJobs function:
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

    if (!jobData.jobs || !Array.isArray(jobData.jobs)) {
      setStackedJobs([]);
      return;
    }

    // Transform to include loading states, WITH lastSiteNote included
    const jobsWithMetadata = (jobData.jobs || []).map((job) => ({
      jobId: job.jobId,
      jobName: job.jobName,
      jobDescription: job.jobDescription || "",
      noteCount: job.totalSiteNotes || 0,
      latestTimeStamp: job.latestTimeStamp,
      lastSiteNoteUserName: job.lastSiteNoteUserName || null,
      lastSiteNote: job.lastSiteNote || "", // ADD THIS LINE - includes the latest note content
      // NEW: Loading states
      isLoadingNotes: false,
      hasLoadedNotes: false,
      notes: null, // Will be populated when expanded
      errorLoadingNotes: null
    }));

    // Filter out jobs with 0 notes
    const jobsWithNotes = jobsWithMetadata.filter(job => job.noteCount > 0);
    
    setStackedJobs(jobsWithNotes);
  } catch (error) {
    console.error("Error in fetchStackedJobs:", error);
    toast.error("Failed to load stacked jobs");
    setStackedJobs([]);
  } finally {
    setLoadingStackedJobs(false);
  }
}, [apiUrl, userid]);

  const fetchInlineImages = useCallback(
    async (noteId) => {
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
          return images;
        } else {
          console.error(
            `Failed to fetch images for note ${noteId}:`,
            response.status
          );
          setInlineImagesMap((prev) => ({
            ...prev,
            [noteId]: [],
          }));
          return [];
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
        return [];
      } finally {
        setLoadingImages((prev) => ({ ...prev, [noteId]: false }));
      }
    },
    [apiUrl, loadingImages]
  );

  const handleImageThumbnailClick = useCallback(
    async (note, imageIndex = 0) => {
      if (!note.inlineImageCount || note.inlineImageCount <= 0) {
        return;
      }

      const existingImages = inlineImagesMap[note.id] || [];
      let images = existingImages;

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
        setSelectedImageNote(note);
        setSelectedImage({
          image: images[imageIndex],
          index: imageIndex,
          total: images.length,
        });
        setShowImageViewer(true);
      }
    },
    [inlineImagesMap, fetchInlineImages]
  );

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

  // Excel-like filter functions
  const getFilterOptions = useCallback(
    (filterType) => {
      const options = filterOptions[filterType] || [];

      if (filterSearchTerm) {
        return options.filter(
          (option) =>
            option.displayText &&
            option.displayText
              .toLowerCase()
              .includes(filterSearchTerm.toLowerCase())
        );
      }

      return options;
    },
    [filterOptions, filterSearchTerm]
  );

  const getFilterDisplayValue = useCallback(
    (filterType, value) => {
      const options = filterOptions[filterType] || [];
      const option = options.find(
        (opt) => opt.id.toString() === value.toString() || opt.text === value
      );

      if (option) {
        return option.displayText || option.text || value;
      }

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
    },
    [filterOptions]
  );

  // UPDATED: handleFilterCheckboxChange with stacked view support
  const handleFilterCheckboxChange = useCallback(
    async (filterType, value, rawValue = null) => {
      const currentValues = selectedFilters[filterType] || [];
      let newValues;

      if (currentValues.includes(value)) {
        newValues = currentValues.filter((v) => v !== value);
      } else {
        newValues = [...currentValues, value];
      }

      const newFilters = {
        ...selectedFilters,
        [filterType]: newValues,
      };

      setSelectedFilters(newFilters);

      // Reload all other filter dropdowns
      const otherFilterTypes = [
        "date",
        "workspace",
        "project",
        "job",
        "userName",
      ].filter((type) => type !== filterType);

      try {
        const promises = otherFilterTypes.map((filterType) =>
          fetchFilterOptions(filterType)
        );
        await Promise.all(promises);
      } catch (error) {
        console.error("Error reloading other filters:", error);
      }

      await fetchFilterOptions(filterType);

      // Trigger API call if there are active filters
      const hasActive = Object.values(newFilters).some((arr) => arr.length > 0);
      if (hasActive) {
        fetchNotesWithFilters(newFilters);
        
        // Clear expanded stacks when filters change
        if (viewMode === "stacked") {
          setExpandedStacks({});
        }
      } else {
        setFilteredNotesFromApi(notes || []);
        setFilteredStackedJobs([]);
        
        // If in stacked view and no filters, refresh stacked jobs
        if (viewMode === "stacked") {
          fetchStackedJobs();
        }
      }
    },
    [selectedFilters, notes, fetchNotesWithFilters, fetchFilterOptions, viewMode, fetchStackedJobs]
  );

  // Update the removeFilter function
  const removeFilter = useCallback(
    async (filterType, value) => {
      const currentValues = selectedFilters[filterType] || [];
      const newValues = currentValues.filter((v) => v !== value);

      const newFilters = {
        ...selectedFilters,
        [filterType]: newValues,
      };

      setSelectedFilters(newFilters);

      const otherFilterTypes = [
        "date",
        "workspace",
        "project",
        "job",
        "userName",
      ].filter((type) => type !== filterType);

      try {
        const promises = otherFilterTypes.map((filterType) =>
          fetchFilterOptions(filterType)
        );
        await Promise.all(promises);
      } catch (error) {
        console.error("Error reloading other filters:", error);
      }

      await fetchFilterOptions(filterType);

      const hasActive = Object.values(newFilters).some((arr) => arr.length > 0);
      if (hasActive) {
        fetchNotesWithFilters(newFilters);
        
        // Clear expanded stacks when filters change
        if (viewMode === "stacked") {
          setExpandedStacks({});
        }
      } else {
        setFilteredNotesFromApi(notes || []);
        setFilteredStackedJobs([]);
        
        // If in stacked view and no filters, refresh stacked jobs
        if (viewMode === "stacked") {
          fetchStackedJobs();
        }
      }
    },
    [selectedFilters, notes, fetchNotesWithFilters, fetchFilterOptions, viewMode, fetchStackedJobs]
  );

  // Enhanced clearAllFilters function
  const clearAllFilters = useCallback(async () => {
    const emptyFilters = {
      date: [],
      workspace: [],
      project: [],
      job: [],
      userName: [],
    };
    setSelectedFilters(emptyFilters);
    setFilteredNotesFromApi(notes || []);
    setFilteredStackedJobs([]);
    
    // Clear expanded stacks
    setExpandedStacks({});
    
    // Reload stacked jobs if in stacked view
    if (viewMode === "stacked") {
      await fetchStackedJobs();
    }
    
    // Reload all filters without any parameters
    await reloadAllFilters();
  }, [notes, reloadAllFilters, viewMode, fetchStackedJobs]);

  const toggleFilterDropdown = useCallback(
    async (filterType) => {
      if (filterDropdownOpen !== filterType) {
        await fetchFilterOptions(filterType);
      }

      if (filterDropdownOpen === filterType) {
        setFilterDropdownOpen(null);
        setFilterSearchTerm("");
      } else {
        setFilterDropdownOpen(filterType);
        setFilterSearchTerm("");
      }
    },
    [filterDropdownOpen, fetchFilterOptions]
  );

  const getFilterButtonLabel = (filterType) => {
    const count = selectedFilters[filterType]?.length || 0;
    const isLoading = loadingFilterOptions[filterType];
    const isLoaded = filterOptionsLoaded[filterType];

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

    const hasOtherFilters = Object.entries(selectedFilters).some(
      ([key, values]) => key !== filterType && values.length > 0
    );

    return (
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {isLoading ? (
          <i
            className="fas fa-spinner fa-spin"
            style={{ fontSize: "14px", color: "#3498db" }}
          />
        ) : (
          <i
            className={`fas fa-${iconMap[filterType]}`}
            style={{
              fontSize: "14px",
              color: hasOtherFilters ? "#17a2b8" : "#3498db",
            }}
          />
        )}
        {isLoading
          ? `Loading ${baseLabels[filterType]}...`
          : baseLabels[filterType]}
        {count > 0 && ` (${count})`}
        {hasOtherFilters && !isLoading && (
          <span
            title="Filtered by other selections"
            style={{ marginLeft: "4px", fontSize: "10px" }}
          >
            <i className="fas fa-filter" style={{ color: "#17a2b8" }} />
          </span>
        )}
        {!isLoading && !isLoaded && filterDropdownOpen !== filterType && (
          <span
            title="Click to load options"
            style={{ marginLeft: "4px", fontSize: "10px" }}
          ></span>
        )}
      </span>
    );
  };

  const getActiveFilterCount = () => {
    return Object.values(selectedFilters).reduce(
      (total, arr) => total + arr.length,
      0
    );
  };

  const renderActiveFilters = () => {
    const activeFilters = [];

    Object.entries(selectedFilters).forEach(([filterType, values]) => {
      if (values.length > 0) {
        values.forEach((value) => {
          const displayValue = getFilterDisplayValue(filterType, value);
          activeFilters.push({ filterType, value, displayValue });
        });
      }
    });

    if (activeFilters.length === 0) {
      return null;
    }

    return (
      <div style={styles.activeFiltersContainer}>
        <div style={styles.activeFiltersTitle}>
          <i
            className="fas fa-filter"
            style={{ fontSize: "14px", color: "#495057" }}
          />
          Active Filters ({getActiveFilterCount()}):
        </div>
        <div style={styles.activeFiltersContent}>
          {activeFilters.map((filter, index) => (
            <div
              key={`${filter.filterType}-${filter.value}-${index}`}
              style={styles.filterTag}
            >
              <span style={{ fontWeight: "500", color: "#1976d2" }}>
                {filter.filterType === "date"
                  ? "Date"
                  : filter.filterType === "workspace"
                  ? "Workspace"
                  : filter.filterType === "project"
                  ? "Project"
                  : filter.filterType === "job"
                  ? "Job"
                  : "User"}
                : {filter.displayValue}
              </span>
              <button
                onClick={() => removeFilter(filter.filterType, filter.value)}
                style={styles.filterTagRemove}
                onMouseEnter={(e) =>
                  (e.target.style.color = styles.filterTagRemoveHover.color)
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = styles.filterTagRemove.color)
                }
                title="Remove filter"
              >
                <i className="fas fa-times" />
              </button>
            </div>
          ))}
          {activeFilters.length > 0 && (
            <button
              onClick={clearAllFilters}
              style={styles.clearAllButton}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor =
                  styles.clearAllButtonHover.backgroundColor;
                e.target.style.borderColor =
                  styles.clearAllButtonHover.borderColor;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor =
                  styles.clearAllButton.backgroundColor;
                e.target.style.borderColor = styles.clearAllButton.borderColor;
              }}
            >
              <i className="fas fa-times-circle" />
              Clear All
            </button>
          )}
        </div>
      </div>
    );
  };

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
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
        job = jobs.find(
          (j) => (j.id || j.jobId)?.toString() === note.jobId.toString()
        );
      }
      setViewNote({
        id: note.id,
        jobId: job?.id ?? null,
      });
      setShowViewModal(true);
    },
    [jobs]
  );

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
    }
  }, [userid, defaultUserWorkspaceID, fetchWorkspaceRole]);

  useEffect(() => {
    if (notes !== undefined) {
      setIsDataLoaded(true);
      setInitialLoading(false);
    }
  }, [notes]);

  useEffect(() => {
    if (userid && viewMode === "stacked") {
      if (hasActiveFilters) {
        // If filters are active, we've already fetched filtered notes
        // which updates filteredStackedJobs
      } else {
        fetchStackedJobs();
      }
    }
  }, [userid, viewMode, fetchStackedJobs, hasActiveFilters]);

  const handlePriorityUpdate = () => {
    refreshNotes();
  };

  const handlePriorityChange = async (priorityValue) => {
    if (!selectedNoteForPriority) return;
    
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const noteId = selectedNoteForPriority.id;
      
      const updatePriority = async () => {
        try {
          const getPriorityUrl = `${apiUrl}/Priority/GetPriorityByNoteId/${noteId}`;
          const getResponse = await fetch(getPriorityUrl);
          
          if (getResponse.ok) {
            const priorityData = await getResponse.json();
            const priorityId = priorityData.priority?.id;
            
            if (priorityId) {
              const updateUrl = `${apiUrl}/Priority/UpdatePriority/${priorityId}`;
              const updateResponse = await fetch(updateUrl, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ priorityValue: priorityValue }),
              });
              
              if (updateResponse.ok) {
                return { success: true, message: "Priority updated successfully" };
              }
            }
          }
        } catch (error) {
          console.log("No existing priority found or error fetching, will create new");
        }
        
        const createUrl = `${apiUrl}/Priority/AddPriority`;
        const createResponse = await fetch(createUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteID: noteId,
            priorityValue: priorityValue,
            userId: user.id,
          }),
        });
        
        if (createResponse.ok) {
          return { success: true, message: "Priority created successfully" };
        }
        
        throw new Error("Failed to create priority");
      };
      
      const result = await updatePriority();
      
      if (result.success) {
        toast.success(result.message);
        
        await refreshNotes();
        
        if (viewMode === "stacked") {
          if (hasActiveFilters) {
            // Refresh filtered notes
            fetchNotesWithFilters(selectedFilters);
          } else {
            await fetchStackedJobs();
          }
        }
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
      setFilterOptionsLoaded({
        date: false,
        workspace: false,
        project: false,
        job: false,
        userName: false,
      });
      
      if (viewMode === "stacked") {
        if (hasActiveFilters) {
          await fetchNotesWithFilters(selectedFilters);
        } else {
          await fetchStackedJobs();
        }
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

  const deleteInlineImages = async (noteId) => {
    try {
      const imagesResponse = await fetch(
        `${apiUrl}/InlineImages/GetInlineImagesBySiteNote?siteNoteId=${noteId}`
      );
      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        const images = imagesData.images || [];
        for (const image of images) {
          const deleteImageResponse = await fetch(
            `${apiUrl}/InlineImages/DeleteInlineImage/${image.id}`,
            {
              method: "DELETE",
            }
          );
          if (!deleteImageResponse.ok) {
            console.error(`Failed to delete image ${image.id}`);
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

  const deleteAttachedDocuments = async (noteId) => {
    try {
      const docsResponse = await fetch(
        `${apiUrl}/Documents/GetDocumentMetadataByReference?siteNoteId=${noteId}`
      );
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        const documents = docsData.documents || [];
        for (const document of documents) {
          const deleteDocResponse = await fetch(
            `${apiUrl}/Documents/DeleteDocument/${document.id}`,
            {
              method: "DELETE",
            }
          );
          if (!deleteDocResponse.ok) {
            console.error(`Failed to delete document ${document.id}`);
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
      const imagesDeleted = await deleteInlineImages(noteToDelete.id);
      if (!imagesDeleted) {
        toast.error("Failed to delete inline images. Please try again.");
        setIsDeleting(false);
        return;
      }
      const documentsDeleted = await deleteAttachedDocuments(noteToDelete.id);
      if (!documentsDeleted) {
        toast.error("Failed to delete attached documents. Please try again.");
        setIsDeleting(false);
        return;
      }
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
      
      // Refresh the current view
      if (viewMode === "stacked") {
        if (hasActiveFilters) {
          await fetchNotesWithFilters(selectedFilters);
        } else {
          await fetchStackedJobs();
        }
      }
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
            note: n.note || n.content || "", // Ensure note content is included
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
        title={`${imageCount} inline image${
          imageCount !== 1 ? "s" : ""
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

  const renderTableImageIcon = (note) => {
    const imageCount = note.inlineImageCount || 0;
    const isLoading = loadingImages[note.id];
    const hasImages = imageCount > 0;

    if (!hasImages) {
      return null;
    }

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
        title={`${imageCount} inline image${
          imageCount !== 1 ? "s" : ""
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
        </div>
      </div>
    );
  };

  const renderCardImageIcon = (note) => {
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
          style={{ opacity: 0.5 }}
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
        title={`${imageCount} inline image${
          imageCount !== 1 ? "s" : ""
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
        </div>
      </div>
    );
  };

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
      display: "none",
      "@media (max-width: 768px)": {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "10px 16px",
        backgroundColor: "#3498db",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
        margin: "10px 0",
        width: "100%",
      },
    },

    mobileFiltersContainer: {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      zIndex: 1000,
      display: "flex",
      justifyContent: "flex-end",
    },

    mobileFiltersPanel: {
      width: "85%",
      maxWidth: "400px",
      height: "100%",
      backgroundColor: "white",
      overflowY: "auto",
      padding: "20px",
      boxShadow: "-2px 0 10px rgba(0, 0, 0, 0.1)",
    },

    mobileFiltersHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      paddingBottom: "15px",
      borderBottom: "1px solid #eee",
    },

    closeButton: {
      background: "none",
      border: "none",
      fontSize: "20px",
      cursor: "pointer",
      color: "#666",
    },
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
          loadingFilterOptions={loadingFilterOptions}
          renderActiveFilters={renderActiveFilters}
        />

        <NotesTab
          viewMode={viewMode}
          finalDisplayNotes={finalDisplayNotes}
          isDataLoaded={isDataLoaded}
          initialLoading={initialLoading}
          searchLoading={searchLoading}
          loadingFiltered={loadingFiltered}
          searchTerm={searchTerm}
          getActiveFilterCount={getActiveFilterCount}
          handleRowClick={handleRowClick}
          handleRowDoubleClick={handleRowDoubleClick}
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
          stackedJobs={hasActiveFilters ? filteredStackedJobs : stackedJobs}
          loadingStackedJobs={loadingStackedJobs}
          fetchStackedJobs={fetchStackedJobs}
          fetchNotes={fetchNotes}
          userId={userid}
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
            refreshNotes();
          }}
          refreshNotes={refreshNotes}
          updateNote={updateNote}
          deleteDocument={onDeleteDocument}
          uploadDocument={onUploadDocument}
          projects={projects}
          jobs={jobs}
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

Dashboard.defaultProps = { projects: [], jobs: [], fetchNotes: () => {} };

export default Dashboard;