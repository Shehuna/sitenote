import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import './GrantDenyProjects.css';

const GrantDenyProjects = ({ filteredUsers = [], projects = [], loading, setLoading }) => {
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [activeUserId, setActiveUserId] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [query, setQuery] = useState('');

    const API_URL = process.env.REACT_APP_API_BASE_URL;

    const users = filteredUsers || [];

    const visibleUsers = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return users;
        return users.filter(u => (u.userName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (`${u.fname || ''} ${u.lname || ''}`).toLowerCase().includes(q));
    }, [query, users]);

    const toggleSelectUser = (userId) => {
        setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const handleGrant = async () => {
        if (!selectedProjectId) { toast.error('Select a project first'); return; }
        if (selectedUserIds.length === 0) { toast.error('Select at least one user'); return; }
        setLoading(true);
        try {
            const promises = selectedUserIds.map(uid => fetch(`${API_URL}/api/UserProject/AddUserProject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, projectId: selectedProjectId }) }));
            const results = await Promise.allSettled(promises);
            const success = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
            const failed = results.length - success;
            if (success) toast.success(`Granted to ${success} user(s)`);
            if (failed) toast.error(`${failed} grant(s) failed`);
            setSelectedUserIds([]);
        } catch (err) { console.error(err); toast.error('Grant failed'); }
        finally { setLoading(false); }
    };

    return (
        <div className="grant-deny-root">
            <div className="left-col">
                <div className="list-header">
                    <input className="search" placeholder="Search users..." value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <ul className="user-list">
                    {visibleUsers.map(u => (
                        <li key={u.userId} className={`user-row ${selectedUserIds.includes(u.userId) ? 'selected' : ''}`} onClick={() => { toggleSelectUser(u.userId); setActiveUserId(u.userId); }}>
                            <div className="user-info">
                                <div className="user-name">{u.fname} {u.lname}</div>
                                <div className="user-email">{u.email}</div>
                            </div>
                            <div className="user-meta">{u.userName}</div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="right-col">
                <div className="project-select">
                    <label>Project</label>
                    <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                        <option value="">Select project</option>
                        {projects.map(p => (<option key={p.projectId || p.id} value={p.projectId || p.id}>{p.projectName || p.name || p.title || `Project ${p.id}`}</option>))}
                    </select>
                    <div className="actions">
                        <button className="btn primary" onClick={handleGrant} disabled={loading || !selectedProjectId || selectedUserIds.length===0}>Grant</button>
                    </div>
                </div>

                <div className="preview">
                    <h4>Selected users ({selectedUserIds.length})</h4>
                    <ul className="selected-users">
                        {selectedUserIds.map(id => { const u = users.find(x=>x.userId===id); return (<li key={id}>{u ? `${u.fname} ${u.lname} (${u.userName})` : id}</li>); })}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default GrantDenyProjects;
