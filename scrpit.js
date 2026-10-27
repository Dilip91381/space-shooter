const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const waveElement = document.getElementById("wave");
const bestElement = document.getElementById("best");
const overlay = document.getElementById("overlay");
const message = document.getElementById("message");
const instructions = document.getElementById("instructions");
const startBtn = document.getElementById("startBtn");

const W = canvas.width;
const H = canvas.height;
const bestScoreKey = "nebulaRunBest";

let player, bullets, enemies, stars, particles, powerups;
let score = 0;
let lives = 3;
let wave = 1;
let bestScore = Number(localStorage.getItem(bestScoreKey)) || 0;
let running = false;
let animationId = null;
let lastShot = 0;
let lastEnemy = 0;
let rapidFireUntil = 0;
let invulnerableUntil = 0;
let keys = {};

bestElement.textContent = bestScore;

function createStars() {
  return Array.from({ length: 115 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 1.8 + 0.4,
    speed: Math.random() * 2.2 + 0.4,
    alpha: Math.random() * 0.6 + 0.25
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
  particles = [];
  powerups = [];
  score = 0;
  lives = 3;
  wave = 1;
  lastShot = 0;
  lastEnemy = 0;
  rapidFireUntil = 0;
  invulnerableUntil = 0;
  keys = {};

  scoreElement.textContent = score;
  livesElement.textContent = lives;
  waveElement.textContent = wave;
}

function drawStars() {
  const background = ctx.createLinearGradient(0, 0, W, H);
  background.addColorStop(0, "#080d23");
  background.addColorStop(0.55, "#08091a");
  background.addColorStop(1, "#11091f");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  const nebula = ctx.createRadialGradient(W * 0.72, H * 0.35, 10, W * 0.72, H * 0.35, W * 0.55);
  nebula.addColorStop(0, "#44247224");
  nebula.addColorStop(1, "#44247200");
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, W, H);

  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#d9f6ff";
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
  if (performance.now() < invulnerableUntil && Math.floor(performance.now() / 90) % 2 === 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.shadowColor = "#46eaff";
  ctx.shadowBlur = 20;

  ctx.fillStyle = "#54e9ff";
  ctx.beginPath();
  ctx.moveTo(0, -player.height / 2);
  ctx.lineTo(-player.width / 2, player.height / 2);
  ctx.lineTo(0, player.height / 3);
  ctx.lineTo(player.width / 2, player.height / 2);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f4fdff";
  ctx.beginPath();
  ctx.ellipse(0, -1, 5, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffad5c";
  ctx.beginPath();
  ctx.moveTo(-6, 12);
  ctx.lineTo(0, 21 + Math.random() * 8);
  ctx.lineTo(6, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function createBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 3 + 1,
      life: 1,
      color
    });
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = particle.life;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.035;
  }

  ctx.globalAlpha = 1;
  particles = particles.filter(particle => particle.life > 0);
}

function shoot() {
  const now = performance.now();
  const cooldown = now < rapidFireUntil ? 100 : 220;
  if (now - lastShot < cooldown) return;

  bullets.push({ x: player.x, y: player.y - 20, speed: 9 });
  if (now < rapidFireUntil) {
    bullets.push({ x: player.x - 12, y: player.y - 12, speed: 8 });
    bullets.push({ x: player.x + 12, y: player.y - 12, speed: 8 });
  }
  lastShot = now;
}

function spawnEnemy() {
  const roll = Math.random();
  let type = "scout";
  if (score >= 40 && roll > 0.72) type = "interceptor";
  if (score >= 100 && roll > 0.9) type = "brute";

  const specs = {
    scout: { radius: 16, speed: 1.4, hp: 1, color: "#ff557d", points: 10 },
    interceptor: { radius: 12, speed: 2.6, hp: 1, color: "#ffb84d", points: 20 },
    brute: { radius: 21, speed: 1, hp: 3, color: "#bd7bff", points: 30 }
  };
  const spec = specs[type];
  enemies.push({
    x: 25 + Math.random() * (W - 50),
    y: -25,
    ...spec,
    maxHp: spec.hp
  });
}

function drawBullets() {
  ctx.fillStyle = "#a9fbff";
  ctx.shadowColor = "#4deaff";
  ctx.shadowBlur = 14;

  for (const bullet of bullets) {
    ctx.fillRect(bullet.x - 2, bullet.y - 11, 4, 17);
    bullet.y -= bullet.speed;
  }

  ctx.shadowBlur = 0;
  bullets = bullets.filter(bullet => bullet.y > -20);
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = enemy.color;

    if (enemy.maxHp > 1) {
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius, -enemy.radius / 3);
      ctx.lineTo(enemy.radius * 0.75, enemy.radius);
      ctx.lineTo(-enemy.radius * 0.75, enemy.radius);
      ctx.lineTo(-enemy.radius, -enemy.radius / 3);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.speed > 2) {
      ctx.beginPath();
      ctx.moveTo(0, enemy.radius);
      ctx.lineTo(-enemy.radius, -enemy.radius);
      ctx.lineTo(0, -enemy.radius / 2);
      ctx.lineTo(enemy.radius, -enemy.radius);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff1f4";
    ctx.fillRect(-7, -3, 4, 4);
    ctx.fillRect(3, -3, 4, 4);

    if (enemy.maxHp > 1) {
      ctx.fillStyle = "#ffffff55";
      ctx.fillRect(-enemy.radius, -enemy.radius - 7, enemy.radius * 2, 3);
      ctx.fillStyle = "#f0d7ff";
      ctx.fillRect(-enemy.radius, -enemy.radius - 7, enemy.radius * 2 * enemy.hp / enemy.maxHp, 3);
    }
    ctx.restore();
    enemy.y += enemy.speed + wave * 0.08;
  }
}

function drawPowerups() {
  for (const powerup of powerups) {
    const color = powerup.type === "rapid" ? "#5df5ff" : "#ff7794";
    ctx.save();
    ctx.globalAlpha = 0.85 + Math.sin(performance.now() / 100) * 0.15;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#101b35";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(powerup.x, powerup.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(powerup.type === "rapid" ? "»" : "♥", powerup.x, powerup.y);
    ctx.restore();
    powerup.y += 1.7;
  }
  powerups = powerups.filter(powerup => powerup.y < H + 20);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function updateScore(points) {
  score += points;
  scoreElement.textContent = score;

  if (score > bestScore) {
    bestScore = score;
    bestElement.textContent = bestScore;
    localStorage.setItem(bestScoreKey, bestScore);
  }

  const nextWave = Math.floor(score / 100) + 1;
  if (nextWave > wave) {
    wave = nextWave;
    waveElement.textContent = wave;
    createBurst(W / 2, H / 2, "#7beeff", 28);
  }
}

function checkCollisions() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const bulletIndex = bullets.findIndex(bullet =>
      Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < enemy.radius + 8
    );

    if (bulletIndex !== -1) {
      bullets.splice(bulletIndex, 1);
      enemy.hp--;
      createBurst(enemy.x, enemy.y, enemy.color, enemy.hp <= 0 ? 12 : 4);
      if (enemy.hp <= 0) {
        enemies.splice(i, 1);
        updateScore(enemy.points);
        if (Math.random() < 0.16) {
          powerups.push({
            x: enemy.x,
            y: enemy.y,
            type: lives < 5 && Math.random() < 0.35 ? "life" : "rapid"
          });
        }
        continue;
      }
    }

    if (distance(player, enemy) < enemy.radius + 15) {
      enemies.splice(i, 1);
      createBurst(enemy.x, enemy.y, enemy.color, 14);
      loseLife();
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].y > H + 20) {
      enemies.splice(i, 1);
      loseLife();
    }
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    const powerup = powerups[i];
    if (distance(player, powerup) < 30) {
      powerups.splice(i, 1);
      if (powerup.type === "life") {
        lives = Math.min(5, lives + 1);
        livesElement.textContent = lives;
        createBurst(player.x, player.y, "#ff7794", 14);
      } else {
        rapidFireUntil = performance.now() + 7000;
        createBurst(player.x, player.y, "#5df5ff", 14);
      }
    }
  }
}

function loseLife() {
  if (!running || performance.now() < invulnerableUntil) return;

  lives--;
  livesElement.textContent = lives;
  invulnerableUntil = performance.now() + 1100;

  if (lives <= 0) {
    endGame();
  }
}

function movePlayer() {
  if (keys.ArrowLeft || keys.a || keys.A) player.x -= player.speed;
  if (keys.ArrowRight || keys.d || keys.D) player.x += player.speed;
  if (keys.ArrowUp || keys.w || keys.W) player.y -= player.speed;
  if (keys.ArrowDown || keys.s || keys.S) player.y += player.speed;

  player.x = Math.max(20, Math.min(W - 20, player.x));
  player.y = Math.max(25, Math.min(H - 25, player.y));
  if (keys[" "] || keys.Spacebar) shoot();
}

function gameLoop() {
  if (!running) return;

  drawStars();
  movePlayer();

  const spawnDelay = Math.max(250, 850 - (wave - 1) * 55);
  if (performance.now() - lastEnemy > spawnDelay) {
    spawnEnemy();
    lastEnemy = performance.now();
  }

  drawPowerups();
  drawBullets();
  drawEnemies();
  checkCollisions();
  drawParticles();

  if (running) {
    drawPlayer();
    animationId = requestAnimationFrame(gameLoop);
  }
}

function startGame() {
  if (animationId !== null) cancelAnimationFrame(animationId);

  resetGame();
  running = true;
  overlay.classList.add("hidden");
  gameLoop();
}

function endGame() {
  running = false;
  message.textContent = "MISSION OVER";
  instructions.innerHTML = `Final score: ${score} · Wave ${wave}<br>Ready for another run?`;
  startBtn.innerHTML = "PLAY AGAIN <span>↗</span>";
  overlay.classList.remove("hidden");
}

startBtn.addEventListener("click", startGame);

window.addEventListener("keydown", event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
  keys[event.key] = true;
  keys[key] = true;
});

window.addEventListener("keyup", event => {
  keys[event.key] = false;
  if (event.key.length === 1) keys[event.key.toLowerCase()] = false;
});

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
  fireBtn.setPointerCapture(event.pointerId);
});

["pointerup", "pointercancel", "lostpointercapture"].forEach(type => {
  fireBtn.addEventListener(type, () => {
    keys[" "] = false;
  });
});

resetGame();
drawStars();
drawPlayer();
