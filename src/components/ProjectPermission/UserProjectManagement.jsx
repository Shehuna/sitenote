import React, { useState, useEffect } from 'react';
import './UserProjectManagement.css';
import toast from 'react-hot-toast';

const UserProjectManagement = ({ defWorkID, fetchedUsers = [] }) => {
    const [users, setUsers] = useState(fetchedUsers || []);
    const [selectedUserId, setSelectedUserId] = useState(users[0]?.userId || null);
    const [userProjects, setUserProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [modal, setModal] = useState({ show: false, type: '', message: '', onConfirm: null });

    useEffect(() => { setUsers(fetchedUsers || []); if ((fetchedUsers || []).length && !selectedUserId) setSelectedUserId(fetchedUsers[0].userId); }, [fetchedUsers]);

    useEffect(() => {
        const load = async () => {
            if (!selectedUserId) { setUserProjects([]); return; }
            setLoading(true);
            try {
                const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/UserProject/GetProjectsByUser/${selectedUserId}`);
                const data = await res.json();
                console.log('Raw API data:', data);
                console.log('defWorkID:', defWorkID); 
                const projects = data.userProjects || data.projects || data || [];
                console.log('Projects after processing:', projects); 
                setUserProjects(projects);
            } catch (err) { console.error(err); setUserProjects([]); }
            finally { setLoading(false); }
        };
        load();
    }, [selectedUserId, defWorkID]);

    const filteredUsers = users.filter(u => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (u.userName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (`${u.fname || ''} ${u.lname || ''}`).toLowerCase().includes(q);
    });

    const showConfirm = (message, onConfirm) => {
        setModal({ show: true, type: 'confirm', message, onConfirm });
    };

    const showAlert = (message) => {
        setModal({ show: true, type: 'alert', message, onConfirm: null });
    };

    const closeModal = () => {
        setModal({ show: false, type: '', message: '', onConfirm: null });
    };

    const handleConfirm = () => {
        if (modal.onConfirm) modal.onConfirm();
        closeModal();
    };

    const handleDeny = (project) => {
        showConfirm(`Remove project access "${project.projectName || project.name}" for this user?`, async () => {
            try {
                const getRes = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/UserProject/GetUserProjectsByUserId/${selectedUserId}`);
                const data = await getRes.json();
                const uProjects = data.userProjects || data || [];
                const up = uProjects.find(p => (p.projectId || p.id) == (project.projectId || project.id));
                if (!up) { showAlert('Permission record not found'); return; }
                const idToDelete = up.userProjectId || up.id || up.projectUserId;
                const del = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/UserProject/DeleteUserProject/${idToDelete}`, { method: 'DELETE' });
                if (del.ok) {
                    setUserProjects(prev => prev.filter(p => (p.projectId || p.id) != (project.projectId || project.id)));
                    toast.success('Permission removed');
                } else showAlert('Failed to remove permission');
            } catch (err) { console.error(err); showAlert('Error removing permission'); }
        });
    };

    return (
        <div className="user-projects-modern">
            <div className="users-pane">
                <div className="users-header">
                    <input placeholder="Search users..." value={query} onChange={(e)=>setQuery(e.target.value)} />
                </div>
                <ul className="users-list">
                    {filteredUsers.map(u => (
                        <li key={u.userId} className={u.userId === selectedUserId ? 'active' : ''} onClick={() => setSelectedUserId(u.userId)}>
                            <div className="u-name">{u.fname} {u.lname}</div>
                            <div className="u-meta">{u.userName}</div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="projects-pane">
                <div className="projects-header">
                    <h3>Projects for user</h3>
                    <div className="projects-actions">
                        <button onClick={() => { setSelectedUserId(null); setUserProjects([]); }}>Clear</button>
                    </div>
                </div>
                <div className="projects-grid">
                    {loading ? <div className="loading">Loading...</div> : userProjects.length === 0 ? <div className="empty">No projects found</div> : userProjects.map(p => (
                        <div className="project-card" key={p.projectId || p.id}>
                            <div className="project-title">{p.projectName || p.name}</div>
                            <div className="project-meta">{p.workspaceName || ''}</div>
                            <div className="project-actions">
                                <button className="btn danger" onClick={() => handleDeny(p)}>Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {modal.show && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-title">{modal.type === 'confirm' ? 'Confirm Action' : 'Message'}</div>
                        <p>{modal.message}</p>
                        <div className="modal-buttons">
                            {modal.type === 'confirm' && (
                                <>
                                    <button className="btn secondary" onClick={closeModal}>No</button>
                                    <button className="btn primary" onClick={handleConfirm}>Yes</button>
                                </>
                            )}
                            {modal.type === 'alert' && (
                                <button className="btn primary" onClick={closeModal}>OK</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProjectManagement;