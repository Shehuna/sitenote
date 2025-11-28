import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AttachedFileModal.css';
import * as signalR from "@microsoft/signalr";

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
    file: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // NEW: Upload progress
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const connectionRef = useRef(null);

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

  // SignalR for live progress
  useEffect(() => {
    if (showDocumentModal && !connectionRef.current) {
      const connect = async () => {
        try {
          const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${process.env.REACT_APP_API_BASE_URL}/hubs/uploadprogress`)
            .withAutomaticReconnect()
            .build();

          connection.on("ReceiveProgress", (percent) => {
            setUploadProgress(Math.round(percent));
          });

          await connection.start();
          connectionRef.current = connection;
        } catch (err) {
          console.warn("SignalR not available", err);
        }
      };
      connect();
    }

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
      }
    };
  }, [showDocumentModal]);

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
      setJournalData({
        date: note.date ? new Date(note.date).toISOString().split('T')[0] : '',
        projectId: note.projectId?.toString() || '',
        jobId: note.jobId?.toString() || '',
        note: note.note || ''
      });
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

    setNewDocument(prev => ({ ...prev, file }));
  };

  // FULLY UPGRADED UPLOAD WITH PROGRESS
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
    setUploadProgress(0);

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const formData = new FormData();
      formData.append("Name", newDocument.name.trim());
      formData.append("File", newDocument.file);
      formData.append("SiteNoteId", note.id);
      formData.append("UserId", user?.id || 1);

      const headers = {};
      if (connectionRef.current?.connectionId) {
        headers["X-Connection-Id"] = connectionRef.current.connectionId;
      }

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Documents/AddDocument`, {
        method: "POST",
        body: formData,
        headers
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

      // Auto-close with nice delay
      setTimeout(() => {
        setShowDocumentModal(false);
        setNewDocument({ name: '', file: null });
        setIsUploading(false);
        setUploadProgress(0);
      }, 600);

    } catch (err) {
      setError(err.message || 'Upload failed');
      setIsUploading(false);
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(doc.downloadApiTriggerUrl);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || 'download';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!note) return null;

  return (
    <div className="afm-overlay">
      <div className="afm-container">
        <div className="afm-header">
          <h2>Attachments ({documents.length})</h2>
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

        <div className="afm-content">
          {isLoadingDocuments ? (
            <p>Loading documents...</p>
          ) : (
            <>
              <div className="document-actions">
                <button onClick={() => setShowDocumentModal(true)} className="afm-add-doc" disabled={isSubmitting}>
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
                            <button onClick={() => handleDownloadDocument(doc)} className="afm-download-btn" disabled={isSubmitting}>
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
          <button onClick={onClose} className="afm-cancel-btn" disabled={isSubmitting}>
            Close
          </button>
        </div>

        {/* FULLY UPGRADED ADD DOCUMENT MODAL */}
        {showDocumentModal && (
          <div className="afm-overlay">
            <div className="afm-container" style={{ maxWidth: '560px' }}>

              {/* GREEN PROGRESS BAR */}
              {isUploading && (
                <div style={{
                  height: '6px',
                  background: '#e0e0e0',
                  borderRadius: '8px 8px 0 0',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${uploadProgress}%`,
                    background: '#4caf50',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              )}

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

                  {/* GREEN SELECTED FILE DISPLAY */}
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

                {/* UPLOADING STATUS */}
                {isUploading && (
                  <div style={{
                    textAlign: 'center',
                    margin: '20px 0',
                    color: '#4caf50',
                    fontWeight: '600',
                    fontSize: '16px'
                  }}>
                    Uploading... {uploadProgress}%
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
                  {isUploading ? `Uploading ${uploadProgress}%` : 'Save Document'}
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