import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api/UserManagement/Login`;
  const getUsersUrl = `${process.env.REACT_APP_API_BASE_URL}/api/UserManagement/GetUsers`;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          onLogin(data.user);
          navigate('/dashboard');
        } else {
          throw new Error('Login failed. Please check your username/password.');
        }
      } else {
        throw new Error('Login failed. Please check your username/password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please check your username/password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
    setIsLoading(true);

    const { username, email, phoneNumber, newPassword, confirmPassword } = forgotPasswordData;

    if (!username.trim()) {
      setForgotPasswordError('Please enter your username');
      setIsLoading(false);
      return;
    }

    if (!email.trim() && !phoneNumber.trim()) {
      setForgotPasswordError('Please enter either email or phone number');
      setIsLoading(false);
      return;
    }

    if (!newPassword.trim()) {
      setForgotPasswordError('Please enter a new password');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotPasswordError('New password and confirm password do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setForgotPasswordError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // Get all users to find the matching user
      const usersResponse = await fetch(getUsersUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }

      const usersData = await usersResponse.json();
      const users = usersData.users || usersData || []; 

      // Step 2: Find user by username and email/phone
      const foundUser = users.find(user => 
        user.userName?.toLowerCase() === username.toLowerCase() &&
        (user.email?.toLowerCase() === email.toLowerCase() || 
         user.phoneNumber === phoneNumber)
      );

      if (!foundUser) {
        setForgotPasswordError('User not found. Please check your username, email, and phone number.');
        setIsLoading(false);
        return;
      }

      // Change password using the user ID
      const changePasswordUrl = `${process.env.REACT_APP_API_BASE_URL}/api/UserManagement/ChangePassword/${foundUser.id}`;
      
      const changePasswordResponse = await fetch(changePasswordUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword: newPassword
        }),
      });

      if (!changePasswordResponse.ok) {
        const errorData = await changePasswordResponse.json();
        throw new Error(errorData.message || 'Failed to change password');
      }

      const changePasswordData = await changePasswordResponse.json();

      if (changePasswordData.success) {
        setForgotPasswordSuccess('Password changed successfully! You can now login with your new password.');
        setForgotPasswordData({ 
          username: '', 
          email: '', 
          phoneNumber: '', 
          newPassword: '', 
          confirmPassword: '' 
        });
        
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotPasswordSuccess('');
        }, 5000);
      } else {
        setForgotPasswordError(changePasswordData.message || 'Failed to change password');
      }

    } catch (err) {
      console.error('Forgot password error:', err);
      setForgotPasswordError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpRedirect = (e) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    console.log('Redirecting to user management...');
    navigate('/users/user-management?action=create');
  };

  const handleCancel = () => {
    setUsername('');
    setPassword('');
    setError(null);
    setShowForgotPassword(false);
    setForgotPasswordData({ 
      username: '', 
      email: '', 
      phoneNumber: '', 
      newPassword: '', 
      confirmPassword: '' 
    });
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    setShowForgotPassword(true);
    setForgotPasswordData(prev => ({ 
      ...prev, 
      username: username,
      newPassword: '',
      confirmPassword: ''
    }));
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setForgotPasswordData({ 
      username: '', 
      email: '', 
      phoneNumber: '', 
      newPassword: '', 
      confirmPassword: '' 
    });
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
  };

  const handleForgotPasswordInputChange = (field, value) => {
    setForgotPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Welcome to SiteNotes</h2>
        
        {!showForgotPassword ? (
         
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="username">Username:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={isLoading}
                required
              />
            </div>
            <div className="input-group password-input-group">
              <label htmlFor="password">Password:</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}

            {/* Temporarily disabled until further requirement is done */}

            {/*<div className="forgot-password-link">*/}
            {/*  <button*/}
            {/*    type="button"*/}
            {/*    className="forgot-password-btn"*/}
            {/*    onClick={handleForgotPasswordClick}*/}
            {/*    disabled={isLoading}*/}
            {/*  >*/}
            {/*    Forgot Password?*/}
            {/*  </button>*/}
            {/*</div>*/}

            <div className="signup-link-group">
              <span className="signup-text">Don't have an account?</span>
              <button 
                type="button"
                className="signup-btn"
                onClick={handleSignUpRedirect}
                disabled={isLoading}
              >
                Sign up
              </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="button-group">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button type="submit" className="login-btn" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'OK'}
              </button>
            </div>
          </form>
        ) : (
          // Forgot Password Form
          <form onSubmit={handleForgotPassword}>
           {/*  <div className="forgot-password-instruction">
              <p>Enter your username and email and set a new password.</p>
            </div> */}
            
            <div className="input-group">
              <label htmlFor="forgot-username">Username:</label>
              <input
                type="text"
                id="forgot-username"
                value={forgotPasswordData.username}
                onChange={(e) => handleForgotPasswordInputChange('username', e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="email">Email Address:</label>
              <input
                type="email"
                id="email"
                value={forgotPasswordData.email}
                onChange={(e) => handleForgotPasswordInputChange('email', e.target.value)}
                placeholder="Enter your email address"
                disabled={isLoading}
              />
            </div>

            <div className="input-group password-input-group">
              <label htmlFor="newPassword">New Password:</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  value={forgotPasswordData.newPassword}
                  onChange={(e) => handleForgotPasswordInputChange('newPassword', e.target.value)}
                  placeholder="Enter new password"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="input-group password-input-group">
              <label htmlFor="confirmPassword">Confirm Password:</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={forgotPasswordData.confirmPassword}
                  onChange={(e) => handleForgotPasswordInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm new password"
                  disabled={isLoading}
                  required
                />
              </div>
            </div> 

            {forgotPasswordError && <div className="error-message">{forgotPasswordError}</div>}
            {forgotPasswordSuccess && <div className="success-message">{forgotPasswordSuccess}</div>}

            <div className="button-group">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleBackToLogin}
                disabled={isLoading}
              >
                Back to Login
              </button>
              <button 
                type="submit" 
                className="login-btn" 
                disabled={isLoading}
              >
                {isLoading ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;