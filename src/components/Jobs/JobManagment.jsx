import React, { useEffect, useState, useRef } from 'react'
import Modal from '../Modals/Modal';
import toast from 'react-hot-toast';

const JobManagment = ({defWorkId, updateProjectsAndJobs}) => {
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
    const [previousJobName, setPreviousJobName] = useState('');
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [pasteContent, setPasteContent] = useState('');
    const [parsedJobs, setParsedJobs] = useState([]);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [errorMessages, setErrorMessages] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const errorRef = useRef(null);

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

  const handleAddJob = async () => {
        setIsAdding(true);
        setError(null);
        setErrorMessages([]);
        try {
            const finalDescription = newJobDescription.trim() || newJobName;
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
            await updateProjectsAndJobs()
            const data = await response.json()
            console.log(data)
            const jobId = data.job.id
            await grantJobPermission(jobId)
            toast.success("Job saved Successfully");

            fetchInitialData();
            setIsAddJobOpen(false);
        } catch (err) {
            setError(err.message);
            console.error('Error adding job:', err);
        } finally {
            setIsAdding(false);
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
            const finalDescription = newJobDescription.trim() || newJobName;
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
            setLoading(false)
        } catch (error) {
             setError(error.message);
             toast.error('Error updating workspace')
        }finally{
            setLoading(false)
        }
        
  }

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
      name: job.name,
      description: job.description,
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
        setErrorMessages(errorData.errors || [errorData.message]);
        setIsAdding(false);
        return;
      }

      const data = await response.json();
      for (const job of data.jobs) {
        await grantJobPermission(job.id);
      }
      toast.success(`${data.jobs.length} jobs saved successfully`);

      await updateProjectsAndJobs();
      fetchInitialData();
      setIsAddJobOpen(false);
      setIsBulkMode(false);
      setPasteContent('');
      setParsedJobs([]);
      setIsReviewMode(false);
      setError(null);
      setErrorMessages([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handlePasteChange = (e) => {
    setPasteContent(e.target.value);
  };

  const handleReview = () => {
    const lines = pasteContent.trim().split('\n');
    const newParsed = lines
      .map(line => {
        const [name, description] = line.split('\t').map(str => str.trim());
        if (name) {
          return { name, description: description || '' };
        }
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
    const updated = parsedJobs.filter((_, i) => i !== index);
    setParsedJobs(updated);
  };

  const handleAddNewRow = () => {
    setParsedJobs([...parsedJobs, { name: '', description: '' }]);
  };

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
                        const project = projects.find(
                        p => p.id === job.projectId && p.workspaceId === defWorkId
                        );
                        return project && job.status !== 3 && project.status !== 3;
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
                    setIsBulkMode(false);
                    setPasteContent('');
                    setParsedJobs([]);
                    setIsReviewMode(false);
                    setError(null);
                    setErrorMessages([]);
                }}
                title="Add Job"
                customClass="modal-sm"
            >
                <div className="settings-form">
                    <div ref={errorRef}>
                        {errorMessages.length > 0 && (
                          <div className="error-message">
                            <ul>
                              {errorMessages.map((msg, idx) => (
                                <li key={idx}>{msg}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {error && <div className="error-message">{error}</div>}
                    </div>
                    <div className="form-group">
                        <label>Project:</label>
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                        >
                            <option value="">Select Project</option>
                            {projects 
                                .filter(project => (project.workspaceId === defWorkId && project.status === 1)) // Only show active projects
                                .map(project => (
                                    <option key={project.id} value={project.id}>{project.name}</option>
                                ))}
                        </select>
                    </div>

                    <button 
                      onClick={() => setIsBulkMode(!isBulkMode)} 
                      className="btn-secondary"
                    >
                      {isBulkMode ? 'Switch to Single Add' : 'Switch to Bulk Add'}
                    </button>

                    {!isBulkMode ? (
                      <>
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
                    ) : (
                      <>
                        {!isReviewMode ? (
                          <>
                            <div className="form-group">
                                <label>Paste from Excel (Name and Description per line):</label>
                                <textarea
                                  value={pasteContent}
                                  onChange={handlePasteChange}
                                  placeholder="Paste from Excel (Name and Description per line)"
                                />
                            </div>
                            <button onClick={handleReview} className="btn-primary">Review</button>
                          </>
                        ) : (
                          <>
                            <h4>Review Jobs</h4>
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
                            <button onClick={handleAddNewRow} className="icon-button secondary">
                              <i className="fas fa-plus"></i>
                            </button>
                            <button onClick={handleAddBulkJobs} className="btn-primary" disabled={isAdding}>
                              {isAdding ? 'Adding...' : 'Add All'}
                            </button>
                            <button onClick={() => setIsReviewMode(false)} className="btn-secondary">Back to Paste</button>
                          </>
                        )}
                      </>
                    )}

                    <div className="modal-footer">
                        {!isBulkMode && (
                          <button className="btn-primary" onClick={handleAddJob} disabled={!selectedProject || !newJobName || isAdding}>
                              {isAdding ? 'Adding...' : 'OK'}
                          </button>
                        )}
                        <button className="btn-close" onClick={() => {
                            setNewJobName('');
                            setNewJobDescription('');
                            setSelectedProject('');
                            setIsAddJobOpen(false);
                            setIsBulkMode(false);
                            setPasteContent('');
                            setParsedJobs([]);
                            setIsReviewMode(false);
                            setError(null);
                            setErrorMessages([]);
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
  )
}

export default JobManagment