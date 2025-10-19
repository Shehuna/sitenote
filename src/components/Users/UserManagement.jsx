import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import Modal from '../Modals/Modal';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/images/avatar.png';
const useQuery = () => {
    return new URLSearchParams(window.location.search);
};

const UserManagement = () => {
    const navigate = useNavigate();
    const query = useQuery();
    const initialAddUserState = query.get('action') === 'create';
     const [isAddUserOpen, setIsAddUserOpen] = useState(false);
     const [isEditUserOpen, setIsEditUserOpen] = useState(false);
     const [isChangeUserPassOpen, setIsChangeUserPassOpen] = useState(false);
     const [isChangeUserStatusOpen, setIsChangeUserStatusOpen] = useState(false);
     const [isDeleteUserConfirmOpen, setIsDeleteUserConfirmOpen] = useState(false);
     const [selectedUser, setSelectedUser] = useState('');
     const [users, setUsers] = useState([]);
     const [userId, setUserId] = useState('')

     const [formData, setFormData] =useState({
        Fname: '',
        Lname: '',
        UserName: '',
        Email: '',
        Password: '',
        profilePictureBase64: null
     })
     const [errors, setErrors] = useState({});
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState(null);
     const [newPass, setNewPass] = useState('')
     const [confirmNewPass, setConfirmNewPass] = useState('')

     const API_URL = process.env.REACT_APP_API_BASE_URL
     const isSignUpFlow = initialAddUserState;
     useEffect(() => {
        if (!isSignUpFlow) {
            fetchUsers();
        }
    }, [isSignUpFlow]);
 
     useEffect(() => {
         fetchUsers();
    }, []);
    useEffect(() => {
    if (initialAddUserState) {
        setIsAddUserOpen(true);
    }
}, [initialAddUserState]);

    useEffect(() => {
            if ((isEditUserOpen || isChangeUserStatusOpen) && selectedUser) {
                const user = users.find(u => u.id === parseInt(selectedUser));
                if (user) {
                    setFormData({
                        Fname: user.fname,
                        Lname: user.lname,
                        UserName: user.userName,
                        Email: user.email,
                        Status: user.status,
                        profilePictureBase64: user.profilePictureBase64
                    })
                }
            } else {
                setFormData({
                    Fname: '',
                    Lname: '',
                    UserName: '',
                    Email: '',
                    Password: '',
                    profilePictureBase64: null
                })
                setErrors({}); 
            }
        }, [isEditUserOpen, isChangeUserStatusOpen, selectedUser, users]);


    const validateField = (name, value) => {
        let error = '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (name !== 'profilePictureBase64' && !value && isAddUserOpen) {
            error = 'This field is mandatory.';
        } else if (name === 'Fname' || name === 'Lname') {
            if (value.length < 2) error = 'Must be at least 2 characters long.';
            else if (value.length > 50) error = 'Cannot exceed 50 characters.';
        } else if (name === 'UserName') {
            if (value.length < 3) error = 'Must be at least 3 characters long.';
            else if (value.length > 30) error = 'Cannot exceed 30 characters.';
        } else if (name === 'Email') {
            if (!emailRegex.test(value)) error = 'Invalid email format.';
        } else if (name === 'Password' && isAddUserOpen) {
            if (value.length < 6) error = 'Password must be at least 6 characters long.';
        }

        setErrors(prevErrors => ({ ...prevErrors, [name]: error }));
        return error;
    };

    const validateForm = () => {
        let formErrors = {};
        let isValid = true;

        const mandatoryFields = ['Fname', 'Lname', 'UserName', 'Email', 'Password'];

        mandatoryFields.forEach(field => {
            const value = formData[field];
            const error = validateField(field, value);
            if (error) {
                formErrors[field] = error;
                isValid = false;
            }
        });

        setErrors(formErrors);
        return isValid;
    };


    const handleInputChange = (e) => {
    const {name, value, files} = e.target;

    let newValue = value;
    if(name === 'profilePictureBase64'){
      newValue = files[0];
      setFormData((prevData) => ({...prevData, [name]: files[0]}))
    }else{
      setFormData((prevData) => ({...prevData, [name]: value}))
    }
    
    validateField(name, newValue);
    }

    const handleCreateUser = async () => {
        if (!validateForm()) {
            toast.error('Please fill in all mandatory fields correctly.');
            return;
        }

        const formDataObj = new FormData()
        Object.keys(formData).forEach((key)=>{
          formDataObj.append(key, formData[key])
        })
    try {
        const response = await fetch(`${API_URL}/api/UserManagement/CreateUser`, {
          method: 'POST',
          body: formDataObj
        });

        if (!response.ok) {
          throw new Error('Failed to create user');
        }
        toast.success('User created successfully! 🎉');
        setIsAddUserOpen(false);
        fetchUsers();
        setFormData({
            Fname: '',
            Lname: '',
            UserName: '',
            Email: '',
            Password: '',
            profilePictureBase64: null,
        })
        setErrors({}); 
         if (isSignUpFlow) {
                setTimeout(() => {
                    navigate('/login');
                }, 1500); 
            } else {
                // If this was from the admin panel, refresh users
                fetchUsers();
            }

    } catch (error) {
        console.error('Error creating user:', error);
        toast.error('Failed to create user. Please try again.');
    }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/api/UserManagement/GetUsers`);
          
          if (!response.ok) {
            throw new Error('Error fetching users data!');
          }
          
          const data = await response.json();
          setUsers(data.users || []);
        } catch (err) {
          setError(err.message);
          console.error('Error fetching users:', err);
        } finally {
          setLoading(false);
        }
    };

    const handleEditeUser = async () => {
        const fieldsToValidate = ['Fname', 'Lname', 'UserName', 'Email'];
        let editErrors = {};
        let isValid = true;
        fieldsToValidate.forEach(field => {
             const error = validateField(field, formData[field]);
             if (error) {
                editErrors[field] = error;
                isValid = false;
             }
        });

        setErrors(editErrors);
        if (!isValid) {
            toast.error('Please correct the validation errors before updating.');
            return;
        }


        const formDataObj = new FormData()
        Object.keys(formData).forEach((key)=>{
          formDataObj.append(key, formData[key])
        })
    try {
        const response = await fetch(`${API_URL}/api/UserManagement/UpdateUser/${selectedUser}`, {
          method: 'PUT',
          body: formDataObj
        });

        if (!response.ok) {
          throw new Error('Failed to create user');
        }
        toast.success('User Updated successfully! 👍');
        setIsEditUserOpen(false);
        fetchUsers()
    } catch (error) {
        toast.error('Failed to update user. Please try again.');
    }
    };

    const handleDelete = async () => {
        
        try {
             const response = await fetch(`${API_URL}/api/UserManagement/DeleteUser/${selectedUser}`, 
                 {
                 method: 'DELETE',
                 headers: {
                     'Content-Type': 'application/json',
                 },
               }
             );

             if (!response.ok) {
                 throw new Error('Error Deleting User');
                 }
             setIsDeleteUserConfirmOpen(false)
             toast.success("User deleted Permanently")
             fetchUsers()
        } catch (error) {
             setError(error.message);
             toast.error(error)
        } 
    }

    const handlePasswordChange = async (e) =>{
             e.preventDefault()
             const passwordError = validateField('Password', newPass); 

             if(passwordError){
                toast.error(passwordError);
                return;
             }
             if(newPass === confirmNewPass){
                 try {
                const response = await fetch(`${API_URL}/api/UserManagement/ChangePassword/${selectedUser}`, 
                     {
                     method: 'PUT',
                     headers: {
                         'Content-Type': 'application/json',
                     },
                     body: JSON.stringify({
                         id: selectedUser,
                         newPassword: newPass,
                     })
                   }
                );

                if (!response.ok) {
                     throw new Error('Error updating password');
                     }
                setIsChangeUserPassOpen(false)
                toast.success("Password changed successfully 🔑")
                setIsChangeUserPassOpen(false)
                setNewPass('')
                setConfirmNewPass('')
                fetchUsers()
                 } catch (error) {
                     setError(error.message);
                     toast.error(error)
                 }  
             }else{
                 toast.error('Passwords do not match');
             }
    }
    
    const isAddFormValid = () => {
        const hasErrors = Object.values(errors).some(error => error !== '');
        const mandatoryFieldsFilled = formData.Fname && formData.Lname && formData.UserName && formData.Email && formData.Password;
        return !hasErrors && mandatoryFieldsFilled;
    }

   const closeAddUserModal = () => {
    setIsAddUserOpen(false);
    setErrors({});

    if (query.get('action') === 'create') {
        window.history.replaceState(null, '', window.location.pathname);
         if (isSignUpFlow) {
                navigate('/login');
            }
    }
    
};

    const handleSignUpRedirect = () => {
  navigate('/users/user-management?action=create');
};

    return (
        <div className="settings-content">
            {!isSignUpFlow && (
                <>
                 <div className="settings-action-buttons">
                     <button className="btn-primary" onClick={() => setIsAddUserOpen(true)}>
                                 Add 
                     </button>
                     <button className="btn-secondary" onClick={() => setIsEditUserOpen(true)} disabled={!selectedUser}>
                                 Edit 
                     </button>
                     <button className="btn-secondary" onClick={() => setIsChangeUserPassOpen(true)} disabled={!selectedUser}>
                                 Change Password
                     </button>
                     <button className="btn-secondary" onClick={() => setIsChangeUserStatusOpen(true)} disabled={!selectedUser}>
                                 Change Status
                     </button>
                     <button className="btn-danger" onClick={()=>setIsDeleteUserConfirmOpen(true)} disabled={!selectedUser}>
                                 Delete
                     </button>
                 </div>
    
                 <div className="settings-lookup-list">
                     <h4>User Lookups</h4>
                     <select
                         size="5"
                         className="lookup-select"
                         value={selectedUser}
                         onChange={(e) => setSelectedUser(e.target.value)}
                     >
                         <option value="">Select a User</option>
                             {users.map(user => (
                                 <option key={user.id} value={user.id}>
                                     {user.userName}
                                 </option>
                             ))}
                     </select>
                 </div>
                </>
            )}
                <Modal
                    isOpen={isAddUserOpen}
                    onClose={closeAddUserModal} 
                    title="Add User"
                >
                    <div className="settings-content">
                    <div className="settings-form user-form-grid">
                        <div className="form-group">
                        <label>First Name: *</label>
                        <input
                            type="text"
                            name="Fname"
                            value={formData.Fname}
                            onChange={handleInputChange}
                            placeholder=""
                            required
                        />
                        {errors.Fname && <p style={{color: 'red', fontSize: '12px'}}>{errors.Fname}</p>}
                        </div>

                        <div className="form-group">
                        <label>Last Name: *</label>
                        <input
                            type="text"
                            name="Lname"
                            value={formData.Lname}
                            onChange={handleInputChange}
                            placeholder=""
                            required
                        />
                        {errors.Lname && <p style={{color: 'red', fontSize: '12px'}}>{errors.Lname}</p>}
                        </div>

                        <div className="form-group">
                        <label>Username: *</label>
                        <input
                            type="text"
                            name="UserName"
                            value={formData.UserName}
                            onChange={handleInputChange}
                            placeholder=""
                            required
                        />
                        {errors.UserName && <p style={{color: 'red', fontSize: '12px'}}>{errors.UserName}</p>}
                        </div>

                        <div className="form-group">
                        <label>Email: *</label>
                        <input
                            type="email"
                            name="Email"
                            value={formData.Email}
                            onChange={handleInputChange}
                            placeholder=""
                            required
                        />
                        {errors.Email && <p style={{color: 'red', fontSize: '12px'}}>{errors.Email}</p>}
                        </div>

                        <div className="form-group">
                        <label>Password: *</label>
                        <input
                            type="password"
                            name="Password"
                            value={formData.Password}
                            onChange={handleInputChange}
                            placeholder=""
                            required
                        />
                        {errors.Password && <p style={{color: 'red', fontSize: '12px'}}>{errors.Password}</p>}
                        </div>

                        <div className="form-group">
                        <label>Profile Picture:</label>
                        <input
                            type="file"
                            name="profilePictureBase64"
                            onChange={handleInputChange}
                        />
                        </div>
                    </div>
                
                 </div>

                    <div className="settings-action-buttons">
                        <button 
                        className="btn-primary" 
                        onClick={handleCreateUser}
                        disabled={!isAddFormValid()}>
                        {isSignUpFlow ? "Create Account" : "Create User"}
                        </button>
                    </div>
                    
                </Modal>
                
                {!isSignUpFlow && (
                <>
                <Modal
                    isOpen={isEditUserOpen}
                    onClose={() => {
                        setIsEditUserOpen(false);
                        setErrors({});
                    }}
                    title="Edit User"
                    >
                    <div className="settings-content">
            
                        <div className="settings-form user-form-grid">
                        
                        <div className="form-group" >
                            <div style={{display: 'flex', justifyContent: 'center', alignItems:'center'}}>
                            <img style={{width: '70px', height: '70px', borderRadius: '50%'
                            }} src={formData.profilePictureBase64 !== null ? `data:image/png;base64,${formData.profilePictureBase64}` : logo} alt="" />
                            </div>
                            
                            <label>Profile Picture:</label>
                            <input
                            type="file"
                            name="profilePictureBase64"
                            onChange={handleInputChange}
                            />
                        </div>
                        <div className="form-group">
                        </div>
                        <div className="form-group">
                            <label>First Name: *</label>
                            <input
                            type="text"
                            name="Fname"
                            value={formData.Fname}
                            onChange={handleInputChange}
                            placeholder="First Name"
                            required
                            />
                            {errors.Fname && <p style={{color: 'red', fontSize: '12px'}}>{errors.Fname}</p>}
                        </div>

                        <div className="form-group">
                            <label>Last Name: *</label>
                            <input
                            type="text"
                            name="Lname"
                            value={formData.Lname}
                            onChange={handleInputChange}
                            placeholder="Last Name"
                            required
                            />
                            {errors.Lname && <p style={{color: 'red', fontSize: '12px'}}>{errors.Lname}</p>}
                        </div>

                        <div className="form-group">
                            <label>Username: *</label>
                            <input
                            type="text"
                            name="UserName"
                            value={formData.UserName}
                            onChange={handleInputChange}
                            placeholder="Username"
                            required
                            />
                            {errors.UserName && <p style={{color: 'red', fontSize: '12px'}}>{errors.UserName}</p>}
                        </div>

                        <div className="form-group">
                            <label>Email: *</label>
                            <input
                            type="email"
                            name="Email"
                            value={formData.Email}
                            onChange={handleInputChange}
                            placeholder="Email"
                            required
                            />
                            {errors.Email && <p style={{color: 'red', fontSize: '12px'}}>{errors.Email}</p>}
                        </div>
                        
                        </div>
                        
                        <div className="settings-action-buttons">
                        <button 
                            className="btn-primary" 
                            onClick={handleEditeUser}
                            disabled={Object.values(errors).some(error => error !== '')}>
                            Update User
                        </button>
                        </div>
                    </div>
                </Modal>
                <Modal
                    isOpen={isChangeUserPassOpen}
                    onClose={() => {
                        setIsChangeUserPassOpen(false);
                    }}
                    title="Change Password"
                    >
                    <div className="settings-form">
                        <div className="form-group">
                            <label>New Password: *</label>
                            <input
                                type="password"
                                value={newPass}
                                onChange={(e) => {
                                    setNewPass(e.target.value);
                                    validateField('Password', e.target.value); 
                                }}
                                placeholder="Enter New Password (Min 6)"
                            />
                            {errors.Password && <p style={{color: 'red', fontSize: '12px'}}>{errors.Password}</p>}
                        </div>
                        <div className="form-group">
                            <label>Confirm Password: *</label>
                            <input
                                type="password"
                                value={confirmNewPass}
                                onChange={(e) => setConfirmNewPass(e.target.value)} 
                                placeholder="Confirm Password"
                            />
                        </div>
                        
                        <div className="modal-footer">
                            <button
                                className="btn-primary"
                                onClick={handlePasswordChange}
                                disabled={!newPass || !confirmNewPass || errors.Password}
                            >
                                OK
                            </button>
                            <button
                                className="btn-close" 
                                onClick={()=>setIsChangeUserPassOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </Modal>
                <Modal
                    isOpen={isChangeUserStatusOpen}
                    onClose={() => {
                        setIsChangeUserStatusOpen(false);
                    }}
                    title="Change Status"
                    >
                    <div className="settings-form">
                        <div className="form-group">
                            <label>User Name:</label>
                            <input
                                type="text"
                                name="UserName"
                                value={formData.UserName}
                                onChange={handleInputChange}
                                placeholder="Username"
                                disabled
                            />
                        </div>
                        <div className="form-group">
                            <label>Status:</label>
                            <select
                                name="Status"
                                value={formData.Status}
                                onChange={handleInputChange}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        
                        <div className="modal-footer">
                            <button
                                className="btn-primary"
                                onClick={handleEditeUser}
                            >
                                OK
                            </button>
                            <button
                                className="btn-close" 
                                onClick={()=>setIsChangeUserStatusOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </Modal>

                <Modal
                    isOpen={isDeleteUserConfirmOpen}
                    onClose={() => {
                        setIsDeleteUserConfirmOpen(false);
                    }}
                    title="Confirm Delete"
                    >
                    <div><p style={{fontSize: '14', textAlign: 'center'}}>Are You sure you want to delete the selected user?</p></div>
                    <div className="modal-footer">
                            <button
                                className="btn-danger"
                                onClick={handleDelete}
                            >
                                OK
                            </button>
                            <button
                                className="btn-secondary" 
                                onClick={()=>setIsDeleteUserConfirmOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                </Modal>
              </>
            )}   
        </div>
        
    )
}

export default UserManagement