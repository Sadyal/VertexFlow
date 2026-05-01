import './Button.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false, 
  isLoading = false,
  className = '',
  ...props 
}) => {
  const baseClass = `btn btn-${variant} btn-${size} ${fullWidth ? 'w-full' : ''} ${className}`;
  
  return (
    <button className={baseClass.trim()} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <span className="loader-inline"></span> : children}
    </button>
  );
};

export default Button;
