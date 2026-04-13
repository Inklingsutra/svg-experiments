// =========================
// SVG ELEMENTS
// =========================
const path = document.querySelector('.wave');
const rotator = document.querySelector('.rotator');
const logo = document.querySelector('.logo');
const ringsGroup = document.querySelector('.rings');
const trailsGroup = document.querySelector('.trails');

if (!path || !rotator || !logo || !ringsGroup || !trailsGroup) {
  console.error("Missing SVG elements");
  throw new Error("Fix SVG structure");
}

// =========================
// BPM
// =========================
const BPM = 170;
const beatDuration = 60 / BPM;

// =========================
// PATH SETUP
// =========================
const pathLength = path.getTotalLength();
path.style.strokeDasharray = pathLength * 0.3;

// =========================
// STATE
// =========================
let startTime = null;

// Hats
let rings = [];
let lastHatTime = 0;
const hatInterval = beatDuration / 4;

// Trails
let trails = [];
let lastTrailTime = 0;
const trailInterval = beatDuration / 3;

// Rotation accumulator
let rotationAccum = 0;

// =========================
// HELPERS
// =========================
function createRing() {
  const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");

  ring.setAttribute("cx", 250);
  ring.setAttribute("cy", 250);
  ring.setAttribute("r", 100);
  ring.setAttribute("class", "ring-pulse");

  ring.style.strokeWidth = 1 + Math.random() * 1.5;
  ring.style.stroke = `hsl(${180 + Math.random() * 60}, 100%, 60%)`;

  ringsGroup.appendChild(ring);

  return { el: ring, life: 0 };
}

function createTrail(d, transform) {
  const trailEl = document.createElementNS("http://www.w3.org/2000/svg", "path");

  trailEl.setAttribute("d", d);
  trailEl.setAttribute("class", "trail");
  trailEl.setAttribute("transform", transform);

  trailEl.style.stroke = "magenta";
  trailEl.style.fill = "none";
  trailEl.style.opacity = 0.6;

  trailsGroup.appendChild(trailEl);

  return { el: trailEl, life: 0 };
}

// =========================
// MAIN LOOP
// =========================
function animate(timestamp) {
  if (!startTime) startTime = timestamp;

  const elapsed = (timestamp - startTime) / 1000;

  // =========================
  // KICK — CONTINUOUS FLOW
  // =========================
  const speed = pathLength / beatDuration;
  const offset = (elapsed * speed) % pathLength;
  path.style.strokeDashoffset = -offset;

  const beatProgress = (elapsed % beatDuration) / beatDuration;
  const pulse = Math.pow(Math.sin(beatProgress * Math.PI), 2);
  const scale = 1 + pulse * 0.12;

  // =========================
  // ANGULAR VELOCITY VARIATION
  // =========================
  const baseSpeed = 360 / (beatDuration * 16);

  const mod =
    Math.sin(elapsed * 2) * 0.3 +
    Math.sin(elapsed * 5) * 0.1;

  const rotationSpeed = baseSpeed * (1 + mod);

  rotationAccum += rotationSpeed * (1 / 60); // frame step approx
  const rotation = rotationAccum;

  rotator.setAttribute(
    "transform",
    `rotate(${rotation} 250 250)`
  );

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
  // BASS — WOBBLE
  // =========================
  const bassDuration = beatDuration / 2;
  const bassProgress = (elapsed % bassDuration) / bassDuration;

  const wobble = Math.sin(bassProgress * Math.PI * 2) * 15;

  const d = `M150 250 
             Q${250 + wobble} 150 350 250 
             Q${250 - wobble} 350 150 250`;

  path.setAttribute("d", d);

  // =========================
  // TRAILS
  // =========================
  if (elapsed - lastTrailTime > trailInterval) {
    const combinedTransform =
      `rotate(${rotation} 250 250) ` + logoTransform;

    trails.push(createTrail(d, combinedTransform));
    lastTrailTime = elapsed;
  }

  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    if (!t.el) continue;

    t.life += 0.02;

    const fade = 1 - t.life;

    t.el.style.opacity = Math.pow(fade, 2);
    t.el.style.stroke = `hsl(${300 - t.life * 200}, 100%, 60%)`;

    if (fade <= 0) {
      if (t.el.parentNode) {
        trailsGroup.removeChild(t.el);
      }
      trails.splice(i, 1);
    }
  }

  // =========================
  // HATS — RINGS
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
      if (r.el.parentNode) {
        ringsGroup.removeChild(r.el);
      }
      rings.splice(i, 1);
    }
  }

  requestAnimationFrame(animate);
}

// =========================
// START
// =========================
requestAnimationFrame(animate);