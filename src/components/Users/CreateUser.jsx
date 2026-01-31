import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import Modal from '../Modals/Modal';
import { useNavigate, useLocation } from 'react-router-dom'; // Added useLocation

const CreateUser = ({ onLogin }) => {
    const [isAddUserOpen, setIsAddUserOpen] = useState(true);
    const navigate = useNavigate();
    const location = useLocation(); // Get location to access query params

    const [formData, setFormData] = useState({
        Fname: '',
        Lname: '',
        UserName: '',
        Email: '',
        Password: '',
        ConfirmPassword: '',
        profilePicturePath: null
    })
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const API_URL = process.env.REACT_APP_API_BASE_URL

    // Extract email from URL query parameters
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const emailFromUrl = queryParams.get('email');
        const action = queryParams.get('action');
        
        // If we have an email in the URL and action is create, populate it
        if (emailFromUrl && action === 'create') {
            setFormData(prevData => ({
                ...prevData,
                Email: decodeURIComponent(emailFromUrl)
            }));
        }
        
        // Optional: Set isAddUserOpen based on action
        setIsAddUserOpen(action === 'create');
        
    }, [location.search]); // Run when URL query params change

    const handleInputChange = (e) => {
        const {name, value, files} = e.target;
        if(name === 'profilePicturePath'){
            setFormData((prevData) => ({...prevData, [name]: files[0]}))
        }else{
            setFormData((prevData) => ({...prevData, [name]: value}))
        }
        
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({...prev, [name]: ''}));
        }
    }

    const validateForm = () => {
        const newErrors = {};
        
        // Required field validation
        if (!formData.Fname.trim()) newErrors.Fname = 'First name is required';
        if (!formData.Lname.trim()) newErrors.Lname = 'Last name is required';
        if (!formData.UserName.trim()) newErrors.UserName = 'Username is required';
        if (!formData.Email.trim()) newErrors.Email = 'Email is required';
        if (!formData.Password) newErrors.Password = 'Password is required';
        if (!formData.ConfirmPassword) newErrors.ConfirmPassword = 'Confirm password is required';
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.Email && !emailRegex.test(formData.Email)) {
            newErrors.Email = 'Please enter a valid email address';
        }
        
        // Password validation
        if (formData.Password) {
            if (formData.Password.length < 6) {
                newErrors.Password = 'Password must be at least 6 characters';
            }
        }
        
        // Confirm password validation
        if (formData.Password && formData.ConfirmPassword && formData.Password !== formData.ConfirmPassword) {
            newErrors.ConfirmPassword = 'Passwords do not match';
        }
        
        return newErrors;
    }

    const isFormValid = () => {
        const requiredFields = ['Fname', 'Lname', 'UserName', 'Email', 'Password', 'ConfirmPassword'];
        const allFieldsFilled = requiredFields.every(field => formData[field] && formData[field].toString().trim() !== '');
        const noErrors = Object.keys(validateForm()).length === 0;
        return allFieldsFilled && noErrors;
    }

    const handleCreateUser = async () => {
        // Validate form before submission
        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            toast.error('Please fix the errors in the form');
            return;
        }
        
        // Check if passwords match (double check)
        if (formData.Password !== formData.ConfirmPassword) {
            setErrors(prev => ({...prev, ConfirmPassword: 'Passwords do not match'}));
            toast.error('Passwords do not match');
            return;
        }
        
        const formDataObj = new FormData()
        // Only append relevant fields to the API
        Object.keys(formData).forEach((key) => {
            if (key !== 'ConfirmPassword') { // Don't send confirm password to API
                formDataObj.append(key, formData[key])
            }
        })
        
        try {
            const response = await fetch(`${API_URL}/api/UserManagement/CreateUser`, {
                method: 'POST',
                body: formDataObj
            });
            
            if (!response.ok) {
                toast.error("Error creating user!")
            }
            
            const result = await response.json();
            if (result.user) {
                localStorage.setItem('user', JSON.stringify(result.user));
                onLogin(result.user);
                navigate('/dashboard');
            }
            
            toast.success('User created successfully!');
            setIsAddUserOpen(false);
            
            // Reset form
            setFormData({
                Fname: '',
                Lname: '',
                UserName: '',
                Email: '',
                Password: '',
                ConfirmPassword: '',
                profilePicturePath: null
            });
            setErrors({});
            
        } catch (error) {
            console.error('Error creating user:', error);
            toast.error('Failed to create user. Please try again.');
        }
    };

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isAddUserOpen) {
            // Keep the email from URL if it exists
            const queryParams = new URLSearchParams(location.search);
            const emailFromUrl = queryParams.get('email');
            
            setFormData({
                Fname: '',
                Lname: '',
                UserName: '',
                Email: emailFromUrl ? decodeURIComponent(emailFromUrl) : '',
                Password: '',
                ConfirmPassword: '',
                profilePicturePath: null
            });
            setErrors({});
        }
    }, [isAddUserOpen, location.search]);

    const handleCloseModal = () => {
        setIsAddUserOpen(false);
        // Clear query parameters when closing
        navigate('/users/user-management');
    };

    return (
        <div className="settings-content">
            <Modal
                isOpen={isAddUserOpen}
                onClose={handleCloseModal}
                title="Add User"
            >
                <div className="settings-content">
                    <div className="settings-form user-form-grid">
                        <div className="form-group">
                            <label>First Name:</label>
                            <input
                                type="text"
                                name="Fname"
                                value={formData.Fname}
                                onChange={handleInputChange}
                                placeholder="First Name"
                                required
                            />
                            {errors.Fname && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{errors.Fname}</span>}
                        </div>

                        <div className="form-group">
                            <label>Last Name:</label>
                            <input
                                type="text"
                                name="Lname"
                                value={formData.Lname}
                                onChange={handleInputChange}
                                placeholder="Last Name"
                                required
                            />
                            {errors.Lname && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{errors.Lname}</span>}
                        </div>

                        <div className="form-group">
                            <label>Username:</label>
                            <input
                                type="text"
                                name="UserName"
                                value={formData.UserName}
                                onChange={handleInputChange}
                                placeholder="Username"
                                required
                            />
                            {errors.UserName && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{errors.UserName}</span>}
                        </div>

                        <div className="form-group">
                            <label>Email:</label>
                            <input
                                type="email"
                                name="Email"
                                value={formData.Email}
                                onChange={handleInputChange}
                                placeholder="Email"
                                required
                                disabled // Optional: disable email field if it comes from URL
                                style={formData.Email && formData.Email.includes('@') ? {backgroundColor: '#f5f5f5'} : {}}
                            />
                            {errors.Email && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{errors.Email}</span>}
                            {formData.Email && formData.Email.includes('@') && (
                                <small style={{fontSize: '11px', color: '#666'}}>
                                    Email pre-filled from OTP verification
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Password:</label>
                            <input
                                type="password"
                                name="Password"
                                value={formData.Password}
                                onChange={handleInputChange}
                                placeholder="Password"
                                required
                            />
                            {errors.Password && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{errors.Password}</span>}
                        </div>

                        <div className="form-group">
                            <label>Confirm Password:</label>
                            <input
                                type="password"
                                name="ConfirmPassword"
                                value={formData.ConfirmPassword}
                                onChange={handleInputChange}
                                placeholder="Confirm Password"
                                required
                            />
                            {errors.ConfirmPassword && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{errors.ConfirmPassword}</span>}
                        </div>

                        <div className="form-group">
                            <label>Profile Picture:</label>
                            <input
                                type="file"
                                name="profilePicturePath"
                                onChange={handleInputChange}
                                accept="image/*"
                            />
                            <small style={{fontSize: '11px', color: '#666'}}>Optional: Upload a profile picture</small>
                        </div>
                    </div>

                    <div className="settings-action-buttons" style={{marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                        <button 
                            className="btn-primary" 
                            onClick={handleCreateUser}
                            disabled={!isFormValid()}
                        >
                            Create User
                        </button>
                        <button 
                            className="btn-secondary"
                            onClick={handleCloseModal}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default CreateUser