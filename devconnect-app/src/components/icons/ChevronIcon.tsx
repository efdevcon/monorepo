interface ChevronIconProps {
  isExpanded?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const ChevronIcon = ({ isExpanded = false, size = 'md', color = '#4b4b66' }: ChevronIconProps) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-6 h-6'
  };

  return (
    <svg 
      className={`${sizeClasses[size]} transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
      viewBox="0 0 12 12" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M2 4L6 8L10 4" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ChevronIcon; 
