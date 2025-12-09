import React, { useEffect, useState, useRef } from 'react';
import Modal from '../Modals/Modal';
import toast from 'react-hot-toast';

const JobManagment = ({ defWorkId, updateProjectsAndJobs }) => {
    const [selectedJob, setSelectedJob] = useState('');
    const [newJobName, setNewJobName] = useState('');
    const [user, setUser] = useState('');
    const [userRole, setUserRole] = useState('');
    const [newJobStatus, setNewJobStatus] = useState(1);
    const [newJobDescription, setNewJobDescription] = useState('');
    const [selectedProject, setSelectedProject] = useState('');
    const [isAddJobOpen, setIsAddJobOpen] = useState(false);
    const [isEditJobOpen, setIsEditJobOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const [jobs, setJobs] = useState([]);

    // Only track if projects failed to load in modal
    const [modalProjectError, setModalProjectError] = useState(false);

    const [pageLoading, setPageLoading] = useState(true);

    const [previousJobName, setPreviousJobName] = useState('');
    const [activeTab, setActiveTab] = useState('single');
    const [pasteContent, setPasteContent] = useState('');
    const [parsedJobs, setParsedJobs] = useState([]);
    const [errorMessages, setErrorMessages] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);

    const errorRef = useRef(null);
    const tableRef = useRef(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser?.id || '');
        setUserRole((storedUser?.role || '').toLowerCase());
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (isAddJobOpen) {
            loadProjectsForModal();
        }
    }, [isAddJobOpen]);

    const fetchInitialData = async () => {
        setPageLoading(true);
        try {
            const [projectsRes, jobsRes] = await Promise.all([
                fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Project/GetProjects`),
                fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Job/GetJobs`)
            ]);

            if (!projectsRes.ok || !jobsRes.ok) throw new Error();

            const projectsData = (await projectsRes.json()).projects || [];
            const jobsData = (await jobsRes.json()).jobs || [];

            setProjects(projectsData);
            setJobs(jobsData);
        } catch {
            toast.error('Failed to load data');
        } finally {
            setPageLoading(false);
        }
    };

    // Silently load projects when modal opens — no loading text
    const loadProjectsForModal = async () => {
        setModalProjectError(false);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Project/GetProjects`);
            if (res.ok) {
                const data = (await res.json()).projects || [];
                setProjects(data);
            } else {
                throw new Error();
            }
        } catch {
            setModalProjectError(true);
            toast.error('Failed to load projects');
        }
    };

    const handleAddJob = async () => {
        setIsAdding(true);
        setErrorMessages([]);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Job/AddJob`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newJobName.trim(),
                    description: newJobDescription.trim(),
                    projectId: selectedProject,
                    userId: user
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                let errors = [];
                if (Array.isArray(errorData.errors)) errors = errorData.errors;
                else if (errorData.errors && typeof errorData.errors === 'object') {
                    Object.values(errorData.errors).flat().forEach(msg => errors.push(msg));
                } else if (errorData.message) errors = [errorData.message];
                setErrorMessages(errors);
                return;
            }

            const data = await response.json();
            await grantJobPermission(data.job.id);
            toast.success('Job saved successfully');
            await updateProjectsAndJobs();
            await fetchInitialData();
            closeAddModal();
        } catch {
            setErrorMessages(['Network error']);
        } finally {
            setIsAdding(false);
        }
    };

    const handleEditJob = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Job/UpdateJob/${selectedJob}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedJob,
                    name: newJobName.trim(),
                    description: newJobDescription.trim(),
                    status: newJobStatus
                })
            });

            if (!response.ok) throw new Error();
            toast.success('Job updated');
            await updateProjectsAndJobs();
            await fetchInitialData();
            setIsEditJobOpen(false);
        } catch {
            toast.error('Update failed');
        }
    };

    const grantJobPermission = async (jobid) => {
        try {
            await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/UserJobAuth/AddUserJob`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user, jobId: jobid, userIDScreen: user })
            });
        } catch { }
    };

    const handleAddBulkJobs = async () => {
        setIsAdding(true);
        setErrorMessages([]);

        if (!selectedProject || parsedJobs.length === 0) {
            setErrorMessages(['Project and jobs required']);
            setIsAdding(false);
            return;
        }

        const dtos = parsedJobs.map(job => ({
            name: job.name.trim(),
            description: job.description?.trim() || job.name.trim(),
            projectId: parseInt(selectedProject),
            userId: user
        }));

        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Job/AddJobsBulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dtos)
            });

            if (!response.ok) {
                const err = await response.json();
                let errors = [];
                if (Array.isArray(err.errors)) errors = err.errors;
                else if (err.errors) errors = Object.values(err.errors).flat();
                else if (err.message) errors = [err.message];
                setErrorMessages(errors);
                return;
            }

            const data = await response.json();
            toast.success(`${data.jobs.length} jobs added`);
            await updateProjectsAndJobs();
            await fetchInitialData();
            closeAddModal();
        } catch {
            setErrorMessages(['Bulk add failed']);
        } finally {
            setIsAdding(false);
        }
    };

    const handlePasteChange = (e) => setPasteContent(e.target.value);

    const handleReview = () => {
        const lines = pasteContent.trim().split('\n');
        const newParsed = lines
            .map(line => {
                const [name, description] = line.split('\t').map(str => str.trim());
                if (name) return { name, description: description || '' };
                return null;
            })
            .filter(Boolean);

        setParsedJobs(newParsed);
        setIsReviewMode(true);
    };

    const handleEditParsedJob = (index, field, value) => {
        const updated = [...parsedJobs];
        updated[index][field] = value;
        setParsedJobs(updated);
    };

    const handleDeleteRow = (index) => {
        setParsedJobs(parsedJobs.filter((_, i) => i !== index));
    };

    const handleAddNewRow = () => {
        setParsedJobs([...parsedJobs, { name: '', description: '' }]);
        setTimeout(() => {
            if (tableRef.current) {
                tableRef.current.scrollTop = tableRef.current.scrollHeight;
            }
        }, 0);
    };

    const handleClearPaste = () => {
        setPasteContent('');
        setParsedJobs([]);
        setIsReviewMode(false);
    };

    const closeAddModal = () => {
        setIsAddJobOpen(false);
        setNewJobName('');
        setNewJobDescription('');
        setSelectedProject('');
        setPasteContent('');
        setParsedJobs([]);
        setIsReviewMode(false);
        setErrorMessages([]);
        setActiveTab('single');
        setModalProjectError(false);
    };

    const isAdmin = userRole === 'admin';
    const activeProjects = projects.filter(p => p.workspaceId === defWorkId && p.status === 1);

    return (
        <div className="settings-content" style={{ position: 'relative', minHeight: '400px' }}>

            <style jsx>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .full-overlay {
                    position: absolute; inset: 0;
                    background: rgba(255,255,255,0.97);
                    backdrop-filter: blur(10px);
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    z-index: 9999; border-radius: 12px;
                }
                .spinner {
                    width: 60px; height: 60px;
                    border: 6px solid #f3f3f3;
                    border-top: 6px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 16px;
                }
                .error-box {
                    padding: 12px;
                    background: #ffebee;
                    color: #c62828;
                    border-radius: 6px;
                    text-align: center;
                    font-size: 0.95rem;
                }
            `}</style>

            {pageLoading && (
                <div className="full-overlay">
                    <div className="spinner" />
                    <p style={{fontSize:'1.2rem',fontWeight:'600',margin:0}}>Loading...</p>
                </div>
            )}

            {!pageLoading && (
                <>
                    <div className="settings-action-buttons">
                        <button className="btn-primary" onClick={() => setIsAddJobOpen(true)}>
                            Add Job
                        </button>
                        <button className="btn-secondary" onClick={() => setIsEditJobOpen(true)} disabled={!selectedJob}>
                            Edit Job
                        </button>
                    </div>

                    <div className="settings-lookup-list">
                        <h4>Job Lookups</h4>
                        {jobs.length === 0 ? (
                            <div style={{textAlign:'center',padding:'50px',color:'#888'}}>
                                No jobs found
                            </div>
                        ) : (
                            <select
                                size="5"
                                className="lookup-select"
                                value={selectedJob}
                                onChange={(e) => setSelectedJob(e.target.value)}
                            >
                                <option value="">Select a Job</option>
                                {jobs
                                    .filter(job => {
                                        const project = projects.find(p => p.id === job.projectId && p.workspaceId === defWorkId);
                                        return project && job.status !== 3 && project.status !== 3;
                                    })
                                    .map(job => {
                                        const projectName = projects.find(p => p.id === job.projectId)?.name || 'Unknown';
                                        const isInactive = job.status !== 1;
                                        return (
                                            <option key={job.id} value={job.id}>
                                                {job.name} (Project: {projectName}) {isInactive ? '(Inactive)' : ''}
                                            </option>
                                        );
                                    })}
                            </select>
                        )}
                    </div>
                </>
            )}

            <Modal isOpen={isAddJobOpen} onClose={closeAddModal} title="Add Job" customClass="modal-md">
                <div style={{ padding: '20px', position: 'relative' }}>

                    {isAdding && (
                        <div className="full-overlay">
                            <div className="spinner" />
                            <p style={{fontSize:'1.2rem',fontWeight:'600'}}>
                                {activeTab === 'bulk' 
                                    ? `Adding ${parsedJobs.length} job${parsedJobs.length > 1 ? 's' : ''}...`
                                    : 'Adding job...'}
                            </p>
                        </div>
                    )}

                    <div style={{ opacity: isAdding ? 0.4 : 1, pointerEvents: isAdding ? 'none' : 'all' }}>

                        <div ref={errorRef} style={{marginBottom:'15px'}}>
                            {errorMessages.length > 0 && (
                                <div className="error-message">
                                    <ul style={{color:'#d32f2f',margin:'8px 0'}}>
                                        {errorMessages.map((msg,i) => <li key={i}>{msg}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="tab-container" style={{marginBottom:'20px'}}>
                            <button className={`tab-button ${activeTab==='single'?'active':''}`} onClick={()=>setActiveTab('single')}>
                                Single Add
                            </button>
                            {isAdmin && (
                                <button className={`tab-button ${activeTab==='bulk'?'active':''}`} onClick={()=>setActiveTab('bulk')}>
                                    Bulk Add
                                </button>
                            )}
                        </div>

                        {/* PROJECT DROPDOWN — ONLY SHOW ERROR, NO LOADING TEXT */}
                        <div className="form-group">
                            <label>Project:</label>
                            {modalProjectError ? (
                                <div className="error-box">
                                    Failed to load projects
                                </div>
                            ) : activeProjects.length === 0 ? (
                                <div className="error-box" style={{background:'#fff3e0',color:'#ef6c00'}}>
                                    No active projects
                                </div>
                            ) : (
                                <select
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                >
                                    <option value="">Select Project</option>
                                    {activeProjects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {activeTab === 'single' && (
                            <>
                                <div className="form-group">
                                    <label>Job Name:</label>
                                    <input
                                        type="text"
                                        value={newJobName}
                                        onChange={(e) => setNewJobName(e.target.value)}
                                        placeholder="Enter job name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Job Description:</label>
                                    <textarea
                                        value={newJobDescription}
                                        onChange={(e) => setNewJobDescription(e.target.value)}
                                        placeholder="Enter job description"
                                    />
                                </div>
                            </>
                        )}

                        {activeTab === 'bulk' && !isReviewMode && (
                            <>
                                <div className="form-group">
                                    <label>Paste from Excel (Name[Tab]Description per line):</label>
                                    <textarea
                                        value={pasteContent}
                                        onChange={handlePasteChange}
                                        placeholder="Job A	Description A&#10;Job B	Description B"
                                        className="modern-textarea"
                                        style={{minHeight:'180px'}}
                                    />
                                </div>
                                <div style={{textAlign:'center',margin:'20px 0'}}>
                                    <button onClick={handleReview} className="btn-primary" disabled={!pasteContent.trim()}>
                                        Review
                                    </button>
                                    <button onClick={handleClearPaste} className="btn-danger" style={{marginLeft:'10px'}}>
                                        Clear
                                    </button>
                                </div>
                            </>
                        )}

                        {isReviewMode && (
                            <>
                                <h4 style={{textAlign:'center',margin:'15px 0'}}>Review Jobs ({parsedJobs.length})</h4>
                                <div ref={tableRef} style={{maxHeight:'320px',overflowY:'auto',border:'1px solid #ddd',borderRadius:'8px'}}>
                                    <table className="modern-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Description</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedJobs.map((job, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <input
                                                            value={job.name}
                                                            onChange={(e) => handleEditParsedJob(index, 'name', e.target.value)}
                                                            className="modern-input"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            value={job.description}
                                                            onChange={(e) => handleEditParsedJob(index, 'description', e.target.value)}
                                                            className="modern-input"
                                                        />
                                                    </td>
                                                    <td>
                                                        <button onClick={() => handleDeleteRow(index)} className="icon-button danger">
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{marginTop:'15px',textAlign:'center'}}>
                                    <button onClick={handleAddNewRow} className="icon-button secondary">
                                        Add Row
                                    </button>
                                    <button onClick={handleAddBulkJobs} className="btn-primary" style={{marginLeft:'12px'}}>
                                        Add All Jobs
                                    </button>
                                    <button onClick={() => setIsReviewMode(false)} className="btn-secondary" style={{marginLeft:'12px'}}>
                                        Back
                                    </button>
                                </div>
                            </>
                        )}

                        <div className="modal-footer" style={{marginTop:'30px'}}>
                            {activeTab === 'single' && (
                                <button
                                    className="btn-primary"
                                    onClick={handleAddJob}
                                    disabled={!selectedProject || !newJobName.trim() || isAdding}
                                >
                                    {isAdding ? 'Adding...' : 'OK'}
                                </button>
                            )}
                            <button className="btn-close" onClick={closeAddModal}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isEditJobOpen} onClose={() => setIsEditJobOpen(false)} title="Edit Job" customClass="modal-sm">
                <div className="settings-form">
                    <div className="form-group">
                        <label>Project:</label>
                        <select value={selectedProject} disabled>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Job Name:</label>
                        <input value={newJobName} onChange={e => setNewJobName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Description:</label>
                        <textarea value={newJobDescription} onChange={e => setNewJobDescription(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Status:</label>
                        <select value={newJobStatus} onChange={e => setNewJobStatus(e.target.value)}>
                            <option value={1}>Active</option>
                            <option value={2}>Inactive</option>
                            <option value={3}>Archive</option>
                        </select>
                    </div>
                    <div className="modal-footer">
                        <button className="btn-primary" onClick={handleEditJob} disabled={!newJobName.trim()}>
                            OK
                        </button>
                        <button className="btn-close" onClick={() => setIsEditJobOpen(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default JobManagment;