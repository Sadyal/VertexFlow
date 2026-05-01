import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useResetPassword } from '../auth.hooks';
import { ROUTES } from '../../../utils/constants';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import './Auth.css';

const ResetPassword = () => {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const { reset, isLoading, error } = useResetPassword();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state && location.state.email) {
      setEmail(location.state.email);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await reset({ email, otp, newPassword });
    if (success) {
      // Direct them to login page after successful reset
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass animate-fade-in">
        <div className="auth-header">
          <h1>Set New Password</h1>
          <p>Enter the OTP sent to your email and your new password.</p>
        </div>
        
        {error && <div className="auth-error">{error}</div>}

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
            label="Reset OTP" 
            type="text" 
            placeholder="Enter OTP from email"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <Input 
            id="newPassword" 
            label="New Password" 
            type="password" 
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Button type="submit" fullWidth isLoading={isLoading}>
            Update Password
          </Button>
        </form>

        <div className="auth-footer">
          <Link to={ROUTES.LOGIN}>Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
