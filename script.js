// =========================
// SVG ELEMENTS
// =========================
const kaleidoContainer = document.querySelector('.kaleido-container');
const scene = document.querySelector('#scene');

const KALEIDO_COUNT = 6; // number of kaleidoscope segments (including original)

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

  use.setAttribute("href", "#scene");

 // use.setAttributeNS(
 //   "http://www.w3.org/1999/xlink",
 //   "href",
 //   "#scene"
 // );

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
let BPM = 175;
let beatDuration = 60 / BPM;

// =========================
// INTERACTION
// =========================
const INTERACTION_STRENGTH = 0.25;
const BASE_IDLE_SPEED = 14; // slow meditative drift when no music is playing
const ROTATION_SMOOTHING = 0.24;
const AUDIO_SMOOTHING = 0.14;
const PATH_WOBBLE_SMOOTHING = 0.13;

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
    sampleY: 250,
    smoothedWobble: 1
  });
}

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
// AUDIO INPUT
// =========================
let audioCtx = null;
let audioSource = null;
let analyser = null;
let analyserData = null;
let audioElement = null;
let fileInputElement = null;

let subLevel = 0;
let lowLevel = 0;
let lowmidLevel = 0;
let midLevel = 0;
let highLevel = 0;
let airLevel = 0;

const FREQUENCY_BANDS = {
  sub: [20, 60],
  low: [60, 150],
  lowmid: [150, 400],
  mid: [400, 2000],
  high: [2000, 8000],
  air: [8000, 16000]
};

let pulses = [];
let debugPanel = null;

let HEX_INTENSITY = 1;
let TRAIL_INTENSITY = 1;
let RING_INTENSITY = 1;
let PATH_INTENSITY = 1;
let smoothedRotationSpeed = 0;
let lastTimestamp = null;

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function createDebugPanel() {
  if (debugPanel) return;

  debugPanel = document.createElement('div');
  debugPanel.id = 'debugPanel';
  debugPanel.innerHTML = `
    <div class="debug-title">Audio Debug</div>
    <div class="debug-row">sub: <span id="debug-sub">0</span></div>
    <div class="debug-row">low: <span id="debug-low">0</span></div>
    <div class="debug-row">lowmid: <span id="debug-lowmid">0</span></div>
    <div class="debug-row">mid: <span id="debug-mid">0</span></div>
    <div class="debug-row">high: <span id="debug-high">0</span></div>
    <div class="debug-row">air: <span id="debug-air">0</span></div>
    <div class="debug-section">Spectrum</div>
    <div class="debug-bars" id="debug-bars"></div>
    <button id="debug-play" type="button">Play</button>
    <div class="debug-section">Controls</div>
    <label class="debug-slider-row">BPM <span id="debug-bpm-val">175</span></label>
    <input id="debug-bpm" type="range" min="40" max="240" step="1" value="175">
    <label class="debug-slider-row">hex intensity <span id="debug-hex-val">1.00</span></label>
    <input id="debug-hex" type="range" min="0" max="2" step="0.01" value="1">
    <label class="debug-slider-row">trail intensity <span id="debug-trail-val">1.00</span></label>
    <input id="debug-trail" type="range" min="0" max="2" step="0.01" value="1">
    <label class="debug-slider-row">ring intensity <span id="debug-ring-val">1.00</span></label>
    <input id="debug-ring" type="range" min="0" max="2" step="0.01" value="1">
    <label class="debug-slider-row">path intensity <span id="debug-path-val">1.00</span></label>
    <input id="debug-path" type="range" min="0" max="2" step="0.01" value="1">
  `;
  document.body.appendChild(debugPanel);

  const hexSlider = debugPanel.querySelector('#debug-hex');
  const trailSlider = debugPanel.querySelector('#debug-trail');
  const ringSlider = debugPanel.querySelector('#debug-ring');
  const pathSlider = debugPanel.querySelector('#debug-path');

  const hexVal = debugPanel.querySelector('#debug-hex-val');
  const trailVal = debugPanel.querySelector('#debug-trail-val');
  const ringVal = debugPanel.querySelector('#debug-ring-val');
  const pathVal = debugPanel.querySelector('#debug-path-val');

  const bindSlider = (slider, valueEl, setter) => {
    slider.addEventListener('input', (event) => {
      const value = Number(event.target.value);
      setter(value);
      valueEl.textContent = value.toFixed(2);
    });
  };

  bindSlider(hexSlider, hexVal, (value) => { HEX_INTENSITY = value; });
  bindSlider(trailSlider, trailVal, (value) => { TRAIL_INTENSITY = value; });
  bindSlider(ringSlider, ringVal, (value) => { RING_INTENSITY = value; });
  bindSlider(pathSlider, pathVal, (value) => { PATH_INTENSITY = value; });

  const bpmInput = debugPanel.querySelector('#debug-bpm');
  const bpmLabel = debugPanel.querySelector('#debug-bpm-val');
  if (bpmInput && bpmLabel) {
    bpmInput.addEventListener('input', (event) => {
      const value = Number(event.target.value);
      if (!Number.isFinite(value) || value < 40) return;
      BPM = value;
      beatDuration = 60 / BPM;
      bpmLabel.textContent = BPM.toFixed(0);
    });
  }

  const playButton = debugPanel.querySelector('#debug-play');
  if (playButton) {
    playButton.disabled = true;
    playButton.addEventListener('click', () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      if (audioElement && audioElement.src && audioElement.paused) {
        audioElement.play().catch(() => {});
      }
    });
  }

  const barsContainer = debugPanel.querySelector('#debug-bars');
  if (barsContainer) {
    for (let i = 0; i < 8; i += 1) {
      const bar = document.createElement('div');
      bar.className = 'debug-bar';
      barsContainer.appendChild(bar);
    }
  }
}

function createKickDot() {
  if (document.getElementById('debug-kick')) return;

  const kickDot = document.createElement('div');
  kickDot.id = 'debug-kick';
  document.body.appendChild(kickDot);
}

function updateKickDot() {
  const kickDot = document.getElementById('debug-kick');
  if (!kickDot) return;

  const scale = 1 + subLevel * 1.5;
  kickDot.style.transform = `scale(${scale})`;
  kickDot.style.opacity = Math.min(1, 0.3 + subLevel * 1.2);
}

function updateBarGraph() {
  const barsContainer = debugPanel?.querySelector('#debug-bars');
  if (!barsContainer || !analyserData) return;

  const bars = Array.from(barsContainer.querySelectorAll('.debug-bar'));
  if (!bars.length) return;

  const step = Math.max(1, Math.floor(analyserData.length / bars.length));
  bars.forEach((bar, index) => {
    const start = index * step;
    let sum = 0;
    let count = 0;

    for (let j = start; j < Math.min(start + step, analyserData.length); j += 1) {
      sum += analyserData[j];
      count += 1;
    }

    const value = count > 0 ? sum / count / 255 : 0;
    bar.style.width = `${Math.max(4, value * 100)}%`;
    bar.style.opacity = `${0.2 + value * 0.8}`;
  });
}

function updateDebugPanel() {
  if (!debugPanel) return;

  debugPanel.querySelector('#debug-sub').textContent = subLevel.toFixed(3);
  debugPanel.querySelector('#debug-low').textContent = lowLevel.toFixed(3);
  debugPanel.querySelector('#debug-lowmid').textContent = lowmidLevel.toFixed(3);
  debugPanel.querySelector('#debug-mid').textContent = midLevel.toFixed(3);
  debugPanel.querySelector('#debug-high').textContent = highLevel.toFixed(3);
  debugPanel.querySelector('#debug-air').textContent = airLevel.toFixed(3);
  updateBarGraph();
  updateKickDot();
}

function createAudioElements() {
  if (!audioElement) {
    audioElement = document.createElement('audio');
    audioElement.style.display = 'none';
    document.body.appendChild(audioElement);
  }

  if (!fileInputElement) {
    fileInputElement = document.getElementById('audioUpload');
  }

  if (!fileInputElement) {
    fileInputElement = document.createElement('input');
    fileInputElement.type = 'file';
    fileInputElement.accept = 'audio/*';
    fileInputElement.id = 'audioUpload';
    fileInputElement.style.position = 'fixed';
    fileInputElement.style.top = '16px';
    fileInputElement.style.right = '16px';
    fileInputElement.style.zIndex = '9999';
    fileInputElement.style.background = 'rgba(0,0,0,0.65)';
    fileInputElement.style.color = '#fff';
    fileInputElement.style.padding = '10px 12px';
    fileInputElement.style.borderRadius = '999px';
    fileInputElement.style.border = '1px solid rgba(255,255,255,0.18)';
    fileInputElement.style.backdropFilter = 'blur(10px)';
    document.body.appendChild(fileInputElement);
  }

  createDebugPanel();
}

function setupAudioContext() {
  if (audioCtx || !audioElement) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.85;
  analyserData = new Uint8Array(analyser.frequencyBinCount);
  audioSource = audioCtx.createMediaElementSource(audioElement);
  audioSource.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function computeFrequencyData() {
  if (!analyser || !analyserData) return;
  analyser.getByteFrequencyData(analyserData);
}

function computeBandLevel(minFreq, maxFreq) {
  if (!audioCtx || !analyserData) return 0;
  const nyquist = audioCtx.sampleRate / 2;
  const lowIndex = Math.max(0, Math.floor((minFreq / nyquist) * analyserData.length));
  const highIndex = Math.min(analyserData.length - 1, Math.ceil((maxFreq / nyquist) * analyserData.length));
  let sum = 0;
  let count = 0;
  for (let i = lowIndex; i <= highIndex; i++) {
    sum += analyserData[i];
    count += 1;
  }
  return count > 0 ? sum / count / 255 : 0;
}

function updateAudioLevels() {
  let targetSub = 0;
  let targetLow = 0;
  let targetLowmid = 0;
  let targetMid = 0;
  let targetHigh = 0;
  let targetAir = 0;

  if (audioElement && audioElement.src && analyser) {
    targetSub = computeBandLevel(...FREQUENCY_BANDS.sub);
    targetLow = computeBandLevel(...FREQUENCY_BANDS.low);
    targetLowmid = computeBandLevel(...FREQUENCY_BANDS.lowmid);
    targetMid = computeBandLevel(...FREQUENCY_BANDS.mid);
    targetHigh = computeBandLevel(...FREQUENCY_BANDS.high);
    targetAir = computeBandLevel(...FREQUENCY_BANDS.air);
  }

  subLevel = lerp(subLevel, targetSub, AUDIO_SMOOTHING);
  lowLevel = lerp(lowLevel, targetLow, AUDIO_SMOOTHING);
  lowmidLevel = lerp(lowmidLevel, targetLowmid, AUDIO_SMOOTHING);
  midLevel = lerp(midLevel, targetMid, AUDIO_SMOOTHING);
  highLevel = lerp(highLevel, targetHigh, AUDIO_SMOOTHING);
  airLevel = lerp(airLevel, targetAir, AUDIO_SMOOTHING);
}

function initAudioInput() {
  createAudioElements();
  if (!fileInputElement) return;

  fileInputElement.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    audioElement.src = url;
    audioElement.load();
    setupAudioContext();
    const playButton = debugPanel?.querySelector('#debug-play');
    if (playButton) {
      playButton.disabled = false;
    }
  });
}

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
  computeFrequencyData();
  updateAudioLevels();
  updateDebugPanel();

  if (!startTime) startTime = timestamp;
  const dt = lastTimestamp ? Math.min((timestamp - lastTimestamp) / 1000, 0.033) : 0.016;
  lastTimestamp = timestamp;
  const elapsed = (timestamp - startTime) / 1000;

    // =========================
    // LOGO TRANSFORMS
    // =========================

    //const logoSymbol = document.querySelector('.logo-symbol');

    //const breathe = 1 + Math.sin(elapsed * 2) * 0.03;

    //logoSymbol.setAttribute(
    //"transform",
    //`translate(250,250) scale(${breathe}) translate(-250,-250)`
    //);
  
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
  const audioMomentum = lowLevel * 170;
  const kickBoost = subLevel * 90;
  const targetRotationSpeed = BASE_IDLE_SPEED + audioMomentum + kickBoost;
  smoothedRotationSpeed = lerp(smoothedRotationSpeed, targetRotationSpeed, ROTATION_SMOOTHING);

  const shimmer = 1 + highLevel * 0.16;
  rotationAccum += smoothedRotationSpeed * dt * shimmer;

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
  const scale = 1 + pulse * 0.13;

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
    const angle = rotation * Math.PI / 170;

    const bassPulse = Math.sin(bassProgress * Math.PI * 2 + p.phase) * 15 * (1 + lowLevel * 0.6);
    const shimmerPulse = Math.sin(elapsed * 12 + p.phase) * highLevel * 7;
    const targetWobble = Math.sin(elapsed + p.phase) * (1 + midLevel * 2 * PATH_INTENSITY) + bassPulse + shimmerPulse;

    p.smoothedWobble = lerp(p.smoothedWobble, targetWobble, PATH_WOBBLE_SMOOTHING);
    let wobble = p.smoothedWobble;

    // add directional bias (THIS is key)
    const offsetX = Math.cos(angle + p.phase) * 20;
    const offsetY = Math.sin(angle + p.phase) * 20;

    let interaction = 0;

    paths.forEach((other, j) => {
      if (i === j) return;
      const phaseDiff = Math.abs(p.phase - other.phase);
      interaction += Math.sin(phaseDiff + elapsed * 2);
    });

    interaction *= INTERACTION_STRENGTH;
    wobble += interaction * 10;
    wobble *= PATH_INTENSITY;

   // const d = `M150 250 
   //   Q${250 + wobble} 150 350 250 
   //   Q${250 - wobble} 350 150 250`;
    const d = `M${150 + offsetX} ${250 + offsetY}
    Q${250 + wobble} ${150 + offsetY} ${350 + offsetX} ${250 + offsetY}
    Q${250 - wobble} ${350 + offsetY} ${150 + offsetX} ${250 + offsetY}`;

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
      const combined = logoTransform;
        //`rotate(${rotation} 250 250) ` + logoTransform;

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
    let angle = rotation * Math.PI / 180;
    angle += (BASE_IDLE_SPEED + lowLevel * 0.05) * Math.PI / 180;

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
    const finalInfluence = influence * (0.8 + 0.2 * alt) * HEX_INTENSITY;

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
    const trailAlpha = (0.2 + highLevel * 0.6) * TRAIL_INTENSITY;

    t.el.style.opacity = Math.pow(fade, 2) * trailAlpha;

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

    let radius = 100 + r.life * 140;
    radius += subLevel * 20 * RING_INTENSITY;
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

function startAudioSystem() {
  initAudioInput();
}

window.addEventListener('click', () => {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
});

// =========================
// START
// =========================
startAudioSystem();
requestAnimationFrame(animate);