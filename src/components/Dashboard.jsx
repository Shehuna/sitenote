import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAttachedFileModal, setShowAttachedFileModal] = useState(false);
  const [selectedFileNote, setSelectedFileNote] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewNote, setViewNote] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hierarchy, setHierarchy] = useState([]);
  const [selectedValues, setSelectedValues] = useState({});
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
  const [role, setRole] = useState(null)
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [loadingUniques, setLoadingUniques] = useState(true);
  const [userWorkspaces, setUserWorkspaces] = useState()
  
  const [viewMode, setViewMode] = useState('table'); 
  const [selectedRow, setSelectedRow] = useState(null);
  const [focusedRow, setFocusedRow] = useState(null);

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

  const handleDragStartValue = (column, value) => (e) => {
    e.dataTransfer.setData('column', column);
    e.dataTransfer.setData('value', value);
    e.stopPropagation();
  };

  const handleRowClick = useCallback((note) => {
    setFocusedRow(note.id);
    setSelectedRow(note.id);
  }, []);

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

  useEffect(() => {
    if (userid && defaultUserWorkspaceID) {
      console.log("Fetching role with workspace ID:", defaultUserWorkspaceID);
      fetchUserWorkspaceRole();
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
    if (notes !== undefined) setIsDataLoaded(true);
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
    const map = new Map();
    try {
      if (p) {
        const r = await fetch(
          `${apiUrl}/SiteNote/GetSiteNotesByProjectId?pageNumber=1&pageSize=200&projectId=${p}&userId=${userid}`
        );
        if (r.ok)
          (await r.json()).siteNotes?.forEach((n) =>
            map.set(n.id, {
              ...n,
              userName: n.UserName || n.userName,
              documentCount: n.DocumentCount || n.documentCount || 0,
            })
          );
      }
      if (j) {
        const r = await fetch(
          `${apiUrl}/SiteNote/GetSiteNotesByJobId?pageNumber=1&pageSize=200&jobId=${j}&userId=${userid}`
        );
        if (r.ok)
          (await r.json()).siteNotes?.forEach((n) =>
            map.set(n.id, {
              ...n,
              userName: n.UserName || n.userName,
              documentCount: n.DocumentCount || n.documentCount || 0,
            })
          );
      }
      if (w) {
        const r = await fetch(
          `${apiUrl}/SiteNote/GetSiteNotesByWorkspaceId?pageNumber=1&pageSize=200&workspaceId=${w}&userId=${userid}`
        );
        if (r.ok)
          (await r.json()).siteNotes?.forEach((n) =>
            map.set(n.id, {
              ...n,
              userName: n.UserName || n.userName,
              documentCount: n.DocumentCount || n.documentCount || 0,
            })
          );
      }
      if (d) {
        const r = await fetch(
          `${apiUrl}/SiteNote/GetSiteNotesByDate?pageNumber=1&pageSize=200&date=${encodeURIComponent(d)}&userId=${userid}`
        );
        if (r.ok)
          (await r.json()).siteNotes?.forEach((n) =>
            map.set(n.id, {
              ...n,
              userName: n.UserName || n.userName,
              documentCount: n.DocumentCount || n.documentCount || 0,
            })
          );
      }
      if (u) {
        const r = await fetch(
          `${apiUrl}/SiteNote/GetSiteNotesByUsername?pageNumber=1&pageSize=200&username=${encodeURIComponent(u)}&userId=${userid}`
        );
        if (r.ok)
          (await r.json()).siteNotes?.forEach((n) =>
            map.set(n.id, {
              ...n,
              userName: n.UserName || n.userName,
              documentCount: n.DocumentCount || n.documentCount || 0,
            })
          );
      }
      setFilteredNotes(Array.from(map.values()));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load filtered notes");
      setFilteredNotes(notes);
    } finally {
      setLoadingFiltered(false);
    }
  };

  useEffect(() => {
    if (notes !== undefined && isDataLoaded) {
      setInitialLoading(false);
      fetchFilteredSiteNotes();
    }
  }, [notes, isDataLoaded, selectedValues]);

  const handleDrop = (e) => {
    e.preventDefault();
    const c = e.dataTransfer.getData("column");
    if (["date","workspace","project","job","userName"].includes(c) && !hierarchy.includes(c)) {
      setHierarchy([...hierarchy, c]);
      setSelectedValues({ ...selectedValues, [c]: "" });
      setCurrentFilterColumn(c);
      setShowFilterDialog(true);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDragStart = (c) => (e) => e.dataTransfer.setData("column", c);
  const openFilterDialog = (c) => {
    setCurrentFilterColumn(c);
    setShowFilterDialog(true);
  };
  const handleFilterSelect = (val) => {
    setSelectedValues((p) => ({ ...p, [currentFilterColumn]: val }));
    setShowFilterDialog(false);
  };
  const removeHierarchyLevel = (c) => {
    setHierarchy(hierarchy.filter((x) => x !== c));
    const v = { ...selectedValues };
    delete v[c];
    setSelectedValues(v);
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
      toast.success("Refreshed");
    } catch {
      toast.error("Refresh error");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleAddFromRow = (note) => {
    const today = new Date();
    const pre = {
      date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(today.getDate()).padStart(2, "0")}`,
      project: note.project,
      job: note.job,
    };
    setShowNewModal(true);
    setTimeout(
      () =>
        document.dispatchEvent(
          new CustomEvent("prefillNewNote", { detail: pre })
        ),
      100
    );
  };

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

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    setIsDeleting(true);
    try {
      const r = await fetch(
        `${apiUrl}/SiteNote/DeleteSiteNote/${noteToDelete.id}`,
        { method: "DELETE" }
      );
      if (!r.ok) throw new Error();
      toast.success("Deleted");
      await refreshNotes();
      await fetchFilteredSiteNotes();
    } catch (e) {
      toast.error(e.message);
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

  const getCurrentNotesForLevel = (level) => {
    let currentNotes = [...notes];
    for (let i = 0; i < level; i++) {
      const column = hierarchy[i];
      const selectedValue = selectedValues[column];
      if (selectedValue) {
        currentNotes = currentNotes.filter(note => {
          const noteValue = column === 'date' 
            ? new Date(note[column]).toLocaleDateString() 
            : note[column];
          return noteValue === selectedValue;
        });
      }
    }
    return currentNotes;
  };

  const getUniqueValues = (column, currentNotes) => {
    const values = new Set();
    currentNotes.forEach(note => {
      const value = column === 'date' 
        ? new Date(note[column]).toLocaleDateString() 
        : note[column];
      if (value) values.add(value);
    });
    if (column === 'date') {
      const dateValues = Array.from(values);
      dateValues.sort((b, a) => {
        return new Date(b) - new Date(a);
      });
      return dateValues;
    }
    return Array.from(values).sort();
  };

  const handleHierarchyChange = (column, value) => {
    const newSelectedValues = {...selectedValues, [column]: value};
    setSelectedValues(newSelectedValues);
    const columnIndex = hierarchy.indexOf(column);
    if (columnIndex < hierarchy.length - 1) {
      hierarchy.slice(columnIndex + 1).forEach(col => {
        newSelectedValues[col] = '';
      });
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
          <div>
            <p className="dropdown-container">{defaultUserWorkspaceName}</p>
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
              }}
            >
              <i className="fas fa-sliders-h" />
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: 4,
            }}
          />
          
          <div className="view-toggle-container">
            <button
              onClick={() => setViewMode('table')}
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              title="Table View"
            >
              <i className="fas fa-table" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
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
            onClick={() => setShowNewModal(true)}
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
            <span>Drag values from cards to filter:</span>
          </div>
          
          {hierarchy.map((column, level) => {
            const currentNotes = getCurrentNotesForLevel(level);
            const uniqueValues = getUniqueValues(column, currentNotes);
            
            return (
              <div key={column} className="hierarchy-level">
                <label>
                  {column.charAt(0).toUpperCase() + column.slice(1)}:
                  <select
                    value={selectedValues[column] || ''}
                    onChange={(e) => handleHierarchyChange(column, e.target.value)}
                  >
                    <option value="">All {column}s</option>
                    {uniqueValues.map(value => (
                      <option key={value} value={value}>
                        {value}
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
          // Table View
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
                      className={hierarchy.includes(c) ? 'hierarchy-column' : ''}
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
                  displayNotes.map((n) => (
                    <tr
                      key={n.id}
                      onClick={() => {
                        const job = jobs.find((j) => j.name === n.job);
                        setViewNote({
                          id: n.id,
                          jobId: job?.id ?? null,
                        });
                        setShowViewModal(true);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        {new Date(n.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td>{n.workspace}</td>
                      <td>{n.project}</td>
                      <td>{n.job}</td>
                      <td className="editable">
                        {n.note.length > 69
                          ? n.note.substring(0, 69) + "..."
                          : n.note}
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
                            style={{ opacity: n.documentCount > 0 ? 1 : 0.3 }}
                          />
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
                  ))
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
                const notePriority = priorities.find(p => p.noteID === note.id && p.userId === userid);
                
                return (
                  <div
                    key={note.id}
                    className={`note-card ${selectedRow === note.id ? 'selected' : ''}`}
                    onClick={() => handleRowClick(note)}
                    onDoubleClick={() => handleRowDoubleClick(note)}
                  >
                    <div className="note-header">
                      <div className="user-avatar">
                        <i className="fas fa-user" />
                      </div>
                      <div className="note-meta">
                        <div 
                          className="note-author draggable-value"
                          draggable
                          onDragStart={(e) => handleDragStartValue('userName', note.userName)(e)}
                          title="Drag to filter by user"
                        >
                          {note.userName}
                        </div>
                        <div 
                          className="note-date draggable-value"
                          draggable
                          onDragStart={(e) => handleDragStartValue('date', note.date)(e)}
                          title="Drag to filter by date"
                        >
                          {new Date(note.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      
                      <div className="note-context">
                        <div 
                          className="context-item workspace draggable-value"
                          draggable
                          onDragStart={(e) => handleDragStartValue('workspace', note.workspace)(e)}
                          title="Drag to filter by workspace"
                        >
                          {note.workspace}
                        </div>
                        <div 
                          className="context-item project draggable-value"
                          draggable
                          onDragStart={(e) => handleDragStartValue('project', note.project)(e)}
                          title="Drag to filter by project"
                        >
                          {note.project}
                        </div>
                        <div 
                          className="context-item job draggable-value"
                          draggable
                          onDragStart={(e) => handleDragStartValue('job', note.job)(e)}
                          title="Drag to filter by job"
                        >
                          {note.job}
                        </div>
                      </div>
                      
                      {notePriority && notePriority.priorityValue > 1 && (
                        <div 
                          className={`priority-indicator priority-${notePriority.priorityValue}`}
                          title={
                            notePriority.priorityValue === 2 ? 'Low Priority' :
                            notePriority.priorityValue === 3 ? 'Medium Priority' :
                            notePriority.priorityValue === 4 ? 'High Priority' : 'No Priority'
                          }
                        />
                      )}
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
                      <div className="note-actions">
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
                        (currentFilterColumn === "date" || currentFilterColumn === "userName" ? selectedValues[currentFilterColumn] === it.text : selectedValues[currentFilterColumn] == it.id)
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
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          refreshNotes={refreshNotes}
          addSiteNote={addSiteNote}
          projects={projects}
          jobs={jobs}
          onUploadDocument={onUploadDocument}
          onDeleteDocument={onDeleteDocument}
          defWorkSpaceId={defaultUserWorkspaceID}
          userworksaces={uniqueWorkspaces}
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
          priorities={priorities}
          defaultUserWorkspaceID={defaultUserWorkspaceID}
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
};

Dashboard.defaultProps = { projects: [], jobs: [] };

export default Dashboard;