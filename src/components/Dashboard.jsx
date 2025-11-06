import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import './Dashboard.css';
import NewNoteModal from './Modals/NewNoteModal';
import EditNoteModal from './Modals/EditNoteModal';
import SettingsModal from './Modals/SettingsModal';
import AttachedFileModal from './Modals/AttachedfileModal.jsx';
import ViewNoteModal from './Modals/ViewNoteModal';
import toast from 'react-hot-toast';

const Dashboard = ({ 
  notes,
  userid,
  userRole,
  refreshNotes, 
  addSiteNote, 
  updateNote, 
  projects, 
  jobs, 
  onUpdateNotes, 
  onUploadDocument, 
  onDeleteDocument, 
  fetchDocuments,
  onLogout,
  workspaces,
  defaultUserWorkspaceID,
  defaultUserWorkspaceName,
  onUpdateDefaultWorkspace,
  onChange, 
  
}) => {
  //const [notes, setNotes] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('');
  const [hierarchy, setHierarchy] = useState([]);
  const [selectedValues, setSelectedValues] = useState({});
  const [showAttachedFileModal, setShowAttachedFileModal] = useState(false);
  const [selectedFileNote, setSelectedFileNote] = useState(null);
  const [noteDocuments, setNoteDocuments] = useState({});
  const [loadingDocuments, setLoadingDocuments] = useState({});
  const [error, setError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [prefilledData, setPrefilledData] = useState(null);
  const [documentCounts, setDocumentCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState({});
  const [showViewModal, setShowViewModal] = useState(false); 
  const [viewNote, setViewNote] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('gray');
  const [defaultWorkspace, setDefaultWorkspace] = useState(null)
  const [isDropDownOpen, setIsDropDownOpen] = useState(false)
  const [userWorkspaces, setUserWorkspaces] = useState([])
  const [role, setRole] = useState(null)
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [priorities, setPriorities] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;
  console.log(defaultUserWorkspaceID)

  const handleThemeChange = (theme) => {
    setCurrentTheme(theme);
  };
  

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
  };

 

  const handleRowClick = useCallback((note) => {
    setSelectedRow(note.id);
    setViewNote(note);
    setShowViewModal(true);
  }, []);

 const handleSelect = (option) => {
    onChange(option);
    setIsDropDownOpen(false);
  };

 
  const loadDocumentsForView = async (noteId) => {
    try {
      setLoadingDocuments(prev => ({ ...prev, [noteId]: true }));
      const docs = await fetchDocuments(noteId);
      setNoteDocuments(prev => ({
        ...prev,
        [noteId]: docs
      }));
    } catch (error) {
      console.error("Error loading documents for view:", error);
    } finally {
      setLoadingDocuments(prev => ({ ...prev, [noteId]: false }));
    }
  };

  /* const fetchDocumentCount = async (siteNoteId) => {
    if (!siteNoteId) return;
    
    try {
      setLoadingCounts(prev => ({ ...prev, [siteNoteId]: true }));
      
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Documents/CountDocuments?siteNoteId=${siteNoteId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        let count = 0;
        if (Array.isArray(data)) {
          count = data.length;
        } else if (typeof data === 'object' && data !== null && 'documentCount' in data) {
          count = data.documentCount;
        } else {
          console.warn('API returned unexpected JSON format:', data);
        }
        // setDocumentCounts(prev => ({ ...prev, [siteNoteId]: count }));
      } else {
        console.warn('API response was not JSON for document count:', await response.text());
        // setDocumentCounts(prev => ({ ...prev, [siteNoteId]: 0 }));
      }
    } catch (err) {
      console.error(`Error fetching document count for note ${siteNoteId}:`, err);
      // setDocumentCounts(prev => ({ ...prev, [siteNoteId]: 0 }));
    } finally {
      setLoadingCounts(prev => ({ ...prev, [siteNoteId]: false }));
    }
  }; */

  useEffect(() => {
    if(userid && defaultUserWorkspaceID){
        fetchUserWorkspaceRole();
        fetchPriorities()
    }
      
  }, [userid, defaultUserWorkspaceID]); 

    const filteredNotes = useMemo(() => {
    let result = [...notes];
    
    result = result.filter(note => {
  
      const job = jobs.find(j => 
        j.id.toString() === note.jobId?.toString() || 
        j.name === note.job
      );
      
      return job && job.status !== 3;
    });
  
    result.sort((a, b) => new Date(b.timeStamp) - new Date(a.timeStamp));
    
    
    hierarchy.forEach(column => {
      const selectedValue = selectedValues[column];
      if (selectedValue) {
        result = result.filter(note => {
          const noteValue = column === 'date' 
            ? new Date(note[column]).toLocaleDateString() 
            : note[column];
          return noteValue === selectedValue;
        });
      }
    });

    // Apply existing search filter
    if (searchTerm.trim()) {
      const searchColumnToUse = searchColumn || 'note';
      result = result.filter(note => {
        const noteValue = String(note[searchColumnToUse]).toLowerCase();
        return noteValue.includes(searchTerm.toLowerCase());
      });
    }
    
    return result;
  }, [notes, jobs, hierarchy, selectedValues, searchTerm, searchColumn]);

  const fetchPriorities = async () =>{
      
    try {
      const response = await fetch(`${apiUrl}/Priority/GetPriorities`, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        }
      })
      if(response.ok){
        const result = await response.json()
        console.log(result)
        setPriorities(result.priorities || [])
      }
      
      
    } catch (error) {
      
    }
  }
 

  const handleRowSelect = useCallback((note) => {
    setSelectedRow(note.id);
  }, []);

  const handleKeyDown = useCallback((event) => {
    console.log('Key pressed:', event.key, 'Ctrl pressed:', event.ctrlKey, 'Selected row:', selectedRow);
    
    if (event.ctrlKey && event.key === 'a' && selectedRow) {
      event.preventDefault();
      console.log('Ctrl+A detected with selected row:', selectedRow);
      
      const selectedNote = filteredNotes.find(note => note.id === selectedRow);
      console.log('Found note:', selectedNote);
      
      if (selectedNote) {
        setPrefilledData({
          project: selectedNote.project,
          job: selectedNote.job
        });
        
        setShowNewModal(true);
        console.log('Opening modal with pre-filled data:', {project: selectedNote.project, job: selectedNote.job});
      }
    }
  }, [selectedRow, filteredNotes]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (!showNewModal) {
      setPrefilledData(null);
    }
  }, [showNewModal]);

  const loadDocuments = async (noteId) => {
    if (!noteId) {
      console.warn("No noteId provided to loadDocuments");
      return;
    }

    try {
      setLoadingDocuments(prev => ({ ...prev, [noteId]: true }));
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/GetDocuments?siteNoteId=${noteId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const documents = Array.isArray(data.documents) ? data.documents : [];

      setNoteDocuments(prev => ({
        ...prev,
        [noteId]: documents.map(doc => ({
          ...doc,
          fileUrl: doc.FileData ? URL.createObjectURL(new Blob([doc.FileData])) : null
        }))
      }));

    } catch (err) {
      console.error("Failed to load documents:", err);
      setError(err.message);
      setNoteDocuments(prev => ({ ...prev, [noteId]: [] }));
    } finally {
      setLoadingDocuments(prev => ({ ...prev, [noteId]: false }));
    }
  };

  useEffect(() => {
    return () => {
      Object.values(noteDocuments).forEach(docs => {
        docs.forEach(doc => {
          if (doc.fileUrl) URL.revokeObjectURL(doc.fileUrl);
        });
      });
    };
  }, [noteDocuments]);


  const fetchUserWorkspaceRole = async () => {
    setIsRoleLoading(true);
    console.log('fetching')
    try {
      console.log('fetching')
      const response = await fetch(`${apiUrl}/UserWorkspace/GetWorkspacesByUserId/${userid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        }
      });
  
       if (response.ok) {
        const data = await response.json();
        const userWorkspaces = data.userWorkspaces || [];
        
        const workspace = userWorkspaces.find(res => res.workspaceID == defaultUserWorkspaceID);
       
        const newRole = workspace?.role || null;
        
        setRole(newRole);
        
      }
    } catch (error) {
      console.error("Error:", error);
      setRole(null);
    } finally {
      setIsRoleLoading(false);
    }
  }

 const fetchWorkspaceByUserId = async (workspaces) => {
    console.log(workspaces)
    for (let i = 0; i < workspaces.length; i++) {
            if(workspaces[i].userID === userid){
              fetchWorkspaceByid(workspaces[i].userID)
              console.log(workspaces[i].workspaceID)
        }
    } 
    
  }

  const handleOpenSettings = () => {
        
    if (isRoleLoading) {
      return;
    }
    setShowSettingsModal(true);
  };
  const fetchWorkspaceByid = async (useId) => {
    try {
      const response = await fetch(`${apiUrl}/Workspace/GetWorkspacesByUserId/${useId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        }
      });
  
      if (response.ok) {
        const data = await response.json();
        console.log()
        setUserWorkspaces(data.workspaces);
        

      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }

  const handleAddFromRow = (note) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const currentDateFormatted = `${year}-${month}-${day}`;

  setPrefilledData({
    date: currentDateFormatted,
    project: note.project,
    job: note.job
  });
  
  setShowNewModal(true);
};

  const handleViewAttachments = async (note) => {
    try {
      console.log("Starting document fetch for note:", note.id);
      
      setSelectedFileNote(note);
      setShowAttachedFileModal(true);
  
      const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/Documents?reference=${note.id}`
      );
  
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const documents = await response.json().documents || [];
      console.log("Received documents:", documents);

      setNoteDocuments(prev => ({
        ...prev,
        [note.id]: documents
      }));

    } catch (error) {
      console.error("Document load failed:", error);
      setError(`Failed to load documents: ${error.message}`);
    }
  };

  const handleUploadDocumentWrapper = async (documentName, file, noteId) => { 
    try {
      console.log("Uploading document via wrapper:", { documentName, file, noteId });
      
      const result = await onUploadDocument(documentName, file, noteId);
      /* if (noteId) {
        await fetchDocumentCount(noteId);
      } */
      //refreshNotes(); 
      return result;
    } catch (error) {
      console.error('Error uploading document in wrapper:', error);
      throw error;
    }
  };

  const handleDeleteDocumentWrapper = async (docId, noteId) => {
    try {
      await onDeleteDocument(docId); 
      /* if (noteId) {
        await fetchDocumentCount(noteId);
      } */
      //refreshNotes(); 
    } catch (error) {
      console.error('Error deleting document in wrapper:', error);
      throw error;
    }
  };

  const handleDownloadDocument = async (document) => {
    try {
      if (!document.fileUrl && document.FileData) {
        const blob = new Blob([new Uint8Array(document.FileData)]);
        document.fileUrl = URL.createObjectURL(blob);
      }
  
      if (document.fileUrl) {
        const link = document.createElement('a');
        link.href = document.fileUrl;
        link.download = document.fileName || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
          URL.revokeObjectURL(document.fileUrl);
        }, 1000);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document');
    }
  };

  const handleDragStart = (column) => {
    return (e) => {
      e.dataTransfer.setData('column', column);
    };
  };

  const handleOpenSubModal = (modalId) => {
    console.log(`Opening sub-modal: ${modalId}`);
    setActiveSubModal(modalId);
  };

  const handleCloseSettingsModal = () => {
    setShowSettingsModal(false);
    setActiveSubModal(null); 
  };

  const handleCloseNewModal = () => {
    setShowNewModal(false);
    setSelectedRow(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const column = e.dataTransfer.getData('column');
    if (column && !['attachmentFileName', 'actions'].includes(column)) {
      if (!hierarchy.includes(column)) {
        setHierarchy([...hierarchy, column]);
        setSelectedValues({...selectedValues, [column]: ''});
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
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

  const resetNotes = () => {
    onUpdateNotes()
  }

  const removeHierarchyLevel = (column) => {
    const index = hierarchy.indexOf(column);
    setHierarchy(hierarchy.filter(col => col !== column));
    
    const newSelectedValues = {...selectedValues};
    delete newSelectedValues[column];
    setSelectedValues(newSelectedValues);
  };

  const handleEdit = (note) => {

    setSelectedNote(note);
    console.log(selectedNote)
    setShowEditModal(true);
  };

const handleDelete = async (note) => {
    const creationDate = note.timeStamp;
    if (creationDate) {
      const createdAt = new Date(creationDate);
      const now = new Date();
      const hoursDiff = (now - createdAt) / (1000 * 60 * 60); 
      if(hoursDiff > 24){
         toast.error('Cannot delete this note it is older than 24 hours');
      }
     else{
        setNoteToDelete(note);
        setShowDeleteConfirm(true);
     }
    } 
   
  
  };

 const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    setIsDeleting(true);
    try { 
          const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/SiteNote/DeleteSiteNote/${noteToDelete.id}`, { method: 'DELETE' });
          if (response.ok) {
            const data = await response.json();
            toast.success(data.message || 'Note deleted successfully');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          refreshNotes();
        } catch (error) {
          console.error('Error deleting note:', error);
          toast.error('Error deleting note: ' + error.message);
      } finally {
        setIsDeleting(false);
        setShowDeleteConfirm(false);
        setNoteToDelete(null);
      }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setNoteToDelete(null);
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
      dateValues.sort((a, b) => {
        return new Date(a) - new Date(b);
      });
      return dateValues;
    }
    return Array.from(values).sort();
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

  const user = JSON.parse(localStorage.getItem('user'));


  return (
    <div className="main-content">
      <div className="dashboard">
        <div style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.95), rgba(199, 194, 194, 0.95)), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          padding: '20px 30px',
          borderRadius: '8px',
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '0',
            height: '0',
            borderStyle: 'solid',
            borderWidth: '0 60px 60px 0',
            borderColor: 'transparent rgba(52, 152, 219, 0.1) transparent transparent'
          }}></div>

          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 600,
            color: '#2c3e50',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            position: 'relative',
            zIndex: 1
          }}>
            <i className="fas fa-clipboard-list" style={{
              color: '#3498db',
              fontSize: '32px',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }} />
            <span style={{
              position: 'relative',
              paddingBottom: '5px'
            }}>
              Site Notes Dashboard: {user.userName}
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '50%',
                height: '3px',
                background: 'linear-gradient(to right, #3498db, transparent)',
                borderRadius: '3px'
              }}></span>
            </span>
          </h1>
           <div>
              <p className="dropdown-container">{defaultUserWorkspaceName}</p>
              <button 
            onClick={handleOpenSettings}
            style={{
              background: 'rgba(52, 152, 219, 0.1)',
              border: '1px solid rgba(52, 152, 219, 0.2)',
              cursor: 'pointer',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              color: '#3498db',
              fontSize: '18px',
              position: 'relative',
              zIndex: 1
            }}
            title="Settings"
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
          <input 
            id="searchInput"
            type="text" 
            placeholder={searchColumn ? `Search by ${searchColumn}...` : "Search notes..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!searchColumn) {
                setSearchColumn('note');
              }
            }}
            style={styles.searchInput}
          />
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
          <button 
            id="newBtn" 
            style={{
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }} 
            onClick={() => setShowNewModal(true)}
          >
            <i className="fas fa-plus-circle"></i> New Note
             
          </button>
          
        </div>
  
        <div className="hierarchy-filters">
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
      
  <div className="responsive-table-container">
        <table>
          <thead>
            <tr>
              {['date', 'workspace', 'project', 'job', 'note', 'userName', 'Attached File'].map(col => (
                <th 
                  key={col} 
                  draggable 
                  onDragStart={handleDragStart(col)}
                  className={hierarchy.includes(col) ? 'hierarchy-column' : ''}
                >
                  {col === 'date' && <i className="far fa-calendar-alt"></i>}
                  {col === 'workspace' && <i className="fas fa-building"></i>}  
                  {col === 'project' && <i className="fas fa-project-diagram"></i>}
                  {col === 'job' && <i className="fas fa-tasks"></i>}
                  {col === 'note' && <i className="far fa-sticky-note"></i>}
                  {col === 'userName' && <i className="fas fa-user"></i>}
                  {col === 'Attached File' && <i className="fas fa-paperclip"></i>}
                  {' '}
                  {col.charAt(0).toUpperCase() + col.slice(1)}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredNotes.map(note => (
                <tr
                  key={note.id}
                  onClick={() => handleRowClick(note)}
                  className={selectedRow === note.id ? 'selected-row' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <td title={new Date(note.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}>
                  {new Date(note.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
                </td>
                <td title={note.workspace}>{note.workspace}</td>
                <td title={note.project}>{note.project}</td>
                <td title={note.job}>{note.job}</td>
                <td
                  className="editable"
                  title={note.note}
                >
                  {note.note.length > 69 ? `${note.note.substring(0, 69)}...` : note.note}
                </td>
                <td title={note.userName}>{note.userName}</td>
                <td
                    className="file-cell"
                    onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedFileNote(note);
                    setShowAttachedFileModal(true);
                  }}
                    style={{
                    cursor: 'pointer',
                    color: '#1890ff',
                    padding: '8px',
                  }}
                  >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fas fa-paperclip" style={{ opacity: note.DocumentCount > 0 ? 1 : 0.3 }} />
                    <span>({note.documentCount || 0})</span>
                  </span>
                </td>
               <td className="table-actions">
                  <a
                    title="Add New Note"
                    onClick={(e) => {
                    e.stopPropagation(); 
                    handleAddFromRow(note);
                    }}
                  >
                    <i className="fas fa-plus"></i>
                  </a>
                  <a 
                      title="Edit" 
                      onClick={(e) => { 
                      e.stopPropagation(); 
                      handleEdit(note);
                    }}>
                  <i className="fas fa-edit"></i>
                </a>
                <a 
                  title="Delete" 
                  onClick={(e) => { 
                  e.stopPropagation(); 
                  handleDelete(note);
                  }}>
                  <i className="fas fa-trash"></i>
                 </a>
                </td>
              </tr>
             ))}
          </tbody>
        </table>
        </div>
       
      </div>

      {showDeleteConfirm && (
        <div 
          className="modal-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={handleCancelDelete}
        >
          <div 
            className="modal-content" 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              width: '90%',
              maxWidth: '400px',
              padding: '24px',
              textAlign: 'center'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px' }}>
              <i 
                className="fas fa-exclamation-triangle" 
                style={{ 
                  fontSize: '48px', 
                  color: '#f39c12', 
                  marginBottom: '12px' 
                }} 
              />
            </div>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              color: '#2c3e50', 
              fontSize: '20px',
              fontWeight: 600
            }}>
              Confirm Delete
            </h3>
            <p style={{ 
              margin: '0 0 24px 0', 
              color: '#7f8c8d', 
              lineHeight: '1.5' 
            }}>
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            <div 
              className="modal-actions" 
              style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'center' 
              }}
            >
              <button 
                onClick={handleCancelDelete}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #bdc3c7',
                  color: '#7f8c8d',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  minWidth: '80px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#ecf0f1';
                  e.target.style.borderColor = '#95a5a6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#bdc3c7';
                }}
              >
                <i className="fas fa-times" style={{ marginRight: '6px' }} />
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete} 
                disabled={isDeleting}
                className="delete-btn"
                style={{
                  backgroundColor: isDeleting ? '#bdc3c7' : '#e74c3c',
                  border: 'none',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  minWidth: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: isDeleting ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isDeleting) {
                    e.target.style.backgroundColor = '#c0392b';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDeleting) {
                    e.target.style.backgroundColor = '#e74c3c';
                  }
                }}
              >
                {isDeleting ? (
                  <>
                    <i className="fas fa-spinner fa-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showSettingsModal && (
        <SettingsModal 
          //key={role}
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)} 
          onLogout={onLogout}
          defWorkID={defaultUserWorkspaceID}
          defWorkName={defaultUserWorkspaceName}
          role={role}
          onUpdateDefaultWorkspace={onUpdateDefaultWorkspace}
          userrole={userRole}
        />
      )}

      {showViewModal && viewNote && (
        <ViewNoteModal
          noteId={viewNote.id}
          onClose={() => {
            setShowViewModal(false);
            setViewNote(null);
          }}
          documents={filteredNotes} 
          currentTheme={currentTheme}
          onViewAttachments={handleViewAttachments}
          priorities={priorities}
          userid={userid}
        />
      )}
  
      {showNewModal && (
        <NewNoteModal
          isOpen={showNewModal}
          onClose={handleCloseNewModal}
          refreshNotes={refreshNotes}
          addSiteNote={addSiteNote}
          projects={projects}
          jobs={jobs}
          onUploadDocument={handleUploadDocumentWrapper} 
          onDeleteDocument={handleDeleteDocumentWrapper} 
          prefilledData={prefilledData}
          defWorkSpaceId={defaultUserWorkspaceID}
        />
      )}
      {showEditModal && selectedNote && ( 
        <EditNoteModal
          note={selectedNote}
          onClose={() => setShowEditModal(false)}
          refreshNotes={refreshNotes}
          updateNote={updateNote}             
          deleteDocument={handleDeleteDocumentWrapper}    
          uploadDocument={handleUploadDocumentWrapper}   
          projects={projects}                       
          jobs={jobs} 
          noteDocuments={noteDocuments[selectedNote.id] || []}
          loadingDocuments={loadingDocuments[selectedNote.id] || false} 
          priorities={priorities}                    
        />
      )}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
  
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
          uploadDocument={handleUploadDocumentWrapper}
          onDeleteDocument={handleDeleteDocumentWrapper}
          documents={noteDocuments[selectedFileNote.id] || []}
          loading={loadingDocuments[selectedFileNote.id] || false}
          error={error}
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
  files: PropTypes.object,
  onUploadDocument: PropTypes.func.isRequired,
  onDeleteDocument: PropTypes.func.isRequired,
  fetchDocuments: PropTypes.func.isRequired,
  documentCounts: PropTypes.object,
  fetchDocumentCount: PropTypes.func,
  onLogout: PropTypes.func.isRequired
  
};

Dashboard.defaultProps = {
  projects: [],
  jobs: [],
  documentCounts: {},
  files: {}
};

export default Dashboard;