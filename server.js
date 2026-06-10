require('dotenv').config();
const express = require('express');
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
const { parseCards } = require('./parser');

const app = express();
const PORT = process.env.PORT || 3000;
const CARDS_PATH = path.join(__dirname, 'cards.json');

app.use(express.static('public'));
app.use(express.json());

let notion = process.env.NOTION_API_KEY
  ? new Client({ auth: process.env.NOTION_API_KEY })
  : null;

// Endpoints added in Task 3

app.get('/api/status', (_req, res) => {
  res.json({
    connected: !!(process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID),
    hasCachedCards: fs.existsSync(CARDS_PATH),
  });
});

app.post('/api/setup', (req, res) => {
  const { notionApiKey, notionDatabaseId } = req.body;
  if (!notionApiKey || !notionDatabaseId) {
    return res.status(400).json({ error: 'Both fields are required' });
  }
  const envContent = `NOTION_API_KEY=${notionApiKey}\nNOTION_DATABASE_ID=${notionDatabaseId}\n`;
  fs.writeFileSync(path.join(__dirname, '.env'), envContent);
  process.env.NOTION_API_KEY = notionApiKey;
  process.env.NOTION_DATABASE_ID = notionDatabaseId;
  notion = new Client({ auth: notionApiKey });
  res.json({ ok: true });
});

app.get('/api/cards', (_req, res) => {
  if (!fs.existsSync(CARDS_PATH)) {
    return res.status(404).json({ error: 'No cards cached. Use Sync first.' });
  }
  res.json(JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8')));
});

app.get('/api/sync', async (_req, res) => {
  if (!notion) {
    return res.status(400).json({ error: 'Notion not configured. Run setup first.' });
  }
  try {
    const dbResponse = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
    });

    const pages = [];
    for (const page of dbResponse.results) {
      const titleProp = Object.values(page.properties).find(p => p.type === 'title');
      const title = titleProp?.title?.[0]?.plain_text?.trim() || 'Unknown';
      const lastEdited = page.last_edited_time;

      const blocksResponse = await notion.blocks.children.list({ block_id: page.id });
      const lines = blocksResponse.results
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
    fs.writeFileSync(CARDS_PATH, JSON.stringify(data, null, 2));

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
