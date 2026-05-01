import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSendResetOtp } from '../auth.hooks';
import { ROUTES } from '../../../utils/constants';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const { sendOtp, isLoading, error } = useSendResetOtp();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await sendOtp({ email });
    if (success) {
      // Redirect to Reset Password screen with email pre-filled via state
      navigate(ROUTES.RESET_PASSWORD, { state: { email } });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass animate-fade-in">
        <div className="auth-header">
          <h1>Forgot Password</h1>
          <p>Enter your email to receive a password reset OTP.</p>
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
          <Button type="submit" fullWidth isLoading={isLoading}>
            Send Reset OTP
          </Button>
        </form>

        <div className="auth-footer">
          Remember your password? <Link to={ROUTES.LOGIN}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
