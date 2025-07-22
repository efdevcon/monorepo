export function verifySignatureFormat(signature: string): boolean {
  // Basic signature format validation
  return signature.startsWith('0x') && signature.length === 132;
}

export function truncateSignature(signature: string, length: number = 20): string {
  if (signature.length <= length) return signature;
  return `${signature.slice(0, length)}...${signature.slice(-length)}`;
} 
