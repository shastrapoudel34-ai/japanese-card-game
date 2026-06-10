async function init() {
  try {
    const statusRes = await fetch('/api/status');
    const status    = await statusRes.json();

    if (!status.connected) {
      window.location.href = '/setup.html';
      return;
    }

    if (!status.hasCachedCards) {
      document.getElementById('totalCount').textContent = '0 cards';
      document.getElementById('randomBtn').style.display = 'none';
      document.getElementById('content').innerHTML =
        '<p class="subtitle" style="margin-top:24px;">No cards yet — click Sync to import from Notion.</p>';
      return;
    }

    const res  = await fetch('/api/cards');
    if (!res.ok) {
      document.getElementById('totalCount').textContent = 'Error loading cards';
      document.getElementById('content').innerHTML =
        '<p class="subtitle" style="margin-top:24px;">Failed to load cards. Try syncing again.</p>';
      return;
    }
    const data = await res.json();
    render(data);
  } catch {
    document.getElementById('totalCount').textContent = 'Cannot connect to server';
    document.getElementById('content').innerHTML =
      '<p class="subtitle" style="margin-top:24px;">Make sure the server is running: npm start</p>';
  }
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

      const nameEl = document.createElement('div');
      nameEl.className = 'date-name';
      nameEl.textContent = page.title;

      const countEl = document.createElement('div');
      countEl.className = 'card-count';
      countEl.textContent = `${page.cards.length} cards`;

      tile.appendChild(nameEl);
      tile.appendChild(countEl);

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
    const year = new Date(lastEdited).getFullYear();
    const d = new Date(year, months.indexOf(match), 1);
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
