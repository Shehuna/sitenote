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

    const textareaRef = useRef(null);
    const hasFocusedRef = useRef(false);
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

    // Get current user
    const getCurrentUser = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return user || { id: 1 }; // fallback to user ID 1 if not found
    };

    // Expose focus method to parent component
    useImperativeHandle(ref, () => ({
        focusTextarea: () => {
            if (textareaRef.current) {
                const focus = () => {
                    textareaRef.current.focus();
                    console.log('Textarea focused via parent ref');
                };
                
                // Try multiple times with delays
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
                    console.log('Textarea focused internally for grid');
                    return true;
                }
                return false;
            };

            // Try multiple times
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

    // Reset focus flag when modal closes
    useEffect(() => {
        if (!isOpen) {
            hasFocusedRef.current = false;
        }
    }, [isOpen]);

    // Fetch projects when workspace changes
    useEffect(() => {
        const fetchProjectsByWorkspace = async () => {
            if (!selectedWorkspace) {
                setFilteredProjects([]);
                setSelectedProject('');
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
                
                // Handle the API response structure
                const projectsData = data.projects || [];
                setFilteredProjects(projectsData);
                
                // Reset project selection when workspace changes
                setSelectedProject('');
                setSelectedJob('');
                setFilteredJobs([]);
                
            } catch (error) {
                console.error('Error fetching projects:', error);
                setApiError('Failed to load projects');
                setFilteredProjects([]);
            } finally {
                setIsLoadingProjects(false);
            }
        };

        fetchProjectsByWorkspace();
    }, [selectedWorkspace, apiUrl]);

    // Fetch jobs when project changes
    useEffect(() => {
        const fetchJobsByProject = async () => {
            if (!selectedProject) {
                setFilteredJobs([]);
                setSelectedJob('');
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
                
                // Handle the API response structure
                const jobsData = data.jobs || [];
                setFilteredJobs(jobsData);
                
                // Reset job selection when project changes
                setSelectedJob('');
                
            } catch (error) {
                console.error('Error fetching jobs:', error);
                setApiError('Failed to load jobs');
                setFilteredJobs([]);
            } finally {
                setIsLoadingJobs(false);
            }
        };

        fetchJobsByProject();
    }, [selectedProject, apiUrl]);

    // Initialize modal state when opened
    useEffect(() => {
        if (isOpen) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            setSelectedDate(formattedDate);
            
            setActiveTab('journal');
            setSelectedPriority('1');

            // Reset states
            setSelectedWorkspace('');
            setSelectedProject('');
            setSelectedJob('');
            setAreDropdownsDisabled(false);
            setNoteContent('');
            setDocuments([]);
            setNewDocument({ name: '', file: null });
            setShowDocumentModal(false);
            setCurrentDocumentBeingEdited(null);
            setErrors({});
            setIsSaving(false);
            setApiError(null);
            setFilteredProjects([]);
            setFilteredJobs([]);

            // Handle prefilled data
            if (prefilledData) {
                setAreDropdownsDisabled(true);
                if (prefilledData.date) {
                    setSelectedDate(prefilledData.date);
                }
            }
        }
    }, [isOpen, prefilledData]);

    // Handle prefilled data matching for workspace
    useEffect(() => {
        if (isOpen && prefilledData?.workspace) {
            const workspace = userworksaces.find(w => 
                w.name === prefilledData.workspace || w.text === prefilledData.workspace
            );
            if (workspace) {
                setSelectedWorkspace(workspace.id.toString());
            }
        }
    }, [isOpen, prefilledData, userworksaces]);

    // Handle prefilled data matching for project (after projects are loaded)
    useEffect(() => {
        if (prefilledData?.project && filteredProjects.length > 0) {
            const project = filteredProjects.find(p => 
                p.name === prefilledData.project || p.text === prefilledData.project
            );
            
            if (project) {
                setSelectedProject(project.id.toString());
            }
        }
    }, [filteredProjects, prefilledData]);

    // Handle prefilled data matching for job (after jobs are loaded)
    useEffect(() => {
        if (prefilledData?.job && filteredJobs.length > 0) {
            const job = filteredJobs.find(j => 
                j.jobName === prefilledData.job || j.name === prefilledData.job
            );
            
            if (job) {
                setSelectedJob(job.jobId.toString());
            }
        }
    }, [filteredJobs, prefilledData]);

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

    // Tab content components
    const renderJournalTab = () => (
        <div className="journal-section">
            <div className="form-row">
                <div className="form-group">
                    <label>Workspace</label>
                    <select
                        value={selectedWorkspace}
                        onChange={(e) => setSelectedWorkspace(e.target.value)}
                        disabled={areDropdownsDisabled}
                    >
                        <option value="">Select Workspace</option>
                        {userworksaces.map(workspace => (
                            <option key={workspace.id} value={workspace.id.toString()}>
                                {workspace.name}
                            </option>
                        ))}
                    </select>
                    
                </div>
                
                <div className="form-group">
                    <label>Project {errors.project && <span className="error-message-inline">{errors.project}</span>}</label>
                    <select
                        value={selectedProject}
                        onChange={(e) => {
                            setSelectedProject(e.target.value);
                            setErrors(prev => ({ ...prev, project: undefined, job: undefined }));
                        }}
                        disabled={areDropdownsDisabled || !selectedWorkspace || isLoadingProjects}
                    >
                        <option value="">Select Project</option>
                        {isLoadingProjects ? (
                            <option value="" disabled>Loading projects...</option>
                        ) : (
                            filteredProjects.map(project => (
                                <option key={project.id} value={project.id.toString()}>
                                    {project.name}
                                </option>
                            ))
                        )}
                    </select>
                    
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label>Job {errors.job && <span className="error-message-inline">{errors.job}</span>}</label>
                    <select
                        value={selectedJob}
                        onChange={(e) => {
                            setSelectedJob(e.target.value);
                            setErrors(prev => ({ ...prev, job: undefined }));
                        }}
                        disabled={areDropdownsDisabled || !selectedProject || isLoadingJobs}
                    >
                        <option value="">Select Job</option>
                        {isLoadingJobs ? (
                            <option value="" disabled>Loading jobs...</option>
                        ) : (
                            filteredJobs.map(job => (
                                <option key={job.jobId} value={job.jobId.toString()}>
                                    {job.jobName}
                                </option>
                            ))
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
                    />
                </div>
            </div>

            <div className="form-group full-width">
                <label>Note {errors.note && <span className="error-message-inline">{errors.note}</span>}</label>
                <textarea
                    ref={textareaRef}
                    value={noteContent}
                    onChange={(e) => {
                        setNoteContent(e.target.value);
                        setErrors(prev => ({ ...prev, note: undefined }));
                    }}
                    placeholder="Write your note here..."
                    rows="4"
                />
            </div>
        </div>
    );

    const renderDocumentsTab = () => (
        <div className="documents-section">
            <div className="document-actions">
                <button className="add-button" onClick={handleAddDocument}>
                    Add Document
                </button>
            </div>

            <div className="documents-list">
                {documents.length === 0 ? (
                    <p className="no-documents">No documents attached</p>
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
                                    <td>
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
                <label className="priority-label">Priority {errors.priority && <span className="error-message-inline">{errors.priority}</span>}</label>
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
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="New Note"
            className="new-note-modal"
            maxHeight="85vh"
        >
            <div className="modal-content-wrapper">
                <div className="tabs-container">
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
                </div>

                <div className="tab-content-scrollable">
                    {renderTabContent()}
                </div>

                {apiError && (
                    <div className="error-message sticky-error">
                        {apiError}
                        <button onClick={() => setApiError(null)} className="dismiss-error">×</button>
                    </div>
                )}

                <div className="modal-footer sticky-footer">
                    <button className="cancel-button" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </button>
                    <button className="save-button" onClick={handleSaveJournal} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>

            {/* Document Modal */}
            {showDocumentModal && (
                <div className="document-modal-overlay">
                    <div className="document-modal">
                        <h3>{currentDocumentBeingEdited ? 'Edit Document' : 'Add Document'}</h3>

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
        </Modal>
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
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            name: PropTypes.string.isRequired,
            workspaceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
        })
    ),
    jobs: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            name: PropTypes.string.isRequired
        })
    ),
    prefilledData: PropTypes.shape({
        project: PropTypes.string,
        job: PropTypes.string,
        workspace: PropTypes.string,
        date: PropTypes.string
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