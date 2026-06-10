document.getElementById('connectBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const dbId   = document.getElementById('dbId').value.trim();
  const errorEl = document.getElementById('error');
  const btn     = document.getElementById('connectBtn');

  errorEl.style.display = 'none';

  if (!apiKey || !dbId) {
    errorEl.textContent = 'Both fields are required.';
    errorEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Connecting…';
  btn.disabled = true;

  try {
    const setupRes = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notionApiKey: apiKey, notionDatabaseId: dbId }),
    });
    const setupData = await setupRes.json();
    if (!setupRes.ok) throw new Error(setupData.error);

    btn.textContent = 'Syncing cards…';
    const syncRes  = await fetch('/api/sync');
    const syncData = await syncRes.json();
    if (!syncRes.ok) throw new Error(syncData.error);

    window.location.href = '/';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
    btn.textContent = 'Connect Notion';
    btn.disabled = false;
  }
});
