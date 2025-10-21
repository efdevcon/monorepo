'use client';

interface ComingSoonMessageProps {
  message?: string;
  className?: string;
}

export default function ComingSoonMessage({ 
  message = 'Coming soon...', 
  className = '' 
}: ComingSoonMessageProps) {
  return (
    <div
      className={`flex items-center justify-center min-h-[400px] ${className}`}
    >
      <div className="text-center space-y-4 pt-10">
        <div className="text-6xl">🚧</div>
        <h2 className="text-2xl font-bold text-[#353548]">{message}</h2>
        <p className="text-[#4b4b66] text-sm max-w-md mx-auto">
          This feature is currently under development and will be available
          soon.
        </p>
      </div>
    </div>
  );
}

