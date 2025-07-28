interface CloseIconProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const CloseIcon = ({ size = 'md', color = '#36364C' }: CloseIconProps) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-8 h-8', 
    lg: 'w-10 h-10'
  };

  return (
    <svg 
      className={sizeClasses[size]}
      preserveAspectRatio="none" 
      width="100%" 
      height="100%" 
      overflow="visible" 
      style={{ display: 'block' }}
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <g id="Close">
        <rect width="32" height="32" fill="#74ACDF" fillOpacity="0.15"/>
        <path 
          id="Vector" 
          d="M11.2 22L10 20.8L14.8 16L10 11.2L11.2 10L16 14.8L20.8 10L22 11.2L17.2 16L22 20.8L20.8 22L16 17.2L11.2 22Z" 
          fill={color}
        />
      </g>
    </svg>
  );
};

export default CloseIcon; 
