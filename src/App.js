import React, { useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from './components/Login';
import Dashboard from "./components/Dashboard";
import toast, { Toaster } from 'react-hot-toast';
import "./App.css";
import UserManagement from "./components/Users/UserManagement";

function App() {
  const [notes, setNotes] = useState([]);
  const [userId, setUserId] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [defaultWorkspace, setDefaultWorkspace] = useState('');
  const [userDefaultWork, setUserDefaultWork] = useState('');
  const [isInWorkspace, setIsInWorkspace] = useState(false);
  const [userWorkspaceMaps, setUserWorkspaceMaps] = useState([]);
  const [onRefresh, setOnRefresh] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);
  const [projects, setProjects] = useState([]); 
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [documentCounts, setDocumentCounts] = useState({});
  const [workspaces, setWorkspaces] = useState([]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;
  const scrollPositionRef = useRef(0);
  const isInitialFetchRef = useRef(true);

  useEffect(() => {
    initializeUser();
  }, []);
  // Add this useEffect to sync authentication state
useEffect(() => {
  const checkAuthState = () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserId(parseInt(user.id));
      setIsAuthenticated(true);
    }
  };

  // Check auth state when component mounts
  checkAuthState();

  // Listen for storage changes (when UserManagement stores user)
  window.addEventListener('storage', checkAuthState);
  
  return () => {
    window.removeEventListener('storage', checkAuthState);
  };
}, []);

  const fetchNotes = useCallback(async () => {
    if (loadingRef.current || (!isInitialFetchRef.current && !hasMore)) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/SiteNote/GetSiteNotes?pageNumber=${page}&pageSize=${pageSize}&userId=${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        }
      });

      const text = await response.text();

      if (response.ok) {
        const data = JSON.parse(text);

        if (data.siteNotes.length === 0) {
          setHasMore(false);
          loadingRef.current = false;
          setLoading(false);
          return;
        }

        scrollPositionRef.current = window.scrollY;

        setNotes(prev => {
          const existingIds = new Set(prev.map(note => note.id));
          const newNotes = data.siteNotes.filter(note => !existingIds.has(note.id));
          return [...prev, ...newNotes];
        });

        setPage(prev => prev + 1);

        setTimeout(() => {
          window.scrollTo(0, scrollPositionRef.current);
        }, 0);
      } else {
        console.error(`Failed to fetch: ${response.status}`);
        setError("Failed to load more notes");
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      setError("Failed to load more notes");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      isInitialFetchRef.current = false;
    }
  }, [page, pageSize, userId, hasMore]);

  const getUser = async (userid) => {
    try {
      const response = await fetch(`${apiUrl}/UserManagement/GetUserById/${userid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        }
      });
  
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setDefaultWorkspace(data.user.defaultWorkspaceId);
        fetchDefaultWorkspace(data.user.defaultWorkspaceId);
        setLoading(false);  
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  const updateDefaultWorkspace = (newDefId, newDefName) => {
    setDefaultWorkspace(newDefId);
    setUserDefaultWork(newDefName);
  };

  const fetchDefaultWorkspace = async (defId) => {
    try {
      const response = await fetch(`${apiUrl}/Workspace/GetWorkspaceById/${defId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        }
      });
  
      if (response.ok) {
        const data = await response.json();
        setIsInWorkspace(true);
        setUserDefaultWork(data.workspace.name);
        setLoading(false);  
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  const handleScroll = useCallback(() => {
    if (loadingRef.current || !hasMore) return;

    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight || window.innerHeight;

    setShowBackToTop(scrollTop > 200);

    if (scrollTop + clientHeight >= scrollHeight - 100) {
      fetchNotes();
    }
  }, [fetchNotes, hasMore]);

  const handleBackToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    if (userId) {
      fetchInitialData();
    }
  }, [userId]); 

  const initializeUser = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        console.log("User from localStorage:", user);
        setUserId(parseInt(user.id));
        setIsAuthenticated(true);
        getUser(user.id);
        console.log(defaultWorkspace);
      }
    } catch (error) {
      console.error("Error parsing user:", error);
    }
  };

  const handleLogin = (user) => {
    initializeUser();
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userToken'); 
    setIsAuthenticated(false);
    setNotes([]);
    setUserId('');
    setUserDefaultWork('');
  };
 
  const refreshNote = () => {
    isInitialFetchRef.current = true;
    fetchInitialData();
  }

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchNotes(), fetchProjectsAndJobs()]);
    } catch (err) {
      setError(err.message);
      console.error("Initial data loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserWorkspaceRole = async () => {
    setLoading(true);
    console.log('fetching');
    try {
      console.log('fetching');
      const response = await fetch(`${apiUrl}/UserWorkspace/GetWorkspacesByUserId/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        }
      });
  
      if (response.ok) {
        const data = await response.json();
        setUserWorkspaceMaps(await data.userWorkspaces);        
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  }
  
  const fetchDocumentsByReference = async (noteId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/Documents/?siteNoteId=${noteId}`,
        {
          headers: {
            "accept": "application/json; charset=utf-8"
          },
          credentials: 'include' 
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }
  
      return await response.json();
    } catch (error) {
      console.error("Error fetching documents:", error);
      throw error;
    }
  };

  const handleUploadDocument = async (documentName, file, siteNoteId) => {
    console.log("App.js: handleUploadDocument called with:", { documentName, file, siteNoteId });

    if (!documentName || documentName.trim() === '') {
      throw new Error("Document name is required for upload.");
    }
    if (!file) {
      throw new Error("File is required for upload.");
    }

    var user = JSON.parse(localStorage.getItem('user'));
    var userId = user ? user.id : 1;

    const formData = new FormData();
    formData.append('Name', documentName); 
    formData.append('File', file);      
    formData.append('SiteNoteId', siteNoteId);
    formData.append('UserId', userId);
    console.log("FormData prepared:", { documentName, file, siteNoteId, userId });

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Documents/AddDocument`, { 
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json(); 
      console.log('Document uploaded successfully:', result.message);
      isInitialFetchRef.current = true;
      fetchNotes();
      return {
        id: result.document.Id, 
        name: result.document.Name, 
        fileName: result.document.FileName, 
      };
    } catch (error) {
      console.error('Failed to upload document:', error);
      throw error;
    }
  };

  const downloadDocumentById = async (documentId) => {
    try {
      if (!documentId) {
        throw new Error("No document ID provided");
      }
  
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/Documents/DownloadDocument?documentId=${documentId}`,
        {
          method: "GET",
          credentials: 'include', 
          headers: {
            'Accept': 'application/octet-stream'
          }
        }
      );
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
  
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'document';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
  
    } catch (error) {
      console.error("Download failed:", {
        error: error.message,
        stack: error.stack
      });
      alert(`Download failed: ${error.message}`);
    }
  };

  const updateProject = async (projectData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Sitebook/UpdateProject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Id: projectData.id,
          Name: projectData.name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update project");
      }

      await fetchProjectsAndJobs();
      return await response.json();
    } catch (error) {
      console.error("Error updating project:", error);
      throw error;
    }
  };

  const updateNote = async (id, updatedData) => {
    console.log(updatedData);
    try {
      const url = `${process.env.REACT_APP_API_BASE_URL}/api/SiteNote/UpdateSiteNote/${id}`;

      const UpdatedNoteData = {
        note: updatedData.Note,
        date: updatedData.Date,
        jobId: updatedData.JobId,
        userId: updatedData.UserId,
      };

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(UpdatedNoteData)
      });
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {}
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Update successful:', result);
      isInitialFetchRef.current = true;
      await fetchNotes();
      return result;
    } catch (error) {
      console.error("Error updating note:", error);
      throw error;
    }
  };
  
  const addSiteNote = async (siteNoteData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/SiteNote/AddSiteNote`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(siteNoteData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save note");
      }

      const responseData = await response.json();
      isInitialFetchRef.current = true;
      await fetchNotes();
      return responseData;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };

  const fetchProjectsAndJobs = async () => {
    try {
      var [projectsRes, jobsRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Project/GetProjects`),
        fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Job/GetJobs`)
      ]);

      if (!projectsRes.ok) throw new Error(`Projects fetch failed: ${projectsRes.status}`);
      if (!jobsRes.ok) throw new Error(`Jobs fetch failed: ${jobsRes.status}`);
      projectsRes = await projectsRes.json();
      jobsRes = await jobsRes.json();
      
      const projectsData = await projectsRes.projects;
      const jobsData = await jobsRes.jobs;
      
      setProjects(projectsData.map(p => ({
        id: p.id,
        name: p.name,
        workspaceId: p.workspaceId,
        status: p.status
      })));
      
      setJobs(jobsData.map(j => ({
        id: j.id.toString(),
        projectId: j.projectId.toString(),
        name: j.name
      })));
    } catch (error) {
      console.error("Error fetching projects and jobs:", error);
      throw error;
    }
  };

  const handleDeleteDocument = async (docId, noteId) => {
    console.warn("WARNING: Your C# API does not have a 'DeleteDocument' endpoint. This action will only remove the document from the frontend's local state.");

    console.log(`Locally deleting document with ID: ${docId} from note ID: ${noteId}`);
    setFiles(prevFiles => ({
      ...prevFiles,
      [noteId]: prevFiles[noteId]?.filter(doc => doc.id !== docId)
    }));
  };
  
  return (
    <Router>
      <div className="app">
        {loading && isInitialFetchRef.current && (
          <div className="loading-container">
            <div className="loading-content">
              <div className="spinner"></div>
              <p>Loading data...</p>
            </div>
          </div>
        )}
        <style>
          {`
            @media (max-width: 768px) {
              .back-to-top {
                position: fixed !important;
                width: 40px !important;
                height: 40px !important;
                font-size: 20px !important;
                bottom: 60px !important;
                right: 10px !important;
                z-index: 1001 !important;
              }
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
            .loading-container {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: rgba(255, 255, 255, 0.95);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 2000;
              animation: fadeIn 0.5s ease-in forwards;
              transition: opacity 0.5s ease-out;
            }
            .loading-container.hide {
              opacity: 0;
              pointer-events: none;
            }
            .loading-container .spinner {
              width: 48px;
              height: 48px;
              animation: spin 1s linear infinite;
              margin-bottom: 15px;
            }
            .loading-container p {
              margin: 0;
              color: #1a1a1a;
            }
            .loading-content {
              background: rgba(255, 255, 255, 0.95);
            
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 15px;
            }
          `}
        </style>
        <Routes>
          <Route 
            path="/login" 
            element={
              !isAuthenticated ? (
                <Login onLogin={handleLogin} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? (
                error ? (
                  <div className="error-container">
                    <p>Error: {error}</p>
                    <button onClick={fetchInitialData}>Retry</button>
                  </div>
                ) : (
                  <>
                    <Dashboard 
                      notes={notes} 
                      userid={userId}
                      workspaces={workspaces}
                      defaultUserWorkspaceID={defaultWorkspace}
                      defaultUserWorkspaceName={userDefaultWork}
                      onUpdateDefaultWorkspace={updateDefaultWorkspace}
                      refreshNotes={refreshNote} 
                      addSiteNote={addSiteNote} 
                      updateNote={updateNote}
                      projects={projects} 
                      updateProject={updateProject} 
                      jobs={jobs}
                      files={files}
                      onUploadDocument={handleUploadDocument}
                      onDeleteDocument={handleDeleteDocument}
                      fetchDocuments={fetchDocumentsByReference}
                      onLogout={handleLogout} 
                      documentCounts={documentCounts}
                    />
                    {loading && !isInitialFetchRef.current && (
                      <div style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div className="spinner" style={{
                          width: '20px',
                          height: '20px',
                          border: '3px solid #f3f3f3',
                          borderTop: '3px solid #3498db',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Loading more notes...
                      </div>
                    )}
                    {showBackToTop && (
                      <button
                        onClick={handleBackToTop}
                        className="back-to-top"
                        style={{
                          position: 'fixed',
                          bottom: '70px',
                          right: '20px',
                          background: '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '50px',
                          height: '50px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 1000,
                          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                          fontSize: '24px',
                          touchAction: 'manipulation'
                        }}
                        title="Back to Top"
                      >
                        <i className="fas fa-arrow-up"></i>
                      </button>
                    )}
                  </>
                )
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route
            path="/users/user-management"
            element={<UserManagement />}
          />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </div>
      <Toaster 
        position='bottom-center'
        style={{
          width: "18rem",
          padding: "0.7rem",
          background: "rgba(175, 75, 62, 0.1)",
          borderRadius: "3rem",
          transition: "all 0.2s",
          opacity: toast.visible ? 0.6 : 0
        }}
      />
    </Router>
  );
}

export default App;