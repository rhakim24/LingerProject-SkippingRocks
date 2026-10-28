// ============================================================
// CODEPEN JS PANEL
// How everything behaves: throwing, skipping, ripples, sound.
// ============================================================
 
// ============================================================
// SETTINGS (safe to play with these)
// ============================================================
const FOG_DENSITY  = 0.15;   // higher = thicker fog, skips disappear sooner
const MIN_SKIPS    = 1;      // fewest skips a throw can have
const MAX_SKIPS    = 6;      // most skips a throw can have
const FIRST_HOP    = 3.6;    // how far the first hop goes
const HOP_SHRINK   = 0.8;    // each hop is this much of the last one
const WAIT_TO_COME_BACK = 1500; // ms before a new stone appears on shore
 
// ============================================================
// YOUR OWN SOUNDS (optional)
// Paste a link to an .mp3 or .wav between the quotes to use your
// own sound. Leave it as '' to use the built-in sound made in code.
// Far skips still get quieter and muffled with your sound too.
// ============================================================
const SPLASH_SOUND_URL = 'https://raw.githubusercontent.com/rhakim24/LingerProject-SkippingRocks/main/splash.mp3';   // plays on every skip
const SINK_SOUND_URL   = 'https://raw.githubusercontent.com/rhakim24/LingerProject-SkippingRocks/main/sinkingsplash.mp3';   // plays when the stone sinks
const WATER_SOUND_URL  = 'https://raw.githubusercontent.com/rhakim24/LingerProject-SkippingRocks/main/lakenoises.mp3';   // background water, loops forever
 
// ============================================================
// SOUND SETUP
// ============================================================
let audio = null;
let noiseBuffer = null;
let splashFile = null;   // filled in if you gave a SPLASH_SOUND_URL
let sinkFile = null;     // filled in if you gave a SINK_SOUND_URL
 
// Browsers only allow sound after the person clicks something,
// so this runs on the first throw.
function startAudio() {
  if (audio) {
    if (audio.state === 'suspended') audio.resume();
    return;
  }
  audio = new (window.AudioContext || window.webkitAudioContext)();
 
  // Two seconds of random static. The built-in splash and water use this.
  noiseBuffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
 
  // load any sound files you linked above
  if (SPLASH_SOUND_URL) loadSound(SPLASH_SOUND_URL).then(b => splashFile = b);
  if (SINK_SOUND_URL)   loadSound(SINK_SOUND_URL).then(b => sinkFile = b);
 
  if (WATER_SOUND_URL) {
    loadSound(WATER_SOUND_URL).then(b => {
      if (!b) return startWaterAmbience();
      const src = audio.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const g = audio.createGain();
      g.gain.value = 0.05;   // background water volume
      src.connect(g).connect(audio.destination);
      src.start();
    });
  } else {
    startWaterAmbience();
  }
}
 
// Downloads a sound file and gets it ready to play
async function loadSound(url) {
  try {
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    return await audio.decodeAudioData(bytes);
  } catch (err) {
    console.warn('Could not load sound, using the built-in one instead:', url, err);
    return null;
  }
}
 
// Plays one of your sound files, quieter and muffled when far away
function playFile(buffer, distance, baseVolume) {
  const far = Math.min(distance / 15, 1);   // 0 = close, 1 = very far
  const src = audio.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = 0.9 + Math.random() * 0.2;  // small pitch change so repeats don't sound identical
 
  const muffle = audio.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.value = 8000 - far * 7200;
 
  const g = audio.createGain();
  g.gain.value = baseVolume * (1 - far * 0.85);
 
  src.connect(muffle).connect(g).connect(audio.destination);
  src.start();
}
 
// BUILT-IN background water: low static that slowly swells like lapping waves
function startWaterAmbience() {
  const src = audio.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
 
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 350;
 
  const gain = audio.createGain();
  gain.gain.value = 0.05;
 
  // a very slow wobble on the volume
  const lfo = audio.createOscillator();
  lfo.frequency.value = 0.15;
  const lfoAmount = audio.createGain();
  lfoAmount.gain.value = 0.03;
  lfo.connect(lfoAmount).connect(gain.gain);
 
  src.connect(filter).connect(gain).connect(audio.destination);
  src.start();
  lfo.start();
}
 
// SKIP SOUND. Uses your file if you gave one, otherwise the built-in splash.
function splash(distance) {
  if (splashFile) return playFile(splashFile, distance, 0.9);
 
  const now = audio.currentTime;
  const far = Math.min(distance / 15, 1);
  const volume = 0.9 * (1 - far * 0.85);
 
  // the "spl" part: a short burst of static, filtered to sound watery
  const src = audio.createBufferSource();
  src.buffer = noiseBuffer;
 
  const band = audio.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1400 + Math.random() * 600;
  band.Q.value = 1.2;
 
  const muffle = audio.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.value = 5000 - far * 4200;
 
  const g = audio.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
 
  src.connect(band).connect(muffle).connect(g).connect(audio.destination);
  src.start(now, Math.random() * 1.5, 0.35);
 
  // the "plip" part: a tiny tone that drops in pitch
  const osc = audio.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(900 + Math.random() * 300, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
 
  const og = audio.createGain();
  og.gain.setValueAtTime(0.0001, now);
  og.gain.exponentialRampToValueAtTime(volume * 0.4 * (1 - far * 0.7), now + 0.005);
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
 
  osc.connect(og).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}
 
// SINK SOUND. Uses your file if you gave one, otherwise the built-in bloop.
function plunk(distance) {
  if (sinkFile) return playFile(sinkFile, distance, 0.7);
 
  const now = audio.currentTime;
  const far = Math.min(distance / 15, 1);
  const volume = 0.6 * (1 - far * 0.85);
 
  const osc = audio.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(260, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);
 
  const g = audio.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
 
  osc.connect(g).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}
 
// ============================================================
// RIPPLES (a white ring that grows and fades where the stone lands)
// ============================================================
function makeRipple(pos, size) {
  const scene = document.querySelector('a-scene');
  const ring = document.createElement('a-ring');
  ring.setAttribute('position', `${pos.x} 0.02 ${pos.z}`);
  ring.setAttribute('rotation', '-90 0 0');
  ring.setAttribute('radius-inner', 0.18);
  ring.setAttribute('radius-outer', 0.22);
  ring.setAttribute('material', 'shader: flat; color: #ffffff; transparent: true; opacity: 0.7; side: double');
  const s = 4 * size;
  ring.setAttribute('animation__grow', {
    property: 'scale', from: '0.3 0.3 0.3', to: `${s} ${s} ${s}`, dur: 2200, easing: 'easeOutQuad'
  });
  ring.setAttribute('animation__fade', {
    property: 'material.opacity', from: 0.7, to: 0, dur: 2200, easing: 'easeOutQuad'
  });
  scene.appendChild(ring);
  setTimeout(() => ring.remove(), 2300);
}
 
// a little "overshoot" curve so the new stone pops up gently
function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
 
// ============================================================
// THE STONE
// phases: idle -> flying -> sinking -> waiting -> returning -> idle
// ============================================================
AFRAME.registerComponent('skip-stone', {
  init: function () {
    this.home = this.el.object3D.position.clone();
    this.camPos = new THREE.Vector3(0, 1.4, 0);
    this.phase = 'idle';
    this.hops = [];
    this.t = 0;
 
    this.el.addEventListener('click', () => this.throwStone());
 
    // hover: cursor changes and the stone gets a little bigger
    this.el.addEventListener('mouseenter', () => {
      if (this.phase !== 'idle') return;
      document.body.style.cursor = 'pointer';
      this.el.object3D.scale.set(1.15, 1.15, 1.15);
    });
    this.el.addEventListener('mouseleave', () => {
      document.body.style.cursor = 'default';
      if (this.phase === 'idle') this.el.object3D.scale.set(1, 1, 1);
    });
  },
 
  throwStone: function () {
    if (this.phase !== 'idle') return;
    startAudio();
    document.body.style.cursor = 'default';
    this.el.object3D.scale.set(1, 1, 1);
 
    // pick how many skips this throw gets
    const skips = MIN_SKIPS + Math.floor(Math.random() * (MAX_SKIPS - MIN_SKIPS + 1));
 
    // plan every hop ahead of time: skips + 1 landings (the last one sinks)
    this.hops = [];
    let start = this.home.clone();
    let length = FIRST_HOP + Math.random() * 0.6;
    let height = 0.9;
    for (let i = 0; i < skips + 1; i++) {
      const end = new THREE.Vector3(
        start.x + (Math.random() - 0.5) * 0.6,  // drift a little left or right
        0,
        start.z - length                          // farther out into the fog
      );
      this.hops.push({ from: start, to: end, height: height, dur: 250 + length * 140 });
      start = end;
      length *= HOP_SHRINK + Math.random() * 0.06;
      height *= 0.65;
    }
 
    this.hopIndex = 0;
    this.t = 0;
    this.phase = 'flying';
  },
 
  tick: function (time, dt) {
    if (this.phase === 'idle') return;
    dt = Math.min(dt, 50);
    this.t += dt;
    const obj = this.el.object3D;
 
    if (this.phase === 'flying') {
      const hop = this.hops[this.hopIndex];
      const p = Math.min(this.t / hop.dur, 1);
 
      // move along the hop in a little arc
      obj.position.lerpVectors(hop.from, hop.to, p);
      obj.position.y = THREE.MathUtils.lerp(hop.from.y, hop.to.y, p) + 4 * hop.height * p * (1 - p);
      obj.rotation.y += dt * 0.03; // spin
 
      if (p >= 1) {
        const dist = hop.to.distanceTo(this.camPos);
        const isLast = this.hopIndex === this.hops.length - 1;
        if (isLast) {
          makeRipple(hop.to, 0.6);
          plunk(dist);
          this.phase = 'sinking';
        } else {
          makeRipple(hop.to, 1);
          splash(dist);
          this.hopIndex++;
        }
        this.t = 0;
      }
    }
 
    else if (this.phase === 'sinking') {
      obj.position.y = -0.4 * Math.min(this.t / 700, 1);
      if (this.t > 700) {
        obj.visible = false;
        this.phase = 'waiting';
        this.t = 0;
      }
    }
 
    else if (this.phase === 'waiting') {
      if (this.t > WAIT_TO_COME_BACK) {
        obj.position.copy(this.home);
        obj.rotation.set(0, 0, 0);
        obj.scale.set(0.01, 0.01, 0.01);
        obj.visible = true;
        this.phase = 'returning';
        this.t = 0;
      }
    }
 
    else if (this.phase === 'returning') {
      const p = Math.min(this.t / 900, 1);
      const s = Math.max(0.01, easeOutBack(p));
      obj.scale.set(s, s, s);
      if (p >= 1) {
        obj.scale.set(1, 1, 1);
        this.phase = 'idle';
      }
    }
  }
});

// ============================================================
// SHORE WAVES (foam and wet sand that wash in and out)
// ============================================================
AFRAME.registerComponent('shore-wave', {
  schema: {
    color:   { default: '#ffffff' },
    opacity: { default: 0.6 },
    offset:  { default: 0 },     // shifts the timing so strips don't move together
    reach:   { default: 0.35 }   // how far the wave washes up the sand
  },

  init: function () {
    // a long thin strip with lots of points so it can bend
    const geo = new THREE.PlaneGeometry(40, 0.5, 200, 1);
    geo.rotateX(-Math.PI / 2);
    this.base = geo.attributes.position.array.slice();
    const mat = new THREE.MeshBasicMaterial({
      color: this.data.color, transparent: true, opacity: this.data.opacity, depthWrite: false
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.el.setObject3D('mesh', this.mesh);
  },

  tick: function (time) {
    const t = time / 1000 + this.data.offset;
    const swell = Math.sin(t * 0.8) * this.data.reach;   // the whole wave moving in and out
    const pos = this.mesh.geometry.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = this.base[i];
      // two overlapping wiggles make the edge look natural instead of perfectly even
      const wiggle = Math.sin(x * 1.3 + t * 1.5) * 0.08 + Math.sin(x * 0.5 - t) * 0.1;
      arr[i + 2] = this.base[i + 2] + swell + wiggle;
    }
    pos.needsUpdate = true;
    // fade a little as it pulls back
    this.mesh.material.opacity = this.data.opacity * (0.6 + 0.4 * Math.sin(t * 0.8 + 1));
  }
});

function addShoreWave(z, y, color, opacity, offset) {
  const el = document.createElement('a-entity');
  el.setAttribute('position', `0 ${y} ${z}`);
  el.setAttribute('shore-wave', { color: color, opacity: opacity, offset: offset });
  document.querySelector('a-scene').appendChild(el);
}

addShoreWave(-2.8, 0.012, '#cfc3ab', 0.5, 0.6);   // wet sand, trails behind the foam
addShoreWave(-3.0, 0.016, '#ffffff', 0.55, 0);    // white foam at the water's edge

// ============================================================
// HOOK EVERYTHING UP
// CodePen runs this panel after the HTML, so the scene already
// exists. Now give the stone its behavior and turn on the fog.
// ============================================================
document.getElementById('stone').setAttribute('skip-stone', '');
document.querySelector('a-scene').setAttribute('fog',
  `type: exponential; color: #d8dde0; density: ${FOG_DENSITY}`);
 