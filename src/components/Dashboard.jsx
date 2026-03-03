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
import NotesTab from "./NotesTab/NotesTab.jsx";
import DashboardMenu from "./Dashbord/DashboardMenu.jsx";
import DashboardHeader from "./Dashbord/DashboardHeader.jsx";
import NewTaskModal from "./Modals/NewTaskModal.jsx";

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

  const [activeSearchTerm, setActiveSearchTerm] = useState(() => {
    const saved = localStorage.getItem("dashboardSearchTerm");
    return saved || "";
  });

  const [searchResults, setSearchResults] = useState(() => {
    const saved = localStorage.getItem("dashboardSearchResults");
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedFilters, setSelectedFilters] = useState(() => {
    try {
      const saved = localStorage.getItem("dashboardSelectedFilters");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Return only valid arrays
        return {
          date: Array.isArray(parsed.date) ? parsed.date.filter(val => val) : [],
          workspace: Array.isArray(parsed.workspace) ? parsed.workspace.filter(val => val) : [],
          project: Array.isArray(parsed.project) ? parsed.project.filter(val => val) : [],
          job: Array.isArray(parsed.job) ? parsed.job.filter(val => val) : [],
          userName: Array.isArray(parsed.userName) ? parsed.userName.filter(val => val) : [],
        };
      }
    } catch (error) {
      console.error("Error parsing saved filters:", error);
    }
    return {
      date: [],
      workspace: [],
      project: [],
      job: [],
      userName: [],
      priority: [],
    };
  });
  const [defaultWorkspaceRole, setDefaultWorkspaceRole] = useState(null);
  const [loadingWorkspaceRole, setLoadingWorkspaceRole] = useState(false);
  const [filteredNotesFromApi, setFilteredNotesFromApi] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
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
  const [hasActiveSearchText, setHasActiveSearchText] = useState(false);
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
    priority: [],
  });

  const [loadingFilterOptions, setLoadingFilterOptions] = useState({
    date: false,
    workspace: false,
    project: false,
    job: false,
    userName: false,
    priority: false,
  });

  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState({
    date: false,
    workspace: false,
    project: false,
    job: false,
    userName: false,
    priority: false,
  });

  // Calculate hasActiveFilters early to avoid reference issues
  const hasActiveFilters = useMemo(
    () => Object.values(selectedFilters).some((arr) => arr?.length > 0),
    [selectedFilters]
  );

  const generateFilterCombinations = useCallback((filters) => {
    const combinations = [];

    // If no filters selected, return empty array
    const hasAnyFilters = Object.values(filters).some(arr => arr.length > 0);
    if (!hasAnyFilters) {
      return [];
    }
    const filterArrays = {};
    
    Object.keys(filters).forEach(filterType => {
      const values = filters[filterType];
      if (values.length > 0) {
        // Include each value as a separate possibility
        filterArrays[filterType] = values;
      } else {
        // No values selected for this filter type
        filterArrays[filterType] = [null];
      }
    });

    const cartesianProduct = (arrays) => {
      return arrays.reduce((acc, curr) => {
        const result = [];
        acc.forEach(a => {
          curr.forEach(c => {
            result.push([...a, c]);
          });
        });
        return result;
      }, [[]]);
    };

    const orderedKeys = ['date', 'workspace', 'project', 'job', 'userName', 'priority'];
    const valueArrays = orderedKeys.map(key => filterArrays[key]);
    
    const allCombinations = cartesianProduct(valueArrays);
    
    allCombinations.forEach(combo => {
      const combination = {};
      orderedKeys.forEach((key, index) => {
        if (combo[index] !== null) {
          combination[key] = combo[index];
        }
      });
      
      // Only add if combination has at least one filter
      if (Object.keys(combination).length > 0) {
        combinations.push(combination);
      }
    });

    return combinations;
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
        case "priority":
          endpoint = `${apiUrl}/Filters/GetFilteredPriorities/${userid}`;
          responseField = "priorities";
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
        case "priority":
          endpoint = `${apiUrl}/Filters/GetFilteredPriorities/${userid}`;
          responseField = "priorities";
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
      if (combination.priority) {
        queryParams.append("priority", combination.priority);
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

      case "priority":
        return items.map((item) => ({
          id: item.priorityValue,
          text: item.priorityName,
          displayText: item.priorityName,
          rawValue: item,
        }));

      default:
        return [];
    }
  }, []);

  useEffect(() => {
  setHasActiveSearchText(searchTerm.trim() !== "");
}, [searchTerm]);

  // Fetch filter options - define this BEFORE any useEffect that uses it
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
    const filterTypes = ["date", "workspace", "project", "job", "userName", "priority"];

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
    if (!notes || notes.length === 0) {
      return [];
    }
    
    const groupedByJob = {};
    
    notes.forEach((note) => {
      const jobName = note.job || "Unassigned";
      const jobId = note.jobId || note.job;
      
      if (!groupedByJob[jobName]) {
        groupedByJob[jobName] = {
          jobId: jobId,
          jobName: jobName,
          jobDescription: note.jobDescription || "",
          noteCount: 1,
          notes: [note],
          hasLoadedNotes: true,
          isLoadingNotes: false,
          errorLoadingNotes: null,
          latestTimeStamp: note.timeStamp || note.date,
          lastSiteNoteUserName: note.userName || note.UserName,
          lastSiteNote: note.note || ""
        };
      } else {
        groupedByJob[jobName].notes.push(note);
        groupedByJob[jobName].noteCount++;
        
        // Update latest timestamp if this note is newer
        const noteTime = new Date(note.timeStamp || note.date).getTime();
        const currentLatest = new Date(groupedByJob[jobName].latestTimeStamp || 0).getTime();
        if (noteTime > currentLatest) {
          groupedByJob[jobName].latestTimeStamp = note.timeStamp || note.date;
          groupedByJob[jobName].lastSiteNote = note.note || "";
          groupedByJob[jobName].lastSiteNoteUserName = note.userName || note.UserName;
        }
      }
    });
    
    // Convert to array and sort by note count (descending)
    return Object.values(groupedByJob).sort((a, b) => b.noteCount - a.noteCount);
  }, []);

  const fetchFilteredNotesForCombination = useCallback(async (combination, searchText) => {
    if (!userid) return [];
    
    try {
      const params = new URLSearchParams({
        pageNumber: "1",
        pageSize: "1000",
        userId: userid,
      });

      // Add parameters from combination (only one value per filter type in combination)
      if (combination.date) {
        params.append("date", combination.date);
      }
      if (combination.workspace) {
        params.append("workspaceId", combination.workspace);
      }
      if (combination.project) {
        params.append("projectId", combination.project);
      }
      if (combination.job) {
        params.append("jobId", combination.job);
      }
      if (combination.userName) {
        params.append("siteNoteUserId", combination.userName);
      }
      if (combination.priority) {
        params.append("priority", combination.priority);
      }

      // If there's an active search term, use the text-filter API
      let url;
      if (searchText && searchText.trim() !== "") {
        params.append("searchText", searchText);
        url = `${apiUrl}/SiteNote/GetSiteNotesWithTextFilter?${params.toString()}`;
      } else {
        url = `${apiUrl}/SiteNote/GetSiteNotesWithFilters?${params.toString()}`;
      }

      console.log("Fetching notes for combination:", url);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Failed to fetch notes for combination:`, response.status);
        return [];
      }
      
      const data = await response.json();
      return (data.siteNotes || []).map((n) => ({
        ...n,
        id: n.id,
        userName: n.userName || n.UserName,
        documentCount: n.documentCount ?? n.DocumentCount ?? 0,
        note: n.note || n.content || "",
        timeStamp: n.timeStamp || n.date,
        date: n.date || n.createdDate || new Date().toISOString(),
        workspace: n.workspace || n.workspaceName || "",
        project: n.project || n.projectName || "",
        job: n.job || "",
        jobId: n.jobId || "",
      }));
      
    } catch (error) {
      console.error("Error fetching notes for combination:", error);
      return [];
    }
  }, [apiUrl, userid]);

  // UPDATED: fetchNotesWithFilters - Now handles multiple values with OR logic
  const fetchNotesWithFilters = useCallback(
    async (filters) => {
      if (!userid) return;
      
      console.log("Fetching filtered notes with filters:", filters, "and active search:", activeSearchTerm);
      setLoadingFiltered(true);
      setFilteredStackedJobs([]);
      
      try {
        // If we have multiple values for the same filter, we need to handle OR logic
        // Let's generate all combinations of filters
        const filterCombinations = generateFilterCombinations(filters);
        
        console.log("Filter combinations for OR logic:", filterCombinations.length);
        
        // If no combinations (shouldn't happen), return empty
        if (filterCombinations.length === 0) {
          setFilteredNotesFromApi([]);
          setFilteredStackedJobs([]);
          return;
        }
        
        // Make requests for each combination
        const allPromises = filterCombinations.map(combination => 
          fetchFilteredNotesForCombination(combination, activeSearchTerm) // Pass activeSearchTerm
        );
        
        const allResults = await Promise.all(allPromises);
        
        // Combine and deduplicate results
        const allNotes = [];
        const seenNoteIds = new Set();
        
        allResults.forEach(notes => {
          notes.forEach(note => {
            if (!seenNoteIds.has(note.id)) {
              seenNoteIds.add(note.id);
              allNotes.push(note);
            }
          });
        });
        
        console.log("Total unique notes after combining:", allNotes.length);

        // Set the filtered notes
        setFilteredNotesFromApi(allNotes);

        // Group notes by job for stacked view
        if (allNotes.length > 0) {
          const groupedJobs = groupFilteredNotesByJob(allNotes);
          console.log("Grouped jobs for stacked view:", groupedJobs.length);
          setFilteredStackedJobs(groupedJobs);
        } else {
          // No notes match filters
          setFilteredStackedJobs([]);
          console.log("No notes match the current filters");
        }
        
      } catch (error) {
        console.error("Error fetching filtered notes:", error);
        toast.error("Failed to fetch filtered notes");
        setFilteredNotesFromApi([]);
        setFilteredStackedJobs([]);
      } finally {
        setLoadingFiltered(false);
      }
    },
    [apiUrl, userid, groupFilteredNotesByJob, generateFilterCombinations, fetchFilteredNotesForCombination, activeSearchTerm] // Add activeSearchTerm dependency
  );

  const fetchNotesForJob = useCallback(async (jobId, filters = null) => {
    if (!userid || !jobId) return [];
    
    try {
      // If we're in stacked view and there is an active search term, use the text-filtered API
      if (viewMode === "stacked" && activeSearchTerm && activeSearchTerm.trim() !== "") {
        // If filters were provided, generate combinations and call text-filtered API per combo
        const activeFilters = filters && Object.values(filters).some((arr) => arr?.length > 0);
        if (activeFilters) {
          const combinations = generateFilterCombinations(filters);
          const promises = combinations.map((combo) => {
            const params = new URLSearchParams({
              pageNumber: "1",
              pageSize: "100",
              jobId: jobId,
              userId: userid,
              searchText: activeSearchTerm, // Use activeSearchTerm
            });
            if (combo.date) params.append("date", combo.date);
            if (combo.workspace) params.append("workspaceId", combo.workspace);
            if (combo.project) params.append("projectId", combo.project);
            if (combo.priority) params.append("priority", combo.priority);
            if (combo.userName) params.append("siteNoteUserId", combo.userName);
            return fetch(`${apiUrl}/SiteNote/GetSiteNotesByJobIdWithTextFilter?${params.toString()}`).then(res => res.ok ? res.json() : { siteNotes: [] });
          });

          const results = await Promise.all(promises);
          const seenIds = new Set();
          const combined = [];
          results.forEach(r => {
            (r.siteNotes || []).forEach(n => {
              if (!seenIds.has(n.id)) {
                seenIds.add(n.id);
                combined.push(n);
              }
            });
          });

          return combined.map((note) => ({
            ...note,
            id: note.id,
            userName: note.userName || note.UserName || "Unknown User",
            documentCount: note.documentCount || note.DocumentCount || 0,
            timeStamp: note.timeStamp || note.date || note.timeStamp || note.createdDate,
            date: note.date || note.createdDate || new Date().toISOString(),
            workspace: note.workspace || note.workspaceName || "",
            project: note.project || note.projectName || "",
            job: note.job || "",
            note: note.note || note.content || "",
            jobId: note.jobId || jobId,
          }));
        }

        const params = new URLSearchParams({
          pageNumber: "1",
          pageSize: "100",
          jobId: jobId,
          userId: userid,
          searchText: activeSearchTerm, // Use activeSearchTerm
        });

        const notesResponse = await fetch(
          `${apiUrl}/SiteNote/GetSiteNotesByJobIdWithTextFilter?${params.toString()}`
        );

        if (!notesResponse.ok) {
          throw new Error(`Failed to fetch text-filtered notes for job ${jobId}: ${notesResponse.status}`);
        }

        const notesData = await notesResponse.json();

        return (notesData.siteNotes || []).map((note) => ({
          ...note,
          id: note.id,
          userName: note.userName || note.UserName || "Unknown User",
          documentCount: note.documentCount || note.DocumentCount || 0,
          timeStamp: note.timeStamp || note.date || note.timeStamp || note.createdDate,
          date: note.date || note.createdDate || new Date().toISOString(),
          workspace: note.workspace || note.workspaceName || "",
          project: note.project || note.projectName || "",
          job: note.job || "",
          note: note.note || note.content || "",
          jobId: note.jobId || jobId,
        }));
      }

      // Fallback to original logic (handles filters and combinations)
      const params = new URLSearchParams({
        jobId: jobId,
        userId: userid,
        pageNumber: "1",
        pageSize: "100"
      });
      
      // Add filter parameters if provided
      if (filters && hasActiveFilters) {
        // For multiple filter values, we need to handle OR logic
        const filterCombinations = generateFilterCombinations(filters);
        
        // If we have multiple combinations, we need to fetch for each and combine
        if (filterCombinations.length > 1) {
          const allPromises = filterCombinations.map(combination => {
            const comboParams = new URLSearchParams({
              jobId: jobId,
              userId: userid,
              pageNumber: "1",
              pageSize: "100"
            });
            
            if (combination.date) comboParams.append("date", combination.date);
            if (combination.workspace) comboParams.append("workspaceId", combination.workspace);
            if (combination.project) comboParams.append("projectId", combination.project);
            if (combination.priority) comboParams.append("priority", combination.priority);
            if (combination.userName) comboParams.append("siteNoteUserId", combination.userName);
            
            // Include current active search term if present
            if (activeSearchTerm && activeSearchTerm.trim() !== "") {
              comboParams.append("searchText", activeSearchTerm);
              return fetch(
                `${apiUrl}/SiteNote/GetSiteNotesByJobIdWithTextFilter?${comboParams.toString()}`
              ).then(res => res.ok ? res.json() : { siteNotes: [] });
            } else {
              return fetch(
                `${apiUrl}/SiteNote/GetSiteNotesByJobId?${comboParams.toString()}`
              ).then(res => res.ok ? res.json() : { siteNotes: [] });
            }
          });
          
          const allResults = await Promise.all(allPromises);
          const allNotes = [];
          const seenNoteIds = new Set();
          
          allResults.forEach(data => {
            (data.siteNotes || []).forEach(note => {
              if (!seenNoteIds.has(note.id)) {
                seenNoteIds.add(note.id);
                allNotes.push(note);
              }
            });
          });
          
          return allNotes.map(note => ({
            ...note,
            id: note.id,
            userName: note.userName || note.UserName || "Unknown User",
            documentCount: note.documentCount || note.DocumentCount || 0,
            timeStamp: note.timeStamp || note.date || note.createdDate,
            date: note.date || note.createdDate || new Date().toISOString(),
            workspace: note.workspace || note.workspaceName || "",
            project: note.project || note.projectName || "",
            job: note.job || "",
            note: note.note || note.content || "",
            jobId: note.jobId || jobId,
          }));
        } else if (filterCombinations.length === 1) {
          // Single combination
          const combination = filterCombinations[0];
          if (combination.date) params.append("date", combination.date);
          if (combination.workspace) params.append("workspaceId", combination.workspace);
          if (combination.project) params.append("projectId", combination.project);
          if (combination.userName) params.append("siteNoteUserId", combination.userName);
          if (combination.priority) params.append("priority", combination.priority);
        }
      }
      
      // Use appropriate endpoint based on whether there's an active search term
      let notesResponse;
      if (activeSearchTerm && activeSearchTerm.trim() !== "") {
        params.append("searchText", activeSearchTerm);
        notesResponse = await fetch(
          `${apiUrl}/SiteNote/GetSiteNotesByJobIdWithTextFilter?${params.toString()}`
        );
      } else {
        notesResponse = await fetch(
          `${apiUrl}/SiteNote/GetSiteNotesByJobId?${params.toString()}`
        );
      }

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
        note: note.note || note.content || "",
        jobId: note.jobId || jobId,
      }));
    } catch (error) {
      console.error(`Error fetching notes for job ${jobId}:`, error);
      throw error;
    }
  }, [apiUrl, userid, hasActiveFilters, generateFilterCombinations, viewMode, activeSearchTerm]);

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
    if (job.hasLoadedNotes && job.notes && job.notes.length > 0) {
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
              noteCount: notes.length
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

  const fetchStackedJobs = useCallback(async () => {
    if (!userid) return;

    setLoadingStackedJobs(true);
    try {
      // If user is in stacked view and there's an active search term, use the text search jobs API
      if (viewMode === "stacked" && activeSearchTerm && activeSearchTerm.trim() !== "") {
        // If filters are active, we need to preserve OR logic via combinations
        if (hasActiveFilters) {
          const combinations = generateFilterCombinations(selectedFilters);
          const promises = combinations.map((combo) => {
            const params = new URLSearchParams({
              searchText: activeSearchTerm, // Use activeSearchTerm
              userId: userid,
            });
            if (combo.date) params.append("date", combo.date);
            if (combo.workspace) params.append("workspaceId", combo.workspace);
            if (combo.project) params.append("projectId", combo.project);
            if (combo.job) params.append("jobId", combo.job);
            if (combo.userName) params.append("siteNoteUserId", combo.userName);
            if (combo.priority) params.append("priority", combo.priority);
            return fetch(`${apiUrl}/SiteNote/GetJobsBySiteNoteText?${params.toString()}`).then(res => res.ok ? res.json() : { jobs: [] });
          });

          const results = await Promise.all(promises);
          const jobsMap = new Map();
          results.forEach(r => {
            (r.jobs || []).forEach((job) => {
              if (!jobsMap.has(job.jobId)) {
                jobsMap.set(job.jobId, job);
              }
            });
          });

          const jobs = Array.from(jobsMap.values()).map((job) => ({
            jobId: job.jobId,
            jobName: job.jobName,
            jobDescription: job.jobDescription || "",
            noteCount: job.matchingNotesCount || job.totalSiteNotes || 0,
            latestTimeStamp: job.latestMatchingNote || job.latestTimeStamp,
            workspaceName: job.workspaceName || job.workspace || "",
            projectName: job.projectName || job.project || "",
            isLoadingNotes: false,
            hasLoadedNotes: false,
            notes: null,
            errorLoadingNotes: null,
          }));

          setStackedJobs(jobs.filter(j => j.noteCount > 0));
          return;
        }

        const params = new URLSearchParams({
          searchText: activeSearchTerm, // Use activeSearchTerm
          userId: userid,
        });

        const jobResponse = await fetch(
          `${apiUrl}/SiteNote/GetJobsBySiteNoteText?${params.toString()}`
        );

        if (!jobResponse.ok) {
          throw new Error(`Failed to fetch stacked jobs by text: ${jobResponse.status}`);
        }

        const jobData = await jobResponse.json();

        const jobs = (jobData.jobs || []).map((job) => ({
          jobId: job.jobId,
          jobName: job.jobName,
          jobDescription: job.jobDescription || "",
          noteCount: job.matchingNotesCount || job.totalSiteNotes || 0,
          latestTimeStamp: job.latestMatchingNote || job.latestTimeStamp,
          workspaceName: job.workspaceName || job.workspace || "",
          projectName: job.projectName || job.project || "",
          isLoadingNotes: false,
          hasLoadedNotes: false,
          notes: null,
          errorLoadingNotes: null,
        }));

        setStackedJobs(jobs.filter(j => j.noteCount > 0));
        return;
      }

      // Default behavior: fetch stacked jobs metadata
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
        projectId: job.projectId || "",
        projectName: job.projectName || "",
        workspaceId: job.workspaceId || "",
        noteCount: job.totalSiteNotes || 0,
        latestTimeStamp: job.latestTimeStamp,
        lastSiteNoteUserName: job.lastSiteNoteUserName || null,
        lastSiteNote: job.lastSiteNote || "",
        isLoadingNotes: false,
        hasLoadedNotes: false,
        notes: null,
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
  }, [apiUrl, userid, activeSearchTerm, viewMode, selectedFilters, hasActiveFilters, generateFilterCombinations]);

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

  // Debug logging
  useEffect(() => {
    console.log("Selected Filters:", selectedFilters);
    console.log("Has Active Filters:", hasActiveFilters);
    console.log("Filter Options:", filterOptions);
    console.log("View Mode:", viewMode);
    console.log("Filtered Stacked Jobs:", filteredStackedJobs?.length || 0);
    console.log("Stacked Jobs:", stackedJobs?.length || 0);
  }, [selectedFilters, hasActiveFilters, filterOptions, viewMode, filteredStackedJobs, stackedJobs]);

  // Load filter options on component mount - MOVE THIS AFTER fetchFilterOptions is defined
  useEffect(() => {
    if (userid && isDataLoaded) {
      const loadAllOptions = async () => {
        try {
          const filterTypes = ["date", "workspace", "project", "job", "userName", "priority"];
          for (const type of filterTypes) {
            await fetchFilterOptions(type);
          }
        } catch (error) {
          console.error("Error loading filter options on mount:", error);
        }
      };
      loadAllOptions();
    }
  }, [userid, isDataLoaded]);

  const displayNotes = useMemo(() => {
    if (activeSearchTerm.trim()) {
      return searchResults;
    }
    if (hasActiveFilters) {
      return filteredNotesFromApi;
    }
    return notes || [];
  }, [
    activeSearchTerm, // Changed from searchTerm
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

  // FIXED: getFilterDisplayValue function
  const getFilterDisplayValue = useCallback(
    (filterType, value) => {
      if (!value) return "";
      
      // First, check if we have the option loaded in filterOptions
      const options = filterOptions[filterType] || [];
      const option = options.find(
        (opt) => opt.id?.toString() === value?.toString() || 
                opt.text?.toString() === value?.toString()
      );

      if (option) {
        return option.displayText || option.text || value;
      }

      if (filterType === "workspace" && workspaces) {
        const workspace = workspaces.find(
          (w) => w.id?.toString() === value?.toString() || 
                 w.name?.toString() === value?.toString()
        );
        if (workspace) return workspace.name || value;
      }

      // For project, check projects prop
      if (filterType === "project" && projects) {
        const project = projects.find(
          (p) => p.id?.toString() === value?.toString() || 
                 p.name?.toString() === value?.toString()
        );
        if (project) return project.name || value;
      }

      // For job, check jobs prop
      if (filterType === "job" && jobs) {
        const job = jobs.find(
          (j) => j.id?.toString() === value?.toString() || 
                 j.name?.toString() === value?.toString()
        );
        if (job) return job.name || value;
      }

      // For date, format it
      if (filterType === "date") {
        try {
          // Handle both YYYY-MM-DD format and full date strings
          let dateStr = value;
          if (value.includes("T")) {
            dateStr = value.split("T")[0];
          }
          
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          }
        } catch (e) {
          console.error("Error formatting date:", e);
        }
      }

      // For userName, we might need to fetch user info
      // Return the value as fallback
      return value;
    },
    [filterOptions, workspaces, projects, jobs]
  );

  // FIXED: handleFilterCheckboxChange function
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

      console.log("Setting new filters:", newFilters);
      setSelectedFilters(newFilters);

      // Save to localStorage
      localStorage.setItem(
        "dashboardSelectedFilters",
        JSON.stringify(newFilters)
      );

      // Reload all other filter dropdowns
      const otherFilterTypes = [
        "date",
        "workspace",
        "project",
        "job",
        "userName",
        "priority",
      ].filter((type) => type !== filterType);

      try {
        const promises = otherFilterTypes.map((type) =>
          fetchFilterOptions(type)
        );
        await Promise.all(promises);
      } catch (error) {
        console.error("Error reloading other filters:", error);
      }

      await fetchFilterOptions(filterType);

      // Trigger API call if there are active filters
      const hasActive = Object.values(newFilters).some((arr) => arr.length > 0);
      if (hasActive) {
        console.log("Has active filters, fetching notes...");
        fetchNotesWithFilters(newFilters);
        
        // Clear expanded stacks when filters change
        if (viewMode === "stacked") {
          setExpandedStacks({});
        }
      } else {
        console.log("No active filters, clearing filtered data");
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

// Replace or enhance your existing refreshStackedViewWithNewNote function
const refreshStackedViewWithNewNote = useCallback(async (noteData, operation = 'add') => {
  if (!noteData || viewMode !== "stacked") return;
  
  console.log(`🔄 Updating stacked view (${operation}) with note:`, noteData);
  
  if (hasActiveFilters) {
    // For filtered view - just re-fetch with current filters
    await fetchNotesWithFilters(selectedFilters);
  } else {
    // For normal stacked view - intelligent update
    const jobId = noteData.jobId;
    
    setStackedJobs(prev => {
      const jobIndex = prev.findIndex(j => j.jobId?.toString() === jobId?.toString());
      
      if (jobIndex === -1) {
        // Job doesn't exist - can't update
        return prev;
      }
      
      // Job exists - update it
      const updated = [...prev];
      const job = { ...updated[jobIndex] };
      
      if (operation === 'add') {
        // Adding a new note
        job.noteCount += 1;
        
        // Check if this note is newer
        const noteTime = new Date(noteData.timeStamp || noteData.date).getTime();
        const currentLatest = new Date(job.latestTimeStamp || 0).getTime();
        
        if (noteTime > currentLatest) {
          job.latestTimeStamp = noteData.timeStamp || noteData.date;
          job.lastSiteNote = noteData.note || "";
          job.lastSiteNoteUserName = noteData.userName || noteData.UserName;
        }
        
        // If this job is expanded, add note to its notes array
        if (expandedStacks[job.jobName] && job.hasLoadedNotes) {
          job.notes = [noteData, ...(job.notes || [])];
        }
      } else if (operation === 'update') {
        // Updating an existing note
        // Update metadata if this note is the latest
        if (job.lastSiteNoteUserName === noteData.userName) {
          job.lastSiteNote = noteData.note || "";
        }
        
        // If this job is expanded, update the note in its notes array
        if (expandedStacks[job.jobName] && job.hasLoadedNotes && job.notes) {
          const noteIndex = job.notes.findIndex(n => n.id === noteData.id);
          if (noteIndex !== -1) {
            // Replace the existing note with updated version
            job.notes = [
              ...job.notes.slice(0, noteIndex),
              noteData,
              ...job.notes.slice(noteIndex + 1)
            ];
          }
        }
      }
      
      updated[jobIndex] = job;
      return updated;
    });
  }
}, [viewMode, hasActiveFilters, selectedFilters, expandedStacks, fetchNotesWithFilters]);

  // FIXED: Update the removeFilter function
  const removeFilter = useCallback(
    async (filterType, value) => {
      const currentValues = selectedFilters[filterType] || [];
      const newValues = currentValues.filter((v) => v !== value);

      const newFilters = {
        ...selectedFilters,
        [filterType]: newValues,
      };

      console.log("Removing filter, new filters:", newFilters);
      setSelectedFilters(newFilters);

      // Save to localStorage
      localStorage.setItem(
        "dashboardSelectedFilters",
        JSON.stringify(newFilters)
      );

      const otherFilterTypes = [
        "date",
        "workspace",
        "project",
        "job",
        "userName",
        "priority",
      ].filter((type) => type !== filterType);

      try {
        const promises = otherFilterTypes.map((type) =>
          fetchFilterOptions(type)
        );
        await Promise.all(promises);
      } catch (error) {
        console.error("Error reloading other filters:", error);
      }

      await fetchFilterOptions(filterType);

      const hasActive = Object.values(newFilters).some((arr) => arr.length > 0);
      if (hasActive) {
        console.log("Still has active filters, fetching notes...");
        fetchNotesWithFilters(newFilters);
        
        // Clear expanded stacks when filters change
        if (viewMode === "stacked") {
          setExpandedStacks({});
        }
      } else {
        console.log("No active filters left, clearing filtered data");
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

  // FIXED: Enhanced clearAllFilters function
  const clearAllFilters = useCallback(async () => {
    const emptyFilters = {
      date: [],
      workspace: [],
      project: [],
      job: [],
      userName: [],
      priority: [],
    };
    
    console.log("Clearing all filters");
    
    setSelectedFilters(emptyFilters);
    setFilteredNotesFromApi([]);
    setFilteredStackedJobs([]);
    
    // Clear expanded stacks
    setExpandedStacks({});
    
    // Clear localStorage
    localStorage.removeItem("dashboardSelectedFilters");
    
    // Reload stacked jobs if in stacked view
    if (viewMode === "stacked") {
      console.log("Refreshing stacked jobs after clearing filters");
      await fetchStackedJobs();
    }
    
    // Reload all filters without any parameters
    //await reloadAllFilters();
    refreshNotes()
    toast.success("All filters cleared");
  }, [reloadAllFilters, viewMode, fetchStackedJobs]);

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
      priority: "Priority",
    };

    const iconMap = {
      date: "calendar",
      workspace: "building",
      project: "project-diagram",
      job: "tasks",
      userName: "user",
      priority: "flag",
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

  // FIXED: Ensure filter options are loaded before rendering
  const ensureFilterOptionsLoaded = useCallback(async (filterType) => {
    if (!filterOptionsLoaded[filterType] && !loadingFilterOptions[filterType]) {
      console.log(`Loading ${filterType} options...`);
      await fetchFilterOptions(filterType);
    }
  }, [filterOptionsLoaded, loadingFilterOptions, fetchFilterOptions]);

  const renderActiveFilters = () => {
    const activeFilters = [];

    Object.entries(selectedFilters).forEach(([filterType, values]) => {
      if (values.length > 0) {
        values.forEach((value) => {
          // Ensure options are loaded for this filter type
          if (!filterOptionsLoaded[filterType] && !loadingFilterOptions[filterType]) {
            ensureFilterOptionsLoaded(filterType);
          }
          
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
    // Save filters to localStorage
    const filtersToSave = {
      date: selectedFilters.date || [],
      workspace: selectedFilters.workspace || [],
      project: selectedFilters.project || [],
      job: selectedFilters.job || [],
      userName: selectedFilters.userName || [],
      priority: selectedFilters.priority || [],
    };
    localStorage.setItem(
      "dashboardSelectedFilters",
      JSON.stringify(filtersToSave)
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

  // FIXED: Trigger filter fetching when filters change
  useEffect(() => {
    if (hasActiveFilters) {
      console.log("Active filters detected, fetching notes...", selectedFilters);
      fetchNotesWithFilters(selectedFilters);
    } else {
      console.log("No active filters, clearing filtered data");
      setFilteredNotesFromApi([]);
      setFilteredStackedJobs([]);
    }
  }, [hasActiveFilters, selectedFilters, fetchNotesWithFilters]);

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

  // FIXED: Load stacked jobs when needed
  useEffect(() => {
    if (userid && viewMode === "stacked" && !hasActiveFilters) {
      console.log("Loading stacked jobs...");
      fetchStackedJobs();
    }
  }, [userid, viewMode, fetchStackedJobs, hasActiveFilters]);

  
  useEffect(() => {
    if (viewMode === "stacked") {
      console.log("Active search term changed in stacked view, refreshing:", activeSearchTerm);
      fetchStackedJobs();
    }
  }, [activeSearchTerm, viewMode, fetchStackedJobs]);

  // UPDATED: When filters change while in stacked view with active search, refresh
  useEffect(() => {
    if (viewMode === "stacked" && activeSearchTerm.trim() && hasActiveFilters) {
      console.log("Filters changed in stacked view with active search, refreshing...");
      fetchStackedJobs();
    }
  }, [selectedFilters, hasActiveFilters, viewMode, activeSearchTerm, fetchStackedJobs]);

  // When a search is performed, re-fetch stacked jobs so text-search is applied
 /*  useEffect(() => {
    if (!userid) return;
    if (viewMode === "stacked" && searchTerm && searchTerm.trim() !== "") {
      console.log("Search term changed in stacked view, fetching stacked jobs with text search...");
      fetchStackedJobs();
    }
  }, [searchTerm, viewMode, userid, fetchStackedJobs]); */

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
            taskid: selectedNote.taskId
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

  // FIXED: handleRefresh function
const handleRefresh = async () => {
  setInitialLoading(true);
  
  // Save current expanded stacks before refresh
  const currentExpandedStacks = { ...expandedStacks };
  const currentViewMode = viewMode;
  
  try {
    await refreshNotes();
    
    // Reset filter options
    setFilterOptionsLoaded({
      date: false,
      workspace: false,
      project: false,
      job: false,
      userName: false,
    });
    
    // Reload all filter options
    await reloadAllFilters();
    
    if (currentViewMode === "stacked") {
      if (hasActiveFilters) {
        // Re-fetch with current filters
        await fetchNotesWithFilters(selectedFilters);
        
        // After filtered notes are loaded, we need to re-expand previously expanded stacks
        // But filteredStackedJobs might have different structure, so we need to map
        setTimeout(() => {
          setFilteredStackedJobs(prev => {
            // For each previously expanded job, mark it as expanded again
            // but we need to find the matching job in the new data
            const updated = prev.map(job => {
              // Check if this job was expanded before
              const wasExpanded = Object.keys(currentExpandedStacks).some(
                jobName => jobName === job.jobName && currentExpandedStacks[jobName]
              );
              
              if (wasExpanded) {
                // This job was expanded, but we need to reload its notes
                // We'll set a flag to trigger expansion with new data
                setTimeout(() => {
                  toggleStackExpansion(job.jobName, job.jobId);
                }, 100);
              }
              
              return job;
            });
            
            return updated;
          });
        }, 300);
      } else {
        // For normal stacked view, fetch fresh stacked jobs
        await fetchStackedJobs();
        
        // After stacked jobs are loaded, re-expand previously expanded stacks
        setTimeout(() => {
          setStackedJobs(prev => {
            const updated = [...prev];
            
            // For each previously expanded job, re-expand it
            Object.keys(currentExpandedStacks).forEach(jobName => {
              if (currentExpandedStacks[jobName]) {
                const jobIndex = updated.findIndex(j => j.jobName === jobName);
                if (jobIndex !== -1) {
                  const job = updated[jobIndex];
                  // Trigger expansion to reload notes
                  setTimeout(() => {
                    toggleStackExpansion(job.jobName, job.jobId);
                  }, 200);
                }
              }
            });
            
            return updated;
          });
        }, 300);
      }
    }
    
    // Also refresh filter options display
    const filterTypes = ["date", "workspace", "project", "job", "userName", "priority"];
    filterTypes.forEach(type => {
      fetchFilterOptions(type);
    });
    
    toast.success("Refreshed successfully");
  } catch (error) {
    console.error("Refresh error:", error);
    toast.error("Refresh failed");
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
      taskid: note.taskId
    });
    setModalSource("grid");
    setShowNewModal(true);
  };

  const handleNewNoteClick = () => {
    setPrefilledData(null);
    setModalSource("dashboard");
    setShowNewModal(true);
  };

  const handleNewTaskClick = () => {
    setShowNewTaskModal(true);
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
    if (note.itemType === "Task") {
    // Open task modal in edit mode
    setEditingTask(note);
    setShowNewTaskModal(true);
  } else {
    setSelectedNote(note);
    setShowEditModal(true);
  };
}

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


const performSearch = useCallback(async (searchText) => {
    const trimmedSearch = searchText.trim();
    
    if (!trimmedSearch || !userid) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    
    setSearchLoading(true);
    
    try {
      const hasFilters = Object.values(selectedFilters || {}).some((arr) => arr?.length > 0);
      let combinedNotes = [];
      const seen = new Set();

      if (hasFilters) {
        console.log("Searching with filters and search text:", trimmedSearch);
        const combinations = generateFilterCombinations(selectedFilters);
        const promises = combinations.map((combo) => {
          const params = new URLSearchParams({
            pageNumber: "1",
            pageSize: "50",
            searchText: trimmedSearch,
            userId: userid,
          });
          
          if (combo.date) params.append("date", combo.date);
          if (combo.workspace) params.append("workspaceId", combo.workspace);
          if (combo.project) params.append("projectId", combo.project);
          if (combo.job) params.append("jobId", combo.job);
          if (combo.userName) params.append("siteNoteUserId", combo.userName);

          return fetch(`${apiUrl}/SiteNote/GetSiteNotesWithTextFilter?${params.toString()}`)
            .then((res) => res.ok ? res.json() : { siteNotes: [] });
        });

        const results = await Promise.all(promises);
        
        results.forEach((r) => {
          (r.siteNotes || []).forEach((n) => {
            if (!seen.has(n.id)) {
              seen.add(n.id);
              combinedNotes.push(n);
            }
          });
        });
      } else {
        console.log("Searching without filters:", trimmedSearch);
        const params = new URLSearchParams({
          pageNumber: "1",
          pageSize: "50",
          searchText: trimmedSearch,
          userId: userid,
        });
        
        const response = await fetch(`${apiUrl}/SiteNote/GetSiteNotesWithTextFilter?${params.toString()}`);
        
        if (!response.ok) throw new Error();
        
        const data = await response.json();
        combinedNotes = data.siteNotes || [];
      }

      setSearchResults(
        combinedNotes.map((n) => ({
          ...n,
          userName: n.UserName || n.userName,
          documentCount: n.DocumentCount || n.documentCount || 0,
          note: n.note || n.content || "",
        }))
      );
    } catch (error) {
      toast.error("Search failed");
      setSearchResults([]);
      console.error("Search error:", error);
    } finally {
      setSearchLoading(false);
    }
  }, [apiUrl, userid, selectedFilters, generateFilterCombinations]);

    useEffect(() => {
    if (activeSearchTerm.trim() && hasActiveFilters) {
      console.log("Filters changed with active search, re-searching...");
      performSearch(activeSearchTerm);
    }
  }, [selectedFilters, hasActiveFilters, activeSearchTerm, performSearch]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission if inside a form
      console.log("Enter pressed, performing search with:", searchTerm);
      setActiveSearchTerm(searchTerm);
      localStorage.setItem("dashboardSearchTerm", searchTerm);
      
      // If there are active filters, re-fetch with the new search term
      if (hasActiveFilters) {
        console.log("Active filters present, re-fetching with search term:", searchTerm);
        fetchNotesWithFilters(selectedFilters);
      }
      
      // If in stacked view, refresh stacked jobs with the new search term
      if (viewMode === "stacked") {
        console.log("Stacked view active, refreshing stacked jobs with search term:", searchTerm);
        fetchStackedJobs();
      }
    }
  }, [searchTerm, hasActiveFilters, selectedFilters, fetchNotesWithFilters, viewMode, fetchStackedJobs]);

  const handleClearSearch = useCallback(() => {
    console.log("Clearing search");
    setSearchTerm("");
    setActiveSearchTerm("");
    setSearchResults([]);
    localStorage.removeItem("dashboardSearchTerm");
    localStorage.removeItem("dashboardSearchResults");
  }, []);

  useEffect(() => {
    performSearch(activeSearchTerm);
  }, [activeSearchTerm, performSearch]);

  useEffect(() => {
    setHasActiveSearchText(activeSearchTerm.trim() !== "");
  }, [activeSearchTerm]);

  useEffect(() => {
    if (activeSearchTerm) {
      localStorage.setItem("dashboardSearchTerm", activeSearchTerm);
    } else {
      localStorage.removeItem("dashboardSearchTerm");
    }
  }, [activeSearchTerm]);

  // Update searchResults in localStorage
  useEffect(() => {
    localStorage.setItem("dashboardSearchResults", JSON.stringify(searchResults));
  }, [searchResults]);

    useEffect(() => {
    if (hasActiveFilters) {
      console.log("Active search term changed with filters, re-fetching:", activeSearchTerm);
      fetchNotesWithFilters(selectedFilters);
    }
  }, [activeSearchTerm, hasActiveFilters, selectedFilters, fetchNotesWithFilters]);

  useEffect(() => {
    if (hasActiveFilters && activeSearchTerm.trim()) {
      console.log("Filters changed with active search, re-fetching...");
      fetchNotesWithFilters(selectedFilters);
    }
  }, [selectedFilters, hasActiveFilters, activeSearchTerm, fetchNotesWithFilters]);

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
          handleSearchKeyDown={handleSearchKeyDown}
          handleClearSearch={handleClearSearch}
          searchColumn={searchColumn}
          setSearchColumn={setSearchColumn}
          viewMode={viewMode}
          setViewMode={setViewMode}
          handleRefresh={handleRefresh}
          refreshNotes={refreshNotes}
          handleNewTaskModal={handleNewTaskClick}
          defWorkName={defaultUserWorkspaceName}
          role={role}
        />

         <DashboardHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleSearchKeyDown={handleSearchKeyDown}
          handleClearSearch={handleClearSearch}
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
          searchTerm={activeSearchTerm} // Pass activeSearchTerm instead of searchTerm
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
          handleFilterCheckboxChange={handleFilterCheckboxChange} 
          removeFilter={removeFilter}
          selectedFilters={selectedFilters}
          handleFilterChange={handleFilterCheckboxChange} 
          projects={projects}
          workspaces={workspaces}
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
            <div
              className="priority-option"
              onClick={() => handlePriorityChange(5)}
            >
              <div className="priority-color-dot priority-5" />
              <span className="priority-label">Completed</span>
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
          fetchNotesWithFilters={fetchNotesWithFilters}
          selectedFilters={selectedFilters}
          hasActiveFilters={hasActiveFilters}
          viewMode={viewMode}
          refreshStackedView={refreshStackedViewWithNewNote}
          hasActiveSearchText={hasActiveSearchText} 
          performSearching={performSearch}
          searchTerm={searchTerm}
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
          fetchNotesWithFilters={fetchNotesWithFilters}
          selectedFilters={selectedFilters}
          hasActiveFilters={hasActiveFilters}
          viewMode={viewMode}
          refreshStackedView={refreshStackedViewWithNewNote}
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

      {showNewTaskModal && (
        <NewTaskModal 
        isOpen={showNewTaskModal}
          onClose={() => {
            
            setShowNewTaskModal(false);
          }}
        defaultWorkspaceRole={defaultWorkspaceRole}
        userworksaces={userWorkspace}
        refreshNotes = {refreshNotes}
        isEditMode={true}
        editTaskData={editingTask}
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