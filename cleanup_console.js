// Console cleanup for development
// This script suppresses certain console messages for a cleaner development experience

if (typeof window !== 'undefined') {
  // Store original console methods
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  
  // Filter out specific noise
  console.log = function(...args) {
    const message = args.join(' ');
    
    // Skip Vercel Analytics messages
    if (message.includes('[Vercel Web Analytics]')) {
      return;
    }
    
    // Skip Fast Refresh messages (most of them)
    if (message.includes('[Fast Refresh]') && message.includes('rebuilding')) {
      return;
    }
    
    // Allow other console.log messages
    originalConsoleLog.apply(console, args);
  };
  
  console.info = function(...args) {
    const message = args.join(' ');
    
    // Skip specific info messages
    if (message.includes('Vercel') || message.includes('pageview')) {
      return;
    }
    
    originalConsoleInfo.apply(console, args);
  };
}
