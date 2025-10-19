import React, { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import './NewNoteModal.css';

const NewNoteModal = ({
    isOpen,
    onClose,
    projects =[],
    jobs = [],
    refreshNotes,
    addSiteNote,
    onUploadDocument,
    prefilledData = null,
    defWorkSpaceId
    
}) => {
    const [activeTab, setActiveTab] = useState('journal');
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedJob, setSelectedJob] = useState('');
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [documents, setDocuments] = useState([]);
    const [newDocument, setNewDocument] = useState({ name: '', file: null });
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [currentDocumentBeingEdited, setCurrentDocumentBeingEdited] = useState(null);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    
    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState(null);
    console.log(projects)

      const allowedFileTypes = {
    // Images
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg'],
    
    // Documents
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'text/plain': ['.txt'],
    
    // Audio
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'audio/aac': ['.aac'],
    
    // Video
    'video/mp4': ['.mp4'],
    'video/mpeg': ['.mpeg'],
    'video/ogg': ['.ogv'],
    'video/webm': ['.webm'],
    'video/quicktime': ['.mov'],
    'video/x-msvideo': ['.avi']
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const isValidFileType = (file) => {
    return Object.keys(allowedFileTypes).includes(file.type);
  };
  const isValidFileSize = (file) => {
    return file.size <= MAX_FILE_SIZE;
  };

   
      // Get filtered projects based on workspace


    useEffect(() => {
        if (selectedProject) {
            const filtered = jobs.filter(job =>
                job.projectId?.toString() === selectedProject.toString()
            );
            setFilteredJobs(filtered);
            if (!filtered.some(job => job.id.toString() === selectedJob.toString())) {
                setSelectedJob('');
            }
        } else {
            setFilteredJobs([]);
            setSelectedJob('');
        }
    }, [selectedProject, jobs, selectedJob]);

    useEffect(() => {
        if (isOpen) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            setSelectedDate(formattedDate);
            
            setActiveTab('journal');
            
            if (prefilledData) {
                const project = projects.find(p => p.name === prefilledData.project);
                if (project) {
                    setSelectedProject(project.id.toString());
                }
                
                if (prefilledData.job) {
                }
            } else {
                setSelectedProject('');
                setSelectedJob('');
            }
            
            setNoteContent('');
            setDocuments([]);
            setNewDocument({ name: '', file: null });
            setShowDocumentModal(false);
            setCurrentDocumentBeingEdited(null);
            setErrors({});
            setIsSaving(false);
            setApiError(null);
        }
    }, [isOpen, prefilledData, projects, defWorkSpaceId]);

    useEffect(() => {
        if (prefilledData && prefilledData.job && selectedProject) {
            const job = jobs.find(j => 
                j.name === prefilledData.job && 
                j.projectId?.toString() === selectedProject.toString()
            );
            if (job) {
                setSelectedJob(job.id.toString());
            }
        }
    }, [selectedProject, prefilledData, jobs]);

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
            const user = JSON.parse(localStorage.getItem('user'));
            /* 
            
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/SiteNote/AddSiteNote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    note: noteContent,
                    date: new Date(selectedDate).toISOString(),
                    jobId: selectedJob,
                    userId: user.id,
                })
            }); */
            const noteData = {
                note: noteContent,
                date: new Date(selectedDate).toISOString(),
                jobId: selectedJob,
                userId: user.id,
            }; 
            /* if(response.ok){
                const siteNoteId = response.siteNoteId;
            } */
            const savedNote = await addSiteNote(noteData);
            const siteNoteId = savedNote.siteNoteId; 

            if (!siteNoteId) {
                throw new Error("Failed to retrieve SiteNoteId from the saved note.");
            } 
            //const siteNoteId = response.siteNoteId
            console.log(siteNoteId)
            console.log("Journal note saved successfully. SiteNoteId:", siteNoteId);

            for (const doc of documents) {
                if (doc.file) {
                    console.log(`Uploading staged document: ${doc.name} (${doc.file.name})`);
                    
                    const uploadResult = await onUploadDocument(doc.name, doc.file, siteNoteId);
                    
                    if (uploadResult.success) {
                        console.log(`Document "${doc.name}" uploaded successfully.`);
                    } else {
                        console.error(`Failed to upload document "${doc.name}":`, uploadResult.error);
                    }
                }
            }

            console.log("All documents processed.");

            onClose();
            refreshNotes();
        } catch (error) {
            console.error("Save error:", error);
            setApiError(error.message || "Failed to save note or upload documents");
        } finally {
            setIsSaving(false);
        }
    };

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
            const updatedDocuments = documents.filter((_, i) => i !== indexToDelete);
            setDocuments(updatedDocuments);
        }
    };

    const handleDocumentFileChange = (e) => {
        const file = e.target.files[0];
    setError('');

    if (!isValidFileType(file)) {
      setError('Invalid file type! ');
      setSelectedFile(null);
      return;
    }

    if (!isValidFileSize(file)) {
      setError(`File size too large. Maximum allowed size is 5MB.`);
      setSelectedFile(null);
      return;
    }
        setNewDocument(prev => ({ ...prev, file: e.target.files[0] }));
    };

    const handleDocumentSubmit = () => {
        const newDocErrors = {};
        if (!newDocument.name.trim()) {
            newDocErrors.newDocumentName = "Document name is required.";
        }
        if (!currentDocumentBeingEdited && !newDocument.file) {
            newDocErrors.newDocumentFile = "Please select a file to add.";
        }
        if (currentDocumentBeingEdited && !currentDocumentBeingEdited.file && !newDocument.file) {
            newDocErrors.newDocumentFile = "Please select a file or retain the existing one.";
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
            setDocuments(prevDocs =>
                prevDocs.map(doc =>
                    doc.id === currentDocumentBeingEdited.id
                        ? { ...doc, ...docToStage }
                        : doc
                )
            );
        } else {
            setDocuments(prevDocs => [...prevDocs, docToStage]);
        }

        setShowDocumentModal(false);
        setNewDocument({ name: '', file: null });
        setCurrentDocumentBeingEdited(null);
        setErrors({});
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Note">
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
            </div>

            <div className="tab-content">
                {activeTab === 'journal' ? (
                    <div className="journal-section">
                        <div className="form-group">
                            <label>Project</label>
                            {errors.project && <span className="error-message-inline">{errors.project}</span>}
                            <select
                                value={selectedProject}
                                onChange={(e) => {
                                    setSelectedProject(e.target.value);
                                    setErrors(prev => ({ ...prev, project: undefined, job: undefined }));
                                }}
                            >
                                <option value="">
                                    {projects.length === 0 ? "No projects available" : "Select Project"}
                                </option>
                                {projects.filter(project => (project.status === 1 && project.workspaceId == defWorkSpaceId)).map(project => (
                                    <option key={project.id} value={project.id.toString()}>
                                        {project.name} (ID: {project.id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Job</label>
                            {errors.job && <span className="error-message-inline">{errors.job}</span>}
                            <select
                                value={selectedJob}
                                onChange={(e) => {
                                    setSelectedJob(e.target.value);
                                    setErrors(prev => ({ ...prev, job: undefined }));
                                }}
                                disabled={!selectedProject}
                            >
                                <option value="">Select Job</option>
                                {filteredJobs && filteredJobs.map(job => (
                                    <option key={job.id} value={job.id.toString()}>
                                        {job.name} (ID: {job.id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Date</label>
                            {errors.date && <span className="error-message-inline">{errors.date}</span>}
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    setErrors(prev => ({ ...prev, date: undefined }));
                                }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Note</label>
                            {errors.note && <span className="error-message-inline">{errors.note}</span>}
                            <textarea
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
                ) : (
                    <div className="documents-section">
                        <div className="document-actions">
                            <button
                                className="add-button"
                                onClick={handleAddDocument}
                            >
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
                                                <td>
                                                    <button
                                                        onClick={() => handleEditDocument(doc)}
                                                        className="edit-button"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDocument(index)}
                                                        className="delete-button"
                                                    >
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
                )}
            </div>

            {apiError && (
                <div className="error-message">
                    {apiError}
                    <button onClick={() => setApiError(null)} className="dismiss-error">X</button>
                </div>
            )}

            <div className="modal-footer">
                <button className="cancel-button" onClick={onClose} disabled={isSaving}>
                    Cancel
                </button>

                <button
                    className="save-button"
                    onClick={handleSaveJournal}
                    disabled={isSaving}
                >
                    {isSaving ? "Saving..." : "Save"}
                </button>
            </div>

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
                                <p style={{color: 'red'}}>{error}</p>
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
};

NewNoteModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    refreshNotes: PropTypes.func.isRequired,
    addSiteNote: PropTypes.func.isRequired,
    onUploadDocument: PropTypes.func.isRequired,
    onDeleteDocument: PropTypes.func.isRequired,
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
        job: PropTypes.string
    }),
    defWorkSpaceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

NewNoteModal.defaultProps = {
    projects: [],
    jobs: [],
    prefilledData: null,
    defWorkSpaceId: null
};

export default NewNoteModal;