'use client';

import { useEffect } from 'react';

/**
 * BigIntSerializer Component
 * 
 * This component adds global BigInt serialization support to JSON.stringify.
 * It must be rendered early in the app lifecycle, preferably in the root layout.
 * 
 * This fixes the "Do not know how to serialize a BigInt" error that occurs
 * when Next.js or other libraries try to serialize blockchain transaction data
 * containing BigInt values (gas amounts, block numbers, wei values, etc.)
 */
export function BigIntSerializer() {
  useEffect(() => {
    // Only run once on mount
    if (typeof BigInt !== 'undefined') {
      // Add toJSON method to BigInt prototype if it doesn't exist
      if (!(BigInt.prototype as any).toJSON) {
        // @ts-ignore - Adding toJSON to BigInt prototype
        BigInt.prototype.toJSON = function () {
          return this.toString();
        };
      }
    }
  }, []);

  // This component doesn't render anything
  return null;
}

