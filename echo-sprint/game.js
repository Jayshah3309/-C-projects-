const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('statusText');
const timerText = document.getElementById('timerText');

const state = {
  keys: {},
  player: null,
  enemy: null,
  orbs: [],
  echoes: [],
  trail: [],
  collected: 0,
  timeLeft: 35,
  gameOver: false,
  won: false,
  timePassed: 0,
  lastTime: 0,
  cooldown: 0,
};

function initGame() {
  state.player = { x: 110, y: 120, r: 12, speed: 220 };
  state.enemy = { x: 610, y: 360, r: 14, speed: 180 };
  state.orbs = [];
  state.echoes = [];
  state.trail = [];
  state.collected = 0;
  state.timeLeft = 35;
  state.gameOver = false;
  state.won = false;
  state.timePassed = 0;
  state.cooldown = 0;
  for (let i = 0; i < 5; i += 1) {
    spawnOrb();
  }
  updateHud();
}

function spawnOrb() {
  let pos = null;
  for (let i = 0; i < 100; i += 1) {
    const candidate = {
      x: 40 + Math.random() * (canvas.width - 80),
      y: 40 + Math.random() * (canvas.height - 80),
      r: 9,
    };
    if (!isTooClose(candidate, state.player) && !state.orbs.some((orb) => distance(candidate, orb) < 40)) {
      pos = candidate;
      break;
    }
  }

  if (!pos) {
    pos = { x: 120 + Math.random() * 480, y: 120 + Math.random() * 240, r: 9 };
  }

  state.orbs.push(pos);
}

function isTooClose(candidate, player) {
  return player && distance(candidate, player) < 80;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function updateHud() {
  statusText.textContent = state.won
    ? 'You escaped the shadow!'
    : state.gameOver
      ? 'The shadow caught you.'
      : `Orbs collected: ${state.collected}/5`;
  timerText.textContent = `Time: ${Math.max(0, Math.ceil(state.timeLeft))}`;
}

function handleInput(dt) {
  const moveX = (state.keys['ArrowRight'] || state.keys['d'] ? 1 : 0) - (state.keys['ArrowLeft'] || state.keys['a'] ? 1 : 0);
  const moveY = (state.keys['ArrowDown'] || state.keys['s'] ? 1 : 0) - (state.keys['ArrowUp'] || state.keys['w'] ? 1 : 0);
  const len = Math.hypot(moveX, moveY) || 1;
  const vx = (moveX / len) * state.player.speed * dt;
  const vy = (moveY / len) * state.player.speed * dt;
  state.player.x = clamp(state.player.x + vx, 14, canvas.width - 14);
  state.player.y = clamp(state.player.y + vy, 14, canvas.height - 14);

  state.trail.push({ x: state.player.x, y: state.player.y });
  if (state.trail.length > 22) {
    state.trail.shift();
  }

  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt * 1000);
  }

  if (state.keys[' '] || state.keys['Spacebar']) {
    if (state.cooldown === 0) {
      plantEcho();
      state.cooldown = 800;
    }
    state.keys[' '] = false;
    state.keys['Spacebar'] = false;
  }
}

function plantEcho() {
  const points = state.trail.slice(-10);
  if (points.length === 0) {
    return;
  }
  points.forEach((point, index) => {
    state.echoes.push({ x: point.x, y: point.y, ttl: 1.8 - index * 0.08, createdAt: performance.now() });
  });
}

function updateEchoes(dt) {
  state.echoes = state.echoes.filter((echo) => {
    echo.ttl -= dt;
    return echo.ttl > 0;
  });
}

function updateEnemy(dt) {
  const dx = state.player.x - state.enemy.x;
  const dy = state.player.y - state.enemy.y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = state.enemy.speed * dt;
  const blocked = state.echoes.some((echo) => distance(state.enemy, echo) < 24);

  if (blocked) {
    state.enemy.x += Math.sign(dx) * speed * 0.5;
    state.enemy.y += Math.sign(dy) * speed * 0.5;
  } else {
    state.enemy.x += (dx / len) * speed;
    state.enemy.y += (dy / len) * speed;
  }

  state.enemy.x = clamp(state.enemy.x, 14, canvas.width - 14);
  state.enemy.y = clamp(state.enemy.y, 14, canvas.height - 14);
}

function collectOrbs() {
  for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
    if (distance(state.orbs[i], state.player) < state.player.r + state.orbs[i].r + 4) {
      state.orbs.splice(i, 1);
      state.collected += 1;
      if (state.collected >= 5) {
        state.won = true;
        state.gameOver = true;
      }
    }
  }
}

function checkCollisions() {
  if (distance(state.player, state.enemy) < state.player.r + state.enemy.r - 2) {
    state.gameOver = true;
  }
}

function update(dt) {
  if (state.gameOver) {
    return;
  }

  handleInput(dt);
  updateEchoes(dt);
  updateEnemy(dt);
  collectOrbs();
  checkCollisions();

  state.timePassed += dt;
  if (state.timePassed >= 1) {
    state.timeLeft -= 1;
    state.timePassed = 0;
  }

  if (state.timeLeft <= 0) {
    state.gameOver = true;
  }

  updateHud();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#050b15');
  gradient.addColorStop(1, '#132439');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.fillStyle = '#8ed2ff';
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fefefe';
  ctx.beginPath();
  ctx.arc(state.player.x + 3, state.player.y - 3, state.player.r - 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy() {
  ctx.save();
  ctx.fillStyle = '#ff5656';
  ctx.beginPath();
  ctx.arc(state.enemy.x, state.enemy.y, state.enemy.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a0604';
  ctx.beginPath();
  ctx.arc(state.enemy.x - 3, state.enemy.y - 3, state.enemy.r - 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOrbs() {
  state.orbs.forEach((orb) => {
    ctx.save();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff4b1';
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawEchoes() {
  state.echoes.forEach((echo) => {
    const alpha = Math.min(1, echo.ttl / 1.8);
    ctx.save();
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = '#7fffd4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(echo.x, echo.y, 8 + (1 - alpha) * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawOverlay() {
  if (!state.gameOver) {
    return;
  }
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 16, 0.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fefefe';
  ctx.font = 'bold 34px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(state.won ? 'You escaped!' : 'The shadow caught you.', canvas.width / 2, canvas.height / 2 - 8);
  ctx.font = '20px Segoe UI';
  ctx.fillStyle = '#cfe2ff';
  ctx.fillText('Press Enter to play again', canvas.width / 2, canvas.height / 2 + 30);
  ctx.restore();
}

function render() {
  drawBackground();
  drawEchoes();
  drawOrbs();
  drawEnemy();
  drawPlayer();
  drawOverlay();
}

function loop(timestamp) {
  const dt = Math.min((timestamp - (state.lastTime || timestamp)) / 1000, 0.033);
  state.lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar', 'Enter', 'w', 'a', 's', 'd'].includes(event.key)) {
    event.preventDefault();
  }
  if (event.key === 'Enter' && state.gameOver) {
    initGame();
    return;
  }
  state.keys[event.key] = true;
});

window.addEventListener('keyup', (event) => {
  state.keys[event.key] = false;
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

initGame();
requestAnimationFrame(loop);

