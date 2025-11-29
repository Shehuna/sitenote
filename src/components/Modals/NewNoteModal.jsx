import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import './NewNoteModal.css';
import toast from 'react-hot-toast';

const NewNoteModal = forwardRef(({
    isOpen,
    onClose,
    projects = [],
    jobs = [],
    refreshNotes,
    refreshFilteredNotes,
    addSiteNote,
    onUploadDocument,
    onDeleteDocument,
    prefilledData = null,
    defWorkSpaceId,
    userworksaces = [],
    source = 'dashboard'
}, ref) => {
    // State declarations
    const [activeTab, setActiveTab] = useState('journal');
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedPriority, setSelectedPriority] = useState('1');
    const [selectedJob, setSelectedJob] = useState('');
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [documents, setDocuments] = useState([]);
    const [newDocument, setNewDocument] = useState({ name: '', file: null });
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [currentDocumentBeingEdited, setCurrentDocumentBeingEdited] = useState(null);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [fetchedProjects, setFetchedProjects] = useState([]);
    const [areDropdownsDisabled, setAreDropdownsDisabled] = useState(false);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    
    // New search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [allSearchData, setAllSearchData] = useState([]);

    // Store the actual project and job objects for dropdown display
    const [selectedProjectData, setSelectedProjectData] = useState(null);
    const [selectedJobData, setSelectedJobData] = useState(null);

    const textareaRef = useRef(null);
    const hasFocusedRef = useRef(false);
    const searchInputRef = useRef(null);
    const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

    // Constants
    const ALLOWED_FILE_TYPES = {
        'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/gif': ['.gif'],
        'image/webp': ['.webp'], 'image/svg+xml': ['.svg'], 'application/pdf': ['.pdf'],
        'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.ms-powerpoint': ['.ppt'], 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
        'text/plain': ['.txt'], 'audio/mpeg': ['.mp3'], 'audio/wav': ['.wav'],
        'audio/ogg': ['.ogg'], 'audio/aac': ['.aac'], 'video/mp4': ['.mp4'],
        'video/mpeg': ['.mpeg'], 'video/ogg': ['.ogv'], 'video/webm': ['.webm'],
        'video/quicktime': ['.mov'], 'video/x-msvideo': ['.avi']
    };

    // Utility functions
    const getCurrentUser = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return user || { id: 1 };
    };

    const normalizeProjectData = (projectData, fallbackData = null) => {
        if (!projectData && !fallbackData) return null;
        
        const data = projectData || fallbackData;
        return {
            id: data.id || data.projectId,
            projectId: data.projectId || data.id,
            name: data.name || data.projectName || 'Unnamed Project',
            workspaceId: data.workspaceId || (fallbackData ? fallbackData.workspaceId : null),
            ...data
        };
    };

    const normalizeJobData = (jobData, fallbackData = null) => {
        if (!jobData && !fallbackData) return null;
        
        const data = jobData || fallbackData;
        return {
            id: data.id || data.jobId,
            jobId: data.jobId || data.id,
            name: data.name || data.jobName || 'Unnamed Job',
            projectId: data.projectId || (fallbackData ? fallbackData.projectId : null),
            ...data
        };
    };

    // Expose focus method to parent component
    useImperativeHandle(ref, () => ({
        focusTextarea: () => {
            if (textareaRef.current) {
                const focus = () => {
                    textareaRef.current.focus();
                };
                
                setTimeout(focus, 100);
                setTimeout(focus, 300);
                setTimeout(focus, 500);
            }
        }
    }));

    // Internal focus logic for grid source
    useEffect(() => {
        if (isOpen && source === 'grid' && !hasFocusedRef.current) {
            const focusTextarea = () => {
                if (textareaRef.current && document.contains(textareaRef.current)) {
                    textareaRef.current.focus();
                    hasFocusedRef.current = true;
                    return true;
                }
                return false;
            };

            const timeout1 = setTimeout(() => focusTextarea(), 200);
            const timeout2 = setTimeout(() => focusTextarea(), 400);
            const timeout3 = setTimeout(() => focusTextarea(), 600);
            
            return () => {
                clearTimeout(timeout1);
                clearTimeout(timeout2);
                clearTimeout(timeout3);
            };
        }
    }, [isOpen, source]);

    // Reset states when modal closes
    useEffect(() => {
        if (!isOpen) {
            hasFocusedRef.current = false;
            setSearchQuery('');
            setSearchResults([]);
            setShowSearchResults(false);
            setSelectedProjectData(null);
            setSelectedJobData(null);
            setApiError(null);
        }
    }, [isOpen]);

    // Fetch all search data when modal opens
    useEffect(() => {
        const fetchAllSearchData = async () => {
            if (!isOpen) return;

            try {
                const user = getCurrentUser();
                const response = await fetch(`${apiUrl}/SiteNote/SearchJobs?userId=${user.id}&search=`);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch search data: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                const allData = data.results || data || [];
                setAllSearchData(allData);
                
            } catch (error) {
                console.error('Error fetching search data:', error);
                setApiError('Failed to load search data');
            }
        };

        fetchAllSearchData();
    }, [isOpen, apiUrl]);

    // Fetch projects when workspace changes OR when prefilled data is provided
    useEffect(() => {
        const fetchProjectsByWorkspace = async () => {
            if (prefilledData?.projectId && selectedWorkspace === prefilledData.workspaceId?.toString()) {
                return;
            }

            if (!selectedWorkspace) {
                setFilteredProjects([]);
                setSelectedProject('');
                setSelectedProjectData(null);
                return;
            }

            setIsLoadingProjects(true);
            try {
                const user = getCurrentUser();
                const response = await fetch(
                    `${apiUrl}/Project/GetProjectsByUserJobPermission/${user.id}/${selectedWorkspace}`
                );
                
                if (!response.ok) {
                    throw new Error('Failed to fetch projects');
                }
                
                const data = await response.json();
                const projectsData = data.projects || [];
                setFilteredProjects(projectsData);
                
            } catch (error) {
                console.error('Error fetching projects:', error);
                setApiError('Failed to load projects');
                setFilteredProjects([]);
            } finally {
                setIsLoadingProjects(false);
            }
        };

        fetchProjectsByWorkspace();
    }, [selectedWorkspace, apiUrl, prefilledData]);

    // Fetch jobs when project changes OR when prefilled data is provided
    useEffect(() => {
        const fetchJobsByProject = async () => {
            if (prefilledData?.jobId && selectedProject === prefilledData.projectId?.toString()) {
                return;
            }

            if (!selectedProject) {
                setFilteredJobs([]);
                setSelectedJob('');
                setSelectedJobData(null);
                return;
            }

            setIsLoadingJobs(true);
            try {
                const user = getCurrentUser();
                const response = await fetch(
                    `${apiUrl}/UserJobAuth/GetJobsByUserAndProject/${user.id}/${selectedProject}`
                );
                
                if (!response.ok) {
                    throw new Error('Failed to fetch jobs');
                }
                
                const data = await response.json();
                const jobsData = data.jobs || [];
                setFilteredJobs(jobsData);
                
            } catch (error) {
                console.error('Error fetching jobs:', error);
                setApiError('Failed to load jobs');
                setFilteredJobs([]);
            } finally {
                setIsLoadingJobs(false);
            }
        };

        fetchJobsByProject();
    }, [selectedProject, apiUrl, prefilledData]);

    // Initialize modal state when opened
    useEffect(() => {
        if (isOpen) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            setSelectedDate(prefilledData?.date || formattedDate);
            
            setActiveTab('journal');
            setSelectedPriority('1');

            if (!prefilledData) {
                setSelectedWorkspace('');
                setSelectedProject('');
                setSelectedJob('');
                setAreDropdownsDisabled(false);
                setNoteContent('');
                setFilteredProjects([]);
                setFilteredJobs([]);
                setSelectedProjectData(null);
                setSelectedJobData(null);
            } else {
                setAreDropdownsDisabled(true);
            }

            setDocuments([]);
            setNewDocument({ name: '', file: null });
            setShowDocumentModal(false);
            setCurrentDocumentBeingEdited(null);
            setErrors({});
            setIsSaving(false);
            setApiError(null);
        }
    }, [isOpen, prefilledData]);

    // Handle prefilled data for workspace, project, and job
    useEffect(() => {
        if (isOpen && prefilledData) {
            setAreDropdownsDisabled(true);
            
            if (prefilledData.date) {
                setSelectedDate(prefilledData.date);
            }

            if (prefilledData.workspaceId) {
                setSelectedWorkspace(prefilledData.workspaceId.toString());
            } else if (prefilledData.workspace) {
                const workspace = userworksaces.find(w => 
                    w && w.name && (w.name === prefilledData.workspace || w.text === prefilledData.workspace)
                );
                if (workspace) {
                    setSelectedWorkspace(workspace.id.toString());
                }
            }

            if (prefilledData.projectId) {
                const projectData = {
                    id: prefilledData.projectId,
                    projectId: prefilledData.projectId,
                    name: prefilledData.project || 'Project',
                    workspaceId: prefilledData.workspaceId
                };
                setSelectedProjectData(projectData);
                setSelectedProject(prefilledData.projectId.toString());
            } else if (prefilledData.project) {
                const project = projects.find(p => 
                    p && p.name && p.name === prefilledData.project
                );
                if (project) {
                    setSelectedProjectData(project);
                    setSelectedProject(project.id.toString());
                }
            }

            if (prefilledData.jobId) {
                const jobData = {
                    id: prefilledData.jobId,
                    jobId: prefilledData.jobId,
                    name: prefilledData.job || 'Job',
                    projectId: prefilledData.projectId
                };
                setSelectedJobData(jobData);
                setSelectedJob(prefilledData.jobId.toString());
            } else if (prefilledData.job) {
                const job = jobs.find(j => 
                    j && j.name && j.name === prefilledData.job
                );
                if (job) {
                    setSelectedJobData(job);
                    setSelectedJob(job.id.toString());
                }
            }
        }
    }, [isOpen, prefilledData, userworksaces, projects, jobs]);

    // Client-side search function
    const performSearch = useCallback((query) => {
        if (!query.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        setIsSearching(true);
        
        setTimeout(() => {
            try {
                const lowerCaseQuery = query.toLowerCase().trim();
                
                const filtered = allSearchData.filter(item => {
                    if (!item) return false;
                    
                    const searchText = `
                        ${item.workspaceName || ''} 
                        ${item.projectName || ''} 
                        ${item.jobName || ''}
                        ${item.fullPath || ''}
                    `.toLowerCase();
                    
                    return searchText.includes(lowerCaseQuery);
                });
                
                setSearchResults(filtered);
                setShowSearchResults(true);
            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, [allSearchData]);

    // Debounced search
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                performSearch(searchQuery);
            } else {
                setSearchResults([]);
                setShowSearchResults(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, performSearch, isOpen]);

    // Get project options for dropdown
    const getProjectOptions = () => {
        const options = [...filteredProjects];
        
        if (selectedProjectData && (selectedProjectData.id || selectedProjectData.projectId)) {
            const projectId = (selectedProjectData.id || selectedProjectData.projectId).toString();
            const exists = options.some(p => {
                const pId = (p.id || p.projectId)?.toString();
                return pId === projectId;
            });
            
            if (!exists) {
                options.push(selectedProjectData);
            }
        }
        
        return options.filter(project => project && (project.id || project.projectId));
    };

    // Get job options for dropdown
    const getJobOptions = () => {
        const options = [...filteredJobs];
        
        if (selectedJobData && (selectedJobData.id || selectedJobData.jobId)) {
            const jobId = (selectedJobData.id || selectedJobData.jobId).toString();
            const exists = options.some(j => {
                const jId = (j.id || j.jobId)?.toString();
                return jId === jobId;
            });
            
            if (!exists) {
                options.push(selectedJobData);
            }
        }
        
        return options.filter(job => job && (job.id || job.jobId));
    };

    // Handle search result selection
    const handleSearchResultSelect = useCallback(async (result) => {
        if (!result) return;

        setSelectedWorkspace('');
        setSelectedProject('');
        setSelectedJob('');
        setFilteredProjects([]);
        setFilteredJobs([]);
        setSelectedProjectData(null);
        setSelectedJobData(null);
        setApiError(null);

        try {
            if (result.workspaceId) {
                const matchingWorkspace = userworksaces.find(workspace => 
                    workspace && workspace.id && workspace.id.toString() === result.workspaceId.toString()
                );
                if (matchingWorkspace) {
                    setSelectedWorkspace(matchingWorkspace.id.toString());
                }
            }

            if (result.projectId) {
                setIsLoadingProjects(true);
                try {
                    const projectResponse = await fetch(
                        `${apiUrl}/Project/GetProjectById/${result.projectId}`
                    );
                    
                    if (projectResponse.ok) {
                        const projectData = await projectResponse.json();
                        const normalizedProject = normalizeProjectData(projectData, result);
                        if (normalizedProject) {
                            setSelectedProjectData(normalizedProject);
                            setSelectedProject(normalizedProject.id.toString());
                        }
                    }
                } catch (projectError) {
                    const fallbackProject = normalizeProjectData(null, result);
                    if (fallbackProject) {
                        setSelectedProjectData(fallbackProject);
                        setSelectedProject(fallbackProject.id.toString());
                    }
                }
            }

            if (result.jobId) {
                await new Promise(resolve => setTimeout(resolve, 100));
                
                setIsLoadingJobs(true);
                try {
                    const jobResponse = await fetch(
                        `${apiUrl}/Job/GetJobById/${result.jobId}`
                    );
                    
                    if (jobResponse.ok) {
                        const jobData = await jobResponse.json();
                        const normalizedJob = normalizeJobData(jobData, result);
                        if (normalizedJob) {
                            setSelectedJobData(normalizedJob);
                            setSelectedJob(normalizedJob.id.toString());
                        }
                    }
                } catch (jobError) {
                    const fallbackJob = normalizeJobData(null, result);
                    if (fallbackJob) {
                        setSelectedJobData(fallbackJob);
                        setSelectedJob(fallbackJob.id.toString());
                    }
                }
            }

        } catch (error) {
            console.error('Error in search result selection:', error);
            setApiError(`Failed to load selection: ${error.message}`);
        } finally {
            setIsLoadingProjects(false);
            setIsLoadingJobs(false);
        }

        setSearchQuery('');
        setShowSearchResults(false);
        setSearchResults([]);
        
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        }, 500);
    }, [userworksaces, apiUrl]);

    // Handle click outside to close search results
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };

        if (showSearchResults) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showSearchResults]);

    // Save journal note
    const handleSaveJournal = async () => {
        const newErrors = {};
        if (!selectedProject) newErrors.project = "Please select a project";
        if (!selectedJob) newErrors.job = "Please select a job";
        if (!selectedDate) newErrors.date = "Please select a date";
        if (!noteContent.trim()) newErrors.note = "Note content is required";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSaving(true);
        setApiError(null);

        try {
            const user = getCurrentUser();
            const noteData = {
                note: noteContent,
                date: new Date(selectedDate).toISOString(),
                jobId: selectedJob,
                userId: user.id,
            }; 
            
            const savedNote = await addSiteNote(noteData);
            const siteNoteId = savedNote.siteNoteId; 

            if (!siteNoteId) {
                throw new Error("Failed to retrieve SiteNoteId from the saved note.");
            }

            // Upload documents
            for (const doc of documents) {
                if (doc.file) {
                    await onUploadDocument(doc.name, doc.file, siteNoteId);
                }
            }

            await handleAddPriority(siteNoteId, user.id);
            refreshNotes();
            refreshFilteredNotes()
            onClose();
        } catch (error) {
            console.error("Save error:", error);
            setApiError(error.message || "Failed to save note or upload documents");
        } finally {
            setIsSaving(false);
        }
    };

    // Keyboard shortcut for save
    const handleSaveShortcut = useCallback((event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 's' && !isSaving) {
            event.preventDefault(); 
            handleSaveJournal();
        }
    }, [isSaving, handleSaveJournal]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleSaveShortcut);
            return () => document.removeEventListener('keydown', handleSaveShortcut);
        }
    }, [isOpen, handleSaveShortcut]);

    // Document handling functions
    const handleAddDocument = () => {
        setCurrentDocumentBeingEdited(null);
        setNewDocument({ name: '', file: null });
        setErrors({});
        setShowDocumentModal(true);
    };

    const handleEditDocument = (doc) => {
        setCurrentDocumentBeingEdited(doc);
        setNewDocument({ name: doc.name, file: null });
        setErrors({});
        setShowDocumentModal(true);
    };

    const handleDeleteDocument = (indexToDelete) => {
        if (window.confirm('Are you sure you want to remove this document from the list? It will not be saved.')) {
            setDocuments(prev => prev.filter((_, i) => i !== indexToDelete));
        }
    };

    const isValidFileType = (file) => {
        return Object.keys(ALLOWED_FILE_TYPES).includes(file.type);
    };

    const handleDocumentFileChange = (e) => {
        const file = e.target.files[0];
        setError('');

        if (!isValidFileType(file)) {
            setError('Invalid file type!');
            return;
        }

        setNewDocument(prev => ({ ...prev, file }));
    };

    const handleDocumentSubmit = () => {
        const newDocErrors = {};
        if (!newDocument.name.trim()) {
            setError('Document name is required.');
            return;
        }
        if (!currentDocumentBeingEdited && !newDocument.file) {
            newDocErrors.newDocumentFile = "Please select a file to add.";
        }

        if (Object.keys(newDocErrors).length > 0) {
            setErrors(newDocErrors);
            return;
        }

        const docToStage = {
            id: currentDocumentBeingEdited?.id || `temp-${Date.now()}`,
            name: newDocument.name.trim(),
            file: newDocument.file || currentDocumentBeingEdited?.file,
            fileName: newDocument.file?.name || currentDocumentBeingEdited?.fileName || 'N/A',
        };

        if (currentDocumentBeingEdited) {
            setDocuments(prev => prev.map(doc => 
                doc.id === currentDocumentBeingEdited.id ? { ...doc, ...docToStage } : doc
            ));
        } else {
            setDocuments(prev => [...prev, docToStage]);
        }

        setShowDocumentModal(false);
        setNewDocument({ name: '', file: null });
        setCurrentDocumentBeingEdited(null);
        setErrors({});
    };

    const handleAddPriority = async (noteId, userId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Priority/AddPriority`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    noteID: noteId,
                    priorityValue: selectedPriority,
                    userId: userId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to save note");
            }
            toast.success('Note Successfully Saved');
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    };

    // Search component
    const renderSearchSection = () => (
        <div className="search-section">
            <div className="form-group full-width search-container" ref={searchInputRef}>
                <label>🔍 Quick Search</label>
                <div className="search-input-wrapper">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Type to search for workspace, project, or job..."
                        className="search-input"
                        disabled={areDropdownsDisabled}
                    />
                    {isSearching && <div className="search-spinner">🔍 Searching...</div>}
                </div>
                
                {showSearchResults && searchResults.length > 0 && (
                    <div className="search-results-dropdown">
                        <div className="search-results-header">
                            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                        </div>
                        {searchResults.map((result, index) => (
                            <div
                                key={`${result.workspaceId}-${result.projectId}-${result.jobId}-${index}`}
                                className="search-result-item"
                                onClick={() => handleSearchResultSelect(result)}
                            >
                                <div className="search-result-fullpath">
                                    {result.fullPath || `${result.workspaceName} → ${result.projectName} → ${result.jobName}`}
                                </div>
                                <div className="search-result-details">
                                    <span>Workspace: {result.workspaceName}</span>
                                    <span>Project: {result.projectName}</span>
                                    <span>Job: {result.jobName}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {showSearchResults && searchQuery && searchResults.length === 0 && !isSearching && (
                    <div className="search-results-dropdown">
                        <div className="search-no-results">
                            No results found for "<strong>{searchQuery}</strong>"
                            <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                Try searching with different keywords
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // Tab content components
    const renderJournalTab = () => {
        const projectOptions = getProjectOptions();
        const jobOptions = getJobOptions();

        return (
            <div className="journal-section">
                {renderSearchSection()}
                
                <div className="form-group">
                    <label>Workspace</label>
                    <select
                        value={selectedWorkspace}
                        onChange={(e) => setSelectedWorkspace(e.target.value)}
                        disabled={areDropdownsDisabled}
                    >
                        <option value="">Select Workspace</option>
                        {userworksaces.map(workspace => (
                            workspace && workspace.id && (
                                <option key={workspace.id} value={workspace.id.toString()}>
                                    {workspace.name}
                                </option>
                            )
                        ))}
                    </select>
                </div>
                
                <div className="form-group">
                    <label>Project {errors.project && <span className="error-message-inline">{errors.project}</span>}</label>
                    <select
                        value={selectedProject}
                        onChange={(e) => {
                            setSelectedProject(e.target.value);
                            const selectedProjectObj = projectOptions.find(p => {
                                const pId = (p.id || p.projectId)?.toString();
                                return pId === e.target.value;
                            });
                            setSelectedProjectData(selectedProjectObj || null);
                            setErrors(prev => ({ ...prev, project: undefined, job: undefined }));
                        }}
                        disabled={areDropdownsDisabled || !selectedWorkspace || isLoadingProjects}
                    >
                        <option value="">Select Project</option>
                        {isLoadingProjects ? (
                            <option value="" disabled>Loading projects...</option>
                        ) : (
                            projectOptions.map(project => {
                                const projectId = (project.id || project.projectId)?.toString();
                                const projectName = project.name || project.projectName || 'Unnamed Project';
                                
                                return projectId ? (
                                    <option key={projectId} value={projectId}>
                                        {projectName}
                                    </option>
                                ) : null;
                            })
                        )}
                    </select>
                </div>

                <div className="form-group">
                    <label>Job {errors.job && <span className="error-message-inline">{errors.job}</span>}</label>
                    <select
                        value={selectedJob}
                        onChange={(e) => {
                            setSelectedJob(e.target.value);
                            const selectedJobObj = jobOptions.find(j => {
                                const jId = (j.id || j.jobId)?.toString();
                                return jId === e.target.value;
                            });
                            setSelectedJobData(selectedJobObj || null);
                            setErrors(prev => ({ ...prev, job: undefined }));
                        }}
                        disabled={areDropdownsDisabled || !selectedProject || isLoadingJobs}
                    >
                        <option value="">Select Job</option>
                        {isLoadingJobs ? (
                            <option value="" disabled>Loading jobs...</option>
                        ) : (
                            jobOptions.map(job => {
                                const jobId = (job.id || job.jobId)?.toString();
                                const jobName = job.jobName || job.name || 'Unnamed Job';
                                
                                return jobId ? (
                                    <option key={jobId} value={jobId}>
                                        {jobName}
                                    </option>
                                ) : null;
                            })
                        )}
                    </select>
                </div>

                <div className="form-group">
                    <label>Date {errors.date && <span className="error-message-inline">{errors.date}</span>}</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setErrors(prev => ({ ...prev, date: undefined }));
                        }}
                        disabled={areDropdownsDisabled}
                    />
                </div>

                <div className="form-group">
                    <label>Note {errors.note && <span className="error-message-inline">{errors.note}</span>}</label>
                    <textarea
                        ref={textareaRef}
                        value={noteContent}
                        onChange={(e) => {
                            setNoteContent(e.target.value);
                            setErrors(prev => ({ ...prev, note: undefined }));
                        }}
                        placeholder="Write your note here..."
                        rows="6"
                    />
                </div>
            </div>
        );
    };

    const renderDocumentsTab = () => (
        <div className="documents-section">
            <h3>Attached Documents</h3>
            <div className="document-actions">
                <button className="add-button" onClick={handleAddDocument}>
                    Add Document
                </button>
            </div>

            <div className="documents-list">
                {documents.length === 0 ? (
                    <p>No documents attached</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Document Name</th>
                                <th>File Name</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((doc, index) => (
                                <tr key={doc.id || index}>
                                    <td>{doc.name}</td>
                                    <td>{doc.fileName || 'N/A'}</td>
                                    <td className="document-actions-cell">
                                        <button onClick={() => handleEditDocument(doc)} className="edit-button">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDeleteDocument(index)} className="delete-button">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );

    const renderPriorityTab = () => (
        <div className="journal-section">
            <div className="form-group">
                <label>Priority {errors.priority && <span className="error-message-inline">{errors.priority}</span>}</label>
                <select
                    value={selectedPriority}
                    onChange={(e) => {
                        setSelectedPriority(e.target.value);
                        setErrors(prev => ({ ...prev, priority: undefined }));
                    }}
                    className={`priority-select ${selectedPriority ? `priority-${selectedPriority}` : ''} ${errors.priority ? 'error' : ''}`}
                >
                    <option value="">Select Priority</option>
                    <option value="4" className="priority-option-4">High</option>
                    <option value="3" className="priority-option-3">Medium</option>
                    <option value="1" className="priority-option-1">No Priority</option>
                </select>
            </div>
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'journal': return renderJournalTab();
            case 'documents': return renderDocumentsTab();
            case 'priority': return renderPriorityTab();
            default: return renderJournalTab();
        }
    };

    return (
        <div className="edit-note-modal-overlay">
            <div className="edit-note-modal">
                <div className="modal-header">
                    <h2>New Note</h2>
                    <button className="close-button" onClick={onClose} disabled={isSaving}>
                        ×
                    </button>
                </div>

                {apiError && (
                    <div className="error-message">
                        {apiError}
                        <button onClick={() => setApiError(null)} className="dismiss-error">×</button>
                    </div>
                )}

                <div className="tabs">
                    <button 
                        className={`tab-button ${activeTab === 'journal' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('journal')}
                    >
                        Journal
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('documents')}
                    >
                        Documents ({documents.length})
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'priority' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('priority')}
                    >
                        Priority
                    </button>
                </div>

                <div className="tab-content">
                    {renderTabContent()}
                </div>

                <div className="modal-footer">
                    <button className="cancel-button" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </button>
                    <button className="save-button" onClick={handleSaveJournal} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>

                {/* Document Modal */}
                {showDocumentModal && (
                    <div className="document-modal-overlay">
                        <div className="document-modal">
                            <div className="modal-header">
                                <h3>{currentDocumentBeingEdited ? 'Edit Document' : 'Add Document'}</h3>
                                <button className="close-button" onClick={() => setShowDocumentModal(false)}>
                                    ×
                                </button>
                            </div>

                            <div className="form-group">
                                <label>Document Name:</label>
                                {errors.newDocumentName && <span className="error-message-inline">{errors.newDocumentName}</span>}
                                <input
                                    type="text"
                                    value={newDocument.name}
                                    onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>File:</label>
                                {errors.newDocumentFile && <span className="error-message-inline">{errors.newDocumentFile}</span>}
                                <input
                                    type="file"
                                    onChange={handleDocumentFileChange}
                                    required={!currentDocumentBeingEdited}
                                />
                                {currentDocumentBeingEdited?.fileName && !newDocument.file && (
                                    <p>Current file: {currentDocumentBeingEdited.fileName}</p>
                                )}
                                {newDocument.file && (
                                    <p>Selected file: {newDocument.file.name}</p>
                                )}
                                {error && (
                                    <p className="file-error">{error}</p>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button
                                    onClick={() => {
                                        setShowDocumentModal(false);
                                        setCurrentDocumentBeingEdited(null);
                                        setNewDocument({ name: '', file: null });
                                        setErrors({});
                                    }}
                                    className="cancel-button"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDocumentSubmit}
                                    className="submit-button"
                                    disabled={!newDocument.name.trim() || (!newDocument.file && !currentDocumentBeingEdited?.fileName)}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

NewNoteModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    refreshNotes: PropTypes.func.isRequired,
    addSiteNote: PropTypes.func.isRequired,
    onUploadDocument: PropTypes.func.isRequired,
    onDeleteDocument: PropTypes.func,
    projects: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            name: PropTypes.string,
            projectName: PropTypes.string,
            workspaceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        })
    ),
    jobs: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            jobId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            name: PropTypes.string,
            jobName: PropTypes.string,
            projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        })
    ),
    prefilledData: PropTypes.shape({
        project: PropTypes.string,
        job: PropTypes.string,
        workspace: PropTypes.string,
        date: PropTypes.string,
        projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        jobId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        workspaceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    }),
    defWorkSpaceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    userworksaces: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            name: PropTypes.string.isRequired,
            text: PropTypes.string
        })
    ),
    source: PropTypes.oneOf(['grid', 'dashboard'])
};

NewNoteModal.defaultProps = {
    projects: [],
    jobs: [],
    prefilledData: null,
    defWorkSpaceId: null,
    userworksaces: [],
    source: 'dashboard'
};

export default NewNoteModal;