// =========================
// SVG ELEMENTS
// =========================
const kaleidoContainer = document.querySelector('.kaleido-container');
const scene = document.querySelector('#scene');

const KALEIDO_COUNT = 6;

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
// KALEIDOSCOPE SETUP
// =========================
//const KALEIDO_COUNT = 6;

//let kaleidoClones = [];

//for (let i = 0; i < KALEIDO_COUNT; i++) {

//  const clone = kaleidoRoot.cloneNode(true);

//  kaleidoContainer.appendChild(clone);

//  kaleidoClones.push({
//    el: clone,
//    angle: (360 / KALEIDO_COUNT) * i
//  });

//}

// hide original (important)
//kaleidoRoot.style.display = "none";

for (let i = 1; i < KALEIDO_COUNT; i++) {

  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");

  use.setAttributeNS(
    "http://www.w3.org/1999/xlink",
    "href",
    "#scene"
  );

  kaleidoContainer.appendChild(use);

}

// =========================
// HEX GRID
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
// HEX STATE
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
    phase: i * (Math.PI / 2),
    sampleX: 250,
    sampleY: 250
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
// PROPAGATION PULSES (NEW)
// =========================
let pulses = [];

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
  // HEX FIELD MOTION
  // =========================
    hexField.setAttribute(
    "transform",
    `rotate(${rotationAccum * 0.05} 250 250)`
    );
  // =========================
  // KALEIDOSCOPE TRANSFORMS
  // =========================
  const allScenes = kaleidoContainer.querySelectorAll('#scene, use');

  allScenes.forEach((el, i) => {

    const angle = (360 / KALEIDO_COUNT) * i;
    const flip = i % 2 === 0 ? 1 : -1;

    el.setAttribute(
        "transform",
        `translate(${flip === -1 ? -500 : 0}, 0) scale(${flip}, 1) rotate(${angle} 250 250)`
    );

});
  //  kaleidoClones.forEach((k) => {

  //  k.el.setAttribute(
  //      "transform",
  //      `rotate(${k.angle} 250 250)`
  //  );

  //  });

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

    // sample points (NOW SAFE)
    p.sampleX = 250 + wobble;
    p.sampleY = 250;

    const speed = p.length / beatDuration;
    const offset = (elapsed * speed + i * 50) % p.length;

    p.el.style.strokeDashoffset = -offset;

    const intensity = Math.abs(interaction);
    p.el.setAttribute("stroke-width", 2 + intensity * 4);
    p.el.style.opacity = 0.6 + intensity * 0.4;

    if (elapsed - lastTrailTime > trailInterval && i === 0) {
      const combined =
        `rotate(${rotation} 250 250) ` + logoTransform;

      trails.push(createTrail(d, combined, p.el.style.stroke));
      lastTrailTime = elapsed;
    }
    // =========================
    // EMIT ENERGY PULSE
    // =========================
    if (Math.random() < 0.07) {
    pulses.push({
        x: p.sampleX,
        y: p.sampleY,
        radius: 0
    });
    }

  });
    // =========================
    // UPDATE PULSES
    // =========================
    pulses.forEach((pulse) => {
    pulse.radius += 3.5;
    });

    // cleanup
    pulses = pulses.filter(p => p.radius < 400);

    
  // =========================
  // HEX REACTIVITY (FIXED)
  // =========================
  hexData.forEach((h, i) => {

      // ✅ ADD THIS LINE RIGHT HERE
      h.el.style.strokeWidth = 0.5;

    let influence = 0;
    let valid = false;
    let collisionCount = 0;

    paths.forEach((p) => {
      if (!isFinite(p.sampleX) || !isFinite(p.sampleY)) return;

      valid = true;

      const dx = h.x - p.sampleX;
      const dy = h.y - p.sampleY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const radius = 260; // wider spread

      let local = Math.max(0, 1 - dist / radius);
      // soften center spike
      local = Math.pow(local, 1.2);

      influence += local;

      // detect strong overlap
        if (local > 0.4) {
        collisionCount++;
        }
    });

    // =========================
    // PROPAGATION INFLUENCE
    // =========================
    pulses.forEach((pulse) => {

    const dx = h.x - pulse.x;
    const dy = h.y - pulse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const waveWidth = 25;
    const diff = Math.abs(dist - pulse.radius);

    if (diff < waveWidth) {
        const waveStrength = 1 - diff / waveWidth;

        influence += waveStrength * 1.8;
    }
    });

    if (!valid || !isFinite(influence)) influence = 0;

    influence = Math.max(0, Math.min(influence, 0.7));

    // =========================
    // COLLISION GLOW
    // =========================
    if (collisionCount > 2) {

    // strength based on how many arcs overlap
    const glowStrength = (collisionCount - 1) * 0.01;

    influence += glowStrength;

    }

// =========================
// ALTERNATING FIELD MOTION
// =========================
    // =========================
    // ROTATING ALTERNATING FIELD
    // =========================

    // convert rotation to radians
    const angle = rotation * Math.PI / 180;

    // center coordinates
    const cx = h.x - 250;
    const cy = h.y - 250;

    // rotate point
    const rx = cx * Math.cos(angle) - cy * Math.sin(angle);
    const ry = cx * Math.sin(angle) + cy * Math.cos(angle);

    // pattern in rotated space
    const pattern = (Math.floor(rx / 60) + Math.floor(ry / 60)) % 2;

    // animated alternation
    const alt = Math.sin(elapsed * 2 + pattern * Math.PI);

    // combine
    const finalInfluence = influence * (0.8 + 0.2 * alt);

    const opacity = h.baseOpacity + finalInfluence * 0.6;

    const safeInfluence = isFinite(finalInfluence) ? finalInfluence : 0;
    const scaleHex = 1 + safeInfluence * 0.35;

    // =========================
    // GLOW VISUAL BOOST
    // =========================
    if (collisionCount > 1) {

    const glow = Math.min(collisionCount / 3, 1);

    // brighter
    h.el.style.opacity = Math.min(1, h.el.style.opacity * (1 + glow));

    // thicker stroke
    h.el.style.strokeWidth = 1 + glow * 2;

    // slight expansion boost
    const extraScale = 1 + glow * 0.3;

    h.el.setAttribute(
        "transform",
        `translate(${h.x}, ${h.y}) scale(${scaleHex * extraScale}) translate(${-h.x}, ${-h.y})`
    );

    }

    h.el.style.opacity = opacity;

    if (isFinite(scaleHex)) {
      h.el.setAttribute(
        "transform",
        `translate(${h.x}, ${h.y}) scale(${scaleHex}) translate(${-h.x}, ${-h.y})`
      );
    }

    const hue = 180 + influence * 120;
    h.el.style.stroke = `hsla(${hue}, 100%, 70%, ${opacity})`;

  });

  // =========================
  // TRAILS
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