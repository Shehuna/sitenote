import React, { useState, useEffect, useCallback, useRef } from "react";
import "./EditNoteModal.css";
import toast from "react-hot-toast";
import * as signalR from "@microsoft/signalr";

const EditNoteModal = ({
  note,
  onClose,
  refreshNotes,
  updateNote,
  uploadDocument,
  projects = [],
  jobs = [],
  priorities = [],
  onPriorityUpdate,
  defaultWorkspaceId,
  openToPriorityTab = false
}) => {
  const [isEditable, setIsEditable] = useState(true);
  const [journalData, setJournalData] = useState({
    date: "",
    userId: "",
    jobId: "",
    note: "",
  });

  const [documents, setDocuments] = useState([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    name: "",
    file: null,
  });

  const [activeTab, setActiveTab] = useState("journal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState("");
  const [priorityId, setPriorityId] = useState("");

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const connectionRef = useRef(null);

  const noteTextareaRef = useRef(null);

  // Get current user
  const getCurrentUser = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user || { id: 1 };
  };

  // Permission logic - only creator can edit
  const currentUser = getCurrentUser();
  const isCreator = note?.userId && note.userId.toString() === currentUser.id.toString();
  const canEditNote = isCreator;

  console.log('EditNoteModal Permission Debug:', {
    noteUserId: note?.userId,
    currentUserId: currentUser.id,
    isCreator,
    canEditNote
  });

  const allowedFileTypes = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
    "image/svg+xml": [".svg"],
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "application/vnd.ms-powerpoint": [".ppt"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
    "text/plain": [".txt"],
    "audio/mpeg": [".mp3"],
    "audio/wav": [".wav"],
    "audio/ogg": [".ogg"],
    "audio/aac": [".aac"],
    "video/mp4": [".mp4"],
    "video/mpeg": [".mpeg"],
    "video/ogg": [".ogv"],
    "video/webm": [".webm"],
    "video/quicktime": [".mov"],
    "video/x-msvideo": [".avi"],
  };

  const isValidFileType = (file) => Object.keys(allowedFileTypes).includes(file.type);

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

  //useEffect(() => {
    //if (openToPriorityTab) {
   //   setActiveTab('priority');
   // }
 // }, [openToPriorityTab]);

  useEffect(() => {
    if (note) {
      const creationDate = note.timeStamp;
      if (creationDate) {
        const createdAt = new Date(creationDate);
        const now = new Date();
        const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
        if (hoursDiff > 24) {
          setIsEditable(false);
        } else {
          setIsEditable(true);
        }
      } else {
        setIsEditable(true);
      }
    }
  }, [note]);

  useEffect(() => {
    if (activeTab === 'journal' && noteTextareaRef.current) {
      const timer = setTimeout(() => {
        noteTextareaRef.current.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);
  
  useEffect(() => {
    if (note && activeTab === 'journal') {
      const timer = setTimeout(() => {
        if (noteTextareaRef.current) {
          noteTextareaRef.current.focus();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [note, activeTab]);

  const getMimeType = (fileName) => {
    const ext = fileName?.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf": return "application/pdf";
      case "jpg": case "jpeg": return "image/jpeg";
      case "png": return "image/png";
      case "gif": return "image/gif";
      case "doc": return "application/msword";
      case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case "xls": return "application/vnd.ms-excel";
      case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case "txt": return "text/plain";
      case "html": return "text/html";
      default: return "application/octet-stream";
    }
  };

  const fetchDocumentsByReference = useCallback(async (referenceId) => {
    try {
      setIsLoadingDocuments(true);
      setError(null);

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/Documents/GetDocumentMetadataByReference?siteNoteId=${referenceId}`,
        { headers: { accept: "application/json" } }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
      }

      var docs = await response.json();
      docs = docs.documents || docs;

      setDocuments(
        docs.map((doc) => {
          const downloadApiTriggerUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Documents/DownloadDocument/${doc.id}`;
          return {
            ...doc,
            fileType: doc.fileName?.split(".").pop(),
            fileUrl: null,
            downloadApiTriggerUrl,
          };
        })
      );
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to load documents: " + error.message);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    if (note) {
      const projectId = note.projectId
        ? note.projectId.toString()
        : findProjectIdByName(note.project || "");

      const jobId = note.jobId
        ? note.jobId.toString()
        : findJobIdByName(note.job || "", projectId);

      let correctedDate = "";
      if (note.date) {
        const dateObj = new Date(note.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        correctedDate = `${year}-${month}-${day}`;
      }
      
      const user = JSON.parse(localStorage.getItem("user"));

      setJournalData({
        date: correctedDate,
        projectId: projectId || "",
        jobId: jobId || "",
        note: note.note || "",
        userId: user.id
      });

      if (note.id) {
        fetchDocumentsByReference(note.id);
      }

      if (note.id) {
        const user = JSON.parse(localStorage.getItem("user"));
        let result = priorities.find((p) => p.noteID == note.id);
        if (!result) {
          result = priorities.find(
            (p) => p.noteID === note.id && p.userId === user.id
          );
        }
        if (result) {
          setSelectedPriority(result.priorityValue.toString());
          setPriorityId(result.id.toString());
        } else {
          setSelectedPriority("1");
          setPriorityId("");
        }
      }
    }
  }, [note, fetchDocumentsByReference, projects, jobs, priorities]);

  const findProjectIdByName = (projectName) => {
    const project = projects.find((p) => p.name === projectName);
    return project ? project.id.toString() : "";
  };

  const findJobIdByName = (jobName, projectId) => {
    const job = jobs.find(
      (j) =>
        j.name === jobName && j.projectId?.toString() === projectId.toString()
    );
    return job ? job.id.toString() : "";
  };

  const handleJournalChange = (e) => {
    if (!isEditable || !canEditNote) return;
    const { name, value } = e.target;
    setJournalData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddDocument = () => {
    if (!isEditable || !canEditNote) return;
    setNewDocument({ name: "", file: null });
    setShowDocumentModal(true);
    setError(null);
  };

  const handleDocumentFileChange = (e) => {
    if (!isEditable || !canEditNote) return;
    
    const file = e.target.files[0];
    setError("");
    if (!file) return;
    if (!isValidFileType(file)) {
      setError("Invalid file type! ");
      return;
    }
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");

    setNewDocument(prev => ({ ...prev, file, name: !prev.name.trim() ? fileNameWithoutExt : prev.name }));
  };

  const handleDocumentSubmit = async () => {
    if (!isEditable || !canEditNote) {
      setError("Cannot add documents to notes older than 24 hours or you don't have permission");
      return;
    }

    if (!newDocument.name.trim()) {
      setError("Document name is required.");
      return;
    }
    if (!newDocument.file) {
      setError("Please select a file to upload.");
      return;
    }

    setError("");
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const user = getCurrentUser();
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

      setTimeout(() => {
        setShowDocumentModal(false);
        setNewDocument({ name: "", file: null });
        setIsUploading(false);
        setUploadProgress(0);
        toast.success("Document uploaded successfully!");
      }, 600);
    } catch (err) {
      setError(err.message || "Upload failed");
      setIsUploading(false);
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

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documentToDownload.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Could not download document: " + error.message);
      setError("Error downloading document: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNote = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let noteIdToReturn = note.id;
      
      // If user is not creator, only allow priority update
      if (!canEditNote) {
        await handleUpdatepriority();
        onClose(noteIdToReturn);
        refreshNotes();
        return;
      }

      // If note is older than 24 hours, only allow priority update
      if (!isEditable) {
        await handleUpdatepriority();
        onClose(noteIdToReturn);
        refreshNotes();
        return;
      }

      const originalProjectId = note.projectId
        ? note.projectId.toString()
        : findProjectIdByName(note.project || "");
      const originalJobId = note.jobId
        ? note.jobId.toString()
        : findJobIdByName(note.job || "", originalProjectId);

      if (
        journalData.projectId !== originalProjectId ||
        journalData.jobId !== originalJobId
      ) {
        setError(
          "Cannot update this record. You can only update the notes you created."
        );
        setIsSubmitting(false);
        return;
      }

      const result = await updateNote(note.id, {
        Date: new Date(journalData.date).toISOString(),
        Note: journalData.note,
        JobId: journalData.jobId,
        UserId: journalData.userId,
      });

      if (result && (result.success || result.id || result.message)) {
        await handleUpdatepriority();
        onClose();
        refreshNotes();
      } else {
        throw new Error("Failed to save note: No success confirmation from server");
      }
    } catch (err) {
      console.error("Error saving note:", err);
      setError(err.message || "Failed to save note. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveShortcut = useCallback((event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (!isSubmitting && canEditNote) {
        handleSaveNote();
      }
    }
  }, [isSubmitting, handleSaveNote, canEditNote]);

  useEffect(() => {
    document.addEventListener('keydown', handleSaveShortcut);
    return () => {
      document.removeEventListener('keydown', handleSaveShortcut);
    };
  }, [handleSaveShortcut]);

  const handleUpdatepriority = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      let response;

      if (priorityId) {
        response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Priority/UpdatePriority/${priorityId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priorityValue: selectedPriority }),
        });
      } else {
        response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Priority/AddPriority`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteID: note.id,
            priorityValue: selectedPriority,
            userId: user.id,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${priorityId ? "update" : "create"} priority`);
      }

      toast.success(`Priority ${priorityId ? "updated" : "created"} successfully`);
    } catch (error) {
      console.error("Error saving priority:", error);
      throw error;
    }
  };

  if (!note) return null;

  return (
    <div className="edit-note-modal-overlay">
      <div className="edit-note-modal">
        <div className="modal-header">
          <h2>
            Edit Note{" "}
            {(!isEditable || !canEditNote) && (
              <i
                className="fas fa-eye"
                title={!canEditNote ? "View only - Only creator can edit" : "Only priority can be edited"}
              ></i>
            )}
          </h2>

          <button className="close-button" onClick={onClose} disabled={isSubmitting}>
            ×
          </button>
        </div>

        {!canEditNote && (
          <div className="edit-warning">
            Only the person who created this note can update it.
          </div>
        )}

        {!isEditable && canEditNote && (
          <div className="edit-warning">
            This note is older than 24 hours. Only the priority can be updated.
          </div>
        )}

        <div className="tabs">
          <button
            className={`tab-button ${activeTab === "journal" ? "active" : ""}`}
            onClick={() => setActiveTab("journal")}
          >
            Journal
          </button>
          <button
            className={`tab-button ${activeTab === "documents" ? "active" : ""}`}
            onClick={() => setActiveTab("documents")}
          >
            Documents {documents.length > 0 && `(${documents.length})`}
          </button>
          <button
            className={`tab-button ${activeTab === "priority" ? "active" : ""}`}
            onClick={() => setActiveTab("priority")}
          >
            Priority
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "journal" ? (
            <div className="journal-section">
              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  name="date"
                  value={journalData.date}
                  onChange={handleJournalChange}
                  required
                  disabled={!isEditable || !canEditNote || isSubmitting}
                />
              </div>

              <div className="form-group">
                <label>Project:</label>
                <select
                  name="projectId"
                  value={journalData.projectId}
                  onChange={handleJournalChange}
                  required
                  disabled={!isEditable || !canEditNote || isSubmitting}
                >
                  <option value="">Select Project</option>
                  {projects.filter(project => 
                      !defaultWorkspaceId || project.workspaceId?.toString() === defaultWorkspaceId.toString()
                  ).map((project) => (
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
                  disabled={
                    !isEditable || !canEditNote || !journalData.projectId || isSubmitting
                  }
                >
                  <option value="">Select Job</option>
                  {jobs
                    .filter((job) => job.projectId?.toString() === journalData.projectId)
                    .map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Notes:</label>
                <textarea
                  ref={noteTextareaRef}
                  name="note"
                  value={journalData.note}
                  onChange={handleJournalChange}
                  rows={6}
                  required
                  disabled={!isEditable || !canEditNote || isSubmitting}
                />
              </div>
            </div>
          ) : activeTab === "documents" ? (
            <div className="documents-section">
              <h3>Attached Documents</h3>
              {error && <p className="error-message">{error}</p>}
              {isLoadingDocuments ? (
                <p>Loading documents...</p>
              ) : (
                <>
                  {canEditNote && isEditable && (
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
                          {documents.map((doc) => (
                            <tr key={doc.id}>
                              <td>{doc.name}</td>
                              <td>{doc.fileName || "N/A"}</td>
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
          ) : (
            <div className="journal-section">
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  disabled={isSubmitting }
                  className={`priority-select ${selectedPriority ? `priority-${selectedPriority}` : "priority-default"}`}
                >
                  <option value="">Select Priority</option>
                  <option value="4" className="priority-option-4">High</option>
                  <option value="3" className="priority-option-3">Medium</option>
                  <option value="1" className="priority-option-1">No Priority</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            className="cancel-button"
            disabled={isSubmitting}
          >
            {"Close"}
          </button>
          {(
            <button onClick={handleSaveNote} className="save-button" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          )}
        </div>

        {showDocumentModal && (
          <div className="document-modal-overlay">
            <div className="document-modal" style={{ maxWidth: "560px" }}>
              {isUploading && (
                <div style={{ height: "6px", background: "#e0e0e0", borderRadius: "8px 8px 0 0", overflow: "hidden" , marginBottom: "10px" }}>
                  <div style={{ height: "100%", width: `${uploadProgress}%`, background: "#4caf50", transition: "width 0.3s ease", marginBottom: "10px"  }} />
                </div>
              )}

              <div className="modal-header">
                <h3>Add Document</h3>
                <button className="close-button" onClick={() => setShowDocumentModal(false)} disabled={isUploading}>
                  ×
                </button>
              </div>

              {error && (
                <div className="error-message" style={{ background: "#ffebee", padding: "12px", borderRadius: "6px", margin: "10px 20px" }}>
                  {error}
                  <button onClick={() => setError("")} style={{ float: "right", background: "none", border: "none", fontWeight: "bold" }}>×</button>
                </div>
              )}

              <div style={{ padding: "20px" }}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Document Name:</label>
                  <input
                    type="text"
                    value={newDocument.name}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Site Photos March 2025"
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
                    disabled={isUploading}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>File:</label>
                  <input type="file" onChange={handleDocumentFileChange} disabled={isUploading} style={{ width: "100%" }} />

                  {newDocument.file && (
                    <div style={{
                      marginTop: "12px",
                      padding: "14px 16px",
                      background: "#e8f5e8",
                      border: "1px solid #4caf50",
                      borderRadius: "8px",
                      color: "#2e7d32",
                      fontWeight: "500"
                    }}>
                      Selected: <strong>{newDocument.file.name}</strong>
                      <span style={{ marginLeft: "10px", opacity: 0.8 }}>
                        ({(newDocument.file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                  )}
                </div>

                {isUploading && (
                  <div style={{
                    textAlign: "center",
                    margin: "20px 0",
                    color: "#4caf50",
                    fontWeight: "600",
                    fontSize: "16px"
                  }}>
                    Uploading... {uploadProgress}%
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ padding: "16px", borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={() => setShowDocumentModal(false)} disabled={isUploading} style={{ padding: "10px 16px", border: "1px solid #ccc", borderRadius: "6px" }}>
                  Cancel
                </button>
                <button
                  onClick={handleDocumentSubmit}
                  disabled={isUploading || !newDocument.name.trim() || !newDocument.file}
                  style={{
                    padding: "10px 20px",
                    background: isUploading ? "#4caf50" : "#1976d2",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600"
                  }}
                >
                  {isUploading ? `Uploading ${uploadProgress}%` : "Save Document"}
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
