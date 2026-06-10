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

app.listen(PORT, () => {
  console.log(`Running at http://localhost:${PORT}`);
});
