interface LockIconProps {
  size?: 'sm' | 'md' | 'lg';
}

const LockIcon = ({ size = 'md' }: LockIconProps) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  };

  return (
    <svg 
      className={sizeClasses[size]}
      viewBox="0 0 12 12" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10.2844 5.14136H9.71436V10.8564H10.2844V5.14136Z" fill="white"/>
      <path d="M9.71438 10.8562H9.14062V11.43H9.71438V10.8562Z" fill="white"/>
      <path d="M9.14059 11.4299H2.85559V11.9999H9.14059V11.4299Z" fill="white"/>
      <path d="M8.57061 0.570068H8.00061V1.14382H8.57061V0.570068Z" fill="white"/>
      <path d="M6.85684 7.42866H6.28684V6.85866H6.85684V6.28491H5.14309V6.85866H4.56934V7.99866H5.14309V8.57241H5.71309V10.2862H6.28684V8.57241H6.85684V7.99866H7.42684V6.85866H6.85684V7.42866Z" fill="white"/>
      <path d="M8.00052 0H3.99927V0.57H8.00052V0Z" fill="white"/>
      <path d="M3.99932 0.570068H3.42932V1.14382H3.99932V0.570068Z" fill="white"/>
      <path d="M9.71427 5.1413V4.5713H9.14052V1.1438H8.57052V4.5713H3.42927V1.1438H2.85552V4.5713H2.28552V5.1413H9.71427Z" fill="white"/>
      <path d="M2.85552 10.8562H2.28552V11.43H2.85552V10.8562Z" fill="white"/>
      <path d="M2.28558 5.14136H1.71558V10.8564H2.28558V5.14136Z" fill="white"/>
    </svg>
  );
};

export default LockIcon; 
