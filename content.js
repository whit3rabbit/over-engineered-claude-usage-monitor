// Claude Usage Monitor - Content Script (isolated world)
// Handles polling and communication with background.
// Fetch interception happens via injected.js in the main world.

let orgId = null;
let pollInterval = null;

// --- Poll usage endpoint (same-origin, cookies auto-included) ---
async function fetchUsage() {
  if (!orgId) return;
  try {
    const res = await fetch(`/api/organizations/${orgId}/usage`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    chrome.runtime.sendMessage({ type: 'USAGE_DATA', data, timestamp: Date.now() });
  } catch (e) {}
}

function startPolling() {
  if (pollInterval) return;
  fetchUsage();
  pollInterval = setInterval(fetchUsage, 5 * 60 * 1000);
}

function setOrgId(id) {
  if (orgId) return;
  orgId = id;
  chrome.runtime.sendMessage({ type: 'SET_ORG_ID', orgId });
  startPolling();
}

// --- Listen for org ID posted from injected main-world script ---
window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  if (e.data?.type === 'CLAUDE_USAGE_ORG_ID' && e.data.orgId) {
    setOrgId(e.data.orgId);
  }
});

// --- Inject main-world script (only if auto-detect enabled) ---
function injectInterceptor() {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('injected.js');
  s.onload = () => s.remove();
  (document.head || document.documentElement).appendChild(s);
}

// --- Init ---
async function init() {
  const stored = await chrome.storage.local.get(['orgId', 'settings']);
  const settings = stored.settings || {};

  if (stored.orgId) {
    orgId = stored.orgId;
    startPolling();
    return;
  }

  if (settings.autoDetect) {
    injectInterceptor();
  }
}

init();

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'POLL_NOW') fetchUsage();
  if (msg.type === 'ORG_ID_UPDATED') { orgId = msg.orgId; startPolling(); }
  if (msg.type === 'AUTO_DETECT_ENABLED' && !orgId) injectInterceptor();
});

