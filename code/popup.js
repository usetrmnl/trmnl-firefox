// JavaScript for the popup

document.addEventListener("DOMContentLoaded", initPopup);

// DOM references
let apiKeyInput;
let saveButton;
let refreshButton;
let logoutButton;
let loginButton;
let loginPrompt;
let loginSection;
let logoutSection;
let manualApiSection;
let toggleManualButton;
let buttonGroup;
let statusElement;
let lastUpdatedElement;
let nextUpdateElement;
let refreshRateElement;

// Initialize the popup
async function initPopup() {
  // Initialize DOM references
  apiKeyInput = document.getElementById("api-key");
  saveButton = document.getElementById("save-settings");
  refreshButton = document.getElementById("refresh-now");
  logoutButton = document.getElementById("logout-btn");
  loginButton = document.getElementById("login-btn");
  loginPrompt = document.getElementById("login-prompt");
  loginSection = document.getElementById("login-section");
  logoutSection = document.getElementById("logout-section");
  manualApiSection = document.getElementById("manual-api-section");
  toggleManualButton = document.getElementById("toggle-manual");
  buttonGroup = document.querySelector(".button-group");
  statusElement = document.getElementById("status");
  lastUpdatedElement = document.getElementById("last-updated");
  nextUpdateElement = document.getElementById("next-update");
  refreshRateElement = document.getElementById("refresh-rate");

  setupEventListeners();
  await checkLoginState();
  await loadSettings();
  await loadDevices();
  updateStatusInfo();
}

async function loadDevices() {
  // First try to get devices from local storage
  const { devices: storedDevices, environment } =
    await browser.storage.local.get(["devices", "environment"]);

  let devices = [];

  // If we have devices in storage, use them first
  if (storedDevices && storedDevices.length > 0) {
    console.log("Using devices from local storage");
    devices = storedDevices;
  } else {
    // If no devices in storage, fetch from server
    console.log("No devices in storage, fetching from server");
    const apiUrl =
      environment === "development"
        ? "http://localhost:3000/devices.json"
        : "https://usetrmnl.com/devices.json";

    try {
      const response = await fetch(apiUrl);
      devices = await response.json();

      // Store devices in local storage for future use
      await browser.storage.local.set({ devices });
    } catch (error) {
      console.error("Error fetching devices from server:", error);
      // If we can't fetch, ensure devices is at least an empty array
      devices = [];
    }
  }

  const { selectedDevice } = await browser.storage.local.get("selectedDevice");

  const deviceSelect = document.getElementById("device-select");
  deviceSelect.innerHTML = ""; // Clear existing options

  if (devices && devices.length > 0) {
    devices.forEach((device) => {
      const option = document.createElement("option");
      option.value = device.api_key;
      option.textContent = device.name;
      option.selected =
        selectedDevice && selectedDevice.api_key === device.api_key;
      deviceSelect.appendChild(option);
    });

    // If no device is selected, select the first one
    if (!selectedDevice) {
      await browser.storage.local.set({
        selectedDevice: devices[0],
        apiKey: devices[0].api_key,
      });
      browser.runtime.sendMessage({ action: "forceRefresh" });
    }
  } else {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No devices found";
    deviceSelect.appendChild(option);
  }

  // Add change event listener
  deviceSelect.addEventListener("change", async (e) => {
    const selectedApiKey = e.target.value;
    const selectedDevice = devices.find((d) => d.api_key === selectedApiKey);

    if (selectedDevice) {
      // Initial logging
      console.log("Device change initiated:", {
        deviceName: selectedDevice.name,
        apiKey: selectedDevice.api_key.substring(0, 8) + "...", // Log partial key for safety
        timestamp: new Date().toISOString(),
      });

      showStatus("Changing device...");

      try {
        // Log pre-update storage state
        const beforeState = await browser.storage.local.get([
          "selectedDevice",
          "apiKey",
          "retryCount",
          "retryAfter",
          "lastFetch",
        ]);
        console.log("Storage state before update:", beforeState);

        // Update the device in storage
        await browser.storage.local.set({
          selectedDevice,
          apiKey: selectedDevice.api_key,
          retryCount: 0,
          retryAfter: null,
          lastFetch: 0,
        });

        console.log("Storage updated with new device settings");

        // Verify storage update
        const afterState = await browser.storage.local.get([
          "selectedDevice",
          "apiKey",
          "retryCount",
          "retryAfter",
          "lastFetch",
        ]);
        console.log("Storage state after update:", afterState);

        // Force refresh with detailed logging
        console.log("Initiating force refresh...");
        browser.runtime
          .sendMessage({ action: "forceRefresh" })
          .then((response) => {
            console.log("Force refresh response received:", {
              response,
              timestamp: new Date().toISOString(),
            });

            if (response && response.success) {
              console.log("Device change and refresh successful");
              hideStatus();
            } else {
              console.warn("Initial refresh attempt unsuccessful:", {
                response,
                error: response?.error,
                timestamp: new Date().toISOString(),
              });

              hideStatus();

              // Schedule retry
              console.log("Scheduling retry refresh...");
              setTimeout(() => {
                console.log("Executing retry refresh...");
                browser.runtime
                  .sendMessage({ action: "forceRefresh" })
                  .then((retryResponse) => {
                    console.log("Retry refresh response:", {
                      response: retryResponse,
                      timestamp: new Date().toISOString(),
                    });

                    if (retryResponse && retryResponse.success) {
                      console.log("Retry refresh successful");
                    } else {
                      console.warn("Retry refresh unsuccessful:", {
                        response: retryResponse,
                        error: retryResponse?.error,
                      });
                    }
                  });
              }, 1000);
            }
          });
      } catch (error) {
        console.error("Error during device change process:", {
          error,
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
        showStatus("Error changing device", true);
      }
    } else {
      console.warn("No device found for selected API key:", {
        selectedApiKey: selectedApiKey
          ? selectedApiKey.substring(0, 8) + "..."
          : "none",
        timestamp: new Date().toISOString(),
      });
    }
  });
}

// Set up event listeners
function setupEventListeners() {
  // Save button
  if (saveButton) {
    saveButton.addEventListener("click", saveSettings);
  }

  // Refresh button
  if (refreshButton) {
    refreshButton.addEventListener("click", refreshImage);
  }

  // Logout button
  if (logoutButton) {
    logoutButton.addEventListener("click", performLogout);
  }

  // Login button
  if (loginButton) {
    loginButton.addEventListener("click", startLogin);
  }

  // Toggle manual API button
  if (toggleManualButton) {
    toggleManualButton.addEventListener("click", toggleManualApiEntry);
  }

  // Enter key in input field
  if (apiKeyInput) {
    apiKeyInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        saveSettings();
      }
    });
  }
}

// Load settings from storage
async function loadSettings() {
  const storage = await browser.storage.local.get(["apiKey"]);

  if (storage.apiKey && apiKeyInput) {
    // Mask the API key for display
    apiKeyInput.value = storage.apiKey;
  }
}

// Save settings to storage
async function saveSettings() {
  const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";

  if (apiKey) {
    const response = await browser.runtime.sendMessage({
      action: "saveApiKey",
      apiKey: apiKey,
    });

    showStatus("Settings saved");
    
    // Update UI state after successful API key save
    showLoggedInState();
    await loadDevices();
    updateStatusInfo();
    
    setTimeout(hideStatus, 3000);
  } else {
    showStatus("API key cannot be empty", true);
  }
}

// Force an image refresh
function refreshImage() {
  showStatus("Refreshing image...");

  browser.runtime.sendMessage({ action: "forceRefresh" }).then((response) => {
    if (response && response.success) {
      showStatus("Image refreshed successfully");
    } else {
      showStatus("Refresh scheduled (retry in progress)", true);
    }

    setTimeout(() => {
      updateStatusInfo();
      hideStatus();
    }, 3000);
  });
}

// Update the status of last/next refresh
async function updateStatusInfo() {
  const storage = await browser.storage.local.get([
    "lastFetch",
    "nextFetch",
    "refreshRate",
    "retryCount",
    "retryAfter",
  ]);

  if (storage.lastFetch && lastUpdatedElement) {
    const lastFetchDate = new Date(storage.lastFetch);
    lastUpdatedElement.textContent = `Last updated: ${formatDateTime(lastFetchDate)}`;
  }

  // Check if we're in a retry backoff period
  if (
    storage.retryAfter &&
    Date.now() < storage.retryAfter &&
    nextUpdateElement
  ) {
    const retryDate = new Date(storage.retryAfter);
    nextUpdateElement.textContent = `Retry after: ${formatDateTime(retryDate)}`;

    // Add retry count if available
    if (storage.retryCount) {
      nextUpdateElement.textContent += ` (attempt ${storage.retryCount})`;
    }
  }
  // Otherwise show the normal next update time
  else if (storage.nextFetch && nextUpdateElement) {
    const nextFetchDate = new Date(storage.nextFetch);
    nextUpdateElement.textContent = `Next update: ${formatDateTime(nextFetchDate)}`;
  }

  if (storage.refreshRate && refreshRateElement) {
    refreshRateElement.textContent = `Refresh rate: ${storage.refreshRate} seconds`;
  }
}

// Show a status message
function showStatus(message, isError = false) {
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = isError ? "status-error" : "status-success";
  }
}

// Hide the status message
function hideStatus() {
  if (statusElement) {
    statusElement.textContent = "";
    statusElement.className = "";
  }
}

// Format date and time
function formatDateTime(date) {
  return date.toLocaleString();
}

// Check login state and show appropriate UI
async function checkLoginState() {
  try {
    const { devices, apiKey } = await browser.storage.local.get(["devices", "apiKey"]);
    
    if ((devices && devices.length > 0) || apiKey) {
      // User is logged in - hide login prompt
      showLoggedInState();
    } else {
      // User is not logged in - show login prompt
      showLoggedOutState();
    }
  } catch (error) {
    console.error("Error checking login state:", error);
    showLoggedOutState();
  }
}

// Show UI for logged in state
function showLoggedInState() {
  if (loginSection) loginSection.classList.add("hidden");
  if (logoutSection) logoutSection.classList.remove("hidden");
  if (manualApiSection) manualApiSection.classList.add("hidden");
  
  // Show device selector
  const deviceSelectGroup = document.getElementById('device-selector-group');
  if (deviceSelectGroup) deviceSelectGroup.classList.remove("hidden");
  
  // Show refresh button in advanced section when logged in
  if (refreshButton) refreshButton.style.display = "block";
  // Hide save button by default (only show when manual API is active)
  if (saveButton) saveButton.style.display = "none";
}

// Show UI for logged out state
function showLoggedOutState() {
  if (loginSection) loginSection.classList.remove("hidden");
  if (logoutSection) logoutSection.classList.add("hidden");
  if (manualApiSection) manualApiSection.classList.add("hidden");
  
  // Hide device selector
  const deviceSelectGroup = document.getElementById('device-selector-group');
  if (deviceSelectGroup) deviceSelectGroup.classList.add("hidden");
  
  // Hide both buttons when logged out (they're now in advanced section)
  if (refreshButton) refreshButton.style.display = "none";
  if (saveButton) saveButton.style.display = "none";
}

// Start login flow
function startLogin() {
  showStatus("Opening login page...");
  
  browser.runtime.sendMessage({ action: "startLogin" }).then((response) => {
    if (response && response.success) {
      showStatus("Login page opened - please complete login");
      // Check for login success periodically
      checkForLoginSuccess();
    } else {
      showStatus("Error opening login page", true);
    }
  }).catch((error) => {
    console.error("Login error:", error);
    showStatus("Error opening login page", true);
  });
}

// Check for login success
function checkForLoginSuccess() {
  const checkInterval = setInterval(async () => {
    const { devices } = await browser.storage.local.get(["devices"]);
    
    if (devices && devices.length > 0) {
      clearInterval(checkInterval);
      showStatus("Login successful!");
      showLoggedInState();
      await loadDevices();
      updateStatusInfo();
    }
  }, 2000);
  
  // Stop checking after 2 minutes
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 120000);
}

// Toggle manual API entry
function toggleManualApiEntry() {
  if (manualApiSection) {
    if (manualApiSection.classList.contains("hidden")) {
      manualApiSection.classList.remove("hidden");
      toggleManualButton.textContent = "Hide Manual Entry";
      // Show save settings button when manual API is active
      if (saveButton) saveButton.style.display = "block";
    } else {
      manualApiSection.classList.add("hidden");
      toggleManualButton.textContent = "Use Manual API Key";
      // Hide save settings button when manual API is hidden
      if (saveButton) saveButton.style.display = "none";
    }
  }
}

// Perform logout
function performLogout() {
  if (!confirm("Are you sure you want to logout? This will clear all extension data and you'll need to login again.")) {
    return;
  }

  showStatus("Logging out...");
  
  browser.runtime.sendMessage({ action: "logout" }).then((response) => {
    if (response && response.success) {
      showStatus("Logged out successfully");
      showLoggedOutState();
      
      // Clear device selection dropdown
      const deviceSelect = document.getElementById("device-select");
      if (deviceSelect) {
        deviceSelect.innerHTML = '<option value="">No devices found</option>';
      }
      
      // Clear API key input
      if (apiKeyInput) {
        apiKeyInput.value = "";
      }
      
      // Clear status info
      if (lastUpdatedElement) lastUpdatedElement.textContent = "";
      if (nextUpdateElement) nextUpdateElement.textContent = "";
      if (refreshRateElement) refreshRateElement.textContent = "";
      
      // Hide manual API section if it was open
      if (manualApiSection) {
        manualApiSection.classList.add("hidden");
        if (toggleManualButton) {
          toggleManualButton.textContent = "Use Manual API Key";
        }
      }
      
      // Reset button visibility states
      if (saveButton) saveButton.style.display = "none";
      if (refreshButton) refreshButton.style.display = "none";
      
      // Close advanced section for cleaner state
      const advancedSection = document.getElementById("advanced-section");
      if (advancedSection) {
        advancedSection.open = false;
      }
      
      setTimeout(hideStatus, 3000);
    } else {
      showStatus("Error during logout", true);
    }
  }).catch((error) => {
    console.error("Logout error:", error);
    showStatus("Error during logout", true);
  });
}
