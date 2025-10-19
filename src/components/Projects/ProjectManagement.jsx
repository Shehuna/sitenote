import React, { useEffect, useState } from 'react'
import Modal from '../Modals/Modal';

const ProjectManagement = ({workspaceId}) => {
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

     const API_URL = process.env.REACT_APP_API_BASE_URL

      useEffect(() => {
            fetchWorkspacesById();
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
            throw new Error('Error fetching users data!');
        }
        
        const data = await response.json();
        setWorkspaceName(data.workspace.name)
        //setWorkspaces(data.workspaces || []);
        } catch (err) {
        setError(err.message);
        console.error('Error fetching Workspaces:', err);
        } finally {
        setLoading(false);
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
    }, [isEditProjectOpen, selectedProject, projects]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
        const response = await fetch(`${API_URL}/api/Project/GetProjects`,{
            method: 'GET'
        });
        
        if (response.ok) {
            const data = await response.json();
            const result = data.projects
            console.log(result)
            const filterResults = result.filter((res)=>{
                return res.workspaceId == workspaceId 
            })
            setFilteredProjects(filterResults|| []);
            
        }
        else{
            throw new Error('Error fetching users data!');
        }
        /* if(response.data.success){
          console.log(response.data.appeals)
          const data = response.data.appeals
          const searchResult = await data.filter((dat)=>{
             return dat.teamLeaderComment !== '' && dat.appealStatus === 'returned'
          })
          setFilteredAppeals(searchResult)
          setTeamLeaderComment(true)
        } */
        
        
        } catch (err) {
        setError(err.message);
        console.error('Error fetching Workspaces:', err);
        } finally {
        setLoading(false);
        }
    };

     const handleAddProject = async () => {
        try {
            const response = await fetch(`${API_URL}/api/Project/AddProject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    name: newProjectName, 
                    description: newProjectDescription, 
                    workspaceId: workspaceId,
                    userId: user
                })
            });

            if (!response.ok) throw new Error('Failed to add project');

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
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Project/UpdateProject/${selectedProject}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: selectedProject,
                name: newProjectName,
                description: newProjectDescription,
                status: newProjectStatus
            })
        });

        if (!response.ok) throw new Error('Failed to update project');

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
  return (
    <div className="settings-content">
        <div className="settings-action-buttons">
            <button className="btn-primary" onClick={() => setIsAddProjectOpen(true)}>
                Add Project
            </button>
            <button className="btn-secondary" onClick={() => setIsEditProjectOpen(true)} disabled={!selectedProject}>
                Edit Project
            </button>
            {/* <button className="btn-danger" onClick={handleDeleteProject} disabled={!selectedProject}>
                Delete Project
            </button> */}
        </div>

        <div className="settings-lookup-list">
            <h4>Project Lookups</h4>
            <select
                size="5"
                className="lookup-select"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
            >
                <option value="">Select a Project</option>
                {filteredProjects.map(project => (
                    
                    <option 
                        key={project.id} 
                        value={project.id}
                        className={project.status !== 1 ? 'inactive-project' : ''}
                    >
                        {project.name} {project.status !== 1 ? '(Inactive)' : ''}
                    </option>
                ))}
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
                                <label>Workspace:</label>
                                <select
                                    value={workspaceId}
                                    //onChange={(e) => setSelectedWorkspace(e.target.value)}
                                    disabled
                                >
                                    <option value={workspaceId}>{workspaceName}</option>
                                </select>
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