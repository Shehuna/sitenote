import React, { useEffect, useState, useMemo } from 'react'
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
     const [workspaces, setWorkspaces] = useState([]); // Store all workspaces for reference

     const API_URL = process.env.REACT_APP_API_BASE_URL

      useEffect(() => {
            fetchWorkspacesById();
            fetchWorkspaces(); // Fetch all workspaces
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

    // Get workspace name by ID
    const getWorkspaceNameById = (workspaceId) => {
        const workspace = workspaces.find(w => w.id === parseInt(workspaceId));
        return workspace ? workspace.name : `Workspace ${workspaceId}`;
    };

    // Filter projects based on search query
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

     const handleAddProject = async () => {
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

            if (!response.ok) throw new Error('Failed to add project');
            toast.success("Project Added Successfully")
            await updateProjectsAndJobs()
            fetchProjects();
            setNewProjectName('');
            setNewProjectDescription('');
            setSelectedWorkspace('');
            setIsAddProjectOpen(false);
        } catch (err) {
            setError(err.message);
            console.error('Error adding project:', err);
        }
    };

    const handleEditProject = async () => {
        try {
            const finalDescription = newProjectDescription.trim() || newProjectName;
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Project/UpdateProject/${selectedProject}`, {
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

            if (!response.ok) throw new Error('Failed to update project');
            toast.success("Project Updated Successfully")
            fetchProjects();
            setNewProjectName('');
            setNewProjectStatus(1);
            setNewProjectDescription('');
            setIsEditProjectOpen(false);
            } catch (err) {
                setError(err.message);
                console.error('Error updating project:', err);
            }
    };

    // Clear search query
    const handleClearSearch = () => {
        setSearchQuery('');
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
            onClose={() => {
                setNewProjectName('');
                setNewProjectDescription('');
                setSelectedWorkspace('');
                setIsAddProjectOpen(false);
            }}
            title="Add Project"
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
                    />
                </div>
                <div className="form-group">
                    <label>Project Description:</label>
                    <textarea
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="Enter project description"
                    />
                </div>
                <div className="modal-footer">
                    <button
                        className="btn-primary"
                        onClick={handleAddProject}
                        disabled={!newProjectName }
                    >
                        OK
                    </button>
                    <button
                        className="btn-close"
                        onClick={() => {
                            setNewProjectName('');
                            setNewProjectDescription('');
                            setSelectedWorkspace('');
                            setIsAddProjectOpen(false);
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
        
        <Modal
            isOpen={isEditProjectOpen}
            onClose={() => {
                setNewProjectName('');
                setNewProjectDescription('');
                setNewProjectStatus(1);
                setIsEditProjectOpen(false);
            }}
            title="Edit Project"
        >
            <div className="settings-form">
                <div className="form-group">
                    <label>Project Name:</label>
                    <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Enter project name"
                    />
                </div>
                <div className="form-group">
                    <label>Status:</label>
                    <select
                        value={newProjectStatus}
                        onChange={(e) => setNewProjectStatus(e.target.value)}
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
                    />
                </div>
                <div className="modal-footer">
                    <button className="btn-primary" onClick={handleEditProject} disabled={!newProjectName}>
                        OK
                    </button>
                    <button className="btn-close" onClick={() => {
                        setNewProjectName('');
                        setNewProjectDescription('');
                        setNewProjectStatus(1);
                        setIsEditProjectOpen(false);
                    }}>
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    </div>
  )
}

export default ProjectManagement