let queue      = [];
let easyCount  = 0;
let hardCount  = 0;
let totalCards = 0;
let flipped    = false;

async function init() {
  const res = await fetch('/api/cards');
  if (!res.ok) {
    window.location.href = '/';
    return;
  }
  const data = await res.json();

  const mode   = sessionStorage.getItem('studyMode');
  const pageId = sessionStorage.getItem('studyPageId');

  if (mode === 'random') {
    queue = data.pages.flatMap(p => p.cards);
    shuffle(queue);
  } else if (mode === 'page' && pageId) {
    const page = data.pages.find(p => p.id === pageId);
    queue = page ? [...page.cards] : [];
  }

  if (queue.length === 0) {
    window.location.href = '/';
    return;
  }

  totalCards = queue.length;
  showCard();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function showCard() {
  const card = queue[0];
  document.getElementById('cardFront').textContent = card.front;
  document.getElementById('cardBack').textContent  = card.back;

  const scene = document.getElementById('cardScene');
  scene.classList.remove('flipped');
  flipped = false;

  document.getElementById('actionRow').style.display = 'none';

  const done = totalCards - queue.length;
  document.getElementById('progressFill').style.width = (done / totalCards * 100) + '%';
  document.getElementById('progressText').textContent = `${done} / ${totalCards}`;
}

document.getElementById('cardScene').addEventListener('click', () => {
  if (flipped) return;
  document.getElementById('cardScene').classList.add('flipped');
  flipped = true;
  document.getElementById('actionRow').style.display = 'flex';
});

document.getElementById('easyBtn').addEventListener('click', () => {
  easyCount++;
  queue.shift();
  next();
});

document.getElementById('hardBtn').addEventListener('click', () => {
  hardCount++;
  const card     = queue.shift();
  const half     = Math.ceil(queue.length / 2);
  const insertAt = half + Math.floor(Math.random() * (queue.length - half + 1));
  queue.splice(Math.min(insertAt, queue.length), 0, card);
  next();
});

function next() {
  if (queue.length === 0) {
    showEndScreen();
  } else {
    showCard();
  }
}

function showEndScreen() {
  document.getElementById('cardScene').style.display = 'none';
  document.getElementById('actionRow').style.display = 'none';
  document.getElementById('progressFill').style.width = '100%';
  document.getElementById('progressText').textContent = `${totalCards} / ${totalCards}`;
  document.getElementById('easyCount').textContent    = easyCount;
  document.getElementById('hardCount').textContent    = hardCount;
  document.getElementById('endScreen').style.display  = 'block';
}

init();
