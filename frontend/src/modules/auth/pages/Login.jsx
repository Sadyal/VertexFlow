import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLogin } from '../auth.hooks';
import { AuthContext } from '../../../context/AuthContext';
import { ROUTES } from '../../../utils/constants';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import './Auth.css';

/**
 * @component Login
 * @description Authentication page for existing users. Features a premium glassmorphic UI.
 */
const Login = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { login, isLoading, error } = useLogin();
  const { isAuthenticated, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(formData);
    if (success) {
      navigate(ROUTES.DASHBOARD);
    } else if (error && error.includes('verify')) {
      // The hook might have set the error to 'Please verify your account first'
      navigate(ROUTES.VERIFY_EMAIL);
    }
  };

  // We should also use a side-effect to check if error changed to verification error
  useEffect(() => {
    if (error && error.toLowerCase().includes('verify')) {
      navigate(ROUTES.VERIFY_EMAIL);
    }
  }, [error, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card glass animate-fade-in">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Enter your credentials to access your account</p>
        </div>
        
        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
          {/* Decoy inputs to trap aggressive browser autofill */}
          <input type="text" name="email" style={{ display: 'none' }} autoComplete="off" />
          <input type="password" name="password" style={{ display: 'none' }} autoComplete="off" />
          
          <Input 
            id="email" 
            label="Email Address" 
            type="email" 
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="chrome-off"
          />
          <Input 
            id="password" 
            label="Password" 
            type="password" 
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <Link to={ROUTES.FORGOT_PASSWORD} style={{ fontSize: '0.875rem' }}>Forgot Password?</Link>
          </div>
          <Button type="submit" fullWidth isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to={ROUTES.REGISTER}>Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
