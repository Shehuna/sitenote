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

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api/UserManagement/Login`;

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
        throw new Error( 'Login failed. Please check your username/password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please check your username/password.');
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
  };
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Welcome to SiteNotes</h2>
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
      </div>
    </div>
  );
};

export default Login;