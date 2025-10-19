import React, { useEffect, useState } from 'react'
import Modal from '../Modals/Modal';
import toast from 'react-hot-toast';

const WorkspaceManagement = ({onUpdateDefaultWorkspace}) => {
    
    const [workspaceName, setWorkspaceName] = useState('');
    const [ownerUserID, setOwnerUserID] = useState('');
    const [ownerType, setOwnerType] = useState(1);
    const [ownerName, setOwnerName] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [billingAddressLine1, setBillingAddressLine1] = useState('');
    const [billingAddressLine2, setBillingAddressLine2] = useState('');
    const [billingCity, setBillingCity] = useState('');
    const [billingState, setBillingState] = useState('');
    const [billingCountry, setBillingCountry] = useState('');
    const [billingPostalCode, setBillingPostalCode] = useState('');
    const [phone, setPhone] = useState('');
    const [taxID, setTaxID] = useState('');
    const [status, setStatus] = useState(2);

    const [isAddWorkspaceOpen, setIsAddWorkspaceOpen] = useState(false);
    const [isEditWorkspaceOpen, setIsEditWorkspaceOpen] = useState(false);
    const [isChangeWorkspaceOpen, setIsChangeWorkspaceOpen] = useState(false);
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    const [workspaces, setWorkspaces] = useState([]);
    
    
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const COUNTRY_OPTIONS = [
    "United States",
    "Canada",
    "United Kingdom",
    "Australia",
    "Germany",
    "France",
    "Japan",
    "Brazil",
    "India",
    "China",
    "Djibouti",
    "Ethiopia",
];

    const API_URL = process.env.REACT_APP_API_BASE_URL

      useEffect(() => {
            const user = JSON.parse(localStorage.getItem('user'));
            setOwnerUserID(user.id)
            fetchWorkspaces(user.id);
        }, []);

        useEffect(() => {
                if (isChangeWorkspaceOpen && selectedWorkspace) {
                    const workspace = workspaces.find(w => w.id === parseInt(selectedWorkspace));
                    if (workspace) {
                        setWorkspaceName(workspace.name)
                        setOwnerType(workspace.ownerType)
                        setOwnerName(workspace.ownerName)
                        setAddressLine1(workspace.addressLine1)
                        setCity(workspace.city)
                        setCountry(workspace.country)
                        setStatus(workspace.status)
                    }
                } else{
                    setWorkspaceName('')
                }
            }, [isChangeWorkspaceOpen, selectedWorkspace, workspaces]);
    
    
       const fetchWorkspaces = async (userid) => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/api/Workspace/GetWorkspacesByUserId/${userid}`,{
            method: 'GET'
          });
          
          if (!response.ok) {
            throw new Error('Error fetching users data!');
          }
          
          const data = await response.json();
          setWorkspaces(data.workspaces || []);
        } catch (err) {
          setError(err.message);
          console.error('Error fetching Workspaces:', err);
        } finally {
          setLoading(false);
        }
      };

   
   const handleEditWorkspace = async () => {
    if (!selectedWorkspace || !workspaceName) {
        toast.error('Please select a workspace and enter a new name.')
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/Workspace/UpdateWorkspace/${selectedWorkspace}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id: selectedWorkspace,
                name: workspaceName,
                ownerUserID: ownerUserID,
                ownerType: ownerType,
                ownerName: ownerName,
                addressLine1: addressLine1,
                city: city,
                country: country,
                status: status
             }),
        });

        if (!response.ok) throw new Error('Failed to update workspace');
        
        fetchWorkspaces();
        setWorkspaceName('')
        setOwnerType(1)
        setOwnerName('')
        setAddressLine1('')
        setCity('')
        setCountry('')
        setStatus(2)
        setSelectedWorkspace('');
        setIsEditWorkspaceOpen(false);
        toast.success('Worksapce is updated successfully')
        fetchWorkspaces(ownerUserID);
    } catch (err) {
        setError(err.message);
        toast.error('Error updating workspace')
    }
};

 const handleAddWorkspace = async () => {
    try {
        const response = await fetch(`${API_URL}/api/Workspace/AddWorkspace`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: workspaceName,
                ownerUserID: ownerUserID,
                ownerType: ownerType,
                ownerName: ownerName,
                addressLine1: addressLine1,
                city: city,
                country: country,
                status: status
            }),
        
            });

        if (!response.ok) throw new Error('Failed to add workspace');
        fetchWorkspaces(); 
        setWorkspaceName('')
        setOwnerType(1)
        setOwnerName('')
        setAddressLine1('')
        setCity('')
        setCountry('')
        setStatus(2)
        setIsAddWorkspaceOpen(false);
        const data = await response.json()
        const workspaceID =  data.workspace.id
        console.log(workspaceID)
        await addUserToWorkSpace(ownerUserID, workspaceID)
    } catch (err) {
        setError(err.message);
        console.error('Error adding workspace:', err);
    }
};

  const addUserToWorkSpace = async(userid, workspaceId) => {
    try {
        const response = await fetch(`${API_URL}/api/UserWorkspace/AddUserWorkspace`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userID: userid,
                workspaceID: workspaceId,
                role: 1,
                status: 1
            }),
        
            });

        if (!response.ok) throw new Error('Failed to add workspace');
        toast.success('Workspace Created Successfully')
        fetchWorkspaces(userid);
        } catch (err) {
        setError(err.message);
        console.error('Error adding workspace:', err);
    }
  }

  const updateDefWorkspace = async () =>{
    onUpdateDefaultWorkspace(selectedWorkspace, workspaceName)
    setIsChangeWorkspaceOpen(false)
    await updateUserDefaultWorkspace()
  }

  const updateUserDefaultWorkspace = async () =>{
    try {
        const response = await fetch(`${API_URL}/api/UserManagement/UpdateDefaultWorkspaceByUserId/${ownerUserID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                defaultWorkspaceId: selectedWorkspace
            }),
        
            });

        if (!response.ok) throw new Error('Failed to add workspace');
        else toast.success('default workspace is successfully updated')
    } catch (err) {
        setError(err.message);
        console.error('Error adding workspace:', err);
    }
  }

  const handleOptionClick = (works) => {
        console.log(works)
        setWorkspaceName(works.name)
        setOwnerType(works.ownerType)
        setOwnerName(works.ownerName)
        setAddressLine1(works.addressLine1)
        setCity(works.city)
        setCountry(works.country)
        setStatus(works.status)
  }
  return (
     
    <div className="settings-content">
        <div className="settings-action-buttons">
            <button className="btn-primary" onClick={() => setIsAddWorkspaceOpen(true)} disabled>
                Add Workspace
            </button>
            <button className="btn-secondary" onClick={() => setIsEditWorkspaceOpen(true)} disabled>
                Edit Workspace
            </button>
            <button className="btn-secondary" onClick={() => setIsChangeWorkspaceOpen(true)} >
                Select Workspace
            </button>
        </div>
        <div className="settings-lookup-list">
            <h4>Workspace Lookups</h4>
            <select
                size="5"
                className="lookup-select"
                value={selectedWorkspace}
                onChange={(e) => setSelectedWorkspace(e.target.value)}
            >
                <option value="">Select a Workspace</option>
                {workspaces.map(workspace => (
                    <option onClick={()=>handleOptionClick(workspace)} key={workspace.id} value={workspace.id}>
                        {workspace.name}
                    </option>
                ))}
            </select>
        </div>
         <Modal isOpen={isAddWorkspaceOpen} onClose={() => setIsAddWorkspaceOpen(false)} title="Add Workspace">
                <div className="settings-form">
                  <div className="settings-form user-form-grid">
                        <div className="form-group">
                            <label>Workspace Name:</label>
                            <input
                                type="text"
                                value={workspaceName}
                                onChange={(e) => setWorkspaceName(e.target.value)}
                                placeholder="Enter workspace name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Owner Type:</label>
                            <select
                                value={ownerType}
                                onChange={(e) => setOwnerType(e.target.value)}
                                
                            >
                                <option value="1">Individual</option>
                                <option value="2">Company</option>
                                
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Owner Name:</label>
                            <input
                                type="text"
                                value={ownerName}
                                onChange={(e) => setOwnerName(e.target.value)}
                                placeholder="Enter Owner name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Address Line 1:</label>
                            <input
                                type="text"
                                value={addressLine1}
                                onChange={(e) => setAddressLine1(e.target.value)}
                                placeholder="Enter address Line 1"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>City:</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Enter city"
                                required
                            />
                        </div>
                          <div className="form-group">
                            <label htmlFor="country-select">Country:</label>
                                <select
                                id="country-select"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                required
                                >
                                <option value="" disabled>Select Country</option> 
                                {COUNTRY_OPTIONS.map((countryName) => (
                                <option key={countryName} value={countryName}>
                                {countryName}
                                </option>
                                ))}
                                </select>
                            </div>
                    </div>
                    
                    <div className="modal-footer">
                        <button className="btn-primary" onClick={handleAddWorkspace} >
                            Add
                        </button>
                        <button className="btn-close" onClick={() => setIsAddWorkspaceOpen(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
        </Modal>

        <Modal isOpen={isEditWorkspaceOpen} onClose={() => setIsEditWorkspaceOpen(false)} title="Edit Workspace">
        <div className="settings-form">
                  <div className="settings-form user-form-grid">
                        <div className="form-group">
                            <label>Workspace Name:</label>
                            <input
                                type="text"
                                value={workspaceName}
                                onChange={(e) => setWorkspaceName(e.target.value)}
                                placeholder="Enter workspace name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Owner Type:</label>
                            <select
                                value={ownerType}
                                onChange={(e) => setOwnerType(e.target.value)}
                                
                            >
                                <option value="1">Individual</option>
                                <option value="2">Company</option>
                                
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Owner Name:</label>
                            <input
                                type="text"
                                value={ownerName}
                                onChange={(e) => setOwnerName(e.target.value)}
                                placeholder="Enter Owner name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Address Line 1:</label>
                            <input
                                type="text"
                                value={addressLine1}
                                onChange={(e) => setAddressLine1(e.target.value)}
                                placeholder="Enter address Line 1"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>City:</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Enter city"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="country-select">Country:</label>
                                <select
                                id="country-select"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                required
                                >
                                <option value="" disabled>Select Country</option> 
                                {COUNTRY_OPTIONS.map((countryName) => (
                                <option key={countryName} value={countryName}>
                                {countryName}
                                </option>
                                ))}
                                </select>
                            </div>
                    </div>
                    
                    <div className="modal-footer">
                        <button className="btn-primary" onClick={handleEditWorkspace} >
                            Add
                        </button>
                        <button className="btn-close" onClick={() => setIsEditWorkspaceOpen(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
    </Modal>

        <Modal isOpen={isChangeWorkspaceOpen} onClose={() => setIsChangeWorkspaceOpen(false)} title="Change Workspace">
            <div className="settings-form">
                    <div className="settings-form">
                            
                            <div className="form-group">
                                <label>Workspaces:</label>
                                <select
                                   value={selectedWorkspace}
                                    onChange={(e) => setSelectedWorkspace(e.target.value)}
                                >
                                    <option value="">Select Workspaces</option>
                                    {workspaces.map(workspace => (
                                    <option onClick={()=>handleOptionClick(workspace)} key={workspace.id} value={workspace.id}>
                                        {workspace.name}
                                    </option>
                ))}
                                </select>
                            </div>
                            <div className="modal-footer">
                            <button className="btn-primary" onClick={updateDefWorkspace} >
                                Change
                            </button>
                            <button className="btn-close" onClick={()=>setIsChangeWorkspaceOpen(false)}>
                                Cancel
                            </button>
                        </div>
                           
                        </div>
                        
                       
                    </div>
        </Modal>
    </div>

    
  )
}

export default WorkspaceManagement