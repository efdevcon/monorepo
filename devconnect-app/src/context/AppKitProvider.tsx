"use client";

import React from 'react';

// AppKit is initialized via the import in UnifiedProvider
// This is just a wrapper component for consistency
export function AppKitProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
} 
