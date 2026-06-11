require('dotenv').config();
const express = require('express');
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
const { parseCards } = require('./parser');

const app = express();
const PORT = process.env.PORT || 3000;
const CARDS_PATH = path.join(__dirname, 'cards.json');

app.use(express.static('public', { etag: false, maxAge: 0 }));
app.use(express.json());

let notion = process.env.NOTION_API_KEY
  ? new Client({ auth: process.env.NOTION_API_KEY })
  : null;

// In-memory cache for Vercel (serverless has no persistent filesystem)
let memCache = null;

function readCache() {
  if (memCache) return memCache;
  try {
    if (fs.existsSync(CARDS_PATH)) return JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));
  } catch {}
  return null;
}

function writeCache(data) {
  memCache = data;
  try { fs.writeFileSync(CARDS_PATH, JSON.stringify(data, null, 2)); } catch {}
}

app.get('/api/status', (_req, res) => {
  res.json({
    connected: !!process.env.NOTION_API_KEY,
    hasCachedCards: !!(memCache || fs.existsSync(CARDS_PATH)),
  });
});

app.post('/api/setup', (req, res) => {
  const { notionApiKey } = req.body;
  if (!notionApiKey) {
    return res.status(400).json({ error: 'Notion API key is required' });
  }
  try { fs.writeFileSync(path.join(__dirname, '.env'), `NOTION_API_KEY=${notionApiKey}\n`); } catch {}
  process.env.NOTION_API_KEY = notionApiKey;
  notion = new Client({ auth: notionApiKey });
  res.json({ ok: true });
});

app.get('/api/cards', (_req, res) => {
  const data = readCache();
  if (!data) return res.status(404).json({ error: 'No cards cached. Use Sync first.' });
  res.json(data);
});

app.get('/api/sync', async (_req, res) => {
  if (!notion) {
    return res.status(400).json({ error: 'Notion not configured. Run setup first.' });
  }
  try {
    let allPageResults = [];
    let cursor = undefined;
    do {
      const response = await notion.search({
        filter: { property: 'object', value: 'page' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        start_cursor: cursor,
      });
      allPageResults = allPageResults.concat(response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    const pages = [];
    for (const page of allPageResults) {
      const titleProp = Object.values(page.properties).find(p => p.type === 'title');
      const title = titleProp?.title?.[0]?.plain_text?.trim() || 'Unknown';
      const lastEdited = page.last_edited_time;

      let allBlocks = [];
      let blockCursor = undefined;
      do {
        const blocksResponse = await notion.blocks.children.list({
          block_id: page.id,
          start_cursor: blockCursor,
        });
        allBlocks = allBlocks.concat(blocksResponse.results);
        blockCursor = blocksResponse.has_more ? blocksResponse.next_cursor : undefined;
      } while (blockCursor);

      const lines = allBlocks
        .filter(b => b.type === 'paragraph')
        .map(b => b.paragraph.rich_text.map(r => r.plain_text).join(''))
        .filter(text => text.trim());

      const cards = parseCards(lines);
      if (cards.length > 0) {
        pages.push({ id: page.id, title, lastEdited, cards });
      }
    }

    pages.sort((a, b) => new Date(b.lastEdited) - new Date(a.lastEdited));
    const data = { pages, syncedAt: new Date().toISOString() };
    writeCache(data);

    res.json({
      ok: true,
      pageCount: pages.length,
      cardCount: pages.reduce((n, p) => n + p.cards.length, 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Running at http://localhost:${PORT}`);
});

module.exports = app;
