'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SkippedContextType {
  isSkipped: boolean;
  setSkipped: (skipped: boolean) => void;
  clearSkipped: () => void;
}

const SkippedContext = createContext<SkippedContextType | undefined>(undefined);

export function SkippedProvider({ children }: { children: ReactNode }) {
  const [isSkipped, setIsSkipped] = useState(false);

  const setSkipped = (skipped: boolean) => {
    console.log('SkippedContext: setSkipped called with:', skipped);
    setIsSkipped(skipped);
  };

  const clearSkipped = () => {
    setIsSkipped(false);
  };

  return (
    <SkippedContext.Provider value={{ isSkipped, setSkipped, clearSkipped }}>
      {children}
    </SkippedContext.Provider>
  );
}

export function useSkipped() {
  const context = useContext(SkippedContext);
  if (context === undefined) {
    throw new Error('useSkipped must be used within a SkippedProvider');
  }
  return context;
} 
