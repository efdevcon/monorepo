"use client";

import React from 'react';
import { appKit } from '@/config/appkit';

// Initialize AppKit at module level - this ensures AppKit is available throughout the app
// The appKit instance is created in the config file via createAppKit()
appKit;

// AppKit is initialized via the import above and createAppKit() call in appkit.ts
// This wrapper ensures AppKit context is available to all children
export function AppKitProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
} 
