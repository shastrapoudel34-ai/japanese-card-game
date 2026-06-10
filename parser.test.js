const { parseCards } = require('./parser');

test('parses japanese-english line', () => {
  expect(parseCards(['けつだん-decision'])).toEqual([
    { front: 'けつだん', back: 'decision' },
  ]);
});

test('parses english-japanese line', () => {
  expect(parseCards(['Misunderstanding-ごかい'])).toEqual([
    { front: 'Misunderstanding', back: 'ごかい' },
  ]);
});

test('strips trailing neutral tag', () => {
  expect(parseCards(['Disadvantages-たんしょ neutral'])).toEqual([
    { front: 'Disadvantages', back: 'たんしょ' },
  ]);
});

test('keeps parenthetical annotations', () => {
  expect(parseCards(['Apologize-しゃざい(noun)'])).toEqual([
    { front: 'Apologize', back: 'しゃざい(noun)' },
  ]);
});

test('skips lines without hyphen', () => {
  expect(parseCards(['no hyphen here', 'けつだん-decision'])).toEqual([
    { front: 'けつだん', back: 'decision' },
  ]);
});

test('skips empty lines', () => {
  expect(parseCards(['', 'よろこぶ-be happy', ''])).toEqual([
    { front: 'よろこぶ', back: 'be happy' },
  ]);
});

test('trims surrounding whitespace', () => {
  expect(parseCards(['  けつだん - decision  '])).toEqual([
    { front: 'けつだん', back: 'decision' },
  ]);
});

test('returns empty array for empty input', () => {
  expect(parseCards([])).toEqual([]);
});
