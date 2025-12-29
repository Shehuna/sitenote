import React, { useEffect, useState, useRef, useMemo } from 'react';
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
    const [singleSelectedProject, setSingleSelectedProject] = useState('');
    const [bulkSelectedProject, setBulkSelectedProject] = useState('');
    const [isAddJobOpen, setIsAddJobOpen] = useState(false);
    const [isEditJobOpen, setIsEditJobOpen] = useState(false);
    const [allProjects, setAllProjects] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [modalProjectError, setModalProjectError] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [previousJobName, setPreviousJobName] = useState('');
    const [activeTab, setActiveTab] = useState('single');
    const [pasteContent, setPasteContent] = useState('');
    const [parsedJobs, setParsedJobs] = useState([]);
    const [errorMessages, setErrorMessages] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [jobSearchTerm, setJobSearchTerm] = useState('');
    const [singleProjectSearchTerm, setSingleProjectSearchTerm] = useState('');
    const [singleSearchedProjects, setSingleSearchedProjects] = useState([]);
    const [singleProjectLoading, setSingleProjectLoading] = useState(false);
    const [bulkProjectSearchTerm, setBulkProjectSearchTerm] = useState('');
    const [bulkSearchedProjects, setBulkSearchedProjects] = useState([]);
    const [bulkProjectLoading, setBulkProjectLoading] = useState(false);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const errorRef = useRef(null);
    const tableRef = useRef(null);
    const singleDebounceRef = useRef(null);
    const bulkDebounceRef = useRef(null);

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
            setProjectsLoading(true);
            loadAllProjects();
        }
    }, [isAddJobOpen]);

    useEffect(() => {
        if (singleDebounceRef.current) {
            clearTimeout(singleDebounceRef.current);
        }
        if (!singleProjectSearchTerm.trim()) {
            return;
        }
        singleDebounceRef.current = setTimeout(() => {
            loadSearchedProjects(singleProjectSearchTerm, setSingleSearchedProjects, setSingleProjectLoading);
        }, 300);
        return () => {
            if (singleDebounceRef.current) {
                clearTimeout(singleDebounceRef.current);
            }
        };
    }, [singleProjectSearchTerm]);

    useEffect(() => {
        if (bulkDebounceRef.current) {
            clearTimeout(bulkDebounceRef.current);
        }
        if (!bulkProjectSearchTerm.trim()) {
            return;
        }
        bulkDebounceRef.current = setTimeout(() => {
            loadSearchedProjects(bulkProjectSearchTerm, setBulkSearchedProjects, setBulkProjectLoading);
        }, 300);
        return () => {
            if (bulkDebounceRef.current) {
                clearTimeout(bulkDebounceRef.current);
            }
        };
    }, [bulkProjectSearchTerm]);

    useEffect(() => {
        if (activeTab === 'single') {
            setSelectedProject(singleSelectedProject);
        } else {
            setSelectedProject(bulkSelectedProject);
        }
    }, [activeTab, singleSelectedProject, bulkSelectedProject]);

    useEffect(() => {
        if (isEditJobOpen && selectedJob) {
            const job = jobs.find(j => j.id === selectedJob);
            if (job) {
                setNewJobName(job.name || '');
                setNewJobDescription(job.description || '');
                setNewJobStatus(job.status || 1);
                setSelectedProject(job.projectId || '');
                setPreviousJobName(job.name || '');
            }
        }
    }, [isEditJobOpen, selectedJob, jobs]);

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
            setAllProjects(projectsData);
            setJobs(jobsData);
        } catch {
            toast.error('Failed to load data');
        } finally {
            setPageLoading(false);
        }
    };

    const loadAllProjects = async () => {
        setModalProjectError(false);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Project/GetProjects`);
            if (res.ok) {
                const data = (await res.json()).projects || [];
                setAllProjects(data);
            } else {
                throw new Error();
            }
        } catch {
            setModalProjectError(true);
            toast.error('Failed to load projects');
        } finally {
            setProjectsLoading(false);
        }
    };

    const loadSearchedProjects = async (search = '', setSearched, setLoading) => {
        if (!search.trim()) {
            setSearched([]);
            return;
        }
        setLoading(true);
        setModalProjectError(false);
        try {
            const params = new URLSearchParams();
            params.append('q', search);
            params.append('userId', user);
            if (defWorkId) params.append('workspaceId', defWorkId);
            const url = `${process.env.REACT_APP_API_BASE_URL}/api/SiteNote/SearchProjects?${params.toString()}`;
            const res = await fetch(url);
            if (res.ok) {
                const jsonData = await res.json();
                const rawData = jsonData.results || [];
                const normalizedProjects = rawData.map(p => ({
                    id: p.projectId,
                    name: p.projectName,
                    workspaceId: p.workspaceId,
                    status: 1,
                    fullPath: p.fullPath
                }));
                const uniqueProjects = Array.from(new Map(normalizedProjects.map(p => [p.id, p])).values());
                setSearched(uniqueProjects);
            } else {
                throw new Error();
            }
        } catch {
            setModalProjectError(true);
            toast.error('Failed to load projects');
        } finally {
            setLoading(false);
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
                    projectId: singleSelectedProject,
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
        if (!bulkSelectedProject || parsedJobs.length === 0) {
            setErrorMessages(['Project and jobs required']);
            setIsAdding(false);
            return;
        }
        const dtos = parsedJobs.map(job => ({
            name: job.name.trim(),
            description: job.description?.trim() || job.name.trim(),
            projectId: parseInt(bulkSelectedProject),
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
        setSingleSelectedProject('');
        setBulkSelectedProject('');
        setPasteContent('');
        setParsedJobs([]);
        setIsReviewMode(false);
        setErrorMessages([]);
        setActiveTab('single');
        setModalProjectError(false);
        setSingleProjectSearchTerm('');
        setSingleSearchedProjects([]);
        setSingleProjectLoading(false);
        setBulkProjectSearchTerm('');
        setBulkSearchedProjects([]);
        setBulkProjectLoading(false);
    };

    const handleSingleSearchChange = (e) => {
        const newTerm = e.target.value;
        setSingleSearchedProjects([]);
        setSingleProjectLoading(!!newTerm.trim());
        setSingleProjectSearchTerm(newTerm);
    };

    const handleBulkSearchChange = (e) => {
        const newTerm = e.target.value;
        setBulkSearchedProjects([]);
        setBulkProjectLoading(!!newTerm.trim());
        setBulkProjectSearchTerm(newTerm);
    };

    const isAdmin = userRole === 'admin';

    const activeProjects = useMemo(() => {
        return allProjects.filter(p => p.workspaceId === defWorkId && p.status === 1);
    }, [allProjects, defWorkId]);

    const filteredJobs = useMemo(() => {
        const searchLower = jobSearchTerm.toLowerCase().trim();
        return jobs.filter(job => {
            const project = allProjects.find(p => p.id === job.projectId);
            if (!project || job.status === 3 || project.status === 3 || project.workspaceId !== defWorkId) return false;
            return job.name.toLowerCase().includes(searchLower) || project.name.toLowerCase().includes(searchLower);
        });
    }, [jobs, allProjects, jobSearchTerm, defWorkId]);

    return (
        <div className="settings-content" style={{ position: 'relative', minHeight: '400px' }}>
            <style jsx>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .full-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255,255,255,0.97);
                    backdrop-filter: blur(10px);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    border-radius: 12px;
                    text-align: center;
                    padding: 0;
                    box-sizing: border-box;
                }
                .spinner {
                    width: 60px;
                    height: 60px;
                    border: 6px solid #f3f3f3;
                    border-top: 6px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                    display: block;
                }
                .error-box {
                    padding: 12px;
                    background: #fff3e0;
                    border-radius: 6px;
                    text-align: center;
                    font-size: 0.95rem;
                }
                .search-wrapper {
                    position: relative;
                }
                .project-search-list {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    width: 100%;
                    max-height: 200px;
                    overflow-y: auto;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    background: white;
                    list-style: none;
                    padding: 0;
                    z-index: 10;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .project-search-list li {
                    padding: 10px 15px;
                    cursor: pointer;
                    transition: background 0.2s ease;
                }
                .project-search-list li:hover {
                    background: #f5f5f5;
                }
                .project-search-list li.selected {
                    background: #e3f2fd;
                }
                .dropdown-message {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    width: 100%;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 10px;
                    text-align: center;
                    z-index: 10;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    box-sizing: border-box;
                }
                input[type="text"], select, textarea {
                    box-sizing: border-box;
                }
                @media (max-width: 600px) {
                    .modal-md {
                        width: 90vw;
                    }
                    .settings-content {
                        min-height: auto;
                    }
                    .settings-action-buttons {
                        flex-direction: column;
                        gap: 10px;
                    }
                    .tab-container {
                        flex-direction: column;
                    }
                    .form-group {
                        margin-bottom: 15px;
                    }
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
                            <div className="search-wrapper">
                                <input
                                    type="text"
                                    value={jobSearchTerm}
                                    onChange={(e) => setJobSearchTerm(e.target.value)}
                                    placeholder="Search jobs..."
                                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                                />
                                {jobSearchTerm.trim() && filteredJobs.length === 0 && (
                                    <div className="dropdown-message error-box">
                                        No jobs match your search
                                    </div>
                                )}
                                {!jobSearchTerm.trim() && filteredJobs.length === 0 && (
                                    <div className="error-box">
                                        No jobs available
                                    </div>
                                )}
                                {filteredJobs.length > 0 && (
                                    <ul className="project-search-list">
                                        {filteredJobs.map(job => {
                                            const projectName = allProjects.find(p => p.id === job.projectId)?.name || 'Unknown';
                                            const isInactive = job.status !== 1;
                                            return (
                                                <li
                                                    key={job.id}
                                                    className={selectedJob === job.id ? 'selected' : ''}
                                                    onClick={() => setSelectedJob(job.id)}
                                                >
                                                    {job.name} (Project: {projectName}) {isInactive ? '(Inactive)' : ''}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
            <Modal isOpen={isAddJobOpen} onClose={closeAddModal} title="Add Job" customClass="modal-md">
                <div style={{ padding: '20px', position: 'relative' }}>
                    {(isAdding || projectsLoading) && (
                        <div className="full-overlay">
                            <div className="spinner" />
                            <p style={{fontSize:'1.2rem',fontWeight:'600',margin:0}}>
                                {projectsLoading ? 'Loading projects...' : activeTab === 'bulk' ? `Adding ${parsedJobs.length} job${parsedJobs.length > 1 ? 's' : ''}...` : 'Adding job...'}
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
                        {activeTab === 'single' && (
                            <>
                                <div className="form-group">
                                    <label>Project Search:</label>
                                    <div className="search-wrapper">
                                        <input
                                            type="text"
                                            value={singleProjectSearchTerm}
                                            onChange={handleSingleSearchChange}
                                            placeholder="Search projects..."
                                            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                                        />
                                        {singleProjectLoading && (
                                            <div className="dropdown-message">
                                                Loading...
                                            </div>
                                        )}
                                        {!singleProjectLoading && singleProjectSearchTerm.trim() && singleSearchedProjects.length === 0 && (
                                            <div className="dropdown-message error-box">
                                                No projects match your search
                                            </div>
                                        )}
                                        {!singleProjectLoading && singleSearchedProjects.length > 0 && (
                                            <ul className="project-search-list">
                                                {singleSearchedProjects.map(p => (
                                                    <li
                                                        key={p.id}
                                                        onClick={() => {
                                                            setSingleSelectedProject(p.id);
                                                            setSingleProjectSearchTerm('');
                                                            setSingleSearchedProjects([]);
                                                        }}
                                                    >
                                                        {p.fullPath}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Project:</label>
                                    {modalProjectError ? (
                                        <div className="error-box">
                                            Failed to load projects
                                        </div>
                                    ) : activeProjects.length === 0 ? (
                                        <div className="error-box">
                                            No active projects
                                        </div>
                                    ) : (
                                        <select
                                            value={singleSelectedProject}
                                            onChange={(e) => setSingleSelectedProject(e.target.value)}
                                        >
                                            <option value="">Select Project</option>
                                            {activeProjects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    )}
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
                            </>
                        )}
                        {activeTab === 'bulk' && (
                            <>
                                {!isReviewMode && (
                                    <>
                                        <div className="form-group">
                                            <label>Project Search:</label>
                                            <div className="search-wrapper">
                                                <input
                                                    type="text"
                                                    value={bulkProjectSearchTerm}
                                                    onChange={handleBulkSearchChange}
                                                    placeholder="Search projects..."
                                                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                                                />
                                                {bulkProjectLoading && (
                                                    <div className="dropdown-message">
                                                        Loading...
                                                    </div>
                                                )}
                                                {!bulkProjectLoading && bulkProjectSearchTerm.trim() && bulkSearchedProjects.length === 0 && (
                                                    <div className="dropdown-message error-box">
                                                        No projects match your search
                                                    </div>
                                                )}
                                                {!bulkProjectLoading && bulkSearchedProjects.length > 0 && (
                                                    <ul className="project-search-list">
                                                        {bulkSearchedProjects.map(p => (
                                                            <li
                                                                key={p.id}
                                                                onClick={() => {
                                                                    setBulkSelectedProject(p.id);
                                                                    setBulkProjectSearchTerm('');
                                                                    setBulkSearchedProjects([]);
                                                                }}
                                                            >
                                                                {p.fullPath}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Project:</label>
                                            {modalProjectError ? (
                                                <div className="error-box">
                                                    Failed to load projects
                                                </div>
                                            ) : activeProjects.length === 0 ? (
                                                <div className="error-box">
                                                    No active projects
                                                </div>
                                            ) : (
                                                <select
                                                    value={bulkSelectedProject}
                                                    onChange={(e) => setBulkSelectedProject(e.target.value)}
                                                >
                                                    <option value="">Select Project</option>
                                                    {activeProjects.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                        <div className="form-group">
                                            <label>Paste from Excel (Name[Tab]Description per line):</label>
                                            <textarea
                                                value={pasteContent}
                                                onChange={handlePasteChange}
                                                placeholder="Job A Description A&#10;Job B Description B"
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
                            </>
                        )}
                        <div className="modal-footer" style={{marginTop:'30px'}}>
                            {activeTab === 'single' && (
                                <button
                                    className="btn-primary"
                                    onClick={handleAddJob}
                                    disabled={!singleSelectedProject || !newJobName.trim() || isAdding}
                                >
                                    {isAdding ? 'Adding...' : 'OK'}
                                </button>
                            )}
                            {activeTab === 'bulk' && isReviewMode && (
                                <button
                                    className="btn-primary"
                                    onClick={handleAddBulkJobs}
                                    disabled={!bulkSelectedProject || parsedJobs.length === 0 || isAdding}
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
                            {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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