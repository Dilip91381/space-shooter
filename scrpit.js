
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const overlay = document.getElementById("overlay");
const message = document.getElementById("message");
const instructions = document.getElementById("instructions");
const startBtn = document.getElementById("startBtn");

const W = canvas.width;
const H = canvas.height;

let player, bullets, enemies, stars;
let score = 0;
let lives = 3;
let running = false;
let animationId = null;
let frame = 0;
let lastShot = 0;
let lastEnemy = 0;
let keys = {};

// Create background stars
function createStars() {
  return Array.from({ length: 100 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 2 + 0.5
  }));
}

function resetGame() {
  player = {
    x: W / 2,
    y: H - 65,
    width: 34,
    height: 40,
    speed: 5
  };

  bullets = [];
  enemies = [];
  stars = createStars();
  score = 0;
  lives = 3;
  frame = 0;
  lastShot = 0;
  lastEnemy = 0;

  scoreElement.textContent = score;
  livesElement.textContent = lives;
}

function drawStars() {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, W, H);

  for (const star of stars) {
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.4 + Math.random() * 0.6;
    ctx.fillRect(star.x, star.y, star.size, star.size);

    if (running) {
      star.y += star.speed;

      if (star.y > H) {
        star.y = 0;
        star.x = Math.random() * W;
      }
    }
  }

  ctx.globalAlpha = 1;
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  // Spaceship body
  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.moveTo(0, -player.height / 2);
  ctx.lineTo(-player.width / 2, player.height / 2);
  ctx.lineTo(0, player.height / 3);
  ctx.lineTo(player.width / 2, player.height / 2);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Engine flame
  ctx.fillStyle = "#fb923c";
  ctx.beginPath();
  ctx.moveTo(-6, 12);
  ctx.lineTo(0, 23 + Math.random() * 7);
  ctx.lineTo(6, 12);
  ctx.fill();

  ctx.restore();
}

function shoot() {
  const now = performance.now();

  if (now - lastShot < 220) return;

  bullets.push({
    x: player.x,
    y: player.y - 20,
    speed: 8
  });

  lastShot = now;
}

function spawnEnemy() {
  enemies.push({
    x: 25 + Math.random() * (W - 50),
    y: -25,
    radius: 17,
    speed: 1.5 + Math.random() * 1.5 + score / 250
  });
}

function drawBullets() {
  ctx.fillStyle = "#facc15";
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 12;

  for (const bullet of bullets) {
    ctx.fillRect(bullet.x - 3, bullet.y - 10, 6, 16);
    bullet.y -= bullet.speed;
  }

  ctx.shadowBlur = 0;
  bullets = bullets.filter(b => b.y > -20);
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    // Enemy details
    ctx.fillStyle = "#fecdd3";
    ctx.fillRect(enemy.x - 8, enemy.y - 3, 5, 4);
    ctx.fillRect(enemy.x + 3, enemy.y - 3, 5, 4);

    enemy.y += enemy.speed;
  }

  enemies = enemies.filter(enemy => enemy.y < H + 30);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function checkCollisions() {
  // Lasers hitting enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    const bulletIndex = bullets.findIndex(bullet =>
      Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y)
      < enemy.radius + 8
    );

    if (bulletIndex !== -1) {
      bullets.splice(bulletIndex, 1);
      enemies.splice(i, 1);
      score += 10;
      scoreElement.textContent = score;
      continue;
    }

    // Enemy reaching the player
    if (distance(player, enemy) < enemy.radius + 15) {
      enemies.splice(i, 1);
      loseLife();
    }
  }

  // Enemies that pass the bottom
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].y > H + 20) {
      enemies.splice(i, 1);
      loseLife();
    }
  }
}

function loseLife() {
  if (!running) return;

  lives--;
  livesElement.textContent = lives;

  if (lives <= 0) {
    endGame();
  }
}

function movePlayer() {
  if (keys.ArrowLeft || keys.a || keys.A) {
    player.x -= player.speed;
  }

  if (keys.ArrowRight || keys.d || keys.D) {
    player.x += player.speed;
  }

  if (keys.ArrowUp || keys.w || keys.W) {
    player.y -= player.speed;
  }

  if (keys.ArrowDown || keys.s || keys.S) {
    player.y += player.speed;
  }

  player.x = Math.max(20, Math.min(W - 20, player.x));
  player.y = Math.max(25, Math.min(H - 25, player.y));

  if (keys[" "] || keys.Spacebar) {
    shoot();
  }
}

function gameLoop() {
  if (!running) return;

  frame++;

  drawStars();
  movePlayer();

  if (performance.now() - lastEnemy > Math.max(250, 850 - score * 2)) {
    spawnEnemy();
    lastEnemy = performance.now();
  }

  drawBullets();
  drawEnemies();
  checkCollisions();

  if (running) {
    drawPlayer();
    animationId = requestAnimationFrame(gameLoop);
  }
}

function startGame() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  resetGame();
  running = true;
  overlay.classList.add("hidden");
  gameLoop();
}

function endGame() {
  running = false;

  message.textContent = "GAME OVER!";
  instructions.innerHTML =
    `Your final score: ${score}<br>Press restart to play again.`;

  startBtn.textContent = "PLAY AGAIN";
  overlay.classList.remove("hidden");
}

startBtn.addEventListener("click", startGame);

// Keyboard controls
window.addEventListener("keydown", event => {
  const key = event.key.length === 1
    ? event.key.toLowerCase()
    : event.key;

  if (["ArrowUp", "ArrowDown", "ArrowLeft",
       "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }

  keys[event.key] = true;
  keys[key] = true;
});

window.addEventListener("keyup", event => {
  keys[event.key] = false;

  if (event.key.length === 1) {
    keys[event.key.toLowerCase()] = false;
  }
});

// Touch and mouse controls
document.querySelectorAll("[data-key]").forEach(button => {
  const key = button.dataset.key;

  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    keys[key] = true;
    button.setPointerCapture(event.pointerId);
  });

  const release = () => {
    keys[key] = false;
  };

  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

const fireBtn = document.getElementById("fireBtn");

fireBtn.addEventListener("pointerdown", event => {
  event.preventDefault();
  keys[" "] = true;
});

["pointerup", "pointercancel", "lostpointercapture"].forEach(type => {
  fireBtn.addEventListener(type, () => {
    keys[" "] = false;
  });
});

// Initial screen
resetGame();
drawStars();
drawPlayer();
