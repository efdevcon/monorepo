import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  type?: 'Primary' | 'Secondary' | 'Text';
  icon?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  props?: any;
}

export default function Button({
  children,
  type = 'Primary',
  icon = false,
  disabled = false,
  onClick,
  className = '',
  props,
}: ButtonProps) {
  const baseClasses =
    'px-8 py-4 rounded-[1px] inline-flex justify-center items-center gap-2 font-bold text-base transition-all duration-150 cursor-pointer focus:outline-none';

  const typeClasses = {
    Primary: `
      bg-[#1b6fae] text-white shadow-[0px_6px_0px_0px_rgba(18,81,129,1.00)]
      hover:bg-[#3c8ac5] 
      active:bg-[#1b6fae] active:shadow-[0px_3px_0px_0px_rgba(11,54,87,1.00)] active:translate-y-[3px] active:ring-0
      disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed
    `,
    Secondary: `
      bg-white text-[#36364c] shadow-[0px_6px_0px_0px_rgba(75,75,102,1.00)] outline outline-1 outline-offset-[-1px] outline-[#4b4b66]
      hover:bg-[#e3f1ff] 
      active:bg-white active:shadow-[0px_3px_0px_0px_rgba(43,43,63,1.00)] active:translate-y-[3px] active:ring-0
      disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed
    `,
    Text: `
      bg-transparent text-[#1b6fae]
      hover:text-[#3b8cc9] 
      active:text-[#0b3657] active:ring-0
      disabled:text-gray-400 disabled:cursor-not-allowed
    `,
  };

  const textClasses =
    type === 'Text' ? 'leading-normal' : 'leading-none text-center';

  return (
    <button
      data-icon={icon}
      data-type={type}
      className={`relative ${baseClasses} ${typeClasses[type]} ${className} focus:ring-2 focus:ring-[#36364c] focus:ring-offset-2 focus:ring-offset-white`}
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: 'Roboto',
        fontWeight: 'bold',
      }}
      {...props}
    >
      <div className={`justify-start ${textClasses}`}>{children}</div>
    </button>
  );
}
