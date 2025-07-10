import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  type?: 'Primary' | 'Secondary';
  icon?: boolean;
  state?: 'default' | 'hover' | 'active' | 'disabled';
  onClick?: () => void;
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: any;
}

export default function Button({
  children,
  type = 'Primary',
  icon = false,
  state = 'default',
  onClick,
  className = '',
  props,
}: ButtonProps) {
  const baseClasses =
    'self-stretch p-4 rounded-[1px] inline-flex justify-center items-center gap-2';

  const typeClasses = {
    Primary: 'bg-sky-700 shadow-[0px_6px_0px_0px_rgba(18,81,129,1.00)]',
    Secondary: 'bg-gray-500 shadow-[0px_6px_0px_0px_rgba(75,85,99,1.00)]',
  };

  const stateClasses = {
    default: '',
    hover: 'hover:opacity-90',
    active:
      'active:transform active:translate-y-1 active:shadow-[0px_2px_0px_0px_rgba(18,81,129,1.00)]',
    disabled: 'opacity-50 cursor-not-allowed',
  };

  const textClasses =
    "text-center justify-start text-white text-base font-bold font-['Roboto'] leading-none";

  return (
    <button
      data-icon={icon}
      data-state={state}
      data-type={type}
      className={`${baseClasses} ${typeClasses[type]} ${stateClasses[state]} ${className}`}
      onClick={onClick}
      disabled={state === 'disabled'}
      {...props}
    >
      <div className={textClasses}>{children}</div>
    </button>
  );
}
