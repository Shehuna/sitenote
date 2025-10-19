import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';

const JobStatusManagement = ({defId}) => {
    
        const [selectedProject, setSelectedProject] = useState('');
        const [selectedJob, setSelectedJob] = useState('');
        const [selectedStatus, setSelectedStatus] = useState(1);
        const [projects, setProjects] = useState([]);
        const [jobs, setJobs] = useState([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState(null);
        const [jobName, setJobName]= useState('')
        const [description, setDescription]= useState('')
        const [isLoading, setIsLoading] = useState(false);
        const [filteredProjects, setFilteredProjects] = useState([]);
        console.log(defId)
          
        const API_URL = process.env.REACT_APP_API_BASE_URL
        
       useEffect(() => {
           
            // Fetch projects based on defId
            fetchInitialData()
            
          }, []);
       useEffect(() => {
            if (projects && defId) {
                const filtered = projects.filter(project => 
                project.status == 1 && project.workspaceId == defId
                );
                setFilteredProjects(filtered);
            } else {
                setFilteredProjects([]);
            }
        }, [projects, defId]);

          useEffect(() => {
                          if (selectedJob) {
                              const job = jobs.find(j => j.id === parseInt(selectedJob));
                              if (job) {
                                  setJobName(job.name)
                                  setDescription(job.description)
                                  setSelectedStatus(job.status)
                              }
                          } else{
                              setJobName('')
                          }
                      }, [selectedJob, jobs]);

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
                }),
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

     const handleUpdateStatus = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_URL}/api/Job/UpdateJob/${selectedJob}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: jobName,
                    description: description,
                    status: parseInt(selectedStatus)
                })
            })

            if(!response) throw new Error('Failed to update Job status');
            else toast.success('job status successfully updated')
            setSelectedProject('');
            setSelectedJob('');
            setSelectedStatus(1);
            setLoading(false)
        } catch (error) {
             setError(error.message);
             console.error('Error adding workspace:', error);
        }
        finally{
            setLoading(false)
        }
    };
  return (
  <div className="settings-content">
            <div className="settings-form">
                <div className="form-group">
                    <label>Project:</label>
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                    >
                       <option value="">Select Project</option>
                            {filteredProjects.map(project => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Job:</label>
                    <select
                        value={selectedJob}
                        onChange={(e) => setSelectedJob(e.target.value)}
                        disabled={!selectedProject}
                    >
                        <option value="">Select Job</option>
                        {jobs.filter(job =>(job.status == 1 && job.projectId === parseInt(selectedProject))).map(job => (
                            <option key={job.id} value={job.id}>{job.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Status:</label>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="1">Active</option>
                        <option value="2">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="settings-action-buttons">
                <button className="btn-primary" onClick={handleUpdateStatus} disabled={!selectedProject || !selectedJob}>
                    Update
                </button>
            </div>
        </div>
  )
}

export default JobStatusManagement