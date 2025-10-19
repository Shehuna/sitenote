import React, { useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from './components/Login';
import Dashboard from "./components/Dashboard";
import toast, { Toaster } from 'react-hot-toast';
import "./App.css";
import UserManagement from "./components/Users/UserManagement";

function App() {
  const [notes, setNotes] = useState([]);
  const [userId, setUserId]= useState(0)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [defaultWorkspace, setDefaultWorkspace] = useState('')
  const [userDefaultWork, setUserDefaultWork] = useState('')
  const [isInWorkspace, setIsInWorkspace]= useState(false)
  const [userWorkspaceMaps, setUserWorkspaceMaps] = useState([])
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
  const [workspaces,setWorkspaces] = useState([])
  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

   useEffect(() => {
        initializeUser();
    }, []);

  const fetchNotes = async () => {
    if (loadingRef.current) return;
    
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
        return;
      }

      setNotes(prev => {
        const existingIds = new Set(prev.map(note => note.id));
        const newNotes = data.siteNotes.filter(note => !existingIds.has(note.id));
        return [...prev, ...newNotes];
      });
      
      //setNotes(prev => [...prev, ...data.siteNotes]);
        //console.log(data)
        //setNotes(data.siteNotes);
        // fetchAllDocumentCounts(data);
        setLoading(false);  
      } else {
        console.error(`Failed to fetch: ${response.status}`);
      }
  
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
    finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }
  

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
        console.log(data)
        setDefaultWorkspace(data.user.defaultWorkspaceId)
        fetchDefaultWorkspace(data.user.defaultWorkspaceId)
        
        setLoading(false);  

      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
    finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }
  
  /* 

  const handleRefresh = () => {
    setOnRefresh(prev => prev + 1);
  }; */

  const updateDefaultWorkspace = (newDefId, newDefName) => {
    setDefaultWorkspace(newDefId)
    setUserDefaultWork(newDefName)
   
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
        //setWorkspaces(data.workspaces || []);
        setIsInWorkspace(true)
        setUserDefaultWork(data.workspace.name)
        // setWorkspaces(data.workspaces)
        //getUserWorkspaceMapping(userId)
        setLoading(false);  

      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
    finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }
  /* const getUserWorkspaceMapping = async (userid) => {
    try {
      const response = await fetch(`${apiUrl}/UserWorkspace/GetUserWorkspaceById/${userid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        }
      });
  
      if (response.ok) {
        const result = await response.json()
        setUserRole(result.userWorkspace.role)
        setLoading(false);  
        return;
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
    finally {
      setLoading(false);
      loadingRef.current = false;
    }
  } */

  const handleScroll = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    // Load more when 100px from bottom
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      setPage(prev => prev + 1);
    }
  }, [hasMore]);

 /*  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]); */

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
        if (userId) {
            fetchInitialData();
        }
    }, [userId]); 


  useEffect(() => {
      const handleScroll = () => {
      if (
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 &&
      !loading
      ) {
      loadMore();
      }
      };
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
      }, [loading])

     const initializeUser = () => {
            try {
                const userStr = localStorage.getItem("user");
                if (userStr) {
                    const user = JSON.parse(userStr);
                    console.log("User from localStorage:", user);
                    setUserId(parseInt(user.id));
                    setIsAuthenticated(true);
                    getUser(user.id)
                    //setDefaultWorkspace(user.defaultWorkspaceId)
                    console.log(defaultWorkspace)
                }
            } catch (error) {
                console.error("Error parsing user:", error);
            }
        };

  /* useEffect(() => {
    console.log(userId)
    //fetchInitialData();
    //fetchNotes();
    const user = localStorage.getItem('user');
    if (user) {
      console.log(user)
      setUserId(user.id)
      setIsAuthenticated(true);
      fetchInitialData();
    } else {
      setLoading(false);
    }  
  }, [userId]); */
  const handleLogin = (user) => {
    initializeUser()
    //fetchInitialData(userId);
  };

  
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userToken'); 
    setIsAuthenticated(false);
    setNotes([])
    setUserId('')
    setUserDefaultWork('')
  };
 
  const refreshNote = () =>{
    fetchInitialData()
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

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const newData = await fetchNotes();
    const safeData = Array.isArray(newData) ? newData : [];
    if (safeData.length === 0 || safeData.length < pageSize) {
      setHasMore(false);
    }
    setNotes(prev => [...prev, ...safeData]);
    setPage(prev => prev + 1);
    setLoading(false);
    };

  // const fetchDocumentCount = async (siteNoteId) => {
  //   if (!siteNoteId) return 0;
    
  //   try {
  //     const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Documents/CountDocuments?siteNoteId=${siteNoteId}`);

  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
      
  //     const data = await response.json();
      
  //     const count = data.documentCount !== undefined ? data.documentCount : 
  //                  data.count !== undefined ? data.count : 
  //                  typeof data === 'number' ? data : 0;
      
  //     return count;
  //   } catch (err) {
  //     console.error(`Error fetching document count for note ${siteNoteId}:`, err);
  //     return 0;
  //   }
  // };

  const fetchAllDocumentCounts = async (notesList) => {
    const counts = {};
    
    for (const note of notesList) {
      // if (note.id) {
      //   counts[note.id] = await fetchDocumentCount(note.id);
      // }
    }
    
    setDocumentCounts(counts);
  };

  const fetchUserWorkspaceRole = async () => {
    setLoading(true)
    console.log('fetching')
    try {
      console.log('fetching')
      const response = await fetch(`${apiUrl}/UserWorkspace/GetWorkspacesByUserId/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        }
      });
  
      if (response.ok) {
        const data = await response.json();
        setUserWorkspaceMaps(await data.userWorkspaces)        
        setLoading(false);
        //console.log(data.userWorkspaces)
        //fetchWorkspaceByUserId(data.userWorkspaces)
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }finally{
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
        fetchNotes()
        // if (siteNoteId) {
        //   const newCount = await fetchDocumentCount(siteNoteId);
        //   setDocumentCounts(prev => ({...prev, [siteNoteId]: newCount}));
        // }

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
    console.log(updatedData)
    try {
      const url = `${process.env.REACT_APP_API_BASE_URL}/api/SiteNote/UpdateSiteNote/${id}`;

      const UpdatedNoteData = {
          note: updatedData.Note,
          date: updatedData.Date,
          jobId: updatedData.JobId,
          userId: updatedData.UserId,
        };

      /* const formData = new FormData();
      formData.append("Note", updatedData.Note);
      formData.append("Date", updatedData.Date); */

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
        } catch (e) {
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Update successful:', result);
      await fetchNotes()
      return result;
      
    } catch (error) {
      console.error("Error updating note:", error);
      throw error;
    }
  };
  
  const addSiteNote = async (siteNoteData) => {
    try {
    /* const formData = new FormData();
    formData.append("Note", siteNoteData.Note);
    formData.append("Date", siteNoteData.Date);
    formData.append("JobId", siteNoteData.JobId);
    formData.append("UserId", siteNoteData.UserId); */

    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/SiteNote/AddSiteNote`, {
      method: "POST",
      headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(
                   siteNoteData
                )
    });


      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save note");
      }

      const responseData = await response.json();
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

    // if (noteId) {
    //   const newCount = await fetchDocumentCount(noteId);
    //   setDocumentCounts(prev => ({...prev, [noteId]: newCount}));
    // }
  };
  
  return (
    <Router>
      <div className="app">
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
                loading ? (
                  <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading data...</p>
                  </div>
                ) : error ? (
                  <div className="error-container">
                    <p>Error: {error}</p>
                    <button onClick={fetchInitialData}>Retry</button>
                  </div>
                ) : (
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
                    // fetchDocumentCount={fetchDocumentCount}
                  />
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