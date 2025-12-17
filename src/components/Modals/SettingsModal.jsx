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
import UserProfile from '../UserProfile/UserProfile';
const SettingsModal = ({ 
    isOpen, 
    onClose, 
    onLogout, 
    role, 
    defWorkID, 
    defWorkName,
    onUpdateDefaultWorkspace, 
    userrole,
    updateProjectsAndJobs
   }) => { 
    const [activeTab, setActiveTab] = useState(null);
    const [projects, setProjects] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [users, setUsers] = useState([]);
    const [databases, setDatabases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
   
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
    const storedUser = localStorage.getItem('user');
    const userId = storedUser ? JSON.parse(storedUser).id : null;
    const userRole = storedUser ? JSON.parse(storedUser).role : null;
    
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
        const usersURL = `${process.env.REACT_APP_API_BASE_URL}/api/UserManagement/GetUsers`;

        console.log('Fetching users from:', usersURL);

        const userRes = await fetch(usersURL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!userRes.ok) throw new Error(`Users API error: ${userRes.status}`);

        const userData = await userRes.json();
        const usersList = userData.users || [];

        console.log('Received users data:', usersList);

        setUsers(usersList);
    } catch (err) {
        setError(err.message);
        console.error('API Error:', err);
    } finally {
        setLoading(false);
    }
}

    const renderMainMenu = () => {
        const options = [
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
            /* {
                id: 'userProfile',
                icon: 'fa-user',
                text: 'User Profile'
            }, */
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
        ];

        const filteredOptions = options.filter(option => {
            if (option.id === 'userManagement' && userrole === "User") return false;
            
            if (
                option.id !== 'workspaceSettings' &&
                option.id !== 'userProfile' &&
                role !== 1
                ) return false;

            return true;
        });

        return (
            
            <div className="settings-options-container">
                
                {filteredOptions.map((option) => (
                    
                    <button
                        key={option.id}
                        className="settings-option"
                        onClick={() => setActiveTab(option.id)}
                        disabled={option.id !== 'workspaceSettings' && option.id !== 'userProfile' && role !== 1}
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

                {/* <button
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
                </button> */}
            </div>
        );
    };

    const renderContent = () => {
        if (!activeTab) return renderMainMenu();

        switch (activeTab) {
            case 'projectManagement':
                return <ProjectManagement workspaceId={defWorkID} updateProjectsAndJobs={updateProjectsAndJobs}/>;
            case 'jobManagement':
                return <JobManagment defWorkId={defWorkID} updateProjectsAndJobs={updateProjectsAndJobs}s/>;
            case 'userManagement':
                return <UserManagement workspaceId={defWorkID}/>;
            /* case 'userProfile':
                return (
                        <UserProfile userid={userId} />
                  
                ); */
            case 'jobPermissions':
                return <JobPermissionManagement defId={defWorkID} users={users} userId={userId}/>;
            case 'jobStatus':
                return <JobStatusManagement defId={defWorkID} />;
            case 'workspaceSettings':
                return <WorkspaceManagement 
                        onUpdateDefaultWorkspace={onUpdateDefaultWorkspace} 
                        userRole={userRole}
                        workspaceRole={role}
                        defWorkId={defWorkID}
                        defWorkName={defWorkName}
                        />;
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
           /*  case 'userProfile':
                return 'User Profile'; */
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
                {
                    renderContent()
                }

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