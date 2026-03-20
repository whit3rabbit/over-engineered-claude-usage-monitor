// Claude Usage Monitor - Main World Injected Script
// Runs in the PAGE's JS context (not isolated extension world)
// so it can actually intercept window.fetch

(function () {
  if (window.__claudeUsageMonitor) return; // don't double-inject
  window.__claudeUsageMonitor = true;

  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url ?? '';
    const match = url.match(/\/api\/organizations\/([0-9a-f-]{36})\//);
    if (match?.[1]) {
      window.postMessage({ type: 'CLAUDE_USAGE_ORG_ID', orgId: match[1] }, '*');
    }
    return _fetch.apply(this, args);
  };
})();
