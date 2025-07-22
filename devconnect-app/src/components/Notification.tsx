'use client';

import { useEffect } from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function Notification({ 
  message, 
  type, 
  isVisible, 
  onClose, 
  autoClose = true, 
  autoCloseDelay = 5000 
}: NotificationProps) {
  useEffect(() => {
    if (isVisible && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoClose, autoCloseDelay, onClose]);

  if (!isVisible) return null;

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }[type];

  const icon = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
  }[type];

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className={`${bgColor} text-white p-4 rounded-lg shadow-lg flex items-start space-x-3`}>
        <div className="flex-shrink-0 text-lg">{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-white hover:text-gray-200 text-lg font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
} 
