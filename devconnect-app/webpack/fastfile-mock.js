// Mock fastfile module for client-side builds
// This provides the exports that snarkjs and other packages expect

// Mock functions that return promises resolving to empty objects or null
const mockFunction = () => Promise.resolve(null);

// Export all the functions that packages are trying to import
export const readExisting = mockFunction;
export const createOverride = mockFunction;
export const open = mockFunction;
export const close = mockFunction;
export const read = mockFunction;
export const write = mockFunction;

// Default export
export default {
  readExisting,
  createOverride,
  open,
  close,
  read,
  write,
};
