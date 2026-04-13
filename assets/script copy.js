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
const BPM = 175;
const beatDuration = 60 / BPM;

// =========================
// PATH SETUP
// =========================
const pathLength = path.getTotalLength();
path.style.strokeDasharray = pathLength * 0.3; // window size

// =========================
// SYSTEM STATE
// =========================
let startTime = null;

// Hats
let rings = [];
let lastHatTime = 0;
const hatInterval = beatDuration / 4;

// Trails
let trails = [];
let lastTrailTime = 0;
const trailInterval = beatDuration / 1.5;

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

function createTrail(currentD, currentTransform) {
  const trailEl = document.createElementNS("http://www.w3.org/2000/svg", "path");

  trailEl.setAttribute("d", currentD);
  trailEl.setAttribute("class", "trail");

  // ✅ Apply SAME transform as main shape at that moment
  trailEl.setAttribute("transform", currentTransform);

  // IMPORTANT: style must be applied AFTER element exists
  trailEl.style.stroke = "magenta";
  trailEl.style.fill = "none";
  trailEl.style.opacity = 0.6;

  trailsGroup.appendChild(trailEl);

  return {
    el: trailEl,
    life: 0
  };
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

  // Pulse
  const beatProgress = (elapsed % beatDuration) / beatDuration;
  const pulse = Math.pow(Math.sin(beatProgress * Math.PI), 2);
  const scale = 1 + pulse * 0.12;

  logo.setAttribute(
    "transform",
    `translate(250,250) scale(${scale}) translate(-250,-250)`
  );

  //const transform = `translate(250,250) scale(${scale}) translate(-250,-250)`;
  // Rotation speed (adjust feel here)
    const rotationSpeed = 360 / (beatDuration * 8); // 8 beats per full rotation

    const rotation = elapsed * rotationSpeed;
    rotator.setAttribute(
        "transform",
        `rotate(${rotation} 250 250)`
    );

    const transform = `
    translate(250,250)
    scale(${scale})
    translate(-250,-250)
    `;

    logo.setAttribute("transform", transform);

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
  // TRAILS (FOOTPRINTS)
  // =========================
  const rotTransform = `rotate(${rotation} 250 250)`;
  const scaleTransform = transform;

  const combinedTransform = rotTransform + " " + scaleTransform;

  trails.push(createTrail(d, combinedTransform));

  if (elapsed - lastTrailTime > trailInterval) {
    trails.push(createTrail(d, transform));
    lastTrailTime = elapsed;
  }

  //trails.forEach((t, i) => {
  for (let i = trails.length - 1; i >= 0; i--) {
  const t = trails[i];
  if (!t.el) return; // safety guard

  t.life += 0.02;

  const fade = 1 - t.life;

  t.el.style.opacity = Math.pow(1 - t.life, 2);
  t.el.style.stroke = `rgb(${255 * fade}, 0, ${255 * fade})`;

  if (fade <= 0) {
    if (t.el.parentNode) {
      trailsGroup.removeChild(t.el);
    }
    trails.splice(i, 1);
  }
};

  // =========================
  // HATS — RINGS
  // =========================
  if (elapsed - lastHatTime > hatInterval) {
    rings.push(createRing());
    lastHatTime = elapsed;
  }

  rings.forEach((ring, i) => {
    ring.life += 0.04;

    const radius = 100 + ring.life * 140;
    const opacity = 1 - ring.life;

    ring.el.setAttribute("r", radius);
    ring.el.style.opacity = opacity;

    if (opacity <= 0) {
      ringsGroup.removeChild(ring.el);
      rings.splice(i, 1);
    }
  });

  requestAnimationFrame(animate);
}

// =========================
// START
// =========================
requestAnimationFrame(animate);