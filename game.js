// Retro Neon Snake Engine

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const currentScoreEl = document.getElementById('current-score');
const highScoreEl = document.getElementById('high-score');
const finalScoreEl = document.getElementById('final-score');
const newRecordBadge = document.getElementById('new-record-badge');
const startOverlay = document.getElementById('start-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const diffButtons = document.querySelectorAll('.diff-btn');
const dpadButtons = document.querySelectorAll('.dpad-btn');

// Configuración del tablero
const GRID_SIZE = 20; // 20x20 celdas
const TILE_COUNT = canvas.width / GRID_SIZE; // 400 / 20 = 20

// Audio Synthesizer (Web Audio API)
class SoundFx {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playEat() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playGameOver() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }
}

const sfx = new SoundFx();

// Estado del juego
let snake = [];
let food = { x: 5, y: 5 };
let dx = 1;
let dy = 0;
let nextDx = 1;
let nextDy = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem('neon_snake_highscore') || '0', 10);
let gameSpeed = 90;
let gameLoopTimeout = null;
let isRunning = false;
let isPaused = false;

highScoreEl.textContent = highScore;

// Dificultad
diffButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    diffButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameSpeed = parseInt(btn.dataset.speed, 10);
  });
});

function initGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  dx = 1;
  dy = 0;
  nextDx = 1;
  nextDy = 0;
  score = 0;
  currentScoreEl.textContent = score;
  spawnFood();
  isRunning = true;
  isPaused = false;
}

function spawnFood() {
  let valid = false;
  while (!valid) {
    food.x = Math.floor(Math.random() * TILE_COUNT);
    food.y = Math.floor(Math.random() * TILE_COUNT);
    valid = !snake.some(segment => segment.x === food.x && segment.y === food.y);
  }
}

function gameLoop() {
  if (!isRunning) return;

  if (!isPaused) {
    update();
    draw();
  }

  gameLoopTimeout = setTimeout(gameLoop, gameSpeed);
}

function update() {
  dx = nextDx;
  dy = nextDy;

  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  // Colisión con paredes
  if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
    triggerGameOver();
    return;
  }

  // Colisión consigo misma
  for (let i = 0; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      triggerGameOver();
      return;
    }
  }

  snake.unshift(head);

  // Comer comida
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    currentScoreEl.textContent = score;
    sfx.playEat();
    spawnFood();
  } else {
    snake.pop();
  }
}

function draw() {
  // Limpiar lienzo
  ctx.fillStyle = '#050811';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cuadrícula sutil
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= canvas.width; i += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  // Dibujar comida (Orbe de energía con brillo)
  const foodCenterX = food.x * GRID_SIZE + GRID_SIZE / 2;
  const foodCenterY = food.y * GRID_SIZE + GRID_SIZE / 2;
  const radius = GRID_SIZE / 2 - 3;

  ctx.save();
  ctx.shadowColor = '#ff007f';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#ff007f';
  ctx.beginPath();
  ctx.arc(foodCenterX, foodCenterY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(foodCenterX, foodCenterY, radius / 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dibujar serpiente
  snake.forEach((segment, index) => {
    const isHead = index === 0;
    const x = segment.x * GRID_SIZE;
    const y = segment.y * GRID_SIZE;

    ctx.save();
    if (isHead) {
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 14;
    } else {
      const gradientFactor = 1 - (index / snake.length) * 0.5;
      ctx.fillStyle = `rgba(0, 212, 255, ${gradientFactor})`;
      ctx.shadowColor = 'rgba(0, 212, 255, 0.4)';
      ctx.shadowBlur = 6;
    }

    roundRect(ctx, x + 2, y + 2, GRID_SIZE - 4, GRID_SIZE - 4, 4);
    ctx.fill();
    ctx.restore();
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function triggerGameOver() {
  isRunning = false;
  clearTimeout(gameLoopTimeout);
  sfx.playGameOver();

  let isNewRecord = false;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('neon_snake_highscore', highScore.toString());
    highScoreEl.textContent = highScore;
    isNewRecord = true;
  }

  finalScoreEl.textContent = score;
  if (isNewRecord && score > 0) {
    newRecordBadge.classList.remove('hidden');
  } else {
    newRecordBadge.classList.add('hidden');
  }

  gameOverOverlay.classList.add('active');
}

function changeDirection(dir) {
  if (!isRunning || isPaused) return;

  switch (dir) {
    case 'UP':
      if (dy === 0) { nextDx = 0; nextDy = -1; }
      break;
    case 'DOWN':
      if (dy === 0) { nextDx = 0; nextDy = 1; }
      break;
    case 'LEFT':
      if (dx === 0) { nextDx = -1; nextDy = 0; }
      break;
    case 'RIGHT':
      if (dx === 0) { nextDx = 1; nextDy = 0; }
      break;
  }
}

// Teclado
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'KeyW'].includes(e.code)) {
    changeDirection('UP');
    e.preventDefault();
  } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
    changeDirection('DOWN');
    e.preventDefault();
  } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
    changeDirection('LEFT');
    e.preventDefault();
  } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
    changeDirection('RIGHT');
    e.preventDefault();
  } else if (e.code === 'Space') {
    if (isRunning) isPaused = !isPaused;
    e.preventDefault();
  }
});

// Controles virtuales (D-pad)
dpadButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    changeDirection(btn.dataset.dir);
  });
});

// Botones de inicio y reinicio
startBtn.addEventListener('click', () => {
  sfx.init();
  startOverlay.classList.remove('active');
  initGame();
  gameLoop();
});

restartBtn.addEventListener('click', () => {
  sfx.init();
  gameOverOverlay.classList.remove('active');
  initGame();
  gameLoop();
});
