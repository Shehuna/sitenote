import React, { useState, useRef } from 'react';
import './RequestWorkspaceOtpModal.css';

const RequestWorkspaceOtpModal = ({ 
  isOpen, 
  onClose,
  onVerificationSuccess,
  existingEmail = ''
}) => {
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter OTP
  const [email, setEmail] = useState(existingEmail);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const apiUrl = process.env.REACT_APP_API_BASE_URL;
  const emailInputRef = useRef(null);
  const otpInputRef = useRef(null);

  // Focus on email input when modal opens
  React.useEffect(() => {
    if (isOpen && step === 1 && emailInputRef.current) {
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, step]);

  // Focus on OTP input when moving to step 2
  React.useEffect(() => {
    if (step === 2 && otpInputRef.current) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    
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
        setSuccess('Verification code has been sent to your email');
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
    if (e) e.preventDefault();
    
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!otp.trim()) {
      setError('Please enter the verification code');
      setIsLoading(false);
      return;
    }

    if (otp.length !== 6) {
      setError('Verification code must be 6 digits');
      setIsLoading(false);
      return;
    }

    try {
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
        setSuccess('Email verified successfully!');
        
        // Notify parent component that verification succeeded
        if (onVerificationSuccess) {
          onVerificationSuccess(email);
        }
        
        // Close the OTP modal
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(data.message || 'Invalid or expired verification code');
      }

    } catch (err) {
      console.error('Verify OTP error:', err);
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
    handleSendOTP();
  };

  const goBackToEmail = () => {
    setStep(1);
    setOtp('');
    setError('');
    setSuccess('');
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleKeyDown = (e) => {
    // Allow Enter key to submit form
    if (e.key === 'Enter') {
      if (step === 1) {
        handleSendOTP(e);
      } else if (step === 2) {
        handleVerifyOTP(e);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="otp-modal-overlay" onClick={onClose}>
      <div className="otp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="otp-modal-header">
          <h3>
            {step === 1 ? 'Verify Email Address' : 'Enter Verification Code'}
            <span className="step-indicator">Step {step} of 2</span>
          </h3>
          <button className="close-button" onClick={onClose} disabled={isLoading}>
            ×
          </button>
        </div>

        <div className="otp-modal-body">
          {step === 1 ? (
            <div className="email-step">
              <p className="step-description">
                Enter your email address to receive a verification code. 
              </p>
              
              <div className="input-group">
                <label htmlFor="email">Email Address:</label>
                <input
                  ref={emailInputRef}
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your email address"
                  disabled={isLoading}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="otp-modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  className="submit-btn" 
                  onClick={handleSendOTP}
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </div>
            </div>
          ) : (
            <div className="otp-step">
              <p className="step-description">
                Enter the 6-digit verification code sent to <strong>{email}</strong>
                <button 
                  type="button" 
                  className="change-email-btn"
                  onClick={goBackToEmail}
                  disabled={isLoading}
                >
                  Change email
                </button>
              </p>
              
              <div className="input-group">
                <label htmlFor="otp">Verification Code:</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter 6-digit code"
                  disabled={isLoading}
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                />
              </div>

              <div className="resend-otp-container">
                <button
                  type="button"
                  className="resend-otp-btn"
                  onClick={handleResendOTP}
                  disabled={isLoading || countdown > 0}
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend verification code'}
                </button>
              </div>

              <div className="otp-modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={goBackToEmail}
                  disabled={isLoading}
                >
                  Back
                </button>
                <button 
                  type="button"
                  className="submit-btn" 
                  onClick={handleVerifyOTP}
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

        </div>
      </div>
    </div>
  );
};

export default RequestWorkspaceOtpModal;