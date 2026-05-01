import { Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import Button from '../components/common/Button';

const Home = () => {
  return (
    <div className="container flex-column flex-center" style={{ minHeight: '100vh', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>
        Modern Document Management
      </h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '2rem' }}>
        Create, edit, and share your documents seamlessly with our powerful editor.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link to={ROUTES.REGISTER}>
          <Button size="lg">Get Started</Button>
        </Link>
        <Link to={ROUTES.LOGIN}>
          <Button variant="secondary" size="lg">Sign In</Button>
        </Link>
      </div>
    </div>
  );
};

export default Home;
