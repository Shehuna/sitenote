import React, { useEffect, useState, useRef, useMemo } from 'react';
import Modal from '../Modals/Modal';
import toast from 'react-hot-toast';
import '../Modals/SettingsModal.css'
const JobManagment = ({ defWorkId, updateProjectsAndJobs }) => {
    const [selectedJob, setSelectedJob] = useState('');
    const [newJobName, setNewJobName] = useState('');
    const [user, setUser] = useState('');
    const [userRole, setUserRole] = useState('');
    const [newJobStatus, setNewJobStatus] = useState(1);
    const [newJobDescription, setNewJobDescription] = useState('');
    const [newJobType, setNewJobType] = useState('');
    const [newJobPriority, setNewJobPriority] = useState(null);
    const [newJobStartDate, setNewJobStartDate] = useState('');
    const [newJobEndDate, setNewJobEndDate] = useState('');
    const [newJobActualEndDate, setNewJobActualEndDate] = useState('');
    const [newJobManagerId, setNewJobManagerId] = useState(null);
    const [selectedProject, setSelectedProject] = useState('');
    const [singleSelectedProject, setSingleSelectedProject] = useState('');
    const [bulkSelectedProject, setBulkSelectedProject] = useState('');
    const [isAddJobOpen, setIsAddJobOpen] = useState(false);
    const [isEditJobOpen, setIsEditJobOpen] = useState(false);
    const [allProjects, setAllProjects] = useState([]);
    const [workspaceUsers, setWorkspaceUsers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [modalProjectError, setModalProjectError] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('single');
    const [pasteContent, setPasteContent] = useState('');
    const [parsedJobs, setParsedJobs] = useState([]);
    const [errorMessages, setErrorMessages] = useState([]);
    const [editErrorMessages, setEditErrorMessages] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [jobSearchTerm, setJobSearchTerm] = useState('');
    const [singleProjectSearchTerm, setSingleProjectSearchTerm] = useState('');
    const [singleSearchedProjects, setSingleSearchedProjects] = useState([]);
    const [singleProjectLoading, setSingleProjectLoading] = useState(false);
    const [bulkProjectSearchTerm, setBulkProjectSearchTerm] = useState('');
    const [bulkSearchedProjects, setBulkSearchedProjects] = useState([]);
    const [bulkProjectLoading, setBulkProjectLoading] = useState(false);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const errorRef = useRef(null);
    const editErrorRef = useRef(null);
    const tableRef = useRef(null);
    const singleDebounceRef = useRef(null);
    const bulkDebounceRef = useRef(null);
    const modalContentRef = useRef(null);
    const editModalContentRef = useRef(null);
    const editTopRef = useRef(null);
    const addTopRef = useRef(null);
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
            setUsersLoading(true);
            loadAllProjects();
            loadWorkspaceUsers();
            resetFormStates();
            setErrorMessages([]);
        }
    }, [isAddJobOpen]);
    useEffect(() => {
        if (isEditJobOpen) {
            setUsersLoading(true);
            loadWorkspaceUsers();
            setEditErrorMessages([]);
        }
    }, [isEditJobOpen]);
    useEffect(() => {
        if (isEditJobOpen && selectedJob) {
            setEditLoading(true);
            fetchJobData();
        }
    }, [isEditJobOpen, selectedJob]);
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
        if (errorMessages.length > 0 && errorRef.current) {
            errorRef.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [errorMessages]);
    useEffect(() => {
        if (editErrorMessages.length > 0 && editErrorRef.current) {
            editErrorRef.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [editErrorMessages]);
    useEffect(() => {
        if (isAdding && modalContentRef.current) {
            try { modalContentRef.current.scrollTop = 0; } catch (e) { }
            try {
                const container = modalContentRef.current.closest && modalContentRef.current.closest('.modal-container');
                if (container) container.scrollTop = 0;
            } catch (e) { }
        }
    }, [isAdding]);
    useEffect(() => {
        if (isEditing && editModalContentRef.current) {
            try { editModalContentRef.current.scrollTop = 0; } catch (e) { }
            try {
                const container = editModalContentRef.current.closest && editModalContentRef.current.closest('.modal-container');
                if (container) container.scrollTop = 0;
            } catch (e) { }
        }
    }, [isEditing]);
    useEffect(() => {
        if (isAddJobOpen && modalContentRef.current) {
            try { modalContentRef.current.scrollTop = 0; } catch (e) { }
            try {
                const container = modalContentRef.current.closest && modalContentRef.current.closest('.modal-container');
                if (container) container.scrollTop = 0;
            } catch (e) { }
        }
    }, [isAddJobOpen]);
    useEffect(() => {
        if (isEditJobOpen && editModalContentRef.current) {
            try { editModalContentRef.current.scrollTop = 0; } catch (e) { }
            try {
                const container = editModalContentRef.current.closest && editModalContentRef.current.closest('.modal-container');
                if (container) container.scrollTop = 0;
            } catch (e) { }
        }
    }, [isEditJobOpen]);
    const resetFormStates = () => {
        setNewJobName('');
        setNewJobDescription('');
        setNewJobType('');
        setNewJobPriority(null);
        setNewJobStartDate('');
        setNewJobEndDate('');
        setNewJobActualEndDate('');
        setNewJobManagerId(null);
        setNewJobStatus(1);
        setSelectedProject('');
        setSingleSelectedProject('');
        setBulkSelectedProject('');
        setPasteContent('');
        setParsedJobs([]);
        setIsReviewMode(false);
        setActiveTab('single');
        setSingleProjectSearchTerm('');
        setSingleSearchedProjects([]);
        setBulkProjectSearchTerm('');
        setBulkSearchedProjects([]);
    };
    const scrollToTopImmediate = () => {
        try {
            if (typeof window !== 'undefined' && window.scrollTo) {
                window.scrollTo({ top: 0, behavior: 'auto' });
            }
        } catch (e) { }
        try { if (document && document.documentElement) document.documentElement.scrollTop = 0; } catch (e) { }
        try { if (document && document.body) document.body.scrollTop = 0; } catch (e) { }
    };
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
    const loadWorkspaceUsers = async () => {
        try {
            const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/UserWorkspace/GetUsersByWorkspaceId/${defWorkId}`);
            if (res.ok) {
                const data = await res.json();
                setWorkspaceUsers(data.users || []);
            } else {
                throw new Error();
            }
        } catch {
            toast.error('Failed to load users');
        } finally {
            setUsersLoading(false);
        }
    };
    const fetchJobData = async () => {
        setEditLoading(true);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Job/GetJobById/${selectedJob}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            const job = data.job;
            setNewJobName(job.name || '');
            setNewJobDescription(job.description || '');
            setNewJobStatus(job.status || 1);
            setNewJobType(job.type || '');
            setNewJobPriority(job.jobPriority ?? null);
            setNewJobStartDate(job.startDate ? new Date(job.startDate).toISOString().split('T')[0] : '');
            setNewJobEndDate(job.endDate ? new Date(job.endDate).toISOString().split('T')[0] : '');
            setNewJobActualEndDate(job.actualEndDate ? new Date(job.actualEndDate).toISOString().split('T')[0] : '');
            setNewJobManagerId(job.managerId ?? null);
            setSelectedProject(job.projectId || '');
        } catch {
            toast.error('Failed to load job data');
        } finally {
            setEditLoading(false);
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
        if (!isAdding) {
            setIsAdding(true);
            if (addTopRef.current) {
                addTopRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
            }
        }
        setErrorMessages([]);
        try {
            const bodyData = {
                name: newJobName.trim(),
                description: newJobDescription.trim(),
                status: newJobStatus,
                projectId: singleSelectedProject,
                userId: user
            };
            if (newJobType.trim()) {
                bodyData.type = newJobType.trim();
            }
            if (newJobPriority !== null) {
                bodyData.jobPriority = newJobPriority;
            }
            if (newJobStartDate) {
                bodyData.startDate = new Date(newJobStartDate).toISOString();
            }
            if (newJobEndDate) {
                bodyData.endDate = new Date(newJobEndDate).toISOString();
            }
            if (newJobActualEndDate) {
                bodyData.actualEndDate = new Date(newJobActualEndDate).toISOString();
            }
            if (newJobManagerId !== null) {
                bodyData.managerId = newJobManagerId;
            }
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Job/AddJob`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                let errors = [];
                if (Array.isArray(errorData.errors)) errors = errorData.errors;
                else if (errorData.errors && typeof errorData.errors === 'object') {
                    Object.values(errorData.errors).flat().forEach(msg => errors.push(msg));
                } else if (errorData.message) errors = [errorData.message];
                setErrorMessages(errors);
                if (errorRef.current) {
                    errorRef.current.scrollIntoView({ behavior: 'auto' });
                }
                return;
            }
            const data = await response.json();
            toast.success('Job saved successfully');
            try {
                await grantJobPermission(data.job.id);
                // await updateProjectsAndJobs();
                await fetchInitialData();
            } catch {
                toast.error('Failed to refresh data');
            }
            scrollToTopImmediate();
            closeAddModal();
        } catch {
            toast.error('Network error');
        } finally {
            setIsAdding(false);
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
        try {
            const bodyData = {
                id: selectedJob,
                name: newJobName.trim(),
                description: newJobDescription.trim(),
                status: newJobStatus
            };
            if (newJobType.trim()) {
                bodyData.type = newJobType.trim();
            }
            if (newJobPriority !== null) {
                bodyData.jobPriority = newJobPriority;
            }
            if (newJobStartDate) {
                bodyData.startDate = new Date(newJobStartDate).toISOString();
            } else {
                bodyData.startDate = null;
            }
            if (newJobEndDate) {
                bodyData.endDate = new Date(newJobEndDate).toISOString();
            } else {
                bodyData.endDate = null;
            }
            if (newJobActualEndDate) {
                bodyData.actualEndDate = new Date(newJobActualEndDate).toISOString();
            } else {
                bodyData.actualEndDate = null;
            }
            if (newJobManagerId !== null) {
                bodyData.managerId = newJobManagerId;
            } else {
                bodyData.managerId = null;
            }
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Job/UpdateJob/${selectedJob}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });
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
            try {
                // await updateProjectsAndJobs();
                await fetchInitialData();
            } catch {
                toast.error('Failed to refresh data');
            }
            scrollToTopImmediate();
            closeEditModal();
        } catch {
            toast.error('Network error');
        } finally {
            setIsEditing(false);
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
        if (!isAdding) {
            setIsAdding(true);
            if (addTopRef.current) {
                addTopRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
            }
        }
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
            try {
                const grantPromises = data.jobs.map(job => grantJobPermission(job.id));
                await Promise.all(grantPromises);
                // await updateProjectsAndJobs();
                await fetchInitialData();
            } catch {
                toast.error('Failed to refresh data');
            }
            scrollToTopImmediate();
            closeAddModal();
        } catch {
            toast.error('Network error');
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
        resetFormStates();
        setErrorMessages([]);
        setModalProjectError(false);
        setSingleProjectLoading(false);
        setBulkProjectLoading(false);
    };
    const closeEditModal = () => {
        setIsEditJobOpen(false);
        resetFormStates();
        setEditErrorMessages([]);
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
                    justify-content: flex-start;
                    z-index: 9999;
                    border-radius: 12px;
                    text-align: center;
                    padding: 0;
                    box-sizing: border-box;
                    padding-top: 80px;
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
                .modal-md {
                    width: 600px;
                    max-width: 90vw;
                    height: auto;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                .modal-sm {
                    width: 600px;
                    max-width: 90vw;
                    height: auto;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                .form-container {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                }
                .form-group.full-width {
                    grid-column: span 2;
                }
                .form-group {
                    margin-bottom: 0;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 600;
                }
                .form-group input, .form-group select, .form-group textarea {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 1rem;
                }
                .form-group textarea {
                    min-height: 100px;
                    resize: vertical;
                }
                @media (max-width: 600px) {
                    .modal-md {
                        width: 90vw;
                        max-height: 90vh;
                    }
                    .modal-sm {
                        width: 90vw;
                        max-height: 90vh;
                    }
                    .form-container {
                        grid-template-columns: 1fr;
                    }
                    .form-group.full-width {
                        grid-column: span 1;
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
                <div ref={modalContentRef} style={{ padding: '20px', position: 'relative' }}>
                    <div ref={addTopRef}></div>
                    {(isAdding || projectsLoading || usersLoading) && (
                        <div className="full-overlay">
                            <div className="spinner" />
                            <p style={{fontSize:'1.2rem',fontWeight:'600',margin:0}}>
                                {projectsLoading ? 'Loading projects...' : usersLoading ? 'Loading users...' : activeTab === 'bulk' ? `Adding ${parsedJobs.length} job${parsedJobs.length > 1 ? 's' : ''}...` : 'Adding job...'}
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
                            <div className="form-container">
                                <div className="form-group full-width">
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
                                        onChange={(e) => setNewJobType(e.target.value)}
                                        placeholder="Enter job type"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Priority:</label>
                                    <select value={newJobPriority ?? ''} onChange={e => setNewJobPriority(e.target.value === '' ? null : parseInt(e.target.value))}>
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
                                        onChange={(e) => setNewJobStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>End Date:</label>
                                    <input
                                        type="date"
                                        value={newJobEndDate}
                                        onChange={(e) => setNewJobEndDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Actual End Date:</label>
                                    <input
                                        type="date"
                                        value={newJobActualEndDate}
                                        onChange={(e) => setNewJobActualEndDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Manager:</label>
                                    <select value={newJobManagerId ?? ''} onChange={e => setNewJobManagerId(e.target.value === '' ? null : parseInt(e.target.value))}>
                                        <option value="">Select Manager</option>
                                        {workspaceUsers.map(u => (
                                            <option key={u.userId} value={u.userId}>{`${u.fname} ${u.lname} (${u.email})`}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="form-group full-width">
                                    <label>Job Description:</label>
                                    <textarea
                                        value={newJobDescription}
                                        onChange={(e) => setNewJobDescription(e.target.value)}
                                        placeholder="Enter job description"
                                    />
                                </div>
                            </div>
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
                        <div className="modal-footer" style={{marginTop:'30px', gridColumn: 'span 2'}}>
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
            <Modal isOpen={isEditJobOpen} onClose={closeEditModal} title="Edit Job" customClass="modal-sm">
                <div ref={editModalContentRef} className="settings-form" style={{ position: 'relative' }}>
                    <div ref={editTopRef}></div>
                    {(usersLoading || editLoading || isEditing) && (
                        <div className="full-overlay">
                            <div className="spinner" />
                            <p style={{fontSize:'1.2rem',fontWeight:'600',margin:0}}>{usersLoading ? 'Loading users...' : editLoading ? 'Loading job...' : 'Updating job...'}</p>
                        </div>
                    )}
                    <div ref={editErrorRef} style={{marginBottom:'15px', gridColumn: 'span 2'}}>
                        {editErrorMessages.length > 0 && (
                            <div className="error-message">
                                <ul style={{color:'#d32f2f',margin:'8px 0'}}>
                                    {editErrorMessages.map((msg,i) => <li key={i}>{msg}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="form-container">
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
                                onChange={(e) => setNewJobType(e.target.value)}
                                placeholder="Enter job type"
                            />
                        </div>
                        <div className="form-group">
                            <label>Priority:</label>
                            <select value={newJobPriority ?? ''} onChange={e => setNewJobPriority(e.target.value === '' ? null : parseInt(e.target.value))}>
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
                                onChange={(e) => setNewJobStartDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>End Date:</label>
                            <input
                                type="date"
                                value={newJobEndDate}
                                onChange={(e) => setNewJobEndDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Actual End Date:</label>
                            <input
                                type="date"
                                value={newJobActualEndDate}
                                onChange={(e) => setNewJobActualEndDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Manager:</label>
                            <select value={newJobManagerId ?? ''} onChange={e => setNewJobManagerId(e.target.value === '' ? null : parseInt(e.target.value))}>
                                <option value="">Select Manager</option>
                                {workspaceUsers.map(u => (
                                    <option key={u.userId} value={u.userId}>{`${u.fname} ${u.lname} (${u.email})`}</option>
                                ))}
                            </select>
                        </div>
                         <div className="form-group full-width">
                            <label>Description:</label>
                            <textarea value={newJobDescription} onChange={e => setNewJobDescription(e.target.value)} />
                        </div>
                    </div>
                    <div className="modal-footer" style={{marginTop:'30px', gridColumn: 'span 2'}}>
                        <button className="btn-primary" onClick={handleEditJob} disabled={!newJobName.trim() || isEditing}>
                            {isEditing ? 'Updating...' : 'OK'}
                        </button>
                        <button className="btn-close" onClick={closeEditModal}>
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
export default JobManagment;