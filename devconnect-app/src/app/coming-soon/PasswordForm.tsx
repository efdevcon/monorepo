'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PasswordForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call server-side API to verify password
      const response = await fetch('/api/early-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        // Cookie is set by the API, redirect to home
        router.push('/');
        router.refresh();
      } else {
        setError('Incorrect password');
        setIsLoading(false);
        setPassword('');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
      setPassword('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[345px] mx-auto px-4">
      <div className="flex flex-col gap-3">
        <p
          className="text-center text-sm font-medium tracking-[-0.1px]"
          style={{
            color: '#4b4b66',
            fontFamily: 'var(--font-geist-sans, sans-serif)',
            lineHeight: '1.3',
          }}
        >
          Here for early access?
        </p>
        <div className="flex flex-col gap-3">
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-3 py-3 border border-solid focus:outline-none focus:ring-1 focus:ring-[#0073de] text-sm tracking-[-0.1px] placeholder:text-[#7c7c99]"
            style={{
              borderColor: '#ededf0',
              backgroundColor: 'white',
              color: '#4b4b66',
              borderRadius: '2px',
              fontFamily: 'var(--font-geist-sans, sans-serif)',
              lineHeight: '1.3',
            }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: '#0073de',
              borderRadius: '1px',
              boxShadow: '0px 4px 0px 0px #005493',
              fontSize: '16px',
              fontFamily: 'var(--font-geist-sans, sans-serif)',
            }}
          >
            {isLoading ? '...' : 'Enter'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      </div>
    </form>
  );
}

