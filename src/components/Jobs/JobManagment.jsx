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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [previousJobName, setPreviousJobName] = useState('');
    const [activeTab, setActiveTab] = useState('single');
    const [pasteContent, setPasteContent] = useState('');
    const [parsedJobs, setParsedJobs] = useState([]);
    const [errorMessages, setErrorMessages] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);

    const errorRef = useRef(null);
    const tableRef = useRef(null);
    const formRef = useRef(null);

    useEffect(() => {
        fetchInitialData();
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser?.id || '');
        setUserRole((storedUser?.role || '').toLowerCase());
    }, []);

    useEffect(() => {
        if (isEditJobOpen && selectedJob) {
            const job = jobs.find(j => j.id === parseInt(selectedJob));
            if (job) {
                setNewJobName(job.name || '');
                setNewJobStatus(job.status || 1);
                setSelectedProject(job.projectId ? job.projectId.toString() : '');
                setNewJobDescription(job.description || '');
            }
        } else if (!isEditJobOpen) {
            setNewJobName('');
            setNewJobStatus(1);
            setSelectedProject('');
            setNewJobDescription('');
        }
    }, [isEditJobOpen, selectedJob, jobs]);

    useEffect(() => {
        if (newJobName && (!newJobDescription || newJobDescription === previousJobName)) {
            setNewJobDescription(newJobName);
        }
    }, [newJobName]);

    useEffect(() => {
        setPreviousJobName(newJobName);
    }, [newJobName]);

    useEffect(() => {
        if ((errorMessages.length > 0 || error) && errorRef.current) {
            errorRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [errorMessages, error]);

    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [projectsRes, jobsRes] = await Promise.all([
                fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Project/GetProjects`),
                fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Job/GetJobs`)
            ]);

            if (!projectsRes.ok) throw new Error(`Projects API error: ${projectsRes.status}`);
            if (!jobsRes.ok) throw new Error(`Jobs API error: ${jobsRes.status}`);

            const projectsData = (await projectsRes.json()).projects || [];
            const jobsData = (await jobsRes.json()).jobs || [];

            setProjects(projectsData);
            setJobs(jobsData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddJob = async () => {
        setIsAdding(true);
        setError(null);
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
            toast.success('Job saved Successfully');

            // Refresh both parent and local job list
            await updateProjectsAndJobs();
            await fetchInitialData();

            closeAddModal();
        } catch (err) {
            setError(err.message);
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
                    name: newJobName,
                    description: newJobDescription,
                    status: newJobStatus
                })
            });

            if (!response.ok) throw new Error('Failed to update job');

            toast.success('Job updated successfully');
            await updateProjectsAndJobs();
            await fetchInitialData();
            setIsEditJobOpen(false);
        } catch (err) {
            setError(err.message);
        }
    };

    const grantJobPermission = async (jobid) => {
        try {
            await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/UserJobAuth/AddUserJob`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user, jobId: jobid, userIDScreen: user })
            });
        } catch (error) {
            toast.error('Error updating workspace');
        }
    };

    const handleAddBulkJobs = async () => {
        setIsAdding(true);
        setError(null);
        setErrorMessages([]);

        if (!selectedProject || parsedJobs.length === 0) {
            setError('Project and jobs are required');
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
            toast.success(`${data.jobs.length} jobs saved successfully`);

            await updateProjectsAndJobs();
            await fetchInitialData();

            closeAddModal();
        } catch (err) {
            setError(err.message);
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
            tableRef.current?.scrollTo(0, tableRef.current.scrollHeight);
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
        setError(null);
        setErrorMessages([]);
        setActiveTab('single');
    };

    const isAdmin = userRole === 'admin';

    return (
        <div className="settings-content">

            <style jsx>{`
                .loading-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(255, 255, 255, 0.94);
                    backdrop-filter: blur(6px);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    border-radius: 12px;
                }
                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 5px solid #f0f0f0;
                    border-top: 5px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 16px;
                }
                .loading-text {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #333;
                    margin: 0;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .modal-relative {
                    position: relative;
                }
            `}</style>

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
                                <option key={job.id} value={job.id} className={isInactive ? 'inactive-job' : ''}>
                                    {job.name} (Project: {projectName}) {isInactive ? '(Inactive)' : ''}
                                </option>
                            );
                        })}
                </select>
            </div>

            <Modal
                isOpen={isAddJobOpen}
                onClose={closeAddModal}
                title="Add Job"
                customClass="modal-md"
            >
                <div ref={formRef} className="settings-form modal-relative" style={{ overflowY: 'auto', maxHeight: '80vh' }}>

                    {isAdding && (
                        <div className="loading-overlay">
                            <div className="spinner" />
                            <p className="loading-text">
                                {activeTab === 'bulk'
                                    ? `Adding ${parsedJobs.length} job${parsedJobs.length > 1 ? 's' : ''}...`
                                    : 'Adding job...'}
                            </p>
                        </div>
                    )}

                    <div ref={errorRef} style={{ marginBottom: '15px' }}>
                        {errorMessages.length > 0 && (
                            <div className="error-message">
                                <ul style={{ color: '#d32f2f' }}>
                                    {errorMessages.map((msg, i) => <li key={i}>{msg}</li>)}
                                </ul>
                            </div>
                        )}
                        {error && <div className="error-message">{error}</div>}
                    </div>

                    <div className="tab-container" style={{ marginBottom: '20px' }}>
                        <button className={`tab-button ${activeTab === 'single' ? 'active' : ''}`} onClick={() => setActiveTab('single')}>
                            Single Add
                        </button>
                        {isAdmin && (
                            <button className={`tab-button ${activeTab === 'bulk' ? 'active' : ''}`} onClick={() => setActiveTab('bulk')}>
                                Bulk Add
                            </button>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Project:</label>
                        <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} disabled={isAdding}>
                            <option value="">Select Project</option>
                            {projects
                                .filter(p => p.workspaceId === defWorkId && p.status === 1)
                                .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    {activeTab === 'single' ? (
                        <>
                            <div className="form-group">
                                <label>Job Name:</label>
                                <input
                                    type="text"
                                    value={newJobName}
                                    onChange={(e) => setNewJobName(e.target.value)}
                                    placeholder="Enter job name"
                                    disabled={isAdding}
                                />
                            </div>
                            <div className="form-group">
                                <label>Job Description:</label>
                                <textarea
                                    value={newJobDescription}
                                    onChange={(e) => setNewJobDescription(e.target.value)}
                                    placeholder="Enter job description"
                                    disabled={isAdding}
                                />
                            </div>
                        </>
                    ) : !isReviewMode ? (
                        <>
                            <div className="form-group">
                                <label>Paste from Excel (Name\tDescription per line):</label>
                                <textarea
                                    value={pasteContent}
                                    onChange={handlePasteChange}
                                    placeholder="Paste from Excel (Name\tDescription per line)"
                                    className="modern-textarea"
                                    style={{ minHeight: '150px' }}
                                    disabled={isAdding}
                                />
                            </div>
                            <div className="button-group">
                                <button onClick={handleReview} className="btn-primary" disabled={isAdding}>Review</button>
                                <button onClick={handleClearPaste} className="btn-danger">Clear</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h4>Review Jobs</h4>
                            <div ref={tableRef} className="table-wrapper" style={{ minHeight: '200px', maxHeight: '300px', overflowY: 'auto' }}>
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
                                                        disabled={isAdding}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        value={job.description}
                                                        onChange={(e) => handleEditParsedJob(index, 'description', e.target.value)}
                                                        className="modern-input"
                                                        disabled={isAdding}
                                                    />
                                                </td>
                                                <td>
                                                    <button 
        onClick={() => handleDeleteRow(index)} 
        className="icon-button danger" 
        disabled={isAdding}
        title="Delete this job"
    >
        <i className="fas fa-trash" ></i>
    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="button-group">
                                <button 
                                    onClick={handleAddNewRow} 
                                    className="icon-button secondary" 
                                    disabled={isAdding}
                                    title="Add new row"
                                >
                                    <i className="fas fa-plus"></i>
                                </button>
                                <button onClick={handleAddBulkJobs} className="btn-primary" disabled={isAdding}>
                                    {isAdding ? 'Adding...' : 'Add All'}
                                </button>
                                <button onClick={() => setIsReviewMode(false)} className="btn-secondary" disabled={isAdding}>Back to Paste</button>
                                <button onClick={handleClearPaste} className="btn-danger" disabled={isAdding}>Clear</button>
                            </div>
                        </>
                    )}

                    <div className="modal-footer">
                        {activeTab === 'single' && (
                            <button className="btn-primary" onClick={handleAddJob} disabled={!selectedProject || !newJobName || isAdding}>
                                {isAdding ? 'Adding...' : 'OK'}
                            </button>
                        )}
                        <button className="btn-close" onClick={closeAddModal} disabled={isAdding}>
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isEditJobOpen}
                onClose={() => {
                    setNewJobName('');
                    setNewJobDescription('');
                    setNewJobStatus(1);
                    setSelectedProject('');
                    setIsEditJobOpen(false);
                }}
                title="Edit Job"
                customClass="modal-sm"
            >
                <div className="settings-form">
                    <div className="form-group">
                        <label>Project:</label>
                        <select value={selectedProject} disabled>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
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
                    <div className="form-group">
                        <label>Status:</label>
                        <select value={newJobStatus} onChange={(e) => setNewJobStatus(e.target.value)}>
                            <option value="1">Active</option>
                            <option value="2">Inactive</option>
                            <option value="3">Archive</option>
                        </select>
                    </div>
                    <div className="modal-footer">
                        <button className="btn-primary" onClick={handleEditJob} disabled={!newJobName}>
                            OK
                        </button>
                        <button className="btn-close" onClick={() => {
                            setNewJobName('');
                            setNewJobDescription('');
                            setNewJobStatus(1);
                            setSelectedProject('');
                            setIsEditJobOpen(false);
                        }}>
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default JobManagment;