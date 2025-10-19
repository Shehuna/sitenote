import React, { useEffect, useState } from 'react'
import Modal from '../Modals/Modal';
import toast from 'react-hot-toast';

const JobManagment = ({defWorkId}) => {
    const [selectedJob, setSelectedJob] = useState('');
    const [newJobName, setNewJobName] = useState('');
    const [user, setUser] = useState('');
    const [newJobStatus, setNewJobStatus] = useState(1);
    const [newJobDescription, setNewJobDescription] = useState('');
    const [selectedProject, setSelectedProject] = useState('');
    const [isAddJobOpen, setIsAddJobOpen] = useState(false);
    const [isEditJobOpen, setIsEditJobOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [jobs, setJobs] = useState([]);

   useEffect(() => {
            fetchInitialData();
            const user = JSON.parse(localStorage.getItem('user'));
            setUser(user.id)
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
    


  const handleAddJob = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Job/AddJob`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newJobName,
                    description: newJobDescription,
                    projectId: selectedProject,
                    userId: user
                })
            });

            if (!response.ok) throw new Error('Failed to add job');
            const data = await response.json()
            console.log(data)
            const jobId = data.job.id
            await grantJobPermission(jobId)

            fetchInitialData();
            setIsAddJobOpen(false);
        } catch (err) {
            setError(err.message);
            console.error('Error adding job:', err);
        }
    }

    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);

        try {
          const projectsUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Project/GetProjects`;
          const jobsUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Job/GetJobs`;


            console.log('Fetching from:', projectsUrl, jobsUrl);

            const [projectsRes, jobsRes] = await Promise.all([
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
                })
            ]);

            if (!projectsRes.ok) throw new Error(`Projects API error: ${projectsRes.status}`);
            if (!jobsRes.ok) throw new Error(`Jobs API error: ${jobsRes.status}`);

            var projectsData = await projectsRes.json();
            var jobsData = await jobsRes.json();

            projectsData = projectsData.projects || [];
            jobsData = jobsData.jobs || [];

            console.log('Received data:', { projectsData, jobsData });

            setProjects(projectsData);
            setJobs(jobsData);
        } catch (err) {
            setError(err.message);
            console.error('API Error:', err);
        } finally {
            setLoading(false);
        }
    }

  const handleEditJob = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Job/UpdateJob/${selectedJob}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: selectedJob,
                    name: newJobName,
                    description: newJobDescription,
                    status: newJobStatus
                })
            });

            if (!response.ok) throw new Error('Failed to update job');

            fetchInitialData();
            setNewJobName('');
            setNewJobStatus(1);
            setNewJobDescription('');
            setIsEditJobOpen(false);
        } catch (err) {
            setError(err.message);
            console.error('Error updating job:', err);
        }
    };
    const handleDeleteJob = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/DeleteJob/${selectedJob}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete job');

            fetchInitialData();
            setSelectedJob('');
        } catch (err) {
            setError(err.message);
            console.error('Error deleting job:', err);
        }
    };

  const grantJobPermission = async(jobid)=>{
    console.log('granting')
    setLoading(true)
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/UserJobAuth/AddUserJob`,{
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user,
                    jobId: jobid,
                    userIDScreen: user
                })
            })
            if (!response.ok) throw new Error('Failed to update workspace');
            toast.success("Job saved Successfully")
            setLoading(false)
        } catch (error) {
             setError(error.message);
             toast.error('Error updating workspace')
        }finally{
            setLoading(false)
        }
        
  }
  return (
        <div className="settings-content">
            <div className="settings-action-buttons">
                <button className="btn-primary" onClick={() => setIsAddJobOpen(true)}>
                    Add Job
                </button>
                <button className="btn-secondary" onClick={() => setIsEditJobOpen(true)} disabled={!selectedJob}>
                    Edit Job
                </button>
                {/* <button className="btn-danger" onClick={handleDeleteJob} disabled={!selectedJob}>
                    Delete Job
                </button> */}
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
                            const project = projects.find(p => (p.id === job.projectId && p.workspaceId == defWorkId));
                            return project && project.status === 1; // Only include jobs from active projects
                        })
                        .map(job => {
                            const projectName = projects.find(p => p.id === job.projectId)?.name || 'Unknown';
                            const isInactive = job.status !== 1;
                            return (
                                <option 
                                    key={job.id} 
                                    value={job.id}
                                    className={isInactive ? 'inactive-job' : ''}
                                >
                                    {job.name} (Project: {projectName}) {isInactive ? '(Inactive)' : ''}
                                </option>
                            );
                        })}
                </select>
            </div>
        
            <Modal
                isOpen={isAddJobOpen}
                onClose={() => {
                    setNewJobName('');
                    setNewJobDescription('');
                    setSelectedProject('');
                    setIsAddJobOpen(false);
                }}
                title="Add Job"
                customClass="modal-sm"
            >
                <div className="settings-form">
                    <div className="form-group">
                        <label>Project:</label>
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                        >
                            <option value="">Select Project</option>
                            {projects 
                                .filter(project => (project.workspaceId == defWorkId)) // Only show active projects
                                .map(project => (
                                    <option key={project.id} value={project.id}>{project.name}</option>
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

                    <div className="modal-footer">
                        <button className="btn-primary" onClick={handleAddJob} disabled={!selectedProject || !newJobName}>
                            OK
                        </button>
                        <button className="btn-close" onClick={() => {
                            setNewJobName('');
                            setNewJobDescription('');
                            setSelectedProject('');
                            setIsAddJobOpen(false);
                        }}>
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
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        disabled
                    >
                        {projects.map(project => (
                            <option key={project.id} value={project.id}>{project.name}</option>
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
                    <select
                        value={newJobStatus}
                        onChange={(e) => setNewJobStatus(e.target.value)}
                    >
                        <option value="1">Active</option>
                        <option value="2">Inactive</option>
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
  )
}

export default JobManagment