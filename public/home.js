async function init() {
  const statusRes = await fetch('/api/status');
  const status    = await statusRes.json();

  if (!status.connected) {
    window.location.href = '/setup.html';
    return;
  }

  if (!status.hasCachedCards) {
    document.getElementById('totalCount').textContent = '0 cards';
    document.getElementById('content').innerHTML =
      '<p class="subtitle" style="margin-top:24px;">No cards yet — click Sync to import from Notion.</p>';
    return;
  }

  const res  = await fetch('/api/cards');
  const data = await res.json();
  render(data);
}

function render(data) {
  const totalCards = data.pages.reduce((n, p) => n + p.cards.length, 0);
  document.getElementById('totalCount').textContent = `${totalCards} cards total`;

  document.getElementById('randomBtn').onclick = () => {
    sessionStorage.setItem('studyMode', 'random');
    window.location.href = '/study.html';
  };

  // Group by month
  const groups = {};
  for (const page of data.pages) {
    const month = getMonth(page.title, page.lastEdited);
    if (!groups[month]) groups[month] = [];
    groups[month].push(page);
  }

  const contentEl = document.getElementById('content');
  contentEl.innerHTML = '';

  for (const [month, pages] of Object.entries(groups)) {
    const label = document.createElement('div');
    label.className = 'month-label';
    label.textContent = month;
    contentEl.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'grid';

    for (const page of pages) {
      const tile = document.createElement('div');
      tile.className = 'date-tile';
      tile.innerHTML = `
        <div class="date-name">${page.title}</div>
        <div class="card-count">${page.cards.length} cards</div>
      `;
      tile.onclick = () => {
        sessionStorage.setItem('studyMode', 'page');
        sessionStorage.setItem('studyPageId', page.id);
        window.location.href = '/study.html';
      };
      grid.appendChild(tile);
    }

    contentEl.appendChild(grid);
  }
}

function getMonth(title, lastEdited) {
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const lower  = title.toLowerCase();
  const match  = months.find(m => lower.startsWith(m));
  if (match) {
    const d = new Date(2025, months.indexOf(match), 1);
    return d.toLocaleString('en', { month: 'long', year: 'numeric' });
  }
  const d = new Date(lastEdited);
  return d.toLocaleString('en', { month: 'long', year: 'numeric' });
}

document.getElementById('syncBtn').addEventListener('click', async () => {
  const btn = document.getElementById('syncBtn');
  btn.textContent = 'Syncing…';
  btn.disabled = true;
  try {
    const res  = await fetch('/api/sync');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    location.reload();
  } catch (err) {
    alert('Sync failed: ' + err.message);
    btn.textContent = 'Sync';
    btn.disabled = false;
  }
});

init();
