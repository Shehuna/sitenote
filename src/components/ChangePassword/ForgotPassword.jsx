import React, { useState, useEffect } from 'react';
import './ForgotPassword.css';

const ForgotPassword = ({ 
  initialEmail = '',
  onBackToLogin,
  onSuccess 
}) => {
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter OTP, 3: Reset password
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [userId, setUserId] = useState(null);

  const apiUrl = process.env.REACT_APP_API_BASE_URL;

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!email.trim()) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      // Call API to generate OTP
      const generateOtpUrl = `${apiUrl}/api/Otp/GenerateOtp`;
      
      const response = await fetch(generateOtpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to send OTP';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.Message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.message && data.message.toLowerCase().includes('success')) {
        setSuccess('OTP has been sent to your email address');
        setStep(2);
        
        // Start 30-second countdown for resend
        setCountdown(30);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
      } else {
        setError(data.message || 'Failed to send OTP');
      }

    } catch (err) {
      console.error('Send OTP error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!otp.trim()) {
      setError('Please enter the OTP');
      setIsLoading(false);
      return;
    }

    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      setIsLoading(false);
      return;
    }

    try {
      // Call API to verify OTP
      const verifyOtpUrl = `${apiUrl}/api/Otp/VerifyOtp`;
      
      const response = await fetch(verifyOtpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otp: otp
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to verify OTP';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.Message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.message && data.message.toLowerCase().includes('verified')) {
        // Get user by email to get user ID
        await getUserByEmail();
      } else {
        setError(data.message || 'Invalid or expired OTP');
      }

    } catch (err) {
      console.error('Verify OTP error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserByEmail = async () => {
    try {
      // URL encode the email
      const encodedEmail = encodeURIComponent(email);
      const getUserUrl = `${apiUrl}/api/UserManagement/GetUserByEmail/${encodedEmail}`;
      
      const response = await fetch(getUserUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch user information';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.Message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.message && data.message.toLowerCase().includes('success') && data.user) {
        setUserId(data.user.id);
        setSuccess('OTP verified successfully! You can now reset your password.');
        setStep(3);
      } else {
        throw new Error('User not found with the provided email');
      }

    } catch (err) {
      console.error('Get user error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!newPassword.trim()) {
      setError('Please enter a new password');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (!userId) {
      setError('User ID not found. Please restart the password reset process.');
      setIsLoading(false);
      return;
    }

    try {
      // Call API to reset password using user ID
      const resetPasswordUrl = `${apiUrl}/api/UserManagement/ChangePasswordWithoutOld/${userId}`;
      
      const response = await fetch(resetPasswordUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword: newPassword
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to reset password';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.Message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.message && data.message.toLowerCase().includes('success')) {
        setSuccess('Password reset successfully! You can now login with your new password.');
        
        // Notify parent component of success
        if (onSuccess) {
          onSuccess();
        }
        
        // Auto-close after success message
        setTimeout(() => {
          if (onBackToLogin) {
            onBackToLogin();
          }
        }, 5000);
      } else {
        setError(data.message || 'Failed to reset password');
      }

    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (countdown > 0) return;
    
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Reset countdown and resend
    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Call resend OTP API
    handleSendOTP(new Event('submit'));
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const goBackToEmail = () => {
    setStep(1);
    setOtp('');
    setError('');
    setSuccess('');
    setUserId(null);
  };

  const goBackToOTP = () => {
    setStep(2);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="forgot-password-container">
      <h3>Reset Password</h3>
      
      {step === 1 && (
        <form onSubmit={handleSendOTP} className="forgot-password-form">
          <div className="form-step">
            <div className="step-indicator">Step 1 of 3</div>
            <p className="step-description">Enter your email address to receive a verification code</p>
            
            <div className="input-group">
              <label htmlFor="email">Email Address:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                disabled={isLoading}
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="button-group">
              <button
                type="button"
                className="cancel-btn"
                onClick={onBackToLogin}
                disabled={isLoading}
              >
                Back to Login
              </button>
              <button 
                type="submit" 
                className="login-btn" 
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOTP} className="forgot-password-form">
          <div className="form-step">
            <div className="step-indicator">Step 2 of 3</div>
            <p className="step-description">
              Enter the 6-digit verification code sent to <strong>{email}</strong>
              <button 
                type="button" 
                className="change-email-btn"
                onClick={goBackToEmail}
              >
                Change email
              </button>
            </p>
            
            <div className="input-group">
              <label htmlFor="otp">Verification Code:</label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                }}
                placeholder="Enter 6-digit OTP"
                disabled={isLoading}
                maxLength={6}
                required
              />
            </div>

            <div className="resend-otp-container">
              <button
                type="button"
                className="resend-otp-btn"
                onClick={handleResendOTP}
                disabled={isLoading || countdown > 0}
              >
                {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="button-group">
              <button
                type="button"
                className="cancel-btn"
                onClick={goBackToEmail}
                disabled={isLoading}
              >
                Back
              </button>
              <button 
                type="submit" 
                className="login-btn" 
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="forgot-password-form">
          <div className="form-step">
            <div className="step-indicator">Step 3 of 3</div>
            <p className="step-description">
              Create a new password for your account
              <button 
                type="button" 
                className="change-email-btn"
                onClick={goBackToOTP}
              >
                Back to OTP
              </button>
            </p>
            
            <div className="input-group password-input-group">
              <label htmlFor="newPassword">New Password:</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="password-toggle-container">
              <label className="password-toggle-label">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={togglePasswordVisibility}
                  disabled={isLoading}
                />
                Show Passwords
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="button-group">
              <button
                type="button"
                className="cancel-btn"
                onClick={goBackToOTP}
                disabled={isLoading}
              >
                Back
              </button>
              <button 
                type="submit" 
                className="login-btn" 
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default ForgotPassword;