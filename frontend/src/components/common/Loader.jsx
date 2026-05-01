import './Loader.css';

const Loader = ({ fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div className="loader-overlay glass">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="loader-container">
      <div className="spinner"></div>
    </div>
  );
};

export default Loader;
