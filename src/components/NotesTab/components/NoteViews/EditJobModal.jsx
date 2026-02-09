import React, { useEffect, useState, useRef } from 'react';
import Modal from '../../../Modals/Modal';
import toast from 'react-hot-toast';
import '../../../Modals/SettingsModal.css';

const EditJobModal = ({
  isOpen,
  onClose,
  jobId,
  workspaceId,
  projectId,
  projectName: initialProjectName,
  userId,
  onJobUpdated = () => {},
}) => {
  const [newJobName, setNewJobName] = useState('');
  const [newJobDescription, setNewJobDescription] = useState('');
  const [newJobStatus, setNewJobStatus] = useState(1);
  const [newJobType, setNewJobType] = useState('');
  const [newJobPriority, setNewJobPriority] = useState(null);
  const [newJobStartDate, setNewJobStartDate] = useState('');
  const [newJobEndDate, setNewJobEndDate] = useState('');
  const [newJobActualEndDate, setNewJobActualEndDate] = useState('');
  const [newJobManagerId, setNewJobManagerId] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedProjectName, setSelectedProjectName] = useState(initialProjectName || '');
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [editErrorMessages, setEditErrorMessages] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  const editErrorRef = useRef(null);
  const editModalContentRef = useRef(null);
  const editTopRef = useRef(null);

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadWorkspaceUsers();
    }
  }, [isOpen, workspaceId]);

  useEffect(() => {
    if (editErrorMessages.length > 0 && editErrorRef.current) {
      editErrorRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [editErrorMessages]);

  useEffect(() => {
    if (isEditing && editModalContentRef.current) {
      try { editModalContentRef.current.scrollTop = 0; } catch {}
      try {
        const container = editModalContentRef.current.closest?.('.modal-container');
        if (container) container.scrollTop = 0;
      } catch {}
    }
  }, [isEditing]);

  useEffect(() => {
    if (isOpen && editModalContentRef.current) {
      try { editModalContentRef.current.scrollTop = 0; } catch {}
      try {
        const container = editModalContentRef.current.closest?.('.modal-container');
        if (container) container.scrollTop = 0;
      } catch {}
    }
  }, [isOpen]);

  const loadWorkspaceUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/UserWorkspace/GetUsersByWorkspaceId/${workspaceId}`
      );
      if (res.ok) {
        const data = await res.json();
        setWorkspaceUsers(data.users || []);
      } else {
        toast.error('Failed to load workspace users');
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch job details when modal opens or jobId changes
  useEffect(() => {
    if (isOpen && jobId) {
      fetchJobData();
    }
  }, [isOpen, jobId]);
  const fetchJobData = async () => {
    setEditLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/Job/GetJobById/${jobId}`
      );
      if (!res.ok) throw new Error('Failed to fetch job');
      const data = await res.json();
      const job = data.job || {};

      setNewJobName(job.name || '');
      setNewJobDescription(job.description || '');
      setNewJobStatus(job.status || 1);
      setNewJobType(job.type || '');
      setNewJobPriority(job.jobPriority ?? null);
            setNewJobStartDate(job.startDate ? new Date(job.startDate).toISOString().split('T')[0] : '');
            setNewJobActualEndDate(job.actualEndDate ? new Date(job.actualEndDate).toISOString().split('T')[0] : '');
      setNewJobManagerId(job.managerId ?? null);

            // Use project values from API or passed-in props
            setSelectedProject(job.projectId || projectId || '');
            setSelectedProjectName(job.projectName || initialProjectName || job.project?.name || '');

    } catch (err) {
      console.error(err);
      toast.error('Failed to load job data');
      setSelectedProjectName('Error loading project');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditJob = async () => {
    if (!isEditing) {
      setIsEditing(true);
      if (editTopRef.current) {
        editTopRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }

    setEditErrorMessages([]);

    if (!newJobName.trim()) {
      setEditErrorMessages(['Job name is required']);
      setIsEditing(false);
      return;
    }

    try {
      const bodyData = {
        id: jobId,
        name: newJobName.trim(),
        description: newJobDescription.trim(),
        status: newJobStatus,
        type: newJobType.trim() || undefined,
        jobPriority: newJobPriority,
        startDate: newJobStartDate ? new Date(newJobStartDate).toISOString() : null,
        endDate: newJobEndDate ? new Date(newJobEndDate).toISOString() : null,
        actualEndDate: newJobActualEndDate ? new Date(newJobActualEndDate).toISOString() : null,
        managerId: newJobManagerId ?? null,
      };

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/Job/UpdateJob/${jobId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        let errors = [];
        if (Array.isArray(errorData.errors)) errors = errorData.errors;
        else if (errorData.errors && typeof errorData.errors === 'object') {
          Object.values(errorData.errors).flat().forEach(msg => errors.push(msg));
        } else if (errorData.message) errors = [errorData.message];
        setEditErrorMessages(errors);
        if (editErrorRef.current) {
          editErrorRef.current.scrollIntoView({ behavior: 'auto' });
        }
        return;
      }

      toast.success('Job updated');
      onJobUpdated();
      onClose();
    } catch {
      toast.error('Network error');
    } finally {
      setIsEditing(false);
    }
  };

  const resetForm = () => {
    setNewJobName('');
    setNewJobDescription('');
    setNewJobStatus(1);
    setNewJobType('');
    setNewJobPriority(null);
    setNewJobStartDate('');
    setNewJobEndDate('');
    setNewJobActualEndDate('');
    setNewJobManagerId(null);
    setSelectedProjectName('');
    setEditErrorMessages([]);
  };

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Job" customClass="modal-sm">
      <div ref={editModalContentRef} style={{ padding: '20px', position: 'relative' }}>
        <div ref={editTopRef} />

        {(usersLoading || editLoading || isEditing) ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '36px 16px', minHeight: 200 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 12px' }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{usersLoading ? 'Loading users...' : editLoading ? 'Loading job...' : 'Updating job...'}</p>
            </div>
          </div>
        ) : (
          <>
            <div ref={editErrorRef} style={{ marginBottom: '15px' }}>
              {editErrorMessages.length > 0 && (
                <div className="error-message">
                  <ul style={{ color: '#d32f2f', margin: '8px 0' }}>
                    {editErrorMessages.map((msg, i) => <li key={i}>{msg}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="form-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Project:</label>
                <input
                  type="text"
                  value={selectedProjectName}
                  readOnly
                  style={{
                    backgroundColor: '#f8f9fa',
                    color: '#555',
                    cursor: 'not-allowed',
                  }}
                />
              </div>

              <div className="form-group">
                <label>Job Name:</label>
                <input value={newJobName} onChange={e => setNewJobName(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Status:</label>
                <select value={newJobStatus} onChange={e => setNewJobStatus(parseInt(e.target.value))}>
                  <option value={1}>Active</option>
                  <option value={2}>Inactive</option>
                  <option value={3}>Archive</option>
                </select>
              </div>

              <div className="form-group">
                <label>Type:</label>
                <input
                  type="text"
                  value={newJobType}
                  onChange={e => setNewJobType(e.target.value)}
                  placeholder="Enter job type"
                />
              </div>

              <div className="form-group">
                <label>Priority:</label>
                <select
                  value={newJobPriority ?? ''}
                  onChange={e => setNewJobPriority(e.target.value === '' ? null : parseInt(e.target.value))}
                >
                  <option value="">Select Priority</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </div>

              <div className="form-group">
                <label>Start Date:</label>
                <input
                  type="date"
                  value={newJobStartDate}
                  onChange={e => setNewJobStartDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>End Date:</label>
                <input
                  type="date"
                  value={newJobEndDate}
                  onChange={e => setNewJobEndDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Actual End Date:</label>
                <input
                  type="date"
                  value={newJobActualEndDate}
                  onChange={e => setNewJobActualEndDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Manager:</label>
                <select
                  value={newJobManagerId ?? ''}
                  onChange={e => setNewJobManagerId(e.target.value === '' ? null : parseInt(e.target.value))}
                >
                  <option value="">Select Manager</option>
                  {workspaceUsers.map(u => (
                    <option key={u.userId} value={u.userId}>
                      {`${u.fname} ${u.lname} (${u.email})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width" style={{ gridColumn: '1 / -1' }}>
                <label>Description:</label>
                <textarea
                  value={newJobDescription}
                  onChange={e => setNewJobDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: '30px', gridColumn: '1 / -1' }}>
              <button
                className="btn-primary"
                onClick={handleEditJob}
                disabled={!newJobName.trim() || isEditing}
              >
                {isEditing ? 'Updating...' : 'OK'}
              </button>
              <button className="btn-close" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default EditJobModal;