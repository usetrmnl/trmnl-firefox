// JavaScript for the new tab page

document.addEventListener("DOMContentLoaded", initNewTab);

// Listen for storage changes to detect logout
browser.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    // Check if critical data was cleared (logout)
    if (changes.devices && !changes.devices.newValue) {
      console.log("Devices cleared - user logged out");
      redirectToLogin();
    }
  }
});

// DOM references
const imageElement = document.getElementById("trmnl-image");
const loadingElement = document.getElementById("loading");
const errorContainer = document.getElementById("error-container");
const infoOverlay = document.getElementById("info-overlay");
const nextRefreshElement = document.getElementById("next-refresh-time");
const refreshButton = document.getElementById("refresh-now");
const settingsButton = document.getElementById("open-settings");
const logoutButton = document.getElementById("logout-btn");

// State
let refreshTimeoutId = null;
let countdownIntervalId = null;

// Initialize the new tab page
async function initNewTab() {
  try {
    // Check if user is logged out
    if (await isLoggedOut()) {
      console.log("User is logged out, redirecting to login");
      await redirectToLogin();
      return;
    }

    // First try to get the environment setting
    const { environment } = await browser.storage.local.get("environment");
    const baseUrl =
      environment === "development"
        ? "http://localhost:3000"
        : "https://usetrmnl.com";

    // Try to get devices from local storage first
    const { devices: storedDevices } =
      await browser.storage.local.get("devices");

    // If we have devices in storage, use them
    if (storedDevices && storedDevices.length > 0) {
      console.log("Using devices from local storage:", storedDevices);

      // Check if we have a selected device
      const { selectedDevice } =
        await browser.storage.local.get("selectedDevice");
      if (!selectedDevice) {
        await browser.storage.local.set({ selectedDevice: storedDevices[0] });
      }

      // Continue with normal initialization
      setupEventListeners();
      await loadImage();
      return;
    }

    // If we don't have devices in storage, fetch from server
    console.log("No devices in local storage, fetching from server");
    const response = await fetch(`${baseUrl}/devices.json`);

    // If unauthorized or forbidden, redirect to login
    if (response.status === 401 || response.status === 403) {
      await redirectToLogin();
      return;
    }

    // If response is not OK for any other reason
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // If we get here, we have the devices, proceed with normal initialization
    const devices = await response.json();

    if (!devices || devices.length === 0) {
      // No devices available, redirect to login
      await redirectToLogin();
      return;
    }

    // Store devices and selected device if not already set
    await browser.storage.local.set({ devices });
    const { selectedDevice } =
      await browser.storage.local.get("selectedDevice");
    if (!selectedDevice) {
      await browser.storage.local.set({ selectedDevice: devices[0] });
    }

    // Continue with normal initialization
    setupEventListeners();
    await loadImage();
  } catch (error) {
    console.error("Error during initialization:", error);
    // On any error, redirect to login
    await redirectToLogin();
  }
}

// Set up event listeners
function setupEventListeners() {
  // Refresh now button
  refreshButton.addEventListener("click", () => {
    browser.runtime.sendMessage({ action: "forceRefresh" }).then(() => {
      loadImage();
    });
  });

  // Settings button
  settingsButton.addEventListener("click", () => {
    // For Firefox, show an inline settings panel instead of popup
    showInlineSettings();
  });

  // Logout button
  logoutButton.addEventListener("click", () => {
    performLogout();
  });

  // Login button - add event listener when it appears
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "login-now") {
      startLogin();
    }
  });

  // Listen for messages from background
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "imageUpdated") {
      console.log("Received image update notification");
      loadImage();
      if (sendResponse) sendResponse({ received: true });
    } else if (message.action === "loginSuccess") {
      console.log("Login success detected, refreshing new tab");
      window.location.reload();
    }
    return false;
  });
}

// Load the image from storage
async function loadImage() {
  loadingElement.classList.remove("hidden");
  imageElement.classList.add("hidden"); // Hide the image while loading

  browser.runtime
    .sendMessage({ action: "getCurrentImage" })
    .then((response) => {
      if (!response || !response.currentImage) {
        showLoginPrompt();
        return;
      }

      // Hide error container if it was showing
      errorContainer.classList.add("hidden");

      // Create a new image element to force a reload
      const newImage = new Image();
      newImage.onload = () => {
        // Update the src of the actual image element
        imageElement.src = newImage.src;
        loadingElement.classList.add("hidden");
        imageElement.classList.remove("hidden");
      };

      newImage.onerror = () => {
        console.error("Error loading image data URL");
        loadingElement.textContent = "Error loading image";
        // Request a fresh image
        browser.runtime.sendMessage({ action: "forceRefresh" });
      };

      // Add a cache-busting parameter to force reload
      newImage.src = `${response.currentImage.url}#t=${Date.now()}`;

      // Update next refresh info
      updateRefreshTimer(response.nextFetch);
    });
}

// Start login flow
function startLogin() {
  browser.runtime.sendMessage({ action: "startLogin" }).then((response) => {
    if (response && response.success) {
      const errorText = errorContainer.querySelector("p");
      if (errorText) {
        errorText.textContent = "Login page opened - please complete login in the new tab.";
      }
      // Check for login success
      checkForLoginSuccess();
    } else {
      const errorText = errorContainer.querySelector("p");
      if (errorText) {
        errorText.textContent = "Error opening login page. Please try again.";
      }
    }
  }).catch((error) => {
    console.error("Login error:", error);
    const errorText = errorContainer.querySelector("p");
    if (errorText) {
      errorText.textContent = "Error opening login page. Please try again.";
    }
  });
}

// Check for login success periodically
function checkForLoginSuccess() {
  const checkInterval = setInterval(async () => {
    const { devices } = await browser.storage.local.get(["devices"]);
    
    if (devices && devices.length > 0) {
      clearInterval(checkInterval);
      window.location.reload();
    }
  }, 2000);
  
  // Stop checking after 2 minutes
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 120000);
}

// Show the login prompt
function showLoginPrompt() {
  loadingElement.classList.add("hidden");
  imageElement.classList.add("hidden");
  errorContainer.classList.remove("hidden");
  
  const errorText = errorContainer.querySelector("p");
  if (errorText) {
    errorText.textContent = "Please log in to your TRMNL account to view your devices.";
  }
}

// Update the refresh countdown timer
function updateRefreshTimer(nextFetchTimestamp) {
  if (!nextFetchTimestamp) {
    nextRefreshElement.textContent = "Unknown";
    return;
  }

  // Clear existing timeouts and intervals
  if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
  if (countdownIntervalId) clearInterval(countdownIntervalId);

  // Set timeout to load image at refresh time
  const now = Date.now();
  const timeToRefresh = Math.max(0, nextFetchTimestamp - now);

  if (timeToRefresh > 0) {
    // Add a small buffer (2 seconds) to ensure the background has time to fetch
    refreshTimeoutId = setTimeout(() => {
      // Check if the image has been updated in background
      browser.runtime
        .sendMessage({ action: "getCurrentImage" })
        .then((response) => {
          const currentTime = Date.now();
          // Only reload if the last fetch time is recent (within last 10 seconds)
          if (
            response &&
            response.lastFetch &&
            currentTime - response.lastFetch < 10000
          ) {
            loadImage();
          } else {
            // If not updated recently, the background refresh might have failed
            // Request a refresh and then load the image
            browser.runtime.sendMessage({ action: "forceRefresh" }).then(() => {
              setTimeout(loadImage, 2000);
            });
          }
        });
    }, timeToRefresh);

    // Update countdown display
    updateCountdown(nextFetchTimestamp);
    countdownIntervalId = setInterval(() => {
      updateCountdown(nextFetchTimestamp);
    }, 1000);
  }
}

// Update the countdown display
function updateCountdown(nextFetchTimestamp) {
  const now = Date.now();
  const timeRemaining = Math.max(0, nextFetchTimestamp - now);

  if (timeRemaining <= 0) {
    nextRefreshElement.textContent = "Now";
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
    }
    return;
  }

  // Format the time remaining
  const seconds = Math.floor((timeRemaining / 1000) % 60);
  const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));

  nextRefreshElement.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

// Show inline settings panel (Firefox-compatible)
function showInlineSettings() {
  // Create or show a simple inline settings overlay
  let settingsOverlay = document.getElementById("settings-overlay");
  if (!settingsOverlay) {
    settingsOverlay = document.createElement("div");
    settingsOverlay.id = "settings-overlay";
    settingsOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    const settingsPanel = document.createElement("div");
    settingsPanel.style.cssText = `
      background: #1a1a1a;
      padding: 20px;
      border-radius: 8px;
      color: white;
      max-width: 400px;
      width: 90%;
    `;
    
    settingsPanel.innerHTML = `
      <h3 style="margin-top: 0;">TRMNL Settings</h3>
      <p>To access full settings, click the TRMNL icon in your browser toolbar.</p>
      <button id="close-settings" style="background: #4a5568; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 16px;">Close</button>
    `;
    
    settingsOverlay.appendChild(settingsPanel);
    document.body.appendChild(settingsOverlay);
    
    // Close button functionality
    document.getElementById("close-settings").addEventListener("click", () => {
      settingsOverlay.remove();
    });
    
    // Close on overlay click
    settingsOverlay.addEventListener("click", (e) => {
      if (e.target === settingsOverlay) {
        settingsOverlay.remove();
      }
    });
  } else {
    settingsOverlay.style.display = "flex";
  }
}

// Helper to pad numbers with leading zeros
function padZero(num) {
  return num.toString().padStart(2, "0");
}

// Check if user is logged out (no critical data)
async function isLoggedOut() {
  const storage = await browser.storage.local.get([
    "devices",
    "selectedDevice",
    "apiKey"
  ]);
  
  // If we have no devices AND no API key, consider user logged out
  return (!storage.devices || storage.devices.length === 0) && !storage.apiKey;
}

// Redirect to login page
async function redirectToLogin() {
  const { environment } = await browser.storage.local.get("environment");
  const baseUrl =
    environment === "development"
      ? "http://localhost:3000"
      : "https://usetrmnl.com";
  
  console.log("Redirecting to login:", `${baseUrl}/login`);
  window.location.href = `${baseUrl}/login`;
}

// Perform logout
function performLogout() {
  if (!confirm("Are you sure you want to logout? This will clear all extension data and you'll need to login again.")) {
    return;
  }

  browser.runtime.sendMessage({ action: "logout" }).then((response) => {
    if (response && response.success) {
      console.log("Logout successful");
      // The background script will redirect us to login
    } else {
      console.error("Logout failed:", response);
      alert("Logout failed. Please try again.");
    }
  }).catch((error) => {
    console.error("Logout error:", error);
    alert("Logout failed. Please try again.");
  });
}
