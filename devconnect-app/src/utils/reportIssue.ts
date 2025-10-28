import { REPORT_ISSUE_URL } from '@/config/config';

/**
 * Gets browser information
 */
function getBrowserInfo(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';

  // Detect browser
  if (ua.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Edg') > -1) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edg\/([0-9.]+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Chrome') > -1) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Safari') > -1) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
  }

  return `${browserName} ${browserVersion}`;
}

/**
 * Gets system/OS information
 */
function getSystemInfo(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  let osName = 'Unknown';

  if (ua.indexOf('Win') > -1) {
    osName = 'Windows';
  } else if (ua.indexOf('Mac') > -1) {
    osName = 'macOS';
  } else if (ua.indexOf('Linux') > -1) {
    osName = 'Linux';
  } else if (ua.indexOf('Android') > -1) {
    osName = 'Android';
  } else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
    osName = 'iOS';
  }

  return osName;
}

/**
 * Safely gets a value from localStorage
 */
function getLocalStorageValue(key: string): string {
  if (typeof window === 'undefined') return '';
  
  try {
    const value = localStorage.getItem(key);
    if (!value) return '';
    // Remove quotes if present
    return value.replace(/^["'](.*)["']$/, '$1');
  } catch {
    return '';
  }
}

/**
 * Builds the report issue URL with all relevant context information
 */
export function buildReportIssueUrl(): string {
  const params = new URLSearchParams();

  // Get email from localStorage
  const email = getLocalStorageValue('email');
  if (email) {
    params.append('email', email);
  }

  // Get wallet connector info
  const eoaConnector = getLocalStorageValue('devconnect_eoa_connector');
  if (eoaConnector) {
    params.append('eoa_connector', eoaConnector);
  }

  // Get primary wallet type
  const walletType = getLocalStorageValue('devconnect_primary_wallet_type');
  if (walletType) {
    params.append('wallet_type', walletType);
  }

  // Get wallet address
  const address = getLocalStorageValue('devconnect_primary_address');
  if (address) {
    params.append('address', address);
  }

  // Get browser info
  const browser = getBrowserInfo();
  if (browser) {
    params.append('browser', browser);
  }

  // Get system/OS info
  const system = getSystemInfo();
  if (system) {
    params.append('system', system);
  }

  // Get current path (including hash for context like #payment_id)
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    if (currentPath) {
      params.append('path', currentPath);
    }
  }

  // Build final URL
  const queryString = params.toString();
  return queryString ? `${REPORT_ISSUE_URL}?${queryString}` : REPORT_ISSUE_URL;
}

/**
 * Opens the report issue form in a new tab
 */
export function openReportIssue(): void {
  const url = buildReportIssueUrl();
  window.open(url, '_blank');
}

