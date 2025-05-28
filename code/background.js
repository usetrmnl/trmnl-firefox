// Background script for TRMNL New Tab Display extension

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveApiKey") {
    saveApiKey(request.apiKey)
      .then(() => {
        if (sendResponse) sendResponse({ success: true });
      })
      .catch((err) => {
        console.error("Error saving API key:", err);
        if (sendResponse) sendResponse({ success: false, error: err.message });
      });
    return true;
  } else if (request.action === "getCurrentImage") {
    sendCurrentImage(sendResponse);
    return true;
  } else if (request.action === "forceRefresh") {
    fetchTrmnlImage(true)
      .then((result) => {
        if (sendResponse) sendResponse({ success: !!result });
      })
      .catch((err) => {
        console.error("Error during forced refresh:", err);
        if (sendResponse) sendResponse({ success: false, error: err.message });
      });
    return true;
  } else if (request.action === "logout") {
    performLogout()
      .then(() => {
        if (sendResponse) sendResponse({ success: true });
      })
      .catch((err) => {
        console.error("Error during logout:", err);
        if (sendResponse) sendResponse({ success: false, error: err.message });
      });
    return true;
  } else if (request.action === "refreshDevices") {
    fetchAndStoreDevices()
      .then(() => {
        if (sendResponse) sendResponse({ success: true });
      })
      .catch((err) => {
        console.error("Error refreshing devices:", err);
        if (sendResponse) sendResponse({ success: false, error: err.message });
      });
    return true;
  } else if (request.action === "startLogin") {
    startLoginFlow()
      .then(() => {
        if (sendResponse) sendResponse({ success: true });
      })
      .catch((err) => {
        console.error("Error starting login flow:", err);
        if (sendResponse) sendResponse({ success: false, error: err.message });
      });
    return true;
  } else if (request.action === "loginSuccess") {
    handleLoginSuccess()
      .then(() => {
        if (sendResponse) sendResponse({ success: true });
      })
      .catch((err) => {
        console.error("Error handling login success:", err);
        if (sendResponse) sendResponse({ success: false, error: err.message });
      });
    return true;
  }
  return false;
});

browser.storage.onChanged.addListener((changes, namespace) => {
  if (changes.environment) {
    console.log("Environment changed:", {
      oldValue: changes.environment.oldValue,
      newValue: changes.environment.newValue,
    });
  }
});

// Constants
const HOSTS = {
  development: "http://localhost:3000",
  production: "https://usetrmnl.com",
};

const getBaseUrl = async () => {
  const { environment } = await browser.storage.local.get("environment");
  return HOSTS[environment] || HOSTS.production;
};

const getDevicesUrl = async () => {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/devices.json`;
};

let API_URL = `${HOSTS.production}/api/current_screen`; // Default to production

const getApiUrl = async () => {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/api/current_screen`;
};

const getLoginUrl = async () => {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/login`;
};

const DEFAULT_REFRESH_RATE = 30; // seconds

async function fetchAndStoreDevices() {
  try {
    // First check if we already have stored devices
    const { devices: storedDevices } =
      await browser.storage.local.get("devices");

    const devicesUrl = await getDevicesUrl();
    const response = await fetch(devicesUrl);

    // Only redirect to login if we have no stored devices AND got a 401/403
    if (
      (response.status === 401 || response.status === 403) &&
      (!storedDevices || storedDevices.length === 0)
    ) {
      const loginUrl = await getLoginUrl();
      // Open login page in a new tab
      browser.tabs.create({ url: loginUrl });
      return storedDevices || null;
    }

    if (!response.ok) {
      // If we have stored devices, return them instead of failing
      if (storedDevices && storedDevices.length > 0) {
        console.log("Using stored devices due to fetch error");
        return storedDevices;
      }
      throw new Error(`HTTP error: ${response.status}`);
    }

    const devices = await response.json();

    // Always save the newly fetched devices
    await browser.storage.local.set({ devices });

    // If no device is selected, select the first one
    const { selectedDevice } =
      await browser.storage.local.get("selectedDevice");
    if (!selectedDevice && devices.length > 0) {
      await browser.storage.local.set({ selectedDevice: devices[0] });
    }

    return devices;
  } catch (error) {
    console.error("Error fetching devices:", error);
    // Return stored devices if available
    const { devices: storedDevices } =
      await browser.storage.local.get("devices");
    return storedDevices || null;
  }
}

// Fetch devices list and get first API key
async function getFirstDeviceApiKey() {
  try {
    // First check if we already have stored devices
    const { devices: storedDevices } =
      await browser.storage.local.get("devices");

    const devicesUrl = await getDevicesUrl();
    const response = await fetch(devicesUrl);

    // Only redirect to login if we have no stored devices AND got a 401/403
    if (
      (response.status === 401 || response.status === 403) &&
      (!storedDevices || storedDevices.length === 0)
    ) {
      const loginUrl = await getLoginUrl();
      browser.tabs.create({ url: loginUrl });
      return null;
    }

    if (!response.ok) {
      // If we have stored devices, use them instead of failing
      if (storedDevices && storedDevices.length > 0) {
        console.log("Using stored devices due to fetch error");
        await browser.storage.local.set({
          selectedDevice: storedDevices[0],
          environment: "production",
        });
        return storedDevices[0].api_key;
      }
      throw new Error(`HTTP error: ${response.status}`);
    }

    const devices = await response.json();
    if (devices && devices.length > 0) {
      // Store the devices
      await browser.storage.local.set({
        devices,
        selectedDevice: devices[0],
        environment: "production",
      });
      return devices[0].api_key;
    }

    // If no devices found in response but we have stored devices, use those
    if (storedDevices && storedDevices.length > 0) {
      return storedDevices[0].api_key;
    }

    return null;
  } catch (error) {
    console.error("Error fetching devices:", error);
    // Check for stored devices
    const { devices: storedDevices } =
      await browser.storage.local.get("devices");
    if (storedDevices && storedDevices.length > 0) {
      return storedDevices[0].api_key;
    }
    return null;
  }
}

// Send the current image to the requester
async function sendCurrentImage(sendResponse) {
  const storage = await browser.storage.local.get([
    "currentImage",
    "lastFetch",
    "refreshRate",
  ]);
  sendResponse(storage);
}

// Initialize when extension is installed or updated
browser.runtime.onInstalled.addListener(async () => {
  console.log("TRMNL New Tab Display extension installed");

  // Set default environment
  await browser.storage.local.set({ environment: "production" });
  API_URL = await getApiUrl();

  // Check if user is already authenticated
  const isAuthenticated = await checkAuthentication();
  
  if (isAuthenticated) {
    console.log("User is already authenticated, fetching devices");
    const devices = await fetchAndStoreDevices();

    if (devices && devices.length > 0) {
      // Set the first device and its API key
      await browser.storage.local.set({
        selectedDevice: devices[0],
        lastFetch: 0,
        nextFetch: 0,
        refreshRate: DEFAULT_REFRESH_RATE,
        retryCount: 0,
        retryAfter: null,
      });

      // Start the initial image fetch
      fetchTrmnlImage();
    }
  } else {
    console.log("User not authenticated, will need to login");
  }
});

// Listen for alarms to trigger image refresh
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refreshTrmnlImage") {
    fetchTrmnlImage();
  } else if (alarm.name === "retryTrmnlImage") {
    console.log("Retry alarm triggered");
    fetchTrmnlImage();
  }
});

// Listen for messages from popup or new tab page
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveApiKey") {
    saveApiKey(request.apiKey)
      .then(() => {
        if (sendResponse) sendResponse({ success: true });
      })
      .catch((err) => {
        console.error("Error saving API key:", err);
        if (sendResponse) sendResponse({ success: false, error: err.message });
      });
    return true; // Required for async response
  } else if (request.action === "getCurrentImage") {
    sendCurrentImage(sendResponse);
    return true; // Required for async response
  } else if (request.action === "forceRefresh") {
    fetchTrmnlImage(true) // Pass true to force a refresh regardless of cache
      .then((result) => {
        if (sendResponse) sendResponse({ success: !!result });
      })
      .catch((err) => {
        console.error("Error during forced refresh:", err);
        if (sendResponse) sendResponse({ success: false, error: err.message });
      });
    return true; // Important for async response
  }

  if (request.action === "refreshDevices") {
    fetchAndStoreDevices()
      .then((devices) => {
        if (devices && devices.length > 0) {
          // Refresh the current image with the new device info
          return fetchTrmnlImage(true);
        }
      })
      .then(() => {
        if (sendResponse) sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Error refreshing devices:", error);
        if (sendResponse)
          sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  return false; // Not handling this message
});

// Save API key and immediately fetch an image
async function saveApiKey(apiKey) {
  await browser.storage.local.set({
    apiKey,
    // Reset any retry information when changing API key
    retryCount: 0,
    retryAfter: null,
  });
  console.log("API key saved");

  // Fetch a new image with the updated API key
  return fetchTrmnlImage();
}

// Set up the refresh alarm
function setupRefreshAlarm(seconds) {
  // Clear any existing alarm
  browser.alarms.clear("refreshTrmnlImage");

  // Create new alarm
  browser.alarms.create("refreshTrmnlImage", {
    periodInMinutes: seconds / 60, // Convert seconds to minutes
  });

  console.log(`Refresh alarm set for every ${seconds} seconds`);
}

// Handle storage limits for data URLs
// Firefox storage also has limits
async function checkStorageUsage() {
  // Get current storage usage - Firefox has different API for this
  // This is a simplification
  const storageUsage = 0; // Replace with actual implementation if needed
  const storageLimit = 5242880; // 5MB default for Firefox

  const percentUsed = (storageUsage / storageLimit) * 100;
  console.log(
    `Storage usage: ${(storageUsage / 1024 / 1024).toFixed(2)}MB / ${(storageLimit / 1024 / 1024).toFixed(2)}MB (${percentUsed.toFixed(2)}%)`,
  );

  // If we're using more than 80% of our quota, we might want to clean up old images
  return percentUsed > 80;
}

let fetchInProgress = false;

// Start the login flow by opening the login page
async function startLoginFlow() {
  console.log("Starting login flow");
  const loginUrl = await getLoginUrl();
  
  // Open login page in a new tab
  await browser.tabs.create({ 
    url: loginUrl,
    active: true
  });
  
  console.log("Login page opened:", loginUrl);
}

// Handle successful login - fetch devices and setup extension
async function handleLoginSuccess() {
  console.log("Handling successful login");
  
  try {
    // Fetch devices from the API
    const devices = await fetchAndStoreDevices();
    
    if (devices && devices.length > 0) {
      console.log("Login successful - devices fetched:", devices.length);
      
      // Set up the extension with the first device
      await browser.storage.local.set({
        selectedDevice: devices[0],
        apiKey: devices[0].api_key,
        lastFetch: 0,
        nextFetch: 0,
        refreshRate: DEFAULT_REFRESH_RATE,
        retryCount: 0,
        retryAfter: null,
      });
      
      // Start fetching images
      setTimeout(() => {
        fetchTrmnlImage(true);
      }, 1000);
      
      // Notify all new tab pages that login was successful
      const tabs = await browser.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && tab.url.includes('newtab.html')) {
          browser.tabs.sendMessage(tab.id, { action: "loginSuccess" }).catch(() => {
            // Ignore errors for tabs that can't receive messages
          });
        }
      }
      
      return true;
    } else {
      throw new Error("No devices found after login");
    }
  } catch (error) {
    console.error("Error during login success handling:", error);
    throw error;
  }
}

// Check if user is authenticated by trying to fetch devices
async function checkAuthentication() {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/devices.json`);
    
    if (response.ok) {
      console.log("User is authenticated");
      return true;
    } else if (response.status === 401 || response.status === 403) {
      console.log("User is not authenticated");
      return false;
    } else {
      console.warn("Unexpected response status:", response.status);
      return false;
    }
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

// Fetch an image from the TRMNL API
async function performLogout() {
  console.log("Performing logout - clearing all extension data");
  
  // Clear all stored data
  await browser.storage.local.clear();
  
  // Clear any active alarms
  const alarms = await browser.alarms.getAll();
  for (const alarm of alarms) {
    await browser.alarms.clear(alarm.name);
  }
  
  console.log("Logout completed - all data cleared");
  
  // New tab pages will automatically redirect via storage change listener
  console.log("New tab pages will be redirected automatically via storage change detection");
}

async function fetchTrmnlImage(forceRefresh = false) {
  // Prevent concurrent requests
  if (fetchInProgress && !forceRefresh) {
    console.log("Fetch already in progress, skipping");
    return null;
  }

  fetchInProgress = true;
  const currentTime = Date.now();

  // Get the current API URL and initialize environment if needed
  const environment = await browser.storage.local.get("environment");
  if (!environment.environment) {
    await browser.storage.local.set({ environment: "production" });
  }
  API_URL = await getApiUrl();

  console.log("Fetching TRMNL image");

  const storage = await browser.storage.local.get([
    "selectedDevice",
    "lastFetch",
    "refreshRate",
    "nextFetch",
    "retryCount",
    "retryAfter",
  ]);

  const apiKey = storage.selectedDevice?.api_key;

  // If no API key, try to get one from devices first
  if (!apiKey) {
    console.log("No API key set, attempting to fetch from devices");
    const deviceApiKey = await getFirstDeviceApiKey();
    if (deviceApiKey) {
      await saveApiKey(deviceApiKey);
      return fetchTrmnlImage(true);
    }
    console.log("Could not get API key from devices, skipping fetch");
    return null;
  }

  // Check if we're in a retry backoff period
  if (storage.retryAfter && currentTime < storage.retryAfter) {
    console.log(
      `In retry backoff period. Next attempt in ${Math.ceil((storage.retryAfter - currentTime) / 1000)}s`,
    );
    return null;
  }

  try {
    const response = await fetch(API_URL, {
      headers: {
        "access-token": apiKey,
        "Cache-Control": "no-cache", // Prevent browser caching
      },
    });

    // Handle unauthorized (redirect to login only if we have no devices)
    if (response.status === 401 || response.status === 403) {
      const { devices } = await browser.storage.local.get("devices");
      if (!devices || devices.length === 0) {
        const loginUrl = await getLoginUrl();
        browser.tabs.create({ url: loginUrl });
        fetchInProgress = false;
        return null;
      } else {
        console.log(
          "API key unauthorized, but have stored devices. Will retry with another key.",
        );
        // Could implement logic here to try the next device
      }
    }

    // Handle rate limiting (429)
    if (response.status === 429) {
      console.warn("Rate limited by the API (429)");

      // Get retry delay from header or use exponential backoff
      let retryAfter = 0;
      if (response.headers.has("Retry-After")) {
        // Server specified retry time in seconds
        retryAfter = parseInt(response.headers.get("Retry-After")) * 1000;
      } else {
        // Calculate exponential backoff
        const retryCount = (storage.retryCount || 0) + 1;
        // Base delay of 60 seconds with exponential increase and some randomness
        retryAfter = Math.min(
          60000 * Math.pow(1.5, retryCount - 1) + Math.random() * 10000,
          3600000,
        );

        await browser.storage.local.set({ retryCount: retryCount });
      }

      console.log(`Setting retry after ${retryAfter / 1000} seconds`);
      const retryTime = currentTime + retryAfter;
      await browser.storage.local.set({ retryAfter: retryTime });

      // Schedule a retry
      browser.alarms.create("retryTrmnlImage", {
        when: retryTime,
      });

      fetchInProgress = false;
      return null;
    }

    // Reset retry count on successful requests
    if (storage.retryCount > 0) {
      await browser.storage.local.set({ retryCount: 0, retryAfter: null });
    }

    if (!response.ok) {
      throw new Error(
        `HTTP error: ${response.status} - ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log("TRMNL API response:", data);

    // Use fixed 30 second refresh rate
    const refreshRate = DEFAULT_REFRESH_RATE;
    console.log(`Using fixed refresh rate: ${refreshRate} seconds`);

    // Check if the image URL has changed
    const currentImageData = storage.currentImage || {};
    if (!forceRefresh && currentImageData.originalUrl === data.image_url) {
      console.log("Image has not changed, updating refresh time only");

      // Update just the next fetch time without downloading the image again
      const nextFetch = currentTime + refreshRate * 1000;
      await browser.storage.local.set({
        refreshRate: refreshRate,
        nextFetch: nextFetch,
        lastFetch: currentTime,
        // Reset any retry information
        retryCount: 0,
        retryAfter: null,
      });

      // Update the refresh alarm if needed
      if (refreshRate !== storage.refreshRate) {
        setupRefreshAlarm(refreshRate);
      }

      fetchInProgress = false;
      return currentImageData.url;
    }

    // Get the image as a blob
    const imageResponse = await fetch(data.image_url, {
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    // Convert the image to a base64 data URL
    const imageBlob = await imageResponse.blob();

    // Create a FileReader to convert the blob to a data URL
    const imageDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });

    // Store the new image and update timestamps
    const nextFetch = currentTime + refreshRate * 1000;

    // Check storage usage before storing potentially large data URL
    const isStorageLimited = await checkStorageUsage();

    // If storage is limited, we might want to compress the image or handle differently
    // For now, we'll just log a warning and continue
    if (isStorageLimited) {
      console.warn(
        "Storage usage is high - consider implementing image compression",
      );
    }

    await browser.storage.local.set({
      currentImage: {
        url: imageDataUrl,
        originalUrl: data.image_url,
        filename: data.filename || "display.jpg",
        timestamp: currentTime,
      },
      lastFetch: currentTime,
      refreshRate: refreshRate,
      nextFetch: nextFetch,
    });

    // Update the refresh alarm if needed
    if (refreshRate !== storage.refreshRate) {
      setupRefreshAlarm(refreshRate);
    }

    // Notify any open tabs that a new image is available
    try {
      browser.runtime.sendMessage({ action: "imageUpdated" }).catch(() => {
        // This is normal if no listeners are active
        console.log("No active listeners for imageUpdated message");
      });
    } catch (e) {
      // Ignore message sending errors, which are expected if no tabs are open
    }

    setTimeout(() => {
      fetchInProgress = false;
    }, 1000);

    return imageDataUrl;
  } catch (error) {
    console.error("Error fetching TRMNL image:", error);

    // Schedule a retry with backoff
    const retryCount = (storage.retryCount || 0) + 1;
    const retryDelay = Math.min(60000 * Math.pow(2, retryCount - 1), 3600000); // Max 1 hour
    const retryTime = currentTime + retryDelay;

    await browser.storage.local.set({
      retryCount: retryCount,
      retryAfter: retryTime,
    });

    browser.alarms.create("retryTrmnlImage", {
      when: retryTime,
    });

    console.log(`Scheduled retry in ${retryDelay / 1000} seconds`);
    fetchInProgress = false;

    return null;
  }
}
