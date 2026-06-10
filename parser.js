const STRIP_TAGS = /\s+(neutral|formal|informal|noun|verb|adj|adjective)\s*$/i;

function parseCards(lines) {
  return lines
    .map(line => line.trim())
    .filter(line => line.includes('-'))
    .map(line => {
      const idx = line.indexOf('-');
      const front = line.slice(0, idx).trim();
      const back = line.slice(idx + 1).trim().replace(STRIP_TAGS, '').trim();
      return { front, back };
    })
    .filter(card => card.front && card.back);
}

module.exports = { parseCards };
