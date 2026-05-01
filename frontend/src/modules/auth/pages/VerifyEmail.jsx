import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVerifyEmail, useSendVerifyOtp } from '../auth.hooks';
import { ROUTES } from '../../../utils/constants';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import './Auth.css';

const VerifyEmail = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const { verify, isLoading, error } = useVerifyEmail();
  const { sendOtp, isLoading: isSendingOtp, error: sendError } = useSendVerifyOtp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.email) {
      setEmail(location.state.email);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    const success = await verify({ email, otp });
    if (success) {
      navigate(ROUTES.DASHBOARD);
    }
  };

  const handleResend = async () => {
    setSuccessMsg('');
    const success = await sendOtp(); // Relies on the user being somewhat "logged in" with cookies after register
    if (success) {
      setSuccessMsg('A new OTP has been sent to your email.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass animate-fade-in">
        <div className="auth-header">
          <h1>Verify Account</h1>
          <p>Please enter the OTP sent to your email address.</p>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        {sendError && <div className="auth-error">{sendError}</div>}
        {successMsg && <div className="auth-success" style={{color: 'var(--success)', marginBottom: '1rem', textAlign: 'center'}}>{successMsg}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input 
            id="email" 
            label="Email Address" 
            type="email" 
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input 
            id="otp" 
            label="One-Time Password (OTP)" 
            type="text" 
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <Button type="submit" fullWidth isLoading={isLoading}>
            Verify Email
          </Button>
          <Button 
            type="button" 
            variant="secondary" 
            fullWidth 
            onClick={handleResend}
            isLoading={isSendingOtp}
          >
            Resend OTP
          </Button>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmail;
