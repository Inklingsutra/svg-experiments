// =========================
// SVG ELEMENTS
// =========================
const rotator = document.querySelector('.rotator');
const logo = document.querySelector('.logo');
const wavesGroup = document.querySelector('.waves');
const ringsGroup = document.querySelector('.rings');
const trailsGroup = document.querySelector('.trails');
const hexField = document.querySelector('.hex-field');

if (!rotator || !logo || !wavesGroup || !ringsGroup || !trailsGroup || !hexField) {
  console.error("Missing SVG elements");
  throw new Error("Fix SVG structure");
}

// =========================
// HEX GRID (NEW - SAFE)
// =========================
function createHex(x, y, size) {
  const hex = document.createElementNS("http://www.w3.org/2000/svg", "polygon");

  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    points.push(`${px},${py}`);
  }

  hex.setAttribute("points", points.join(" "));
  hex.style.stroke = "rgba(255, 255, 255, 0.19)";
  hex.style.fill = "none";

  return hex;
}

// Build grid once
const HEX_SIZE = 18;
let hexes = [];

for (let y = 0; y < 500; y += HEX_SIZE * 1.8) {
  for (let x = 0; x < 500; x += HEX_SIZE * 1.8) {

    const offset = (Math.floor(y / (HEX_SIZE * 1.7)) % 2) * (HEX_SIZE * 0.73);

    const hex = createHex(x + offset, y, HEX_SIZE);
    hexField.appendChild(hex);

    hexes.push(hex);
  }
}

// =========================
// HEX STATE (NEW)
// =========================
let hexData = hexes.map((hex) => {
  const bbox = hex.getBBox();
  return {
    el: hex,
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
    baseOpacity: 0.19
  };
});

// =========================
// BPM
// =========================
const BPM = 175;
const beatDuration = 60 / BPM;

// =========================
// INTERACTION
// =========================
const INTERACTION_STRENGTH = 0.25;

// =========================
// MULTI PATH SYSTEM
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
    phase: i * (Math.PI / 2)
  });
}

// =========================
// STATE
// =========================
let startTime = null;
let rotationAccum = 0;

let trails = [];
let lastTrailTime = 0;
const trailInterval = beatDuration / 3;

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
  // HEX FIELD (SUBTLE MOTION)
  // =========================
  hexField.setAttribute(
    "transform",
    `rotate(${rotationAccum * 0.05} 250 250)`
  );



  // =========================
  // ROTATION
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
  // SCALE + SPIRAL
  // =========================
  const beatProgress = (elapsed % beatDuration) / beatDuration;
  const pulse = Math.pow(Math.sin(beatProgress * Math.PI), 2);
  const scale = 1 + pulse * 0.12;

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
  // PATHS + INTERACTION
  // =========================
  paths.forEach((p, i) => {

    const bassDuration = beatDuration / 2;
    const bassProgress = (elapsed % bassDuration) / bassDuration;

    let wobble =
      Math.sin(bassProgress * Math.PI * 2 + p.phase) * 15;

    let interaction = 0;

    paths.forEach((other, j) => {
      if (i === j) return;
      const phaseDiff = Math.abs(p.phase - other.phase);
      interaction += Math.sin(phaseDiff + elapsed * 2);
    });

    interaction *= INTERACTION_STRENGTH;
    wobble += interaction * 10;

    const d = `M150 250 
      Q${250 + wobble} 150 350 250 
      Q${250 - wobble} 350 150 250`;

    p.el.setAttribute("d", d);
    // =========================
    // ARC SAMPLE POINT (NEW)
    // =========================
    p.sampleX = 250 + wobble;
    p.sampleY = 250;

    const speed = p.length / beatDuration;
    const offset = (elapsed * speed + i * 50) % p.length;

    p.el.style.strokeDashoffset = -offset;

    const intensity = Math.abs(interaction);
    p.el.setAttribute("stroke-width", 2 + intensity * 4);
    p.el.style.opacity = 0.6 + intensity * 0.4;

    // Trails (primary path only)
    if (elapsed - lastTrailTime > trailInterval && i === 0) {
      const combined =
        `rotate(${rotation} 250 250) ` + logoTransform;

      trails.push(createTrail(d, combined, p.el.style.stroke));
      lastTrailTime = elapsed;
    }

  });

  // =========================
// HEX REACTIVITY (ARC-DRIVEN)
// =========================
hexData.forEach((h, i) => {

  let influence = 0;
  let valid = false;

  // check against all arcs
  paths.forEach((p) => {

    const dx = h.x - p.sampleX;
    const dy = h.y - p.sampleY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const radius = 140;

    let local = Math.max(0, 1 - dist / radius);

    // sharpen falloff
    local = Math.pow(local, 2);

    influence += local;
  });

  // normalize
  influence = Math.min(influence, 1);

  // motion modulation
  influence *= 0.6 + 0.4 * Math.sin(elapsed * 4 + i * 0.1);

  // visuals
  const opacity = h.baseOpacity + influence * 0.8;
  const scale = 1 + influence * 0.5;

  h.el.style.opacity = opacity;

  h.el.setAttribute(
    "transform",
    `translate(${h.x}, ${h.y}) scale(${scale}) translate(${-h.x}, ${-h.y})`
  );

  const hue = 180 + influence * 140;
  h.el.style.stroke = `hsla(${hue}, 100%, 70%, ${opacity})`;

});

  // =========================
  // TRAILS UPDATE
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
  // RINGS
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