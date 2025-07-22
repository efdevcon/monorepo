export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBalance(balance: string, decimals = 4): string {
  const num = parseFloat(balance);
  if (isNaN(num)) return "0";
  return num.toFixed(decimals);
} 
