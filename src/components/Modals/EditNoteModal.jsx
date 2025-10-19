import React, { useState, useEffect, useCallback } from 'react';
import './EditNoteModal.css';

const EditNoteModal = ({ note, onClose, refreshNotes, updateNote, uploadDocument, projects = [], jobs = [] }) => {
  
  const [isEditable, setIsEditable] = useState(true);
  const [journalData, setJournalData] = useState({
    date: '',
    userId: '',
    jobId: '',
    note: ''
  });

  const [documents, setDocuments] = useState([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    name: '',
    file: null,
    siteNoteId :'',
    userId: ''
  });

  const [activeTab, setActiveTab] = useState('journal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

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

  useEffect(() => {
    if (note) {
      const creationDate = note.timeStamp;
      //|| note.dateCreated || note.createdDate || note.date
      if (creationDate) {
        const createdAt = new Date(creationDate);
        const now = new Date();
        const hoursDiff = (now - createdAt) / (1000 * 60 * 60); 
        if(hoursDiff > 24){
           setIsEditable(false);
        }
       else{
        setIsEditable(true)
       }
      } else {
        setIsEditable(true);
      }
    }
  }, [note]);



  const getMimeType = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls': return 'application/vnd.ms-excel';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'txt': return 'text/plain';
      case 'html': return 'text/html';
      default: return 'application/octet-stream';
    }
  };

  const fetchDocumentsByReference = useCallback(async (referenceId) => {
    try {
      setIsLoadingDocuments(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Documents/GetDocumentMetadataByReference?siteNoteId=${referenceId}`, {
        headers: { "accept": "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
      }

      var docs = await response.json();
      docs = docs.documents || docs;

      setDocuments(docs.map(doc => {
        const fileType = doc.fileName?.split('.').pop();
        
        const downloadApiTriggerUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Documents/DownloadDocument/${doc.id}`;

        return {
          ...doc,
          fileType: fileType,
          fileUrl: null, 
          downloadApiTriggerUrl: downloadApiTriggerUrl
        };
      }));

    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to load documents: " + error.message);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []); 

  const findProjectIdByName = (projectName) => {
    const project = projects.find(p => p.name === projectName);
    return project ? project.id.toString() : '';
  };

  const findJobIdByName = (jobName, projectId) => {
    const job = jobs.find(j => 
      j.name === jobName && 
      j.projectId?.toString() === projectId.toString()
    );
    return job ? job.id.toString() : '';
  };

  useEffect(() => {
    if (note) {
      const projectId = note.projectId 
        ? note.projectId.toString() 
        : findProjectIdByName(note.project || '');
      
      const jobId = note.jobId 
        ? note.jobId.toString() 
        : findJobIdByName(note.job || '', projectId);
        let correctedDate = '';
      if (note.date) {
        const dateObj = new Date(note.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        correctedDate = `${year}-${month}-${day}`;
      }

      setJournalData({
        date: correctedDate,
        projectId: projectId || '',
        jobId: jobId || '',
        note: note.note || ''
      });

      if (note.id) {
        fetchDocumentsByReference(note.id); 
      }
    }
  }, [note, fetchDocumentsByReference, projects, jobs]); 

  const handleJournalChange = (e) => {
    if (!isEditable) return;
    
    const { name, value } = e.target;
    setJournalData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDocument = () => {
    if (!isEditable) return;
    
    setNewDocument({ name: '', file: null, siteNoteId: '', userId: '' });
    setShowDocumentModal(true);
    setError(null);
  };

  const handleDocumentFileChange = (e) => {
    if (!isEditable) return;
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

  const handleDocumentSubmit = async () => {
    if (!isEditable) {
      setError('Cannot add documents to notes older than 24 hours');
      return;
    }
    
    setError(null);

    if (!newDocument.name.trim()) {
      setError('Document name is required.');
      return;
    }

    if (!newDocument.file) {
      setError('Please select a file to upload.');
      return;
    }

    try {
      setIsSubmitting(true);

      const savedDoc = await uploadDocument(
        
          newDocument.name,
          newDocument.file,
          note.id
        

        /* note.id, 
        null, 
        
        {
          name: newDocument.name,
          file: newDocument.file 
        } */
      );

      const newDocWithDownloadUrl = {
        ...savedDoc,
        fileType: getMimeType(savedDoc.fileName).split('/')[1], 
        fileUrl: null, 
        downloadApiTriggerUrl: `${process.env.REACT_APP_API_BASE_URL}/api/Documents/DownloadDocument/${savedDoc.id}`
      };
      setDocuments(docs => [...docs, newDocWithDownloadUrl]);

      setShowDocumentModal(false);
      setNewDocument({ name: '', file: null });
    } catch (err) {
      console.error('Error saving document:', err);
      setError(err.message || 'Failed to save document');
    } finally {
      setIsSubmitting(false);
    }
  };

 const handleDownloadDocument = async (documentToDownload) => {
  try {
    setError(null); 
    setIsSubmitting(true); 

    const response = await fetch(documentToDownload.downloadApiTriggerUrl);

    if (!response.ok) {
      throw new Error(`Failed to retrieve document: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob(); // read as binary
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = documentToDownload.fileName; // sets the filename
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error downloading document:', error);
    alert('Could not download document: ' + error.message);
    setError('Error downloading document: ' + error.message);
  } finally {
    setIsSubmitting(false);
  }
};


  const handleSaveNote = async () => {
    console.log()
    if (!isEditable) {
      setError('Cannot edit notes older than 24 hours');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
  
    try {
      const originalProjectId = note.projectId ? note.projectId.toString() : findProjectIdByName(note.project || '');
      const originalJobId = note.jobId ? note.jobId.toString() : findJobIdByName(note.job || '', originalProjectId);
      
      if (journalData.projectId !== originalProjectId || journalData.jobId !== originalJobId) {
        setError('Cannot update project or job information. Only the note content and date can be updated.');
        setIsSubmitting(false);
        return;
      }
  
      const result = await updateNote(note.id, {
        Date: new Date(journalData.date).toISOString(), 
        Note: journalData.note,
        JobId: journalData.jobId,
        UserId: journalData.userId
        //UserId: journalData.userId
      });
  
      if (result && (result.success || result.id || result.message)) {
        onClose();
        refreshNotes();
      } else {
        throw new Error('Failed to save note: No success confirmation from server');
      }
    } catch (err) {
      console.error('Error saving note:', err);
      setError(err.message || 'Failed to save note. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!note) return null;

  return (
    <div className="edit-note-modal-overlay">
      <div className="edit-note-modal">
        <div className="modal-header">
          <h2>Edit Note {!isEditable && <span className="read-only-badge">(Read Only)</span>}</h2>
          <button className="close-button" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        {!isEditable && (
          <div className="edit-warning">
            This note is older than 24 hours and can no longer be edited.
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
            Documents {documents.length > 0 && `(${documents.length})`}
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'journal' ? (
            <div className="journal-section">
              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  name="date"
                  value={journalData.date}
                  onChange={handleJournalChange}
                  required
                  disabled={!isEditable || isSubmitting}
                />
              </div>

              <div className="form-group">
                <label>Project:</label>
                <select
                  name="projectId"
                  value={journalData.projectId}
                  onChange={handleJournalChange}
                  required
                  disabled={!isEditable || isSubmitting}
                >
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Job:</label>
                <select
                  name="jobId"
                  value={journalData.jobId}
                  onChange={handleJournalChange}
                  required
                  disabled={!isEditable || !journalData.projectId || isSubmitting}
                >
                  <option value="">Select Job</option>
                  {jobs
                    .filter(job => job.projectId?.toString() === journalData.projectId)
                    .map(job => (
                      <option key={job.id} value={job.id}>
                        {job.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Notes:</label>
                <textarea
                  name="note"
                  value={journalData.note}
                  onChange={handleJournalChange}
                  rows={6}
                  required
                  disabled={!isEditable || isSubmitting}
                />
              </div>
            </div>
          ) : (
            <div className="documents-section">
              <h3>Attached Documents</h3>
              {error && <p className="error-message">{error}</p>}
              {isLoadingDocuments ? (
                <p>Loading documents...</p>
              ) : (
                <>
                  {isEditable && (
                    <div className="document-actions">
                      <button onClick={handleAddDocument} className="add-button" disabled={isSubmitting}>
                        Add Document
                      </button>
                    </div>
                  )}

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
                          {documents.map(doc => (
                            <tr key={doc.id}>
                              <td>{doc.name}</td>
                              <td>{doc.fileName || 'N/A'}</td>
                              <td className="document-actions-cell">
                                <button
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="download-button"
                                  disabled={isSubmitting}
                                >
                                  Download
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            className="cancel-button"
            disabled={isSubmitting}
          >
            {isEditable ? 'Cancel' : 'Close'}
          </button>
          {isEditable && (
            <button
              onClick={handleSaveNote}
              className="save-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>

        {showDocumentModal && (
          <div className="document-modal-overlay">
            <div className="document-modal">
              <h3>Add Document</h3> 
              {error && <p className="error-message">{error}</p>}
              <div className="form-group">
                <label>Document Name:</label>
                <input
                  type="text"
                  value={newDocument.name}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={isSubmitting || !isEditable}
                />
              </div>

              <div className="form-group">
                <label>File:</label>
                <input
                  type="file"
                  onChange={handleDocumentFileChange}
                  required 
                  disabled={isSubmitting || !isEditable}
                />
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="cancel-button"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDocumentSubmit}
                  className="submit-button"
                  disabled={isSubmitting || !newDocument.name.trim() || !newDocument.file || !isEditable}
                >
                  {isSubmitting ? 'Saving...' : 'Save Document'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditNoteModal;