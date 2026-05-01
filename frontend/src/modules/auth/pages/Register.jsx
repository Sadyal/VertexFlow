import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegister } from '../auth.hooks';
import { AuthContext } from '../../../context/AuthContext';
import { ROUTES } from '../../../utils/constants';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import './Auth.css';

/**
 * @component Register
 * @description Authentication page for new users. Features a premium glassmorphic UI.
 */
const Register = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const { register, isLoading, error } = useRegister();
  const { isAuthenticated } = useContext(AuthContext);
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
    const success = await register(formData);
    if (success) {
      navigate(ROUTES.VERIFY_EMAIL, { state: { email: formData.email } });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass animate-fade-in">
        <div className="auth-header">
          <h1>Create an Account</h1>
          <p>Join us to start managing your documents</p>
        </div>
        
        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input 
            id="name" 
            label="Full Name" 
            type="text" 
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <Input 
            id="email" 
            label="Email Address" 
            type="email" 
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <Input 
            id="password" 
            label="Password" 
            type="password" 
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
          <Button type="submit" fullWidth isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to={ROUTES.LOGIN}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
