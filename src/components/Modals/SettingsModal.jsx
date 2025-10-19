import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Modal from './Modal';
import './SettingsModal.css';

import UserManagement from '../Users/UserManagement';
import WorkspaceManagement from '../Workspaces/WorkspaceManagement';
import ProjectManagement from '../Projects/ProjectManagement';
import JobManagment from '../Jobs/JobManagment';
import JobPermissionManagement from '../JobPermission/JobPermissionManagement';
import JobStatusManagement from '../JobStatus/JobStatusManagement';

const SettingsModal = ({ 
    isOpen, 
    onClose, 
    onLogout, 
    role, 
    defWorkID, 
    onUpdateDefaultWorkspace, 
   }) => { 
    const [activeTab, setActiveTab] = useState(null);
    const [projects, setProjects] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [users, setUsers] = useState([]);
    const [databases, setDatabases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');

    const [isAddWorkspaceOpen, setIsAddWorkspaceOpen] = useState(false);
    const [isEditWorkspaceOpen, setIsEditWorkspaceOpen] = useState(false);

    const [selectedProject, setSelectedProject] = useState('');
    const [selectedJob, setSelectedJob] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedDatabase, setSelectedDatabase] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(1);
    const [newProjectName, setNewProjectName] = useState('');
    const [newJobName, setNewJobName] = useState('');
    
    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
   
    const [isEditJobOpen, setIsEditJobOpen] = useState(false);
    const [newJobStatus, setNewJobStatus] = useState(1);
    const [newProjectStatus, setNewProjectStatus] = useState(1);
    console.log(role)
    const navigate = useNavigate();
    
    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen, role, defWorkID]);
    
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    const [workspaces, setWorkspaces] = useState([]);
    const [newProjectDescription, setNewProjectDescription] = useState('');
    const [newJobDescription, setNewJobDescription] = useState('');

useEffect(() => {
    if (isEditProjectOpen && selectedProject) {
        const project = projects.find(p => p.id === parseInt(selectedProject));
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

    const handleLogout = () => {
        onLogout();
    };

    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);

        try {
          const projectsUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Project/GetProjects`;
          const jobsUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Job/GetJobs`;
          const usersURL = `${process.env.REACT_APP_API_BASE_URL}/api/UserManagement/GetUsers`;

            console.log('Fetching from:', projectsUrl, jobsUrl);

            const [projectsRes, jobsRes, userRes] = await Promise.all([
                fetch(projectsUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
                fetch(jobsUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
                fetch(usersURL, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            ]);

            if (!projectsRes.ok) throw new Error(`Projects API error: ${projectsRes.status}`);
            if (!jobsRes.ok) throw new Error(`Jobs API error: ${jobsRes.status}`);
            if (!userRes.ok) throw new Error(`Jobs API error: ${userRes.status}`);

            var projectsData = await projectsRes.json();
            var jobsData = await jobsRes.json();
            var userData = await userRes.json()

            projectsData = projectsData.projects || [];
            jobsData = jobsData.jobs || [];
            userData = userData.users || []

            console.log('Received data:', { projectsData, jobsData });

            setProjects(projectsData);
            setJobs(jobsData);
            setUsers(userData)
        } catch (err) {
            setError(err.message);
            console.error('API Error:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleDeleteProject = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Project/DeleteProject/${selectedProject}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete project');

            fetchInitialData();
            setSelectedProject('');
        } catch (err) {
            setError(err.message);
            console.error('Error deleting project:', err);
        }
    };


    const handleAddUser = () => {
        alert(`User ${selectedUser} added to database ${selectedDatabase}`);
        setSelectedUser('');
        setSelectedDatabase('');
    };

    const handleRemoveUser = () => {
        alert(`User ${selectedUser} removed from database ${selectedDatabase}`);
        setSelectedUser('');
        setSelectedDatabase('');
    };
   
    const handleUpdateStatus = () => {
        alert(`Job ${selectedJob} status updated to ${selectedStatus}`);
        setSelectedProject('');
        setSelectedJob('');
        setSelectedStatus(1);
    };
    

    const renderMainMenu = () => (
        
        <div className="settings-options-container">
            
            {[
                {
                    id: 'projectManagement',
                    icon: 'fa-project-diagram',
                    text: 'Project Management'
                },
                {
                    id: 'jobManagement',
                    icon: 'fa-tasks',
                    text: 'Job Management'
                },
                {
                    id: 'userManagement',
                    icon: 'fa-user-plus',
                    text: 'User Management'
                },
                {
                    id: 'jobPermissions',
                    icon: 'fa-user-shield',
                    text: 'Job Permissions'
                },
                {
                    id: 'jobStatus',
                    icon: 'fa-sync-alt',
                    text: 'Job Status Update'
                },
                {
                    id: 'workspaceSettings',
                    icon: 'fa-building', 
                    text: 'Workspace Settings'
                }
            ].map((option) => (
                
                <button
                    key={option.id}
                    className="settings-option"
                    onClick={() => setActiveTab(option.id)}
                    disabled={option.id !== 'workspaceSettings' && role !== 1}
                    aria-label={`Open ${option.text} settings`}
                >
                    
                    <div className="option-icon">
                        <i className={`fas ${option.icon}`} />
                    </div>
                    <div className="option-text">
                        <h4>{option.text}</h4>
                        <p>{option.description}</p>
                    </div>
                    <i className="fas fa-chevron-right option-arrow" />
                </button>
            ))}

            <button
                className="settings-option logout-option"
                onClick={handleLogout}
                aria-label="Logout"
            >
                <div className="option-icon">
                    <i className="fas fa-sign-out-alt" />
                </div>
                <div className="option-text">
                    <h4>Logout</h4>
                </div>
                <i className="fas fa-chevron-right option-arrow" />
            </button>
        </div>
    );

    const renderContent = () => {
        if (!activeTab) return renderMainMenu();

        switch (activeTab) {
            case 'projectManagement':
                return <ProjectManagement workspaceId={defWorkID}/>;
            case 'jobManagement':
                return <JobManagment defWorkId={defWorkID}/>;
            case 'userManagement':
                return <UserManagement />;
            case 'jobPermissions':
                return <JobPermissionManagement defId={defWorkID} users={users}/>;
            case 'jobStatus':
                return <JobStatusManagement defId={defWorkID} />;
            case 'workspaceSettings':
                return <WorkspaceManagement onUpdateDefaultWorkspace={onUpdateDefaultWorkspace}/>;
            default:
                return <div>Unknown settings option</div>;
        }
    };

    const getTitle = () => {
        if (!activeTab) return 'Settings';

        switch (activeTab) {
            case 'projectManagement':
                return 'Project Management';
            case 'jobManagement':
                return 'Job Management';
            case 'userManagement':
                return 'User Management';
            case 'jobPermissions':
                return 'Job Permissions';
            case 'jobStatus':
                return 'Job Status Update';
            default:
                return 'Settings';
        }
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={
                    <div className="settings-modal-title">
                        <i className="fas fa-sliders-h settings-icon" />
                        <span>{getTitle()}</span>
                        {activeTab && (
                            <button
                                className="back-button"
                                onClick={() => setActiveTab(null)}
                            >
                                <i className="fas fa-arrow-left" /> Back
                            </button>
                        )}
                    </div>
                }
                className="settings-modal" >
                {loading ? (
                    <div className="loading-message">Loading data...</div>
                ) : error ? (
                    <div className="error-message">
                        Error: {error}
                        <button onClick={fetchInitialData}>Retry</button>
                    </div>
                ) : (
                    renderContent()
                )}

                <div className="modal-footer">
                    <button className="btn-close" onClick={onClose}>
                        Close
                    </button>
                </div>
            </Modal>
        </>
    );
};

SettingsModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onLogout: PropTypes.func.isRequired, 
};

export default SettingsModal;