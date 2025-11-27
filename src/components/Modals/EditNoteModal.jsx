import React, { useState, useEffect, useCallback, useRef  } from "react";
import "./EditNoteModal.css";
import toast from "react-hot-toast";

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
  defaultWorkspaceId
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
    siteNoteId: "",
    userId: "",
  });

  const [activeTab, setActiveTab] = useState("journal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState("");
  const [priorityId, setPriorityId] = useState("");

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
    // Images
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
    "image/svg+xml": [".svg"],

    // Documents
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
    "application/vnd.ms-powerpoint": [".ppt"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      [".pptx"],
    "text/plain": [".txt"],

    // Audio
    "audio/mpeg": [".mp3"],
    "audio/wav": [".wav"],
    "audio/ogg": [".ogg"],
    "audio/aac": [".aac"],

    // Video
    "video/mp4": [".mp4"],
    "video/mpeg": [".mpeg"],
    "video/ogg": [".ogv"],
    "video/webm": [".webm"],
    "video/quicktime": [".mov"],
    "video/x-msvideo": [".avi"],
  };

  const noteTextareaRef = useRef(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const isValidFileType = (file) => {
    return Object.keys(allowedFileTypes).includes(file.type);
  };

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
      case "pdf":
        return "application/pdf";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "gif":
        return "image/gif";
      case "doc":
        return "application/msword";
      case "docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case "xls":
        return "application/vnd.ms-excel";
      case "xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case "txt":
        return "text/plain";
      case "html":
        return "text/html";
      default:
        return "application/octet-stream";
    }
  };

  const fetchDocumentsByReference = useCallback(async (referenceId) => {
    try {
      setIsLoadingDocuments(true);
      setError(null);

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/Documents/GetDocumentMetadataByReference?siteNoteId=${referenceId}`,
        {
          headers: { accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch documents: ${response.status} ${response.statusText}`
        );
      }

      var docs = await response.json();
      docs = docs.documents || docs;

      setDocuments(
        docs.map((doc) => {
          const fileType = doc.fileName?.split(".").pop();

          const downloadApiTriggerUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Documents/DownloadDocument/${doc.id}`;

          return {
            ...doc,
            fileType: fileType,
            fileUrl: null,
            downloadApiTriggerUrl: downloadApiTriggerUrl,
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
        console.log("=== PRIORITY DEBUG ===");
        console.log("Note ID:", note.id);
        console.log("Current User ID:", user.id);
        console.log("All priorities:", priorities);

        let result = priorities.find((p) => p.noteID == note.id);
        console.log("Found priority (any user):", result);

        if (!result) {
          result = priorities.find(
            (p) => p.noteID === note.id && p.userId === user.id
          );
          console.log("Found priority (current user):", result);
        }

        if (result) {
          console.log("✅ Setting priorityId:", result.id);
          console.log("✅ Setting selectedPriority:", result.priorityValue);
          setSelectedPriority(result.priorityValue.toString());
          setPriorityId(result.id.toString());
        } else {
          console.log("❌ No priority found for this note");
          setSelectedPriority("1");
          setPriorityId("");
        }
        console.log("=== END DEBUG ===");
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

    setNewDocument({ name: "", file: null, siteNoteId: "", userId: "" });
    setShowDocumentModal(true);
    setError(null);
  };

  const handleDocumentFileChange = (e) => {
    if (!isEditable || !canEditNote) return;
    
    const file = e.target.files[0];
    setError("");
    if (!isValidFileType(file)) {
      setError("Invalid file type! ");
      setSelectedFile(null);
      return;
    }

    setNewDocument((prev) => ({ ...prev, file: e.target.files[0] }));
  };

  const handleDocumentSubmit = async () => {
    if (!isEditable || !canEditNote) {
      setError("Cannot add documents to notes older than 24 hours or you don't have permission");
      return;
    }

    setError(null);

    if (!newDocument.name.trim()) {
      setError("Document name is required.");
      return;
    }

    if (!newDocument.file) {
      setError("Please select a file to upload.");
      return;
    }

    try {
      setIsSubmitting(true);

      const savedDoc = await uploadDocument(
        newDocument.name,
        newDocument.file,
        note.id
      );

      const newDocWithDownloadUrl = {
        ...savedDoc,
        fileType: getMimeType(savedDoc.fileName).split("/")[1],
        fileUrl: null,
        downloadApiTriggerUrl: `${process.env.REACT_APP_API_BASE_URL}/api/Documents/DownloadDocument/${savedDoc.id}`,
      };
      setDocuments((docs) => [...docs, newDocWithDownloadUrl]);

      setShowDocumentModal(false);
      setNewDocument({ name: "", file: null });
    } catch (err) {
      console.error("Error saving document:", err);
      setError(err.message || "Failed to save document");
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
        throw new Error(
          `Failed to retrieve document: ${response.status} ${response.statusText}`
        );
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
        throw new Error(
          "Failed to save note: No success confirmation from server"
        );
      }
    } catch (err) {
      console.error("Error saving note:", err);
      setError(
        err.message ||
          "Failed to save note. Please check your connection and try again."
      );
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
      console.log("=== UPDATE PRIORITY DEBUG ===");
      console.log("priorityId:", priorityId);
      console.log("selectedPriority:", selectedPriority);
      console.log("note.id:", note.id);
      console.log("user.id:", user.id);

      let response;

      if (priorityId) {
        console.log("Updating existing priority");
        const url = `${process.env.REACT_APP_API_BASE_URL}/api/Priority/UpdatePriority/${priorityId}`;
        console.log("Update URL:", url);

        response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priorityValue: selectedPriority,
          }),
        });
      } else {
        console.log("Creating new priority");
        response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/Priority/AddPriority`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              noteID: note.id,
              priorityValue: selectedPriority,
              userId: user.id,
            }),
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `Failed to ${priorityId ? "update" : "create"} priority`
        );
      }

      console.log(
        `Priority ${priorityId ? "updated" : "created"} successfully`
      );

      toast.success(
        `Priority ${priorityId ? "updated" : "created"} successfully`
      );
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

          <button
            className="close-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            &times;
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
            className={`tab-button ${
              activeTab === "documents" ? "active" : ""
            }`}
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
                    .filter(
                      (job) =>
                        job.projectId?.toString() === journalData.projectId
                    )
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
                      <button
                        onClick={handleAddDocument}
                        className="add-button"
                        disabled={isSubmitting}
                      >
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
                  onChange={(e) => {
                    setSelectedPriority(e.target.value);
                  }}
                  disabled={isSubmitting || !canEditNote}
                  className={`priority-select ${
                    selectedPriority
                      ? `priority-${selectedPriority}`
                      : "priority-default"
                  }`}
                >
                  <option value="">Select Priority</option>
                  <option value="4" className="priority-option-4">
                    High
                  </option>
                  <option value="3" className="priority-option-3">
                    Medium
                  </option>
                  <option value="1" className="priority-option-1">
                    No Priority
                  </option>
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
            {canEditNote ? "Cancel" : "Close"}
          </button>
          {canEditNote && (
            <button
              onClick={handleSaveNote}
              className="save-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
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
                  onChange={(e) =>
                    setNewDocument((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                  disabled={isSubmitting || !isEditable || !canEditNote}
                />
              </div>

              <div className="form-group">
                <label>File:</label>
                <input
                  type="file"
                  onChange={handleDocumentFileChange}
                  required
                  disabled={isSubmitting || !isEditable || !canEditNote}
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
                  disabled={
                    isSubmitting ||
                    !newDocument.name.trim() ||
                    !newDocument.file ||
                    !isEditable ||
                    !canEditNote
                  }
                >
                  {isSubmitting ? "Saving..." : "Save Document"}
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