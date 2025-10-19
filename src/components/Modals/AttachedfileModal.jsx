import React, { useState, useEffect, useCallback, use, useRef } from 'react';
import './AttachedFileModal.css'; 

const AttachedFileModal = ({
  note, 
  onClose,
  refreshNotes, 
  updateNote,   
  uploadDocument,
  projects = [],
  jobs = [],
}) => {
  const [journalData, setJournalData] = useState({
    date: '',
    projectId: '',
    jobId: '',
    note: ''
  });

  const [documents, setDocuments] = useState([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    name: '',
    file: null
  });

  const [activeTab, setActiveTab] = useState('documents'); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const fileInputRef = useRef(null);

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

  const getFileExtension = (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  };
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
      docs = Array.isArray(docs.documents) ? docs.documents : [];

      setDocuments(docs.map(doc => {
        const downloadApiTriggerUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Documents/DownloadDocument/${doc.id}`;

        return {
          ...doc,
          fileType: doc.fileName?.split('.').pop(),
          fileUrl: null, 
          downloadApiTriggerUrl: downloadApiTriggerUrl,
           download: async () => {
      try {
        const response = await fetch(downloadApiTriggerUrl, { method: 'GET' });
        if (!response.ok) throw new Error('Failed to download file');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download error:', error);
      }
    }
        };
      }));

    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to load documents: " + error.message);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    if (note) {
      setJournalData({
        date: note.date ? new Date(note.date).toISOString().split('T')[0] : '',
        projectId: note.projectId?.toString() || '',
        jobId: note.jobId?.toString() || '',
        note: note.note || ''
      });

      
      if (note.id) {
        fetchDocumentsByReference(note.id);
      }
    }
  }, [note, fetchDocumentsByReference]);

  const handleJournalChange = (e) => {
    const { name, value } = e.target;
    setJournalData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDocument = () => {
    setNewDocument({ name: '', file: null });
    setShowDocumentModal(true);
    setError(null);
  };

  const handleDocumentFileChange = (e) => {
    const file = e.target.files[0];
    setError('');

    if (!isValidFileType(file)) {
      setError(`Invalid file type. Allowed types: ${Object.values(allowedFileTypes).flat().join(', ')}`);
      setSelectedFile(null);
      return;
    }

    if (!isValidFileSize(file)) {
      setError(`File size too large. Maximum size is 5MB.`);
      setSelectedFile(null);
      return;
    }

    setNewDocument(prev => ({ ...prev, file }));

  };

const handleDocumentSubmit = async () => {
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
      const siteNoteId = note.id; 
      if (!siteNoteId) {
        throw new Error("Cannot upload document: Note ID is missing.");
      }

      var user = JSON.parse(localStorage.getItem('user'));
      var userId = user ? user.id  : 1;
      console.log("Uploading document for userId:", userId);

      // ✅ Call your existing uploadDocument function
      const savedDoc = await uploadDocument(newDocument.name, newDocument.file, siteNoteId, userId);

      // ✅ Build consistent object with download URL
      const newDocWithDownloadUrl = {
        ...savedDoc,
        fileType: getMimeType(savedDoc.fileName).split('/')[1],
        fileUrl: null,
        downloadApiTriggerUrl: `${process.env.REACT_APP_API_BASE_URL}/api/Documents/DownloadDocument/${savedDoc.id}`
      };

      // ✅ Add uploaded doc to state
      setDocuments(docs => [...docs, newDocWithDownloadUrl]);
  
      // ✅ Reset modal state
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
  console.log(documentToDownload)
  try {
    setError(null); 
    setIsSubmitting(true); 

    const response = await fetch(documentToDownload.downloadApiTriggerUrl);

    if (!response.ok) {
      throw new Error(`Failed to retrieve document: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = documentToDownload.fileName || 'download';
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
    setIsSubmitting(true);
    setError(null);

    try {
      await updateNote(note.id, {
        Date: journalData.date,
        ProjectId: journalData.projectId,
        JobId: journalData.jobId,
        Note: journalData.note
      });

      
      await refreshNotes();
      onClose(); 
    } catch (err) {
      console.error('Error saving note:', err);
      setError(err.message || 'Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!note) return null; 

  return (
    <div className="afm-overlay">
      <div className="afm-container">
        <div className="afm-header">
          <h2>Attachments</h2>
          <button className="afm-close" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>
  
        {error && (
          <div className="afm-error">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
  
        <div className="afm-tabs">
          <button
            className={`afm-tab ${activeTab === 'journal' ? 'active' : ''}`}
            onClick={() => setActiveTab('journal')}
          >
            Journal
          </button>
          <button
            className={`afm-tab ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            Documents ({documents.length})
          </button>
        </div>
  
        <div className="afm-content">
          {activeTab === 'journal' ? (
            <div className="afm-journal">
              <div className="afm-field">
                <label>Date:</label>
                <input
                  type="date"
                  name="date"
                  value={journalData.date}
                  onChange={handleJournalChange}
                  required
                />
              </div>
  
              <div className="afm-field">
                <label>Project:</label>
                <select
                  name="projectId"
                  value={journalData.projectId}
                  onChange={handleJournalChange}
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
  
              <div className="afm-field">
                <label>Job:</label>
                <select
                  name="jobId"
                  value={journalData.jobId}
                  onChange={handleJournalChange}
                  required
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
  
              <div className="afm-field">
                <label>Notes:</label>
                <textarea
                  name="note"
                  value={journalData.note}
                  onChange={handleJournalChange}
                  rows={6}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="afm-documents">
              {isLoadingDocuments ? (
                <p>Loading documents...</p>
              ) : (
                <>
                  <div className="document-actions">
                    <button onClick={() => setShowDocumentModal(true)} className="afm-add-doc">
                      Add Document
                    </button>
                  </div>
  
                  <div className="afm-doc-list">
                    {documents.length === 0 ? (
                      <p className="afm-empty">No documents attached</p>
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
                              <td className="afm-doc-actions-cell">
                                <button
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="afm-download-btn"
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
  
        <div className="afm-footer">
          <button
            onClick={onClose}
            className="afm-cancel-btn"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveNote}
            className="afm-save-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
  
       
        {showDocumentModal && (
        <div className="afm-overlay">
          <div className="afm-container">
            <div className="afm-header">
              <h3>Add Document</h3>
              <button 
                className="afm-close" 
                onClick={() => setShowDocumentModal(false)}
                disabled={isSubmitting}
              >
                &times;
              </button>
            </div>
            
            {error && (
              <div className="afm-error">
                <span>{error}</span>
                <button onClick={() => setError('')}>&times;</button>
              </div>
            )}

            <div className="afm-content">
              <div className="afm-field">
                <label>Document Name:</label>
                <input
                  type="text"
                  value={newDocument.name}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="afm-field">
                <label>File:</label>
                <input
                  type="file"
                  onChange={handleDocumentFileChange}
                  required
                />
              </div>
            </div>

            <div className="afm-footer">
              <button
                onClick={() => setShowDocumentModal(false)}
                className="afm-cancel-button"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleDocumentSubmit}
                className="afm-save-button"
                disabled={isSubmitting || !newDocument.name.trim() || !newDocument.file || error}
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

export default AttachedFileModal;