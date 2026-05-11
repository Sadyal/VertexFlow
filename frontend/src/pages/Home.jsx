import { Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import Button from '../components/common/Button';
import { Sparkles, FileText, Zap, Shield, ArrowRight } from 'lucide-react';

const Home = () => {
  return (
    <div className="landing-page-wrapper" style={{ overflowX: 'hidden' }}>
      {/* 🚀 HERO SECTION */}
      <section className="hero-section container flex-column flex-center" style={{ minHeight: '100vh', position: 'relative', paddingTop: '4rem' }}>
        <div className="hero-glow animate-fade-in" style={{ 
          position: 'absolute', 
          top: '10%', 
          left: '50%', 
          transform: 'translateX(-50%)',
          width: '600px', 
          height: '600px', 
          background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
          zIndex: -1,
          opacity: 0.4
        }}></div>

        <div className="badge-pill animate-fade-in" style={{ 
          background: 'var(--accent-light)', 
          padding: '0.5rem 1rem', 
          borderRadius: '2rem', 
          border: '1px solid var(--accent-primary)',
          color: 'var(--accent-primary)',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Sparkles size={16} /> Now with AI-Powered Intelligence
        </div>

        <h1 className="animate-slide-up" style={{ 
          fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', 
          textAlign: 'center', 
          maxWidth: '900px',
          background: 'linear-gradient(to bottom, var(--text-primary) 30%, var(--text-secondary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1.5rem',
          lineHeight: 1.1
        }}>
          Documents Reimagined for <br />
          <span style={{ color: 'var(--accent-primary)', WebkitTextFillColor: 'initial' }}>Modern Intelligence.</span>
        </h1>

        <p className="animate-slide-up" style={{ 
          fontSize: '1.25rem', 
          color: 'var(--text-secondary)', 
          maxWidth: '650px', 
          textAlign: 'center',
          marginBottom: '3rem',
          animationDelay: '0.1s'
        }}>
          Create, collaborate, and automate your workflow with VertexFlow. 
          The ultimate platform for high-performance teams and thinkers.
        </p>

        <div className="hero-actions animate-slide-up" style={{ display: 'flex', gap: '1.5rem', animationDelay: '0.2s' }}>
          <Link to={ROUTES.REGISTER}>
            <Button size="lg" className="glow-on-hover" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
              Start Writing Free <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </Button>
          </Link>
          <Link to={ROUTES.LOGIN}>
            <Button variant="secondary" size="lg" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
              Sign In
            </Button>
          </Link>
        </div>

        {/* 🚀 DASHBOARD MOCKUP PREVIEW */}
        <div className="preview-container glass animate-slide-up" style={{ 
          marginTop: '5rem', 
          width: '100%', 
          maxWidth: '1000px', 
          height: '400px', 
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          borderBottom: 'none',
          padding: '1rem',
          animationDelay: '0.3s',
          background: 'linear-gradient(to bottom, var(--bg-tertiary), var(--bg-primary))',
          overflow: 'hidden'
        }}>
          <div className="mock-window-header" style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }}></div>
          </div>
          <div className="mock-content" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '2rem' }}>
            <div className="mock-sidebar">
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: '32px', background: 'var(--border-color)', borderRadius: '6px', marginBottom: '12px', width: i === 0 ? '100%' : '80%' }}></div>
              ))}
            </div>
            <div className="mock-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass-panel" style={{ height: '120px', padding: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', background: 'var(--accent-light)', borderRadius: '8px', marginBottom: '12px' }}></div>
                  <div style={{ height: '12px', background: 'var(--border-color)', borderRadius: '4px', width: '60%' }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 FEATURES GRID */}
      <section className="features-section" style={{ padding: '8rem 0', background: 'var(--bg-primary)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Engineered for Excellence</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
              VertexFlow combines raw speed with intelligent features to help you work better.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <FeatureCard 
              icon={<Zap color="var(--accent-primary)" />} 
              title="Instant Sync" 
              description="Collaborate in real-time with zero latency. Every keystroke is saved and synced across all devices."
            />
            <FeatureCard 
              icon={<Sparkles color="#8b5cf6" />} 
              title="AI Copilot" 
              description="Write faster with context-aware AI. From summaries to creative expansions, we've got you covered."
            />
            <FeatureCard 
              icon={<Shield color="#10b981" />} 
              title="Military Grade" 
              description="Your data is encrypted at rest and in transit. Secure authentication keeps your workspace private."
            />
          </div>
        </div>
      </section>

      {/* 🚀 CTA SECTION */}
      <section className="cta-section container" style={{ padding: '5rem 0 8rem' }}>
        <div className="glass-card animate-fade-in" style={{ 
          padding: '4rem', 
          textAlign: 'center', 
          background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '300px', height: '300px', background: 'var(--accent-glow)', filter: 'blur(100px)', opacity: 0.15 }}></div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Ready to Flow?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
            Join thousands of users who have upgraded their document management game.
          </p>
          <Link to={ROUTES.REGISTER}>
            <Button size="lg" style={{ padding: '1rem 3rem' }}>Get Started Now</Button>
          </Link>
        </div>
      </section>

      {/* 🚀 FOOTER */}
      <footer className="container" style={{ padding: '4rem 0', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <FileText size={24} color="var(--accent-primary)" />
          <span style={{ fontWeight: '700', fontSize: '1.25rem' }}>VertexFlow</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          © 2026 VertexFlow Inc. Built for the future of collaboration.
        </p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="glass-panel" style={{ padding: '2.5rem', transition: 'transform 0.3s ease' }}>
    <div style={{ 
      width: '50px', 
      height: '50px', 
      background: 'var(--bg-primary)', 
      borderRadius: '12px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      marginBottom: '1.5rem',
      border: '1px solid var(--border-color)'
    }}>
      {icon}
    </div>
    <h3 style={{ marginBottom: '1rem' }}>{title}</h3>
    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>{description}</p>
  </div>
);

export default Home;

