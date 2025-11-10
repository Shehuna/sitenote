import React, { useState, useEffect, useMemo } from 'react';
import './UserJobManagement.css';

const UserJobManagement = ({ defWorkID }) => {
    const [users, setUsers] = useState([]);
    const [userJobs, setUserJobs] = useState([]);
    const [jobDetails, setJobDetails] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUsersAndJobs();
    }, []);

    const extractNumericId = (jobId) => {
        if (typeof jobId === 'string' && jobId.startsWith('G')) {
            return jobId.substring(1);
        }
        return jobId;
    };

    const fetchUsersAndJobs = async () => {
        setLoading(true);
        setError(null);

        try {
            const usersResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/UserManagement/GetUsers`);
            if (!usersResponse.ok) throw new Error('Failed to fetch users');
            const usersData = await usersResponse.json();
            const usersList = usersData.users || [];

            const userJobsPromises = usersList.map(async (user) => {
                try {
                    const userJobResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/UserJobAuth/GetUserJobsByUserId/${user.id}`);
                    if (!userJobResponse.ok) return { userId: user.id, jobs: [] };
                    
                    const userJobData = await userJobResponse.json();
                    return { userId: user.id, jobs: userJobData.userJobs || [] };
                } catch (error) {
                    console.error(`Error fetching jobs for user ${user.id}:`, error);
                    return { userId: user.id, jobs: [] };
                }
            });

            const userJobsData = await Promise.all(userJobsPromises);
            
            const usersWithJobs = usersList.filter(user => {
                const userJobData = userJobsData.find(uj => uj.userId === user.id);
                return userJobData && userJobData.jobs.length > 0;
            });

            setUsers(usersWithJobs);
            setUserJobs(userJobsData.filter(uj => uj.jobs.length > 0));

            const allJobIds = [...new Set(userJobsData.flatMap(uj => uj.jobs.map(job => job.jobId)))];
            console.log('All job IDs to fetch:', allJobIds);
            
            if (allJobIds.length > 0) {
                await fetchJobDetails(allJobIds);
            }

        } catch (err) {
            setError(err.message);
            console.error('API Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchJobDetails = async (jobIds) => {
        try {
            console.log('Fetching job details for IDs:', jobIds);
            
            const jobDetailsPromises = jobIds.map(async (jobId) => {
                try {
                    const numericId = extractNumericId(jobId);
                    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Job/GetJobById/${numericId}`);
                    
                    console.log(`API call for job ${jobId} (numeric: ${numericId}):`, response.status);
                    
                    if (!response.ok) {
                        console.warn(`Failed to fetch job ${jobId}: ${response.status}`);
                        return { jobId, data: null };
                    }
                    
                    const jobData = await response.json();
                    console.log(`Job ${jobId} data:`, jobData);
                    return { jobId, data: jobData };
                } catch (error) {
                    console.error(`Error fetching job ${jobId}:`, error);
                    return { jobId, data: null };
                }
            });

            const jobDetailsResults = await Promise.all(jobDetailsPromises);
            const jobDetailsMap = {};
            
            jobDetailsResults.forEach(result => {
                if (result && result.data) {
                    const jobData = result.data;
                    if (jobData.job) {
                        jobDetailsMap[result.jobId] = jobData.job;
                    } else {
                        jobDetailsMap[result.jobId] = jobData;
                    }
                } else {
                    jobDetailsMap[result.jobId] = null;
                }
            });
            
            console.log('Final job details map:', jobDetailsMap);
            setJobDetails(jobDetailsMap);
        } catch (err) {
            console.error('Error fetching job details:', err);
        }
    };

    const getJobsForUser = (userId) => {
        const userJob = userJobs.find(uj => uj.userId === userId);
        return userJob ? userJob.jobs : [];
    };

    const getJobDetail = (jobId) => {
        const job = jobDetails[jobId];
        
        if (!job) {
            return { name: `Unknown Job (${jobId})` };
        }
        
        return {
            name: job.name || `Unnamed Job (${jobId})`
        };
    };

    const handleDenyPermission = async (userJobId) => {
        if (!window.confirm('Are you sure you want to deny permission for this job?')) {
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/UserJobAuth/DeleteUserJob/${userJobId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) throw new Error('Failed to deny permission');
            fetchUsersAndJobs();
        } catch (err) {
            setError(err.message);
            console.error('Error denying permission:', err);
        }
    };

    // Enhanced filtering logic
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;

        const searchLower = searchTerm.toLowerCase();
        
        return users.filter(user => {
            // Check user fields
            const userMatches = user.userName?.toLowerCase().includes(searchLower) ||
                              user.email?.toLowerCase().includes(searchLower) ||
                              `${user.fname} ${user.lname}`.toLowerCase().includes(searchLower);

            // Check if any of user's jobs match the search
            const userJobsList = getJobsForUser(user.id);
            const jobMatches = userJobsList.some(userJob => {
                const job = getJobDetail(userJob.jobId);
                return job.name.toLowerCase().includes(searchLower);
            });

            return userMatches || jobMatches;
        });
    }, [users, searchTerm, jobDetails]);

    // Function to determine which jobs to show for each user
    const getJobsToDisplayForUser = (userId) => {
        const userJobsList = getJobsForUser(userId);
        
        if (!searchTerm) {
            // No search term - show all jobs
            return userJobsList;
        }

        const searchLower = searchTerm.toLowerCase();
        
        // Check if user matches the search
        const userMatches = users.find(user => user.id === userId)?.userName?.toLowerCase().includes(searchLower) ||
                           users.find(user => user.id === userId)?.email?.toLowerCase().includes(searchLower) ||
                           `${users.find(user => user.id === userId)?.fname} ${users.find(user => user.id === userId)?.lname}`.toLowerCase().includes(searchLower);

        if (userMatches) {
            // User matches search - show ALL their jobs
            return userJobsList;
        } else {
            // User doesn't match search, but might have matching jobs - show only matching jobs
            return userJobsList.filter(userJob => {
                const job = getJobDetail(userJob.jobId);
                return job.name.toLowerCase().includes(searchLower);
            });
        }
    };

    if (loading) return <div className="loading-message">Loading user job data...</div>;
    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="user-job-management">
            <div className="user-job-header">
                <h2>User Job Permissions</h2>
                <p>Manage user permissions for different jobs</p>
            </div>

            {/* Search */}
            <div className="user-job-filters">
                <div className="search-bar">
                    <i className="fas fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search users or job names..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Users List */}
            <div className="users-list">
                {filteredUsers.map(user => {
                    const jobsToDisplay = getJobsToDisplayForUser(user.id);
                    
                    // Don't show users with no jobs to display
                    if (jobsToDisplay.length === 0) return null;

                    return (
                        <div key={user.id} className="user-card">
                            <div className="user-info">
                                <h3 className="user-name">{user.fname} {user.lname}</h3>
                                
                            </div>

                            <div className="user-jobs-section">
                                <h4 className="jobs-section-title">
                                    Job Permissions ({jobsToDisplay.length} job{jobsToDisplay.length !== 1 ? 's' : ''})
                                </h4>
                                <div className="jobs-list">
                                    {jobsToDisplay.map(userJob => {
                                        const job = getJobDetail(userJob.jobId);
                                        
                                        return (
                                            <div key={userJob.id} className="job-item">
                                                <div className="job-info">
                                                    <span className="job-name">{job.name}</span>
                                                </div>
                                                
                                                <div className="permission-display">
                                                    
                                                    <button 
                                                        onClick={() => handleDenyPermission(userJob.id)}
                                                        className="deny-btn"
                                                        title="Deny Permission"
                                                    >
                                                        Deny
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredUsers.filter(user => getJobsToDisplayForUser(user.id).length > 0).length === 0 && (
                <div className="no-results">
                    {searchTerm ? (
                        <>
                            <i className="fas fa-search"></i>
                            <h3>No users or jobs found</h3>
                            <p>No users or jobs match your search criteria</p>
                        </>
                    ) : (
                        <>
                            <i className="fas fa-users"></i>
                            <h3>No users with job permissions</h3>
                            <p>There are currently no users with job permissions assigned</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserJobManagement;