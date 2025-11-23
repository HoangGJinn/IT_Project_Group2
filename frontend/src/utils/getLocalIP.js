// Utility to get local IP address for QR code generation
export const getLocalIP = () => {
  // Try to get IP from environment variable first
  if (import.meta.env.VITE_LOCAL_IP) {
    return import.meta.env.VITE_LOCAL_IP;
  }

  // Get current hostname (will be IP if accessed via network)
  const hostname = window.location.hostname;

  // If already an IP address (not localhost), return it
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return hostname;
  }

  // Otherwise, try to detect from WebRTC (requires user interaction)
  return null;
};

// Get full URL for QR code
export const getQRCodeURL = token => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port || (protocol === 'https:' ? '443' : '80');

  // If accessed via localhost, try to get network IP
  let ip = hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Prompt user to enter their local IP
    const storedIP = localStorage.getItem('localIP');
    if (storedIP) {
      ip = storedIP;
    }
  }

  const baseURL = `${protocol}//${ip}${port && port !== '80' && port !== '443' ? `:${port}` : ''}`;
  return `${baseURL}/student/scan?token=${token}`;
};
