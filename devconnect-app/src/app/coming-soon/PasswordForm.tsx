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
    <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xs mx-auto px-4">
      <div className="space-y-3">
        <label 
          htmlFor="password" 
          className="block text-center text-sm font-medium"
          style={{ color: '#353548' }}
        >
          Have early access?
        </label>
        <div className="flex gap-2">
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="flex-1 px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm min-w-0"
            style={{ 
              borderColor: '#353548',
              backgroundColor: 'white',
              color: '#353548',
              maxWidth: '240px'
            }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            style={{ backgroundColor: '#353548' }}
          >
            {isLoading ? '...' : 'Enter'}
          </button>
        </div>
        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}
      </div>
    </form>
  );
}

