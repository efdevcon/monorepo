/**
 * Check if the betaAccess cookie exists
 * @returns true if betaAccess cookie is set, false otherwise
 */
export function hasBetaAccess(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  
  const cookies = document.cookie.split(';');
  return cookies.some(cookie => {
    const [name] = cookie.trim().split('=');
    return name === 'betaAccess';
  });
}

/**
 * Get a specific cookie value
 * @param name - The name of the cookie
 * @returns The cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue;
    }
  }
  return null;
}


