import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ForgotPassword from './ChangePassword/ForgotPassword';
import './Login.css';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // OTP signup states
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [otpGenerated, setOtpGenerated] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [signupStep, setSignupStep] = useState(1); // 1: Email, 2: OTP, 3: Success
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api/UserManagement/Login`;
  const otpGenerateUrl = `${process.env.REACT_APP_API_BASE_URL}/api/NewUserOtp/GenerateOtp`;
  const otpVerifyUrl = `${process.env.REACT_APP_API_BASE_URL}/api/NewUserOtp/VerifyOtp`;

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

  const handleSignUpClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSignupModal(true);
    setSignupStep(1);
    setSignupEmail('');
    setSignupOtp('');
    setOtpGenerated(false);
    setOtpVerified(false);
    setSignupError('');
  };

  const handleCloseSignupModal = () => {
    setShowSignupModal(false);
    setSignupStep(1);
    setSignupEmail('');
    setSignupOtp('');
    setSignupError('');
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSendOtp = async () => {
    if (!signupEmail.trim()) {
      setSignupError('Please enter your email address');
      return;
    }

    if (!validateEmail(signupEmail)) {
      setSignupError('Please enter a valid email address');
      return;
    }

    setSignupLoading(true);
    setSignupError('');

    try {
      const response = await fetch(otpGenerateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: signupEmail 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSignupStep(2);
        setOtpGenerated(true);
        setSignupError('');
        console.log('OTP generated successfully');
      } else {
        setSignupError(data.message || 'Failed to generate OTP. Please try again.');
      }
    } catch (err) {
      console.error('OTP generation error:', err);
      setSignupError('Failed to generate OTP. Please try again.');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!signupOtp.trim() || signupOtp.length !== 6) {
      setSignupError('Please enter a valid 6-digit OTP');
      return;
    }

    setSignupLoading(true);
    setSignupError('');

    try {
      const response = await fetch(otpVerifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: signupEmail,
          otp: signupOtp
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSignupStep(3);
        setOtpVerified(true);
        setSignupError('');
        
        // Automatically redirect to user management after a short delay
        setTimeout(() => {
          handleCloseSignupModal();
          navigate('/users/user-management?action=create&email=' + encodeURIComponent(signupEmail));
        }, 2000);
      } else {
        setSignupError(data.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setSignupError('Failed to verify OTP. Please try again.');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleResendOtp = () => {
    setSignupOtp('');
    setSignupError('');
    handleSendOtp();
  };

  const handleCancel = () => {
    setUsername('');
    setPassword('');
    setError(null);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    setShowForgotPassword(true);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
  };

  const handleForgotPasswordSuccess = () => {
    // Reset login form when password reset is successful
    setUsername('');
    setPassword('');
    setError(null);
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

            <div className="forgot-password-link">
              <button
                type="button"
                className="forgot-password-btn"
                onClick={handleForgotPasswordClick}
                disabled={isLoading}
              >
                Forgot Password?
              </button>
            </div>

            <div className="signup-link-group">
              <span className="signup-text">Don't have an account?</span>
              <button 
                type="button"
                className="signup-btn"
                onClick={handleSignUpClick}
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
          <ForgotPassword
            initialUsername={username}
            onBackToLogin={handleBackToLogin}
            onSuccess={handleForgotPasswordSuccess}
          />
        )}
      </div>

      {/* OTP Signup Modal */}
      {showSignupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Sign Up with OTP</h3>
              <button className="modal-close-btn" onClick={handleCloseSignupModal}>
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              {signupStep === 1 && (
                <div className="signup-step">
                  <p>Enter your email address to receive OTP for signup:</p>
                  <div className="input-group">
                    <label htmlFor="signup-email">Email:</label>
                    <input
                      type="email"
                      id="signup-email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="Enter your email"
                      disabled={signupLoading}
                      required
                    />
                  </div>
                  {signupError && <div className="error-message">{signupError}</div>}
                  <div className="modal-button-group">
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={handleCloseSignupModal}
                      disabled={signupLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="login-btn"
                      onClick={handleSendOtp}
                      disabled={signupLoading}
                    >
                      {signupLoading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </div>
                </div>
              )}

              {signupStep === 2 && (
                <div className="signup-step">
                  <p>OTP has been sent to <strong>{signupEmail}</strong></p>
                  <p>Please enter the 6-digit OTP:</p>
                  <div className="input-group">
                    <label htmlFor="signup-otp">OTP:</label>
                    <input
                      type="text"
                      id="signup-otp"
                      value={signupOtp}
                      onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      disabled={signupLoading}
                      required
                      maxLength="6"
                    />
                  </div>
                  {signupError && <div className="error-message">{signupError}</div>}
                  <div className="modal-button-group">
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => setSignupStep(1)}
                      disabled={signupLoading}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="resend-otp-btn"
                      onClick={handleResendOtp}
                      disabled={signupLoading}
                    >
                      Resend OTP
                    </button>
                    <button
                      type="button"
                      className="login-btn"
                      onClick={handleVerifyOtp}
                      disabled={signupLoading || signupOtp.length !== 6}
                    >
                      {signupLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </div>
              )}

              {signupStep === 3 && (
                <div className="signup-step success-step">
                  <div className="success-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <h4>OTP Verified Successfully!</h4>
                  <p>Redirecting to user registration...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;