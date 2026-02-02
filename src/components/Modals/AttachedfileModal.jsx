import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [pasteIndicator, setPasteIndicator] = useState(false);

  const dragDropAreaRef = useRef(null);

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

  const isValidFileType = (file) => {
    return Object.keys(allowedFileTypes).includes(file.type);
  };

  const handlePaste = useCallback((e) => {
    if (!showDocumentModal) return;
    
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;

    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          setPasteIndicator(true);
          setTimeout(() => setPasteIndicator(false), 1500);
          
          handleDocumentFileChange(file);
          e.preventDefault();
          break;
        }
      }
    }
  }, [showDocumentModal]);

  const handleDocumentFileChange = (file) => {
    setError('');
    if (!file) return;

    if (!isValidFileType(file)) {
      setError(`Invalid file type: ${file.type}. Please upload a supported file type.`);
      return;
    }
    
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    
    const defaultName = !newDocument.name.trim() 
      ? `${fileNameWithoutExt} - ${new Date().toLocaleDateString()}`
      : newDocument.name;
    
    setNewDocument(prev => ({ 
      ...prev, 
      file, 
      name: defaultName
    }));
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleDocumentFileChange(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleDocumentFileChange(file);
    }
  };

  useEffect(() => {
    if (showDocumentModal) {
      document.addEventListener('paste', handlePaste);
      if (dragDropAreaRef.current) {
        dragDropAreaRef.current.focus();
      }
    }
    
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [showDocumentModal, handlePaste]);

  useEffect(() => {
    if (showDocumentModal && dragDropAreaRef.current) {
      setTimeout(() => {
        dragDropAreaRef.current?.focus();
      }, 100);
    }
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
      fetchDocumentsByReference(note.id);
    }
  }, [note, fetchDocumentsByReference]);

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
    }, 1000);
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
              <div className="downloading-indicator">
                <div className="spinner"></div>
                <p>Downloading {currentDownloadingFileName}...</p>
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
                <button className="afm-close" onClick={() => {
                  setShowDocumentModal(false);
                  setNewDocument({ name: '', file: null });
                  setPasteIndicator(false);
                }} disabled={isUploading}>
                  &times;
                </button>
              </div>

              {error && (
                <div className="afm-error">
                  <span>{error}</span>
                  <button onClick={() => setError('')}>×</button>
                </div>
              )}

              {pasteIndicator && (
              <div className="paste-indicator">
                File pasted from clipboard!
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
                
                <div 
                  ref={dragDropAreaRef}
                  className={`drag-drop-area ${isDragOver ? 'drag-over' : ''} ${pasteIndicator ? 'paste-success' : ''} ${isUploading ? 'uploading' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  tabIndex={0} 
                  onClick={() => !isUploading && document.getElementById('fileInput')?.click()}
                >
                  {/* Upload spinner overlay */}
                  {isUploading && (
                    <div className="upload-spinner-overlay">
                      <div className="upload-spinner-container">
                        <div className="upload-spinner"></div>
                        <div className="upload-spinner-text">Uploading Document</div>
                        {newDocument.file && (
                          <>
                            <div className="upload-spinner-filename">
                              {newDocument.file.name}
                            </div>
                            
                            <div className="upload-spinner-filename" style={{ fontSize: '12px', color: '#888' }}>
                              Please wait...
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="drag-drop-content">
                    <div className="drag-drop-icon">
                      {isUploading ? '⏳' : pasteIndicator ? '📋' : isDragOver ? '⬆️' : '📋'}
                    </div>
                    
                    <p className="drag-drop-title">
                      {isUploading ? 'Upload in Progress...' : 
                      pasteIndicator ? 'File Pasted Successfully!' : 
                      isDragOver ? 'Drop file here' : 
                      'Drag & Drop or Paste file here'}
                    </p>
                    
                    <p className="drag-drop-subtitle">
                      {isUploading ? 'Your file is being uploaded' : 
                      pasteIndicator ? 'Ready to upload!' : 
                      'You can also copy a file and paste (Ctrl+V) here'}
                    </p>
                  </div>
                </div>

                <input
                  id="fileInput"
                  type="file"
                  onChange={handleFileInputChange}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                />

                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => !isUploading && document.getElementById('fileInput')?.click()}
                    disabled={isUploading}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: isUploading ? '#e0e0e0' : '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      color: isUploading ? '#999' : '#333',
                      opacity: isUploading ? 0.7 : 1
                    }}
                  >
                    {isUploading ? 'Uploading...' : 'Or Choose File'}
                  </button>
                </div>
              </div>

                
              </div>

              <div className="afm-footer">
                <button
                  onClick={() => {
                    setShowDocumentModal(false);
                    setNewDocument({ name: '', file: null });
                    setPasteIndicator(false);
                  }}
                  className="afm-cancel-button"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDocumentSubmit}
                  className="afm-save-button"
                  disabled={isUploading || !newDocument.name.trim() || !newDocument.file}
                >
                  {isUploading ? (
                    <>
                      <div className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', borderWidth: '2px', marginRight: '8px' }}></div>
                      Uploading...
                    </>
                  ) : 'Save Document'}
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