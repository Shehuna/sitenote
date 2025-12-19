import React, { useState, useEffect, useCallback } from 'react';
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
  const [documents, setDocuments] = useState([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    name: '',
    file: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  const [isUploading, setIsUploading] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);
  const [currentDownloadingFileName, setCurrentDownloadingFileName] = useState('');

  const allowedFileTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'text/plain': ['.txt'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'audio/aac': ['.aac'],
    'video/mp4': ['.mp4'],
    'video/mpeg': ['.mpeg'],
    'video/ogg': ['.ogv'],
    'video/webm': ['.webm'],
    'video/quicktime': ['.mov'],
    'video/x-msvideo': ['.avi']
  };

  const isValidFileType = (file) => Object.keys(allowedFileTypes).includes(file.type);

  const fetchDocumentsByReference = useCallback(async (referenceId) => {
    try {
      setIsLoadingDocuments(true);
      setError(null);

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/Documents/GetDocumentMetadataByReference?siteNoteId=${referenceId}`,
        { headers: { accept: "application/json" } }
      );

      if (!response.ok) throw new Error("Failed to load documents");

      const data = await response.json();
      const docs = Array.isArray(data.documents) ? data.documents : [];

      setDocuments(docs.map(doc => ({
        ...doc,
        downloadApiTriggerUrl: `${process.env.REACT_APP_API_BASE_URL}/api/Documents/DownloadDocument/${doc.id}`
      })));

    } catch (err) {
      setError("Failed to load documents");
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    if (note && note.id) {
      fetchDocumentsByReference(note.id);
    }
  }, [note, fetchDocumentsByReference]);

  const handleDocumentFileChange = (e) => {
    const file = e.target.files[0];
    setError('');
    if (!file) return;

    if (!isValidFileType(file)) {
      setError('Invalid file type.');
      return;
    }
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");

    setNewDocument(prev => ({ ...prev, file, name: !prev.name.trim() ? fileNameWithoutExt : prev.name }));
  };

  const handleDocumentSubmit = async () => {
    if (!newDocument.name.trim()) {
      setError('Document name is required.');
      return;
    }
    if (!newDocument.file) {
      setError('Please select a file.');
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const formData = new FormData();
      formData.append("Name", newDocument.name.trim());
      formData.append("File", newDocument.file);
      formData.append("SiteNoteId", note.id.toString());
      formData.append("UserId", user?.id?.toString() || "1");

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Documents/AddDocument`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.errors?.Name?.[0] || "Upload failed");
      }

      const result = await response.json();
      const savedDoc = result.document || result;

      const newDocEntry = {
        ...savedDoc,
        name: newDocument.name.trim(),
        fileName: newDocument.file.name,
        downloadApiTriggerUrl: `${process.env.REACT_APP_API_BASE_URL}/api/Documents/DownloadDocument/${savedDoc.id}`
      };

      setDocuments(prev => [...prev, newDocEntry]);

      setShowDocumentModal(false);
      setNewDocument({ name: '', file: null });
      setIsUploading(false);

    } catch (err) {
      setError(err.message || 'Upload failed');
      setIsUploading(false);
    }
  };

  const handleDownloadDocument = (doc) => {
    setError('');
    setIsSubmitting(true);
    setIsDownloading(true);
    setCurrentDownloadingFileName(doc.fileName || 'file');

    const a = document.createElement('a');
    a.href = doc.downloadApiTriggerUrl;
    a.download = doc.fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setIsDownloading(false);
      setIsSubmitting(false);
    }, 1000); // Hide spinner after 1 second, adjust as needed
  };

  if (!note) return null;

  return (
    <div className="afm-overlay">
      <div className="afm-container">
        <div className="afm-header">
          <h2>Attachments ({documents.length})</h2>
          <button className="afm-close" onClick={onClose} disabled={isSubmitting || isDownloading || isUploading}>
            &times;
          </button>
        </div>

        {error && (
          <div className="afm-error">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <div className="afm-content">
          {isLoadingDocuments ? (
            <p>Loading documents...</p>
          ) : (
            <>
              <div className="document-actions">
                <button onClick={() => setShowDocumentModal(true)} className="afm-add-doc" disabled={isSubmitting || isDownloading}>
                  Add Document
                </button>
              </div>

              {isDownloading && (
                <div style={{
                  margin: '16px 0',
                  padding: '16px',
                  background: '#e8f5e8',
                  border: '1px solid #4caf50',
                  borderRadius: '8px',
                  color: '#2e7d32',
                  textAlign: 'center'
                }}>
                  <div className="spinner"></div>
                  <p style={{ fontWeight: '600', marginBottom: '8px' }}>
                    Downloading {currentDownloadingFileName}...
                  </p>
                </div>
              )}

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
                              disabled={isSubmitting || isDownloading}
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

        <div className="afm-footer">
          <button onClick={onClose} className="afm-cancel-btn" disabled={isSubmitting || isDownloading || isUploading}>
            Close
          </button>
        </div>

        {showDocumentModal && (
          <div className="afm-overlay">
            <div className="afm-container" style={{ maxWidth: '560px' }}>

              <div className="afm-header">
                <h3>Add Document</h3>
                <button className="afm-close" onClick={() => setShowDocumentModal(false)} disabled={isUploading}>
                  &times;
                </button>
              </div>

              {error && (
                <div className="afm-error">
                  <span>{error}</span>
                  <button onClick={() => setError('')}>×</button>
                </div>
              )}

              <div className="afm-content">
                <div className="afm-field">
                  <label>Document Name:</label>
                  <input
                    type="text"
                    value={newDocument.name}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Site Photos March 2025"
                    disabled={isUploading}
                  />
                </div>

                <div className="afm-field">
                  <label>File:</label>
                  <input
                    type="file"
                    onChange={handleDocumentFileChange}
                    disabled={isUploading}
                  />

                  {newDocument.file && (
                    <div style={{
                      marginTop: '12px',
                      padding: '14px 16px',
                      background: '#e8f5e8',
                      border: '1px solid #4caf50',
                      borderRadius: '8px',
                      color: '#2e7d32',
                      fontWeight: '500'
                    }}>
                      Selected: <strong>{newDocument.file.name}</strong>
                      <span style={{ marginLeft: '10px', opacity: 0.8 }}>
                        ({(newDocument.file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                  )}
                </div>

                {isUploading && (
                  <div style={{
                    textAlign: 'center',
                    margin: '20px 0',
                    color: '#4caf50',
                    fontWeight: '600',
                    fontSize: '16px'
                  }}>
                    <div className="spinner"></div>
                    Uploading...
                  </div>
                )}
              </div>

              <div className="afm-footer">
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="afm-cancel-button"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDocumentSubmit}
                  className="afm-save-button"
                  disabled={isUploading || !newDocument.name.trim() || !newDocument.file}
                  style={{ backgroundColor: isUploading ? '#4caf50' : '' }}
                >
                  {isUploading ? `Uploading...` : 'Save Document'}
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