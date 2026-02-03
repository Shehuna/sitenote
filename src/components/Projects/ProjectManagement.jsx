import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
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
    const [projectSuggestions, setProjectSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [showAllProjects, setShowAllProjects] = useState(false);
    const inputRef = useRef(null);

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

    // Update project suggestions when input is clicked or value changes
    useEffect(() => {
        let suggestions = [];
        
        if (newProjectName.trim()) {
            const query = newProjectName.toLowerCase().trim();
            suggestions = filteredProjects.filter(project => 
                project.name?.toLowerCase().includes(query)
            );
        } else if (showAllProjects) {
            suggestions = [...filteredProjects];
        }
        
        // Sort by name
        suggestions.sort((a, b) => a.name?.localeCompare(b.name));
        
        // Limit to 10 suggestions
        setProjectSuggestions(suggestions.slice(0, 10));
        
        if (showAllProjects && filteredProjects.length > 0) {
            setShowSuggestions(true);
        } else if (newProjectName.trim() && suggestions.length > 0) {
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
        
        setSuggestionIndex(0);
    }, [newProjectName, filteredProjects, showAllProjects]);

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
        setProjectSuggestions([]);
        setShowSuggestions(false);
        setSuggestionIndex(0);
        setShowAllProjects(false);
    };

    const handleSuggestionClick = (project) => {
        setNewProjectName(project.name);
        setNewProjectDescription(project.description || project.name);
        setShowSuggestions(false);
        setShowAllProjects(false);
    };

    const handleProjectNameKeyDown = (e) => {
        if (!showSuggestions) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSuggestionIndex(prev => 
                    prev < projectSuggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSuggestionIndex(prev => prev > 0 ? prev - 1 : prev);
                break;
            case 'Enter':
                e.preventDefault();
                if (projectSuggestions[suggestionIndex]) {
                    handleSuggestionClick(projectSuggestions[suggestionIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setShowAllProjects(false);
                break;
            default:
                break;
        }
    };

    const handleInputFocus = () => {
        if (filteredProjects.length > 0 && !newProjectName.trim()) {
            setShowAllProjects(true);
        }
    };

    const handleInputBlur = () => {
        setTimeout(() => {
            setShowSuggestions(false);
            setShowAllProjects(false);
        }, 200);
    };

    const handleInputChange = (e) => {
        setNewProjectName(e.target.value);
        if (e.target.value.trim()) {
            setShowAllProjects(false);
        }
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
                        <div className="autocomplete-container">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newProjectName}
                                onChange={handleInputChange}
                                onKeyDown={handleProjectNameKeyDown}
                                onFocus={handleInputFocus}
                                onBlur={handleInputBlur}
                                placeholder="Type project name or click to see existing projects"
                                autoFocus
                                disabled={isSubmitting}
                            />
                            {showSuggestions && (
                                <div className="autocomplete-suggestions">
                                    <div className="suggestions-header">
                                        <small>
                                            {showAllProjects 
                                                ? `All projects in ${workspaceName} (${projectSuggestions.length})` 
                                                : `Matching projects in ${workspaceName} (${projectSuggestions.length})`
                                            }
                                        </small>
                                    </div>
                                    {projectSuggestions.map((project, index) => (
                                        <div
                                            key={project.id}
                                            className={`suggestion-item ${index === suggestionIndex ? 'suggestion-active' : ''}`}
                                            onMouseEnter={() => setSuggestionIndex(index)}
                                            onMouseDown={() => handleSuggestionClick(project)}
                                        >
                                            <div className="suggestion-name">
                                                {project.name}
                                                {project.status !== 1 && (
                                                    <span className="suggestion-status"> (Inactive)</span>
                                                )}
                                            </div>
                                            {project.description && (
                                                <div className="suggestion-description">{project.description}</div>
                                            )}
                                        </div>
                                    ))}
                                    {projectSuggestions.length === 0 && (
                                        <div className="suggestion-item no-suggestions">
                                            <div className="suggestion-name">No projects found</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
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