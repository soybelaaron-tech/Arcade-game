const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Game state
let score = 0;
let lives = 3;
let asteroids = [];
let bullets = [];
let keys = {};

// Ship properties
const ship = {
  x: WIDTH / 2,
  y: HEIGHT / 2,
  radius: 15,
  angle: 0, // radians
  rotationSpeed : 0.08,
  thrusting: false,
  thrust: {
    x: 0,
    y: 0
  },
  thrustPower: 0.12,
  friction: 0.99
};

// Asteroid properties
const ASTEROID_NUM = 6;
const ASTEROID_SIZE = 50;
const ASTEROID_SPEED = 1.5;

// Bullet properties
const BULLET_SPEED = 6;
const BULLET_LIFETIME = 60; // frames

// Input handling
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
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Create asteroids
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
    // spawn away from ship
    do {
      x = randomRange(0, WIDTH);
      y = randomRange(0, HEIGHT);
    } while (distance(x, y, ship.x, ship.y) < 100);
    asteroids.push(createAsteroid(x, y, ASTEROID_SIZE));
  }
}

// Shoot bullet
function shoot() {
  const bullet = {
    x: ship.x + Math.cos(ship.angle) * ship.radius,
    y: ship.y + Math.sin(ship.angle) * ship.radius,
    velX: Math.cos(ship.angle) * BULLET_SPEED,
    velY: Math.sin(ship.angle) * BULLET_SPEED,
    life: BULLET_LIFETIME
  };
  bullets.push(bullet);
}

// Reset ship
function resetShip() {
  ship.x = WIDTH / 2;
  ship.y = HEIGHT / 2;
  ship.angle = -Math.PI / 2;
  ship.thrust.x = 0;
  ship.thrust.y = 0;
}

// Update
function update() {
  // Handle input
  if (keys["ArrowLeft"]) {
    ship.angle -= ship.rotationSpeed;
  }
  if (keys["ArrowRight"]) {
    ship.angle += ship.rotationSpeed;
  }
  ship.thrusting = keys["ArrowUp"] || false;

  if (keys["Space"]) {
    // simple rate limit: only shoot when key is first pressed
    if (!keys["_spacePressed"]) {
      shoot();
      keys["_spacePressed"] = true;
    }
  } else {
    keys["_spacePressed"] = false;
  }

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

  // Screen wrap for ship
  if (ship.x < 0 - ship.radius) ship.x = WIDTH + ship.radius;
  if (ship.x > WIDTH + ship.radius) ship.x = 0 - ship.radius;
  if (ship.y < 0 - ship.radius) ship.y = HEIGHT + ship.radius;
  if (ship.y > HEIGHT + ship.radius) ship.y = 0 - ship.radius;

  // Update asteroids
  asteroids.forEach((a) => {
    a.x += a.velX;
    a.y += a.velY;
    a.angle += a.spin;

    // wrap
    if (a.x < 0 - a.radius) a.x = WIDTH + a.radius;
    if (a.x > WIDTH + a.radius) a.x = 0 - a.radius;
    if (a.y < 0 - a.radius) a.y = HEIGHT + a.radius;
    if (a.y > HEIGHT + a.radius) a.y = 0 - a.radius;
  });

  // Update bullets
  bullets.forEach((b) => {
    b.x += b.velX;
    b.y += b.velY;
    b.life--;

    // wrap bullets too
    if (b.x < 0) b.x = WIDTH;
    if (b.x > WIDTH) b.x = 0;
    if (b.y < 0) b.y = HEIGHT;
    if (b.y > HEIGHT) b.y = 0;
  });

  // Remove dead bullets
  bullets = bullets.filter((b) => b.life > 0);

  // Collisions: bullets vs asteroids
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i];
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (distance(a.x, a.y, b.x, b.y) < a.radius) {
        // hit
        bullets.splice(j, 1);
        score += 10;

        // split asteroid
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

  // Collisions: ship vs asteroids
  for (let i = 0; i < asteroids.length; i++) {
    const a = asteroids[i];
    if (distance(a.x, a.y, ship.x, ship.y) < a.radius + ship.radius) {
      lives--;
      resetShip();
      if (lives <= 0) {
        // simple game over: reset everything
        lives = 3;
        score = 0;
        initAsteroids();
      }
      break;
    }
  }

  // If all asteroids destroyed, new wave
  if (asteroids.length === 0) {
    initAsteroids();
  }

  // Update HUD
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
}

// Draw
function drawShip() {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  // ship body
  ctx.strokeStyle = "#4b9fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ship.radius, 0);
  ctx.lineTo(-ship.radius, ship.radius * 0.6);
  ctx.lineTo(-ship.radius, -ship.radius * 0.6);
  ctx.closePath();
  ctx.stroke();

  // thrust flame
  if (ship.thrusting) {
    ctx.strokeStyle = "#ffcc66";
    ctx.beginPath();
    ctx.moveTo(-ship.radius, 0);
    ctx.lineTo(-ship.radius - 10, 0);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAsteroids() {
  asteroids.forEach((a) => {
    ctx.save();
    ctx.translate(a.x, a.y);
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

function drawBullets() {
  ctx.fillStyle = "#ffffff";
  bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBackgroundGlow() {
  const gradient = ctx.createRadialGradient(
    WIDTH / 2,
    HEIGHT / 2,
    0,
    WIDTH / 2,
    HEIGHT / 2,
    WIDTH / 1.2
  );
  gradient.addColorStop(0, "rgba(75, 159, 255, 0.05)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.9)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

// Main loop
function loop() {
  update();

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackgroundGlow();
  drawAsteroids();
  drawBullets();
  drawShip();

  requestAnimationFrame(loop);
}

// Init
resetShip();
initAsteroids();
loop();