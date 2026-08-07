// TRMNL server URLs. Change HOSTS.production for BYOS setups.
const HOSTS = {
  development: "http://localhost:3000",
  production: "https://trmnl.com",
};

async function getBaseUrl() {
  const { environment } = await chrome.storage.local.get("environment");
  return HOSTS[environment] || HOSTS.production;
}

async function getDevicesUrl() {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/devices.json`;
}

async function getApiUrl() {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/api/current_screen`;
}

async function getLoginUrl() {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/login`;
}
