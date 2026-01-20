import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const AssignUsers = ({ filteredUsers, projects, loading, setLoading, defId }) => {
    const [assignUser, setAssignUser] = useState('');
    const [assignedProjects, setAssignedProjects] = useState([]);
    const [userAssignedProjects, setUserAssignedProjects] = useState([]);
    const [loadingUserProjects, setLoadingUserProjects] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));
    const API_URL = process.env.REACT_APP_API_BASE_URL;

    const defaultWorkspaceProjects = projects.filter(p => p.workspaceId == defId);

    useEffect(() => {
        if (assignUser) {
            fetchUserAssignedProjects(assignUser);
        } else {
            setUserAssignedProjects([]);
        }
    }, [assignUser]);

    const fetchUserAssignedProjects = async (userId) => {
        setLoadingUserProjects(true);
        try {
            const response = await fetch(`${API_URL}/api/UserProject/GetUserProjectsByUserId/${userId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch user projects: ${response.status}`);
            }
            const data = await response.json();
            const userProjects = data.userProjects || data.data || data || [];
            setUserAssignedProjects(userProjects);
        } catch (err) {
            console.error('Error fetching user assigned projects:', err);
            toast.error('Error loading user project assignments');
            setUserAssignedProjects([]);
        } finally {
            setLoadingUserProjects(false);
        }
    };

    const isProjectAlreadyAssigned = (projectId) => {
        return userAssignedProjects.some(ap => ap.projectId === projectId || ap.id === projectId);
    };

    const handleAssignUser = async () => {
        if (!assignUser) {
            toast.error('Please select a user');
            return;
        }

        if (assignedProjects.length === 0) {
            toast.error('Please select at least one project');
            return;
        }

        setLoading(true);
        try {
            const assignPromises = [];
            const projectsAlreadyAssigned = [];

            for (const project of assignedProjects) {
                if (isProjectAlreadyAssigned(project.projectId)) {
                    projectsAlreadyAssigned.push(project.projectName);
                } else {
                    assignPromises.push(
                        fetch(`${API_URL}/api/UserProject/AddUserProject`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: assignUser,
                                projectId: project.projectId
                            })
                        })
                    );
                }
            }

            if (projectsAlreadyAssigned.length > 0) {
                toast.error(`User already has these projects: ${projectsAlreadyAssigned.join(', ')}`);
            }

            if (assignPromises.length > 0) {
                const results = await Promise.allSettled(assignPromises);
                const successfulAssignments = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
                if (successfulAssignments > 0) {
                    toast.success(`Successfully assigned ${successfulAssignments} project(s) to user`);
                    fetchUserAssignedProjects(assignUser);
                    setAssignedProjects([]);
                } else {
                    toast.error('Failed to assign projects. Please try again.');
                }
            }
        } catch (error) {
            toast.error('Error assigning projects to user');
            console.error('Assign user error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getGroupedProjects = () => {
        const grouped = {};
        defaultWorkspaceProjects.forEach(p => {
            const key = p.workspaceId || 'default';
            if (!grouped[key]) grouped[key] = { workspaceName: p.workspaceName || 'Workspace', projects: [] };
            grouped[key].projects.push(p);
        });
        return grouped;
    };

    const groupedProjects = getGroupedProjects();

    return (
        <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '400px' }}>
            <div className="settings-form" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                    <label style={{ fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Select User:</label>
                    <select
                        value={assignUser}
                        onChange={(e) => setAssignUser(e.target.value)}
                        disabled={loadingUserProjects}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px', height: '32px' }}
                    >
                        <option value="">Select User</option>
                        {filteredUsers.map(u => (
                            <option key={u.userId} value={u.userId}>{u.userName} ({u.fname} {u.lname})</option>
                        ))}
                    </select>
                    {loadingUserProjects && <div className="loading-indicator" style={{ fontSize: '11px', marginTop: '2px' }}>Loading user projects...</div>}
                </div>

                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: '0' }}>
                    <label style={{ fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Projects to Assign:</label>
                    <div className="jobs-selection-container" style={{ flex: 1, maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '8px', backgroundColor: '#fff' }}>
                        {Object.keys(groupedProjects).length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#666', padding: '20px 12px', fontSize: '12px' }}>
                                <i className="fas fa-folder-open" style={{ fontSize: '20px', marginBottom: '6px', opacity: 0.5 }}></i>
                                <div>No projects available</div>
                            </div>
                        ) : (
                            Object.entries(groupedProjects).map(([wk, data]) => (
                                <div key={wk} style={{ marginBottom: '12px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: '#495057', display: 'flex', alignItems: 'center', gap: '4px', paddingBottom: '4px', borderBottom: '1px solid #dee2e6' }}>
                                        <i className="fas fa-folder" style={{ color: '#17a2b8', fontSize: '10px' }}></i>
                                        {data.workspaceName}
                                        <span style={{ fontSize: '10px', backgroundColor: '#e9ecef', color: '#6c757d', padding: '1px 4px', borderRadius: '8px', marginLeft: 'auto' }}>{data.projects.length}</span>
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {data.projects.map(p => {
                                            const isAlready = isProjectAlreadyAssigned(p.projectId);
                                            const isChecked = assignedProjects.some(ap => ap.projectId === p.projectId);
                                            return (
                                                <label key={p.projectId} className={`job-checkbox ${isAlready ? 'disabled' : ''}`} title={isAlready ? 'User already has this project' : p.description} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderRadius: '3px', transition: 'all 0.2s', cursor: isAlready ? 'not-allowed' : 'pointer', opacity: isAlready ? 0.6 : 1, backgroundColor: isAlready ? '#f5f5f5' : '#fff', border: '1px solid #e9ecef', margin: '0', fontSize: '11px', minHeight: '32px' }}>
                                                    <input type="checkbox" checked={isChecked} onChange={(e) => {
                                                        if (isAlready) return;
                                                        if (e.target.checked) setAssignedProjects(prev => [...prev, p]); else setAssignedProjects(prev => prev.filter(x => x.projectId !== p.projectId));
                                                    }} disabled={isAlready} style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span style={{ fontWeight: '500', color: '#212529', fontSize: '11px', lineHeight: '1.2' }}>{p.projectName || p.name}</span>
                                                            {isAlready && <span style={{ fontSize: '8px', background: '#ffebee', color: '#c62828', padding: '1px 3px', borderRadius: '2px', marginLeft: '6px', flexShrink: 0, fontWeight: '600' }}>Assigned</span>}
                                                        </div>
                                                        <div style={{ fontSize: '9px', color: '#6c757d', lineHeight: '1.1' }}>ID: {p.projectId} • {p.workspaceName || p.workspace}</div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="selection-info" style={{ marginTop: '4px', fontSize: '11px' }}>
                    {assignedProjects.length === 0 ? <span style={{ color: '#666' }}>No projects selected</span> : <span style={{ color: '#28a745', fontWeight: '500' }}>{assignedProjects.length} project{assignedProjects.length !== 1 ? 's' : ''} selected</span>}
                    {userAssignedProjects.length > 0 && (
                        <div style={{ marginTop: '2px', color: '#856404', background: '#fff3cd', padding: '3px 6px', borderRadius: '3px', border: '1px solid #ffeaa7', fontSize: '10px' }}>User has {userAssignedProjects.length} existing project{userAssignedProjects.length !== 1 ? 's' : ''}</div>
                    )}
                </div>
            </div>

            <div className="settings-action-buttons" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee', flexShrink: 0 }}>
                <button onClick={handleAssignUser} disabled={!assignUser || assignedProjects.length === 0 || loading} style={{ padding: '8px 16px', backgroundColor: assignedProjects.length > 0 ? '#2f55ddff' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: assignedProjects.length > 0 && !loading ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: '500', width: '100%', height: '32px', margin: '12px' }}>
                    {loading ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '4px' }}></i>Assigning...</> : `Assign ${assignedProjects.length} Project${assignedProjects.length !== 1 ? 's' : ''}`}
                </button>
            </div>
        </div>
    );
};

export default AssignUsers;
