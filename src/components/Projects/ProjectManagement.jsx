import React, { useEffect, useState, useMemo, useCallback } from 'react'
import Modal from '../Modals/Modal';
import toast from 'react-hot-toast';
import '../Modals/SettingsModal.css'

const ProjectManagement = ({workspaceId, updateProjectsAndJobs}) => {
    const [projects, setProjects] = useState([])
    const [filteredProjects, setFilteredProjects] = useState([])
    const [selectedProject, setSelectedProject] = useState('')
    const [newProjectName, setNewProjectName] = useState('');
    const [user, setUser] = useState('');
    const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
    const [newProjectDescription, setNewProjectDescription] = useState('');
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    const [newProjectStatus, setNewProjectStatus] = useState(1);
    const [workspaceName, setWorkspaceName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [previousProjectName, setPreviousProjectName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [workspaces, setWorkspaces] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false); 

    const API_URL = process.env.REACT_APP_API_BASE_URL
    
    const handleKeyDown = useCallback((event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault(); 
            if (isAddProjectOpen && newProjectName && !isSubmitting) {
                handleAddProject();
            } else if (isEditProjectOpen && newProjectName && !isSubmitting) {
                handleEditProject();
            }
        }
    }, [isAddProjectOpen, isEditProjectOpen, newProjectName, isSubmitting]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    useEffect(() => {
        fetchWorkspacesById();
        fetchWorkspaces();
        fetchProjects();
        const user = JSON.parse(localStorage.getItem('user'));
        setUser(user.id)
    }, []);
    
    const fetchWorkspacesById = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/Workspace/GetWorkspaceById/${workspaceId}`,{
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Error fetching workspace data!');
            }
            
            const data = await response.json();
            setWorkspaceName(data.workspace.name)
        } catch (err) {
            setError(err.message);
            console.error('Error fetching Workspace by ID:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkspaces = async () => {
        try {
            const response = await fetch(`${API_URL}/api/Workspace/GetWorkspaces`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Error fetching workspaces data!');
            }
            
            const data = await response.json();
            setWorkspaces(data.workspaces || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching workspaces:', err);
        }
    };
    
    useEffect(() => {
        if (isEditProjectOpen && selectedProject) {
            const project = filteredProjects.find(p => p.id === parseInt(selectedProject));
            if (project) {
                setNewProjectName(project.name || '');
                setNewProjectStatus(project.status || 1);
                setNewProjectDescription(project.description || '');
            }
        } else if (!isEditProjectOpen) {
            setNewProjectName('');
            setNewProjectStatus(1);
            setNewProjectDescription('');
        }
    }, [isEditProjectOpen, selectedProject, filteredProjects]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/Project/GetProjects`,{
                method: 'GET'
            });
            
            if (response.ok) {
                const data = await response.json();
                const result = data.projects
                const filterResults = result.filter((res)=>{
                    return res.workspaceId == workspaceId 
                })
                setProjects(result || []);
                setFilteredProjects(filterResults || []);
            }
            else{
                throw new Error('Error fetching projects data!');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error fetching projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const getWorkspaceNameById = (workspaceId) => {
        const workspace = workspaces.find(w => w.id === parseInt(workspaceId));
        return workspace ? workspace.name : `Workspace ${workspaceId}`;
    };

    const searchedProjects = useMemo(() => {
        if (!searchQuery.trim()) {
            return filteredProjects;
        }
        
        const query = searchQuery.toLowerCase().trim();
        return filteredProjects.filter(project => {
            const projectName = project.name?.toLowerCase() || '';
            const projectDescription = project.description?.toLowerCase() || '';
            const workspaceName = getWorkspaceNameById(project.workspaceId).toLowerCase();
            
            return projectName.includes(query) || 
                   projectDescription.includes(query) ||
                   workspaceName.includes(query);
        });
    }, [filteredProjects, searchQuery, workspaces]);

    useEffect(() => {
        if (newProjectName && (!newProjectDescription || newProjectDescription === previousProjectName)) {
            setNewProjectDescription(newProjectName);
        }
    }, [newProjectName]);

    useEffect(() => {
        setPreviousProjectName(newProjectName);
    }, [newProjectName]);

    const resetFormStates = () => {
        setNewProjectName('');
        setNewProjectDescription('');
        setNewProjectStatus(1);
        setSelectedWorkspace('');
        setError(null);
    };

    const handleAddProject = async () => {
        if (isSubmitting) return;
        
        setIsSubmitting(true);
        try {
            const finalDescription = newProjectDescription.trim() || newProjectName;
            const response = await fetch(`${API_URL}/api/Project/AddProject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    name: newProjectName, 
                    description: finalDescription, 
                    workspaceId: workspaceId,
                    userId: user
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to add project');
            }
            
            toast.success("Project Added Successfully");
            
            setIsAddProjectOpen(false);
            resetFormStates();
            
            await updateProjectsAndJobs();
            await fetchProjects();
            
        } catch (err) {
            setError(err.message);
            toast.error(err.message || "Failed to add project");
            console.error('Error adding project:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditProject = async () => {
        if (isSubmitting) return;
        
        setIsSubmitting(true);
        try {
            const finalDescription = newProjectDescription.trim() || newProjectName;
            const response = await fetch(`${API_URL}/api/Project/UpdateProject/${selectedProject}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: selectedProject,
                    name: newProjectName,
                    description: finalDescription,
                    status: newProjectStatus
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update project');
            }
            
            toast.success("Project Updated Successfully");
            
            setIsEditProjectOpen(false);
            resetFormStates();
            
            await fetchProjects();
            
        } catch (err) {
            setError(err.message);
            toast.error(err.message || "Failed to update project");
            console.error('Error updating project:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Clear search query
    const handleClearSearch = () => {
        setSearchQuery('');
    };

    const closeAddModal = () => {
        resetFormStates();
        setIsAddProjectOpen(false);
    };

    const closeEditModal = () => {
        resetFormStates();
        setIsEditProjectOpen(false);
    };

    return (
        <div className="settings-content">
            <div className="settings-action-buttons">
                <button className="btn-primary" onClick={() => setIsAddProjectOpen(true)}>
                    Add Project
                </button>
                <button className="btn-secondary" onClick={() => setIsEditProjectOpen(true)} disabled={!selectedProject}>
                    Edit Project
                </button>
            </div>

            <div className="settings-lookup-list">
                <div className="project-search-container">
                    <div className="search-input-wrapper">
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="project-search-input"
                        />
                        {searchQuery && (
                            <button 
                                className="clear-search-btn" 
                                onClick={handleClearSearch}
                                title="Clear search"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <div className="search-results-info">
                            Found {searchedProjects.length} project(s)
                        </div>
                    )}
                </div>

                <select
                    size="5"
                    className="lookup-select"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                >
                    <option value="">Select a Project</option>
                    {searchedProjects.length > 0 ? (
                        searchedProjects
                        .filter(project => project.status !== 3)
                        .map(project => (
                            <option
                            key={project.id}
                            value={project.id}
                            className={project.status !== 1 ? 'inactive-project' : ''}
                            >
                            {workspaceName} → {project.name} {project.status !== 1 ? '(Inactive)' : ''}
                            </option>
                        ))
                    ) : (
                        <option value="" disabled>
                            {searchQuery ? 'No projects found' : 'No projects available'}
                        </option>
                    )}
                </select>
            </div>

            <Modal
                isOpen={isAddProjectOpen}
                onClose={closeAddModal}
                title="Add Project"
                disableClose={isSubmitting}
            >
                <div className="settings-form">
                    <div className="form-group">
                        <h4>Workspace: {workspaceName}</h4>
                    </div>
                    <div className="form-group">
                        <label>Project Name:</label>
                        <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Enter project name"
                            autoFocus
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-group">
                        <label>Project Description:</label>
                        <textarea
                            value={newProjectDescription}
                            onChange={(e) => setNewProjectDescription(e.target.value)}
                            placeholder="Enter project description"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="modal-footer">
                        <button
                            className="btn-primary"
                            onClick={handleAddProject}
                            disabled={!newProjectName || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> Adding...
                                </>
                            ) : 'OK'}
                        </button>
                        <button
                            className="btn-close"
                            onClick={closeAddModal}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
            
            <Modal
                isOpen={isEditProjectOpen}
                onClose={closeEditModal}
                title="Edit Project"
                disableClose={isSubmitting}
            >
                <div className="settings-form">
                    <div className="form-group">
                        <label>Project Name:</label>
                        <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Enter project name"
                            autoFocus
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-group">
                        <label>Status:</label>
                        <select
                            value={newProjectStatus}
                            onChange={(e) => setNewProjectStatus(e.target.value)}
                            disabled={isSubmitting}
                        >
                            <option value="1">Active</option>
                            <option value="2">Inactive</option>
                            <option value="3">Archive</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Project Description:</label>
                        <textarea
                            value={newProjectDescription}
                            onChange={(e) => setNewProjectDescription(e.target.value)}
                            placeholder="Enter project description"
                            disabled={isSubmitting}
                        />
                    </div>
                    {error && (
                        <div className="form-error">
                            <i className="fas fa-exclamation-circle"></i> {error}
                        </div>
                    )}
                    <div className="modal-footer">
                        <button 
                            className="btn-primary" 
                            onClick={handleEditProject} 
                            disabled={!newProjectName || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> Updating...
                                </>
                            ) : 'OK'}
                        </button>
                        <button 
                            className="btn-close" 
                            onClick={closeEditModal}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default ProjectManagement