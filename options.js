// Claude Usage Monitor - Options Script

async function getSessionCookie() {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: 'https://claude.ai', name: 'sessionKey' }, (cookie) => {
      resolve(cookie ? `sessionKey=${cookie.value}` : null);
    });
  });
}

async function load() {
  const data = await chrome.storage.local.get(['orgId', 'settings']);
  const s = data.settings || {};
  const goals = s.goals || {};

  document.getElementById('org-id').value        = data.orgId || '';
  document.getElementById('auto-detect').checked = s.autoDetect === true;
  document.getElementById('goal-5h').value       = goals.five_hour ?? 80;
  document.getElementById('goal-7d').value       = goals.seven_day ?? 70;
  document.getElementById('pace-notifs').checked = !!s.paceNotifications;
  document.getElementById('iot-endpoint').value  = s.iotEndpoint || '';
  document.getElementById('iot-enabled').checked = !!s.iotEnabled;

  syncAutoDetect();
}

function syncAutoDetect() {
  const on = document.getElementById('auto-detect').checked;
  const orgInput = document.getElementById('org-id');
  orgInput.disabled = on;
  orgInput.style.opacity = on ? '0.4' : '1';
}

document.getElementById('auto-detect').addEventListener('change', syncAutoDetect);

// Push to device — reads session cookie automatically
document.getElementById('push-btn').addEventListener('click', async () => {
  const endpoint = document.getElementById('iot-endpoint').value.trim();
  const status   = document.getElementById('push-status');

  const stored = await chrome.storage.local.get('orgId');
  const orgId  = stored.orgId || document.getElementById('org-id').value.trim();

  if (!endpoint) {
    status.style.color = 'var(--red)';
    status.textContent = '✗ enter device IP first';
    setTimeout(() => status.textContent = '', 3000);
    return;
  }
  if (!orgId || orgId.length !== 36) {
    status.style.color = 'var(--red)';
    status.textContent = '✗ org ID not detected yet — open claude.ai first';
    setTimeout(() => status.textContent = '', 3000);
    return;
  }

  const btn = document.getElementById('push-btn');
  btn.disabled = true;
  status.style.color = 'var(--dim)';
  status.textContent = 'reading cookie...';

  const sessionKey = await getSessionCookie();
  if (!sessionKey) {
    status.style.color = 'var(--red)';
    status.textContent = '✗ not logged in to claude.ai';
    btn.disabled = false;
    setTimeout(() => status.textContent = '', 3000);
    return;
  }

  status.textContent = 'pushing...';

  try {
    const base = endpoint.startsWith('http') ? endpoint : `http://${endpoint}`;
    const res  = await fetch(`${base}/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, sessionKey }),
    });
    const json = await res.json();
    if (json.ok) {
      status.style.color = 'var(--green)';
      status.textContent = '✓ device configured!';
    } else {
      status.style.color = 'var(--red)';
      status.textContent = `✗ ${json.error || 'failed'}`;
    }
  } catch (e) {
    status.style.color = 'var(--red)';
    status.textContent = '✗ could not reach device';
  }

  btn.disabled = false;
  setTimeout(() => status.textContent = '', 4000);
});

// Save settings
document.getElementById('save-btn').addEventListener('click', async () => {
  const orgId      = document.getElementById('org-id').value.trim();
  const autoDetect = document.getElementById('auto-detect').checked;

  if (!autoDetect && orgId && !/^[0-9a-f-]{36}$/.test(orgId)) {
    const st = document.getElementById('save-status');
    st.style.color = 'var(--red)';
    st.textContent = '✗ invalid UUID format';
    setTimeout(() => st.textContent = '', 3000);
    return;
  }

  const settings = {
    autoDetect,
    goals: {
      five_hour: parseInt(document.getElementById('goal-5h').value, 10) || 80,
      seven_day: parseInt(document.getElementById('goal-7d').value, 10) || 70,
    },
    paceNotifications: document.getElementById('pace-notifs').checked,
    iotEndpoint:       document.getElementById('iot-endpoint').value.trim(),
    iotEnabled:        document.getElementById('iot-enabled').checked,
  };

  const toSave = { settings };
  if (!autoDetect && orgId) toSave.orgId = orgId;
  await chrome.storage.local.set(toSave);

  const tabs = await chrome.tabs.query({ url: 'https://claude.ai/*' });
  let needsReload = false;
  for (const tab of tabs) {
    if (!autoDetect && orgId)
      chrome.tabs.sendMessage(tab.id, { type: 'ORG_ID_UPDATED', orgId }).catch(() => {});
    if (autoDetect) needsReload = true;
  }
  if (needsReload) for (const tab of tabs) chrome.tabs.reload(tab.id);

  const st = document.getElementById('save-status');
  st.style.color = 'var(--green)';
  st.textContent = autoDetect ? '✓ saved — reloading claude.ai…' : '✓ saved';
  setTimeout(() => st.textContent = '', 3000);
});

document.getElementById('clear-history').addEventListener('click', async () => {
  if (!confirm('Clear all usage history? This cannot be undone.')) return;
  await chrome.storage.local.remove(['history', 'currentUsage', 'sessionStart', 'lastTimestamp']);
  alert('History cleared.');
});

load();
