import './Skeleton.css';

const Skeleton = ({ width, height, borderRadius, className = '' }) => {
  const style = {
    width: width || '100%',
    height: height || '20px',
    borderRadius: borderRadius || '4px'
  };

  return (
    <div 
      className={`skeleton-pulse ${className}`} 
      style={style}
    ></div>
  );
};

export default Skeleton;
