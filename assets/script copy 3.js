// =========================
// SVG ELEMENTS
// =========================
const rotator = document.querySelector('.rotator');
const logo = document.querySelector('.logo');
const wavesGroup = document.querySelector('.waves');
const ringsGroup = document.querySelector('.rings');
const trailsGroup = document.querySelector('.trails');

if (!rotator || !logo || !wavesGroup || !ringsGroup || !trailsGroup) {
  console.error("Missing SVG elements");
  throw new Error("Fix SVG structure");
}

// =========================
// BPM
// =========================
const BPM = 170;
const beatDuration = 60 / BPM;

// =========================
// CREATE MULTI PATHS
// =========================
const NUM_PATHS = 4;
let paths = [];

for (let i = 0; i < NUM_PATHS; i++) {
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");

  p.setAttribute("fill", "none");
  p.setAttribute("stroke-width", 3);
  p.style.stroke = `hsl(${300 + i * 20}, 100%, 60%)`;

  wavesGroup.appendChild(p);

  const length = 400;
  p.style.strokeDasharray = length * 0.3;

  paths.push({
    el: p,
    length,
    phase: i * (Math.PI / 2) // phase offset
  });
}

// =========================
// STATE
// =========================
let startTime = null;
let rotationAccum = 0;

// Trails
let trails = [];
let lastTrailTime = 0;
const trailInterval = beatDuration / 3;

// Rings
let rings = [];
let lastHatTime = 0;
const hatInterval = beatDuration / 4;

// =========================
// HELPERS
// =========================
function createRing() {
  const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");

  ring.setAttribute("cx", 250);
  ring.setAttribute("cy", 250);
  ring.setAttribute("r", 100);

  ring.style.stroke = `hsl(${180 + Math.random() * 60}, 100%, 60%)`;
  ring.style.fill = "none";

  ringsGroup.appendChild(ring);

  return { el: ring, life: 0 };
}

function createTrail(d, transform, color) {
  const t = document.createElementNS("http://www.w3.org/2000/svg", "path");

  t.setAttribute("d", d);
  t.setAttribute("transform", transform);

  t.style.stroke = color;
  t.style.fill = "none";
  t.style.opacity = 0.5;

  trailsGroup.appendChild(t);

  return { el: t, life: 0 };
}

// =========================
// MAIN LOOP
// =========================
function animate(timestamp) {
  if (!startTime) startTime = timestamp;

  const elapsed = (timestamp - startTime) / 1000;

  // =========================
  // ROTATION (MODULATED)
  // =========================
  const baseSpeed = 360 / (beatDuration * 16);
  const mod = Math.sin(elapsed * 2) * 0.3;

  const rotationSpeed = baseSpeed * (1 + mod);
  rotationAccum += rotationSpeed * (1 / 60);

  const rotation = rotationAccum;

  rotator.setAttribute(
    "transform",
    `rotate(${rotation} 250 250)`
  );

  // =========================
  // SCALE (KICK)
  // =========================
  const beatProgress = (elapsed % beatDuration) / beatDuration;
  const pulse = Math.pow(Math.sin(beatProgress * Math.PI), 2);
  const scale = 1 + pulse * 0.12;

  // =========================
  // SPIRAL DRIFT
  // =========================
  const spiral = Math.sin(elapsed * 0.8) * 20;

  const driftX = Math.cos(rotation * Math.PI / 180) * spiral;
  const driftY = Math.sin(rotation * Math.PI / 180) * spiral;

  const logoTransform = `
    translate(${250 + driftX}, ${250 + driftY})
    scale(${scale})
    translate(-250,-250)
  `;

  logo.setAttribute("transform", logoTransform);

  // =========================
  // MULTI PATH UPDATE
  // =========================
  paths.forEach((p, i) => {
    const bassDuration = beatDuration / 2;
    const bassProgress = (elapsed % bassDuration) / bassDuration;

    const wobble =
      Math.sin(bassProgress * Math.PI * 2 + p.phase) * 15;

    const d = `M150 250 
      Q${250 + wobble} 150 350 250 
      Q${250 - wobble} 350 150 250`;

    p.el.setAttribute("d", d);

    // continuous flow
    const speed = p.length / beatDuration;
    const offset = (elapsed * speed + i * 50) % p.length;

    p.el.style.strokeDashoffset = -offset;

    // TRAILS
    if (elapsed - lastTrailTime > trailInterval && i === 0) {
      const combined =
        `rotate(${rotation} 250 250) ` + logoTransform;

      trails.push(createTrail(d, combined, p.el.style.stroke));
      lastTrailTime = elapsed;
    }
  });

  // =========================
  // TRAIL UPDATE
  // =========================
  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];

    t.life += 0.02;

    const fade = 1 - t.life;

    t.el.style.opacity = Math.pow(fade, 2);

    if (fade <= 0) {
      trailsGroup.removeChild(t.el);
      trails.splice(i, 1);
    }
  }

  // =========================
  // RINGS (HATS)
  // =========================
  if (elapsed - lastHatTime > hatInterval) {
    rings.push(createRing());
    lastHatTime = elapsed;
  }

  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];

    r.life += 0.04;

    const radius = 100 + r.life * 140;
    const opacity = 1 - r.life;

    r.el.setAttribute("r", radius);
    r.el.style.opacity = opacity;

    if (opacity <= 0) {
      ringsGroup.removeChild(r.el);
      rings.splice(i, 1);
    }
  }

  requestAnimationFrame(animate);
}

// =========================
// START
// =========================
requestAnimationFrame(animate);