(function () {
  // Function to check if user is authenticated
  function checkAuthentication() {
    // Check if we can access devices.json to verify authentication
    fetch('/devices.json')
      .then(response => {
        if (response.ok) {
          console.log("User is authenticated - devices.json accessible");
          browser.runtime.sendMessage({ action: "loginSuccess" });
        }
      })
      .catch(error => {
        console.log("Authentication check failed:", error);
      });
  }

  // Function to detect login success indicators
  function detectLoginSuccess() {
    // Check for dashboard or authenticated pages
    const authenticatedPaths = ['/dashboard', '/devices', '/settings', '/account'];
    const currentPath = window.location.pathname;
    
    if (authenticatedPaths.some(path => currentPath.startsWith(path))) {
      console.log("User on authenticated page:", currentPath);
      browser.runtime.sendMessage({ action: "loginSuccess" });
      browser.runtime.sendMessage({ action: "refreshDevices" });
      return;
    }
    
    // Check for authentication cookies
    const hasAuthCookie = document.cookie.includes('session') || 
                         document.cookie.includes('auth') ||
                         document.cookie.includes('_session') ||
                         document.cookie.includes('remember_user_token');
    
    // Check for user navigation elements that appear when logged in
    const userNavElements = document.querySelector('nav [href*="logout"], nav [href*="sign_out"], .user-menu, .account-menu');
    
    if (hasAuthCookie || userNavElements) {
      console.log("Login indicators found - cookies:", !!hasAuthCookie, "nav elements:", !!userNavElements);
      checkAuthentication();
    }
  }

  // Run detection immediately
  detectLoginSuccess();
  
  // Also run after DOM content loads in case elements load later
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectLoginSuccess);
  }
  
  // Watch for navigation changes (SPA behavior)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(detectLoginSuccess, 500); // Small delay for page to settle
    }
  }).observe(document, { subtree: true, childList: true });
})();