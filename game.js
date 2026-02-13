const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Large world
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;

// Camera
const camera = { x: 0, y: 0 };

// Game state
let score = 0;
let lives = 3;
let asteroids = [];
let bullets = [];
let keys = {};

// Ship
const ship = {
  x: WORLD_WIDTH / 2,
  y: WORLD_HEIGHT / 2,
  radius: 15,
  angle: -Math.PI / 2,
  rotationSpeed: 0.08,
  thrusting: false,
  thrust: { x: 0, y: 0 },
  thrustPower: 0.12,
  friction: 0.99
};

// Objective (forces movement)
let objective = {
  x: Math.random() * WORLD_WIDTH,
  y: Math.random() * WORLD_HEIGHT,
  radius: 25,
  reached: false
};

// Starfield
const stars = [];
for (let i = 0; i < 500; i++) {
  stars.push({
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,
    size: Math.random() * 2 + 1
  });
}

// Asteroid settings
const ASTEROID_NUM = 10;
const ASTEROID_SIZE = 60;
const ASTEROID_SPEED = 1.5;

// Bullet settings
const BULLET_SPEED = 6;
const BULLET_LIFETIME = 60;

// Input
document.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});
document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// Utility
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}
function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Create asteroid
function createAsteroid(x, y, size) {
  const angle = Math.random() * Math.PI * 2;
  const speed = randomRange(0.5, ASTEROID_SPEED);
  return {
    x,
    y,
    radius: size,
    velX: Math.cos(angle) * speed,
    velY: Math.sin(angle) * speed,
    angle: Math.random() * Math.PI * 2,
    spin: randomRange(-0.02, 0.02)
  };
}

function initAsteroids() {
  asteroids = [];
  for (let i = 0; i < ASTEROID_NUM; i++) {
    let x, y;
    do {
      x = randomRange(0, WORLD_WIDTH);
      y = randomRange(0, WORLD_HEIGHT);
    } while (distance(x, y, ship.x, ship.y) < 200);
    asteroids.push(createAsteroid(x, y, ASTEROID_SIZE));
  }
}

// Shoot
function shoot() {
  bullets.push({
    x: ship.x + Math.cos(ship.angle) * ship.radius,
    y: ship.y + Math.sin(ship.angle) * ship.radius,
    velX: Math.cos(ship.angle) * BULLET_SPEED,
    velY: Math.sin(ship.angle) * BULLET_SPEED,
    life: BULLET_LIFETIME
  });
}

// Reset ship
function resetShip() {
  ship.x = WORLD_WIDTH / 2;
  ship.y = WORLD_HEIGHT / 2;
  ship.angle = -Math.PI / 2;
  ship.thrust.x = 0;
  ship.thrust.y = 0;
}

// Update
function update() {
  // Input
  if (keys["ArrowLeft"]) ship.angle -= ship.rotationSpeed;
  if (keys["ArrowRight"]) ship.angle += ship.rotationSpeed;
  ship.thrusting = keys["ArrowUp"] || false;

  if (keys["Space"] && !keys["_spacePressed"]) {
    shoot();
    keys["_spacePressed"] = true;
  }
  if (!keys["Space"]) keys["_spacePressed"] = false;

  // Thrust
  if (ship.thrusting) {
    ship.thrust.x += Math.cos(ship.angle) * ship.thrustPower;
    ship.thrust.y += Math.sin(ship.angle) * ship.thrustPower;
  } else {
    ship.thrust.x *= ship.friction;
    ship.thrust.y *= ship.friction;
  }

  ship.x += ship.thrust.x;
  ship.y += ship.thrust.y;

  // World boundaries
  ship.x = Math.max(ship.radius, Math.min(WORLD_WIDTH - ship.radius, ship.x));
  ship.y = Math.max(ship.radius, Math.min(WORLD_HEIGHT - ship.radius, ship.y));

  // Update asteroids
  asteroids.forEach((a) => {
    a.x += a.velX;
    a.y += a.velY;
    a.angle += a.spin;

    // Boundaries
    if (a.x < 0) a.x = WORLD_WIDTH;
    if (a.x > WORLD_WIDTH) a.x = 0;
    if (a.y < 0) a.y = WORLD_HEIGHT;
    if (a.y > WORLD_HEIGHT) a.y = 0;
  });

  // Update bullets
  bullets.forEach((b) => {
    b.x += b.velX;
    b.y += b.velY;
    b.life--;
  });
  bullets = bullets.filter((b) => b.life > 0);

  // Bullet collisions
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i];
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (distance(a.x, a.y, b.x, b.y) < a.radius) {
        bullets.splice(j, 1);
        score += 10;

        if (a.radius > 20) {
          const newSize = a.radius / 2;
          asteroids.push(createAsteroid(a.x, a.y, newSize));
          asteroids.push(createAsteroid(a.x, a.y, newSize));
        }
        asteroids.splice(i, 1);
        break;
      }
    }
  }

  // Ship collisions
  for (let a of asteroids) {
    if (distance(a.x, a.y, ship.x, ship.y) < a.radius + ship.radius) {
      lives--;
      resetShip();
      if (lives <= 0) {
        lives = 3;
        score = 0;
        initAsteroids();
      }
      break;
    }
  }

  // Objective reached
  if (!objective.reached && distance(ship.x, ship.y, objective.x, objective.y) < 40) {
    objective.reached = true;
    score += 100;
  }

  // HUD
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
}

// Draw starfield
function drawStarfield() {
  ctx.fillStyle = "white";
  stars.forEach((s) => {
    const sx = s.x - camera.x;
    const sy = s.y - camera.y;
    if (sx >= 0 && sx <= WIDTH && sy >= 0 && sy <= HEIGHT) {
      ctx.fillRect(sx, sy, s.size, s.size);
    }
  });
}

// Draw ship
function drawShip() {
  ctx.save();
  ctx.translate(ship.x - camera.x, ship.y - camera.y);
  ctx.rotate(ship.angle);

  ctx.strokeStyle = "#4b9fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ship.radius, 0);
  ctx.lineTo(-ship.radius, ship.radius * 0.6);
  ctx.lineTo(-ship.radius, -ship.radius * 0.6);
  ctx.closePath();
  ctx.stroke();

  if (ship.thrusting) {
    ctx.strokeStyle = "#ffcc66";
    ctx.beginPath();
    ctx.moveTo(-ship.radius, 0);
    ctx.lineTo(-ship.radius - 10, 0);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw asteroids
function drawAsteroids() {
  asteroids.forEach((a) => {
    ctx.save();
    ctx.translate(a.x - camera.x, a.y - camera.y);
    ctx.rotate(a.angle);

    ctx.strokeStyle = "#b0b0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const points = 10;
    for (let i = 0; i < points; i++) {
      const angle = (Math.PI * 2 * i) / points;
      const radius = a.radius * (0.7 + Math.random() * 0.3);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  });
}

// Draw bullets
function drawBullets() {
  ctx.fillStyle = "#ffffff";
  bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x - camera.x, b.y - camera.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Draw objective
function drawObjective() {
  if (objective.reached) return;

  const ox = objective.x - camera.x;
  const oy = objective.y - camera.y;

  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ox, oy, objective.radius, 0, Math.PI * 2);
  ctx.stroke();
}

// Minimap
function drawMinimap() {
  const mapSize = 150;
  const scaleX = mapSize / WORLD_WIDTH;
  const scaleY = mapSize / WORLD_HEIGHT;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(WIDTH - mapSize - 10, 10, mapSize, mapSize);

  // Player
  ctx.fillStyle = "#4b9fff";
  ctx.fillRect(
    WIDTH - mapSize - 10 + ship.x * scaleX,
    10 + ship.y * scaleY,
    4,
    4
  );

  // Objective
  if (!objective.reached) {
    ctx.fillStyle = "#00ff88";
    ctx.fillRect(
      WIDTH - mapSize - 10 + objective.x * scaleX,
      10 + objective.y * scaleY,
      4,
      4
    );
  }
}

// Main loop
function loop() {
  update();

  // Camera follows ship
  camera.x = ship.x - WIDTH / 2;
  camera.y = ship.y - HEIGHT / 2;

  camera.x = Math.max(0, Math.min(WORLD_WIDTH - WIDTH, camera.x));
  camera.y = Math.max(0, Math.min(WORLD_HEIGHT - HEIGHT, camera.y));

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  drawStarfield();
  drawAsteroids();
  drawBullets();
  drawShip();
  drawObjective();
  drawMinimap();

  requestAnimationFrame(loop);
}

// Init
resetShip();
initAsteroids();
loop();