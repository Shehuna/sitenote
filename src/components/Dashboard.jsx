import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import "./Dashboard.css";
import NewNoteModal from "./Modals/NewNoteModal";
import EditNoteModal from "./Modals/EditNoteModal";
import SettingsModal from "./Modals/SettingsModal";
import AttachedFileModal from "./Modals/AttachedfileModal.jsx";
import ViewNoteModal from "./Modals/ViewNoteModal";
import toast from "react-hot-toast";

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
  // All state declarations consolidated at the top
  const [searchTerm, setSearchTerm] = useState(() => {
    const saved = localStorage.getItem('dashboardSearchTerm');
    return saved || "";
  });
  const [searchResults, setSearchResults] = useState(() => {
    const saved = localStorage.getItem('dashboardSearchResults');
    return saved ? JSON.parse(saved) : [];
  });
  const [hierarchy, setHierarchy] = useState(() => {
    const saved = localStorage.getItem('dashboardHierarchy');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedValues, setSelectedValues] = useState(() => {
    const saved = localStorage.getItem('dashboardSelectedValues');
    return saved ? JSON.parse(saved) : {};
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
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [currentFilterColumn, setCurrentFilterColumn] = useState(null);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueJobs, setUniqueJobs] = useState([]);
  const [uniqueWorkspaces, setUniqueWorkspaces] = useState([]);
  const [uniqueDates, setUniqueDates] = useState([]);
  const [uniqueUsernames, setUniqueUsernames] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
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
  const [searchColumn, setSearchColumn] = useState('');
  const [prefilledData, setPrefilledData] = useState(null);
  const [showRequestWorkspaceModal, setShowRequestWorkspaceModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [priorityDropdownPosition, setPriorityDropdownPosition] = useState({ x: 0, y: 0 });
  const [selectedNoteForPriority, setSelectedNoteForPriority] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
  const saved = localStorage.getItem('dashboardViewMode');
  return saved || 'cards';
});
  const [modalSource, setModalSource] = useState('dashboard');

 
  const newNoteModalRef = useRef();

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

  useEffect(() => {
    localStorage.setItem('dashboardSearchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('dashboardSearchResults', JSON.stringify(searchResults));
  }, [searchResults]);

  useEffect(() => {
    localStorage.setItem('dashboardHierarchy', JSON.stringify(hierarchy));
  }, [hierarchy]);

  useEffect(() => {
    localStorage.setItem('dashboardSelectedValues', JSON.stringify(selectedValues));
  }, [selectedValues]);
  useEffect(() => {
  localStorage.setItem('dashboardViewMode', viewMode);
}, [viewMode]);


  const styles = {
    searchBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
      flexWrap: 'wrap'
    },
    searchInput: {
      flex: 1,
      minWidth: '200px',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px'
    },
    searchHint: {
      background: '#f0f0f0',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '0.9em',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    },
    clearGroupBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#666',
      padding: 0,
      fontSize: '1.1em',
      lineHeight: 1
    },
    clearGroupBtnHover: {
      color: '#333'
    },
    workspaceHeader: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '2px'
    },
    workspaceTopRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '2px'
    },
    workspaceName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      padding: '8px 2px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      minWidth: '0px',
      justifyContent: 'center'
    },
  };

  // Debug effect for prefilledData
  useEffect(() => {
    console.log('prefilledData changed:', prefilledData);
  }, [prefilledData]);

  const handleDragStartValue = (column, value) => (e) => {
    e.dataTransfer.setData('column', column);
    e.dataTransfer.setData('value', value);
    e.stopPropagation();
  };

  const handleRequestWorkspace = () => {
    setShowRequestWorkspaceModal(true);
    toast.success("Workspace request feature coming soon!");
  };

  const handleRowDoubleClick = useCallback((note) => {
    const job = jobs.find((j) => j.name === note.job);
    setViewNote({
      id: note.id,
      jobId: job?.id ?? null,
    });
    setShowViewModal(true);
  }, [jobs]);

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
      const response = await fetch(`${apiUrl}/api/UserManagement/GetUserById/${userid}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
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
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
};

  // Fetch notes for a specific column/value from server-side endpoints.
  const fetchNotesByColumnAndValue = async (column, value) => {
    if (!value || !userid) return [];
    let url = "";
    try {
      if (column === "userName") {
        url = `${apiUrl}/SiteNote/GetSiteNotesByUsername?pageNumber=1&pageSize=200&username=${encodeURIComponent(value)}&userId=${userid}`;
      } else if (column === "date") {
        url = `${apiUrl}/SiteNote/GetSiteNotesByDate?pageNumber=1&pageSize=200&date=${encodeURIComponent(value)}&userId=${userid}`;
      } else if (column === "workspace") {
        url = `${apiUrl}/SiteNote/GetSiteNotesByWorkspaceId?pageNumber=1&pageSize=200&workspaceId=${encodeURIComponent(value)}&userId=${userid}`;
      } else if (column === "project") {
        url = `${apiUrl}/SiteNote/GetSiteNotesByProjectId?pageNumber=1&pageSize=200&projectId=${encodeURIComponent(value)}&userId=${userid}`;
      } else if (column === "job") {
        url = `${apiUrl}/SiteNote/GetSiteNotesByJobId?pageNumber=1&pageSize=200&jobId=${encodeURIComponent(value)}&userId=${userid}`;
      }

      if (!url) return [];
      const r = await fetch(url);
      if (!r.ok) throw new Error('fetch error');
      const d = await r.json();
      const arr = d.siteNotes || [];
      return arr.map(n => ({
        ...n,
        userName: n.UserName || n.userName,
        documentCount: n.DocumentCount || n.documentCount || 0,
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  // Call server for each selected filter and merge (OR) the results.
  const fetchCombinedServerFilters = async (selectedObj) => {
    const sv = selectedObj || selectedValues || {};
    const keys = Object.keys(sv).filter(k => sv[k] !== undefined && sv[k] !== null && sv[k] !== "");
    if (keys.length === 0) {
      setFilteredNotes(notes);
      return;
    }

    setLoadingFiltered(true);
    try {
      const promises = keys.map(k => fetchNotesByColumnAndValue(k, sv[k]));
      const results = await Promise.all(promises);
      const all = results.flat();
      // dedupe by id
      const byId = {};
      all.forEach(n => { if (n && n.id !== undefined) byId[n.id] = n; });
      const merged = Object.values(byId);
      setFilteredNotes(merged);
    } catch (e) {
      console.error(e);
      // fallback to client-side OR filtering
      const keys2 = keys;
      const filtered = notes.filter(note => keys2.some(k => {
        const val = sv[k];
        if (!val && val !== 0) return false;
        if (k === 'date') {
          const noteDate = new Date(note.date).toISOString().split('T')[0];
          const filterDate = new Date(val).toISOString().split('T')[0];
          return noteDate === filterDate;
        }
        if (k === 'userName') return note.userName === val || note.userId?.toString() === val.toString();
        if (k === 'project') return note.projectId?.toString() === val.toString() || note.project === val;
        if (k === 'job') return note.jobId?.toString() === val.toString() || note.job === val;
        if (k === 'workspace') return note.workspaceId?.toString() === val.toString() || note.workspace === val;
        return false;
      }));
      setFilteredNotes(filtered);
    } finally {
      setLoadingFiltered(false);
    }
  };

  useEffect(() => {
    if (userid && defaultUserWorkspaceID) {
      console.log("Fetching role with workspace ID:", defaultUserWorkspaceID);
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
    if (notes !== undefined)
      setIsDataLoaded(true);
  }, [notes]);

  const fetchFilteredSiteNotes = async () => {
    const p = selectedValues["project"];
    const j = selectedValues["job"];
    const w = selectedValues["workspace"];
    const d = selectedValues["date"];
    const u = selectedValues["userName"];
    
    if (!p && !j && !w && !d && !u) {
      setFilteredNotes(notes);
      return;
    }
    
    setLoadingFiltered(true);
    
    try {
      let filtered = [...notes];
      
      if (p) {
        filtered = filtered.filter(note => 
          note.projectId?.toString() === p.toString() || 
          note.project === uniqueProjects.find(proj => proj.id.toString() === p.toString())?.text
        );
      }
      
      if (j) {
        filtered = filtered.filter(note => 
          note.jobId?.toString() === j.toString() || 
          note.job === uniqueJobs.find(job => job.id.toString() === j.toString())?.text
        );
      }
      
      if (w) {
        filtered = filtered.filter(note => 
          note.workspaceId?.toString() === w.toString() || 
          note.workspace === uniqueWorkspaces.find(ws => ws.id.toString() === w.toString())?.text
        );
      }
      
      if (d) {
        filtered = filtered.filter(note => {
          const noteDate = new Date(note.date).toISOString().split('T')[0];
          const filterDate = new Date(d).toISOString().split('T')[0];
          return noteDate === filterDate;
        });
      }
      
      if (u) {
        filtered = filtered.filter(note => note.userName === u);
      }
      
      setFilteredNotes(filtered);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load filtered notes");
      setFilteredNotes(notes);
    } finally {
      setLoadingFiltered(false);
    }
  };

  useEffect(() => {
    // Run combined server filtering on initial notes load only.
    // Individual filter changes call `fetchCombinedServerFilters` directly
    // from their handlers to avoid duplicate requests.
    if (notes !== undefined && isDataLoaded) {
      setInitialLoading(false);
      fetchCombinedServerFilters();
    }
  }, [notes, isDataLoaded]);

  const handleDrop = (e) => {
    e.preventDefault();
    const c = e.dataTransfer.getData("column");
    const v = e.dataTransfer.getData("value");
    if (["date","workspace","project","job","userName"].includes(c)) {
      if (!hierarchy.includes(c)) {
        setHierarchy(prev => [...prev, c]);
      }

      if (v) {
        const newSelected = { ...selectedValues, [c]: v };
        setSelectedValues(newSelected);
        fetchCombinedServerFilters(newSelected);
      } else {
        const newSelected = { ...selectedValues, [c]: selectedValues[c] || "" };
        setSelectedValues(newSelected);
      }

      setCurrentFilterColumn(c);
    }
  };

  const handlePriorityUpdate = () => {
    fetchPriorities();
  };
  const handlePriorityChange = async (priorityValue) => {
  if (!selectedNoteForPriority) return;

  try {
    const user = JSON.parse(localStorage.getItem("user"));
    
    console.log('=== DOT DROPDOWN DEBUG ===');
    console.log('Selected note:', selectedNoteForPriority);
    console.log('Existing priorities:', priorities);
    
    const existingPriority = priorities.find(p => p.noteID == selectedNoteForPriority.id);
    console.log('Existing priority for this note:', existingPriority);
    console.log('Priority value to set:', priorityValue);
    
    let response;
    
    if (existingPriority && existingPriority.id) {
      console.log("Updating existing priority ID:", existingPriority.id);
      const updateUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Priority/UpdatePriority/${existingPriority.id}`;
      console.log("Update URL:", updateUrl);
      
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
      console.log("Creating new priority");
      const createUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Priority/AddPriority`;
      console.log("Create URL:", createUrl);
      
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

    console.log("Response status:", response.status, response.statusText);
    
    if (response.ok) {
      toast.success('Priority updated successfully');
      handlePriorityUpdate(); 
      await refreshNotes();
    } else {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
      throw new Error(`Failed to update priority: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('Error updating priority:', error);
    toast.error('Failed to update priority. Please try again.');
  } finally {
    setShowPriorityDropdown(false);
    setSelectedNoteForPriority(null);
  }
};

  const handleDragOver = (e) => e.preventDefault();
  const handleDragStart = (c) => (e) => e.dataTransfer.setData("column", c);
  const openFilterDialog = (c) => {
    setCurrentFilterColumn(c);
    setShowFilterDialog(true);
  };
  const handleFilterSelect = (val) => {
    const newSelected = { ...selectedValues };
    if (val === "" || val === null) delete newSelected[currentFilterColumn];
    else newSelected[currentFilterColumn] = val;
    setSelectedValues(newSelected);
    setShowFilterDialog(false);
    fetchCombinedServerFilters(newSelected);
  };
  const removeHierarchyLevel = (c) => {
    setHierarchy(hierarchy.filter((x) => x !== c));
    const v = { ...selectedValues };
    delete v[c];
    setSelectedValues(v);
    fetchCombinedServerFilters(v);
  };
  const clearAllFilters = () => {
    setHierarchy([]);
    setSelectedValues({});
    setFilteredNotes(notes);
  };

  const displayNotes = useMemo(() => {
    let list = searchTerm.trim() ? searchResults : filteredNotes;
    list = list.filter((n) => {
      const job = jobs.find(
        (j) => j.id.toString() === n.jobId?.toString() || j.name === n.job
      );
      return job && job.status !== 3;
    });
    return list.sort((a, b) => b.id - a.id);
  }, [searchResults, filteredNotes, jobs, searchTerm]);

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

  const handleRowClick = useCallback(
    (note, event) => {
      setFocusedRow(note.id);
      setSelectedRow(note.id);
    },
    []);

  // Fixed keyboard shortcut handler
  const handleKeyDown = useCallback((event) => {
    if (!focusedRow) return;

    const currentIndex = filteredNotes.findIndex(note => note.id === focusedRow);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(currentIndex + 1, filteredNotes.length - 1);
      if (nextIndex !== currentIndex) {
        setFocusedRow(filteredNotes[nextIndex].id);
        setSelectedRow(filteredNotes[nextIndex].id);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = Math.max(currentIndex - 1, 0);
      if (prevIndex !== currentIndex) {
        setFocusedRow(filteredNotes[prevIndex].id);
        setSelectedRow(filteredNotes[prevIndex].id);
      }
    } else if (event.ctrlKey && event.key === 'a' && focusedRow) {
      event.preventDefault();
      const selectedNote = filteredNotes.find(note => note.id === focusedRow);
      if (selectedNote) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const currentDateFormatted = `${year}-${month}-${day}`;

        setPrefilledData({
          date: currentDateFormatted,
          project: selectedNote.project,
          job: selectedNote.job,
          workspace: selectedNote.workspace
        });
        setModalSource('grid'); // Set source to grid for keyboard shortcut
        setShowNewModal(true);
      }
    }
  }, [focusedRow, filteredNotes]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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
        fetchUniqueUsernames()
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

  // Fixed handleAddFromRow function - for grid plus button
  const handleAddFromRow = (note) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const currentDateFormatted = `${year}-${month}-${day}`;

    console.log('=== DASHBOARD DEBUG ===');
    console.log('Note data:', note);
    console.log('Note ID:', note.id);
    console.log('Note UserId:', note.userId);
    console.log('Current User ID:', JSON.parse(localStorage.getItem('user'))?.id);

    // Pass the exact values from the note
    setPrefilledData({
      date: currentDateFormatted,
      project: note.project,  // Use the project name from the note
      job: note.job,          // Use the job name from the note
      workspace: note.workspace, // Use the workspace name from the note
      userId: note.userId
    });

    setModalSource('grid'); // Set source to grid for plus button
    setShowNewModal(true);
  };

  // New function for New Note button - from dashboard
  const handleNewNoteClick = () => {
    console.log('Opening from New Note button - clearing prefilled data');
    setPrefilledData(null);
    setModalSource('dashboard'); // Set source to dashboard for new note button
    setShowNewModal(true);
  };

  // Focus the textarea when modal opens from grid source
  useEffect(() => {
    if (showNewModal && modalSource === 'grid' && newNoteModalRef.current) {
      const timer = setTimeout(() => {
        if (newNoteModalRef.current) {
          newNoteModalRef.current.focusTextarea();
          console.log('Focusing textarea from grid source');
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
    const hrs = (Date.now() - new Date(note.timeStamp)) / 36e5;
    if (hrs > 24) toast.error("Cannot delete notes older than 24h");
    else {
      setNoteToDelete(note);
      setShowDeleteConfirm(true);
    }
  };

  const getCurrentNotesForLevel = (level) => {
    if (level === 0) {
      return searchTerm.trim() ? searchResults : filteredNotes;
    }
    
    let filtered = searchTerm.trim() ? searchResults : filteredNotes;
    
    for (let i = 0; i < level; i++) {
      const column = hierarchy[i];
      const selectedValue = selectedValues[column];
      
      if (selectedValue) {
        filtered = filtered.filter(note => {
          if (column === 'date' || column === 'userName') {
            return note[column] === selectedValue;
          } else {
            return note[`${column}Id`] === selectedValue || note[column] === selectedValue;
          }
        });
      }
    }
    
    return filtered;
  };

  const getUniqueValues = (column, currentNotes) => {
    const values = new Set();
    
    currentNotes.forEach(note => {
      let value;
      
      if (column === 'date' || column === 'userName') {
        value = note[column];
      } else {
        value = note[column];
      }
      
      if (value) {
        values.add(value);
      }
    });
    
    return Array.from(values).sort();
  };

  const handleHierarchyChange = (column, value) => {
    // Update only this column's selected value. Preserve downstream filters.
    const newSelected = { ...selectedValues };
    if (value === "" || value === null) delete newSelected[column];
    else newSelected[column] = value;

    // If column not already part of hierarchy, add it
    if (!hierarchy.includes(column)) {
      setHierarchy(prev => [...prev, column]);
    }

    setSelectedValues(newSelected);
    // Re-run combined server filters with the updated selection
    fetchCombinedServerFilters(newSelected);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;

    setIsDeleting(true);

    const url = new URL(`${apiUrl}/SiteNote/DeleteSiteNote/${noteToDelete.id}`);
    url.searchParams.append('userId', userid);

    try {
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

      toast.success("Note deleted successfully");
      await refreshNotes();
      await fetchFilteredSiteNotes();
    } catch (e) {
      console.error("Delete error:", e);
      toast.error(e.message || "Failed to delete note");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setNoteToDelete(null);
    }
};

  const handleViewAttachments = (note) => {
    setSelectedFileNote(note);
    setShowAttachedFileModal(true);
  };

  const fetchUserWorkspaceRole = async () => {
    setIsRoleLoading(true);
    console.log("fetching workspace Id", defaultUserWorkspaceID);
    console.log("userid", userid);
    
    try {
      const response = await fetch(`${apiUrl}/UserWorkspace/GetWorkspacesByUserId/${userid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        const userWorkspaces = data.userWorkspaces || data || []; 
        setUserWorkspaces(userWorkspaces);
        userWorkspaces.forEach((ws, index) => {
          console.log(`Workspace ${index}:`, {
            id: ws.id,
            workspaceID: ws.workspaceID,
            workspaceId: ws.workspaceId, 
            role: ws.role
          });
        });

        const workspace = userWorkspaces.find(ws => 
          (ws.workspaceID && ws.workspaceID.toString() === defaultUserWorkspaceID.toString()) ||
          (ws.workspaceId && ws.workspaceId.toString() === defaultUserWorkspaceID.toString()) ||
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
      const response = await fetch(`${apiUrl}/Workspace/GetActiveWorkspacesNameByUserId/${userid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        }
      });

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
        method: 'GET',
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        }
      });

      if(response.ok){
        const result = await response.json();
        console.log(result);
        setPriorities(result.priorities || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

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
                transition: "all 0.2s ease"
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

        <div
            style={styles.searchBox}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
          <div style={{
            position: 'relative',
            flex: 1,
            minWidth: '200px'
          }}>
            <input
                id="searchInput"
                type="text"
                placeholder={searchColumn ? `Search by ${searchColumn}...` : "Search notes..."}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                style={{
                  ...styles.searchInput,
                  paddingRight: searchTerm ? '30px' : '12px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
            />
            {searchTerm && (
                <button
                    onClick={() => {
                      setSearchTerm('');
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#666',
                      fontSize: '18px',
                      padding: '4px',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f0f0f0';
                      e.target.style.color = '#333';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#666';
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
                      setSearchColumn('');
                      setSearchTerm('');
                    }}
                    style={styles.clearGroupBtn}
                >
                      ×
                    </button>
                  </span>
          )}
           <div className="view-toggle-container" style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            height: '36px' 
          }}>
            <button
              onClick={() => setViewMode('table')}
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              style={{
                border: '1px solid #ddd',
                background: viewMode === 'table' ? '#1976d2' : 'white',
                color: viewMode === 'table' ? 'white' : '#333',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '36px', 
                width: '36px' 
              }}
              title="Table View"
            >
              <i className="fas fa-table" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              style={{
                border: '1px solid #ddd',
                background: viewMode === 'cards' ? '#1976d2' : 'white',
                color: viewMode === 'cards' ? 'white' : '#333',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '36px', 
                width: '36px' 
              }}
              title="Card View"
            >
              <i className="fas fa-th" />
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

        <div className="hierarchy-filters" onDrop={handleDrop} onDragOver={handleDragOver}>
          <div className="filter-instructions">
          </div>
          
          {hierarchy.map((column, level) => {
            const currentNotes = getCurrentNotesForLevel(level);
            const derived = getUniqueValues(column, currentNotes);

            let serverOptions = [];
            if (column === 'project' && uniqueProjects && uniqueProjects.length > 0) {
              serverOptions = uniqueProjects.map(o => ({ id: o.id, text: o.text || o }));
            } else if (column === 'job' && uniqueJobs && uniqueJobs.length > 0) {
              serverOptions = uniqueJobs.map(o => ({ id: o.id, text: o.text || o }));
            } else if (column === 'workspace' && uniqueWorkspaces && uniqueWorkspaces.length > 0) {
              serverOptions = uniqueWorkspaces.map(o => ({ id: o.id, text: o.text || o }));
            } else if (column === 'date' && uniqueDates && uniqueDates.length > 0) {
              serverOptions = uniqueDates.map(o => ({ id: o.id || o, text: o.text || o }));
            } else if (column === 'userName' && uniqueUsernames && uniqueUsernames.length > 0) {
              serverOptions = uniqueUsernames.map(o => ({ id: o.id || o, text: o.text || o }));
            }

            const finalOptions = serverOptions.length > 0 ? serverOptions : derived.map(v => ({ id: v, text: v }));

            return (
              <div key={column} className="hierarchy-level">
                <label>
                  {column.charAt(0).toUpperCase() + column.slice(1)}:
                  <select
                    value={selectedValues[column] || ''}
                    onChange={(e) => handleHierarchyChange(column, e.target.value)}
                  >
                    <option value="">All {column}s</option>
                    {finalOptions.map(opt => (
                      <option key={opt.id} value={column === 'date' || column === 'userName' ? opt.text : opt.id}>
                        {opt.text}
                      </option>
                    ))}
                  </select>
                </label>
                <button 
                  onClick={() => removeHierarchyLevel(column)}
                  className="clear-hierarchy-btn"
                >
                  ×
                </button>
              </div>
            );
          })}
          {hierarchy.length > 0 && (
            <button 
              onClick={() => {
                setHierarchy([]);
                setSelectedValues({});
              }}
              className="clear-all-hierarchy-btn"
            >
              Clear all filters
            </button>
          )}
        </div>

        {viewMode === 'table' ? (
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
            "Attached File",
          ].map((c) => (
            <th
              key={c}
              draggable={["date","workspace","project","job","userName"].includes(c)}
              onDragStart={handleDragStart(c)}
              className={hierarchy.includes(c) ? "hierarchy-column" : ""}
            >
              {c === "date" && <i className="fas fa-calendar" />}
              {c === "workspace" && <i className="fas fa-building" />}
              {c === "project" && (
                <i className="fas fa-project-diagram" />
              )}
              {c === "job" && <i className="fas fa-tasks" />}
              {c === "note" && <i className="fas fa-sticky-note" />}
              {c === "userName" && <i className="fas fa-user" />}
              {c === "Attached File" && <i className="fas fa-paperclip" />}{" "}
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
        ) : displayNotes.length === 0 ? (
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
                  />{" "}
                  <div>
                    {searchTerm.trim()
                      ? "No notes match your search"
                      : "No notes available"}
                  </div>
                </>
              ) : null}
            </td>
          </tr>
        ) : (
          displayNotes.map((n) => {
            const notePriority = priorities.find(
              (p) => Number(p.noteID) === Number(n.id)
            );
            return (
              <tr
                key={n.id}
                onClick={() => {
                  handleRowClick(n);
                }}
                onDoubleClick={() => {
                  handleRowDoubleClick(n);
                  const job = jobs.find((j) => j.name === n.job);
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
                title={new Date(n.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              >
                {formatRelativeTime(n.timeStamp)}
              </td>
                <td>{n.workspace}</td>
                <td>{n.project}</td>
                <td>{n.job}</td>
                <td className="editable" style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <span style={{ flex: 1 }}>
                      {n.note.length > 69 ? n.note.substring(0, 69) + "..." : n.note}
                    </span>
                    {notePriority && notePriority.priorityValue > 1 && (
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
                        zIndex: 1 
                      }}
                      title={
                        notePriority.priorityValue === 3
                          ? "Medium Priority"
                          : notePriority.priorityValue === 4
                            ? "High Priority"
                            : "Low Priority"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNoteForPriority(n);
                        setPriorityDropdownPosition({
                          x: e.clientX,
                          y: e.clientY
                        });
                        setShowPriorityDropdown(true);
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
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <i className="fas fa-paperclip" style={{ opacity: n.documentCount > 0 ? 1 : 0.3 }} />
                    <span>({n.documentCount || 0})</span>
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
) : (
  <div className="notes-grid">
    {!isDataLoaded || initialLoading || searchLoading || loadingFiltered ? (
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
    ) : displayNotes.length === 0 ? (
      <div className="empty-state">
        <i className="fas fa-search" />
        <h3>
          {searchTerm.trim() ? "No notes match your search" : "No notes available"}
        </h3>
        <p>
          {searchTerm.trim()
            ? "Try adjusting your search terms"
            : "Create your first note to get started"}
        </p>
      </div>
    ) : (
      displayNotes.map((note) => {
        const notePriority = priorities.find(p => p.noteID === note.id);
        
        return (
          <div
            key={note.id}
            className={`note-card ${selectedRow === note.id ? 'selected' : ''}`}
            onClick={() => handleRowClick(note)}
            onDoubleClick={() => handleRowDoubleClick(note)}
          >
            <div className="note-header">
            <div className="user-avatar-wrapper">
            <div className="user-avatar">
              {note.userName ? (
                (() => {
                  const names = note.userName.trim().split(/\s+/);
                  const firstInitial = names[0] ? names[0].charAt(0).toUpperCase() : '';
                  const lastInitial = names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '';
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
                  className="note-author draggable-value"
                  draggable
                  onDragStart={(e) => handleDragStartValue('userName', note.userName)(e)}
                  title="Drag to filter by user"
                >
                  
                </div>
                <div 
                  className="note-date draggable-value"
                  draggable
                  onDragStart={(e) => handleDragStartValue('date', note.date)(e)}
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
                <div 
                  className="context-item job draggable-value"
                  draggable
                  onDragStart={(e) => handleDragStartValue('job', note.job)(e)}
                  title="Drag to filter by job"
                >
                  {note.job}
                </div>
                <div className="context-item workspace-project">
                  <span 
                    className="draggable-value"
                    draggable
                    onDragStart={(e) => handleDragStartValue('workspace', note.workspace)(e)}
                    title="Drag to filter by workspace"
                  >
                    {note.workspace}
                  </span>
                  /
                  <span 
                    className="draggable-value"
                    draggable
                    onDragStart={(e) => handleDragStartValue('project', note.project)(e)}
                    title="Drag to filter by project"
                  >
                    {note.project}
                  </span>
                </div>                
              </div>
            </div>

                    <div className="note-content">
                      <div className="note-text">
                        {note.note}
                      </div>
                    </div>

            <div className="note-footer">
              <div className="note-attachments">
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
              </div>
              <div className="footer-priority">
              </div>
              <div className="note-actions">
                {notePriority && notePriority.priorityValue > 1 && (
                <div 
                  className={`priority-indicator priority-${notePriority.priorityValue}`}
                  style={{ cursor: "pointer" }}
                  title={
                    notePriority.priorityValue === 3 ? 'Medium Priority' :
                    notePriority.priorityValue === 4 ? 'High Priority' : 'No Priority'
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNoteForPriority(note);
                    setPriorityDropdownPosition({
                      x: e.clientX,
                      y: e.clientY
                    });
                    setShowPriorityDropdown(true);
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
      })
    )}
  </div>
)}
      </div>

      {showFilterDialog && (
        <div
          className="modal-overlay"
          onClick={() => setShowFilterDialog(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: 400, padding: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>
              Select {currentFilterColumn.charAt(0).toUpperCase() + currentFilterColumn.slice(1)}
            </h3>
            <div
              style={{
                maxHeight: 300,
                overflowY: "auto",
                margin: "10px 0",
                border: "1px solid #eee",
                borderRadius: 4,
              }}
            >
              <div
                onClick={() => handleFilterSelect("")}
                style={{
                  padding: 10,
                  cursor: "pointer",
                  background: selectedValues[currentFilterColumn]
                    ? "#f5f5f5"
                    : "#e3f2fd",
                  fontWeight: "bold",
                }}
              >
                All {currentFilterColumn}s
              </div>
              {(() => {
                let opts;
                if (currentFilterColumn === "project") opts = uniqueProjects;
                else if (currentFilterColumn === "job") opts = uniqueJobs;
                else if (currentFilterColumn === "workspace") opts = uniqueWorkspaces;
                else if (currentFilterColumn === "date") opts = uniqueDates;
                else if (currentFilterColumn === "userName") opts = uniqueUsernames;
                return opts.map((it) => (
                  <div
                    key={it.id}
                    onClick={() => handleFilterSelect(currentFilterColumn === "date" || currentFilterColumn === "userName" ? it.text : it.id)}
                    style={{
                      padding: 10,
                      cursor: "pointer",
                      background:
                        (currentFilterColumn === "date" || currentFilterColumn === "userName" ? selectedValues[currentFilterColumn] === it.text : selectedValues[currentFilterColumn] === it.id)
                          ? "#e3f2fd"
                          : "transparent",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {it.text}
                  </div>
                ));
              })()}
            </div>
            <button
              onClick={() => setShowFilterDialog(false)}
              style={{
                width: "100%",
                padding: 10,
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

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
              Are you sure you want to delete this note? This action cannot be
              undone.
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
                {isDeleting ? "Deleting..." : "Delete"}
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
        position: 'fixed',
        left: Math.min(priorityDropdownPosition.x, window.innerWidth - 200),
        top: Math.min(priorityDropdownPosition.y, window.innerHeight - 200),
        zIndex: 1000
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="priority-option" onClick={() => handlePriorityChange(1)}>
        <div className="priority-color-dot priority-1" />
        <span className="priority-label">No Priority</span>
      </div>
      <div className="priority-option" onClick={() => handlePriorityChange(3)}>
        <div className="priority-color-dot priority-3" />
        <span className="priority-label">Medium Priority</span>
      </div>
      <div className="priority-option" onClick={() => handlePriorityChange(4)}>
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
            console.log('Closing modal, resetting prefilledData');
            setPrefilledData(null);
            setShowNewModal(false);
          }}
          refreshNotes={refreshNotes}
          refreshFilteredNotes={fetchFilteredSiteNotes}
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

Dashboard.defaultProps = { projects: [], jobs: [],userData: null };

export default Dashboard;

