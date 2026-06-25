/* ─────────────────────────────────────────────
   Achievements Timeline (ported from original)
   ───────────────────────────────────────────── */
(function() {
  const cards = document.getElementById('cards');
  const timelineProgress = document.getElementById('timelineProgress');
  const timelineMarkersEl = document.getElementById('timelineMarkers');
  if (!cards || !timelineProgress || !timelineMarkersEl) return;

  const items = [
    { age: 13 }, { age: 14 }, { age: 15 }, { age: 19 }, { age: 20 }
  ];

  function createMarkers() {
    items.forEach((item, index) => {
      const wrap = document.createElement('div');
      const marker = document.createElement('div');
      const label = document.createElement('div');
      marker.classList.add('timeline-marker');
      label.classList.add('timeline-label');
      label.textContent = `Age ${item.age}`;
      marker.addEventListener('click', () => scrollToCard(index));
      wrap.appendChild(marker);
      wrap.appendChild(label);
      timelineMarkersEl.appendChild(wrap);
    });
  }

  function scrollToCard(index) {
    const cardEl = cards.children[index];
    if (!cardEl) return;
    cards.scrollTo({ left: cardEl.offsetLeft - 16, behavior: 'smooth' });
    updateProgress(index);
    highlightCard(index);
  }

  function updateProgress(index) {
    const pct = items.length > 1 ? (index / (items.length - 1)) * 100 : 0;
    timelineProgress.style.width = pct + '%';
  }

  function highlightCard(index) {
    Array.from(cards.children).forEach((c, i) => {
      c.classList.toggle('highlighted', i === index);
    });
  }

  cards.addEventListener('scroll', () => {
    if (!cards.children[0]) return;
    const cardW = cards.children[0].offsetWidth + 16;
    const idx = Math.round(cards.scrollLeft / cardW);
    updateProgress(idx);
    highlightCard(idx);
  });

  createMarkers();
  updateProgress(0);
  highlightCard(0);
})();

/* ───────────────────────────���──���───────────��──
   Scroll Reveal
   ───────────────────────────────────────────── */
(function() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  // Stagger siblings within the same parent so reveals cascade instead of firing all at once
  const counts = new Map();
  document.querySelectorAll('.reveal').forEach(el => {
    const parent = el.parentElement;
    const i = counts.get(parent) || 0;
    if (i > 0) el.style.transitionDelay = Math.min(i * 90, 540) + 'ms';
    counts.set(parent, i + 1);
    obs.observe(el);
  });
})();

/* ─────────��───────────────────────────────────
   Hero typewriter, cycles the second line
   ───────────────────────────────────────────── */
(function() {
  const el = document.getElementById('typewriterText');
  if (!el) return;

  const phrases = [
    'close to metal.',
    'for the edge.',
    'with FPGAs.',
    'on tiny computers.'
  ];

  const TYPE_SPEED = 50;     // ms per character typed
  const ERASE_SPEED = 32;    // ms per character erased
  const HOLD_TIME = 1500;    // pause after a phrase is fully typed

  // Respect reduced-motion: show the first phrase statically, no looping.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = phrases[0];
    return;
  }

  let phraseIndex = 0;
  let charIndex = 0;
  let erasing = false;

  function tick() {
    const current = phrases[phraseIndex];

    if (!erasing) {
      charIndex++;
      el.textContent = current.slice(0, charIndex);
      if (charIndex === current.length) {
        erasing = true;
        setTimeout(tick, HOLD_TIME);
        return;
      }
      setTimeout(tick, TYPE_SPEED);
    } else {
      charIndex--;
      el.textContent = current.slice(0, charIndex);
      if (charIndex === 0) {
        erasing = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        setTimeout(tick, TYPE_SPEED);
        return;
      }
      setTimeout(tick, ERASE_SPEED);
    }
  }

  tick();
})();

/* ─────────────────────────────────────────────
   Hero oscilloscope, realistic PWM trace that
   occasionally morphs into an AM-style soundwave
   ───────────────────────────────────────────── */
(function() {
  const scopeWave = document.getElementById('scopeWave');
  const scopeId = document.getElementById('scopeId');
  if (!scopeWave) return;

  // Respect reduced motion: keep the static square wave already in markup.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const W = 240;
  const H = 64;
  const MID = H / 2;

  const SQUARE_TIME = 8000;
  const AM_TIME = 10000;
  const MORPH_TIME = 2000;

  let state = "square";
  let stateStart = performance.now();
  let phase = 0;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function squareY(x, scroll) {
    const cycles = 6;
    const p = ((x / W) * cycles + scroll) % 1;
    return p < 0.5 ? 18 : 46;
  }

  function amY(x, phase) {
    const t = (x / W) * Math.PI * 4;

    const envelope =
        4 + 18 * Math.pow(Math.abs(Math.sin(t / 2)), 1.4);

    return MID +
        envelope * Math.sin(t * 18 + phase);
  }

  function generatePath(blend, scroll, phase) {

    let d = "";

    for (let x = 0; x <= W; x++) {

      const ySquare = squareY(x, scroll);
      const yAM = amY(x, phase);

      const y =
        ySquare * (1 - blend) +
        yAM * blend;

      d += (x === 0 ? "M" : "L") + x + "," + y + " ";
    }

    return d;
  }

  function animate(now) {

    const elapsed = now - stateStart;

    let blend = 0;

    switch(state) {

      case "square":
        scopeId.textContent = "SCOPE · PWM_AM";

        if(elapsed > SQUARE_TIME) {
          state = "toAM";
          stateStart = now;
        }
        break;

      case "toAM":
        blend = smoothstep(
          clamp(elapsed / MORPH_TIME, 0, 1)
        );

        scopeId.textContent = "SCOPE · PWM_AM";

        if(elapsed > MORPH_TIME) {
          state = "am";
          stateStart = now;
        }
        break;

      case "am":
        blend = 1;

        scopeId.textContent = "SCOPE · GPIO_0114";

        if(elapsed > AM_TIME) {
          state = "toSquare";
          stateStart = now;
        }
        break;

      case "toSquare":
        blend = 1 - smoothstep(
          clamp(elapsed / MORPH_TIME, 0, 1)
        );

        scopeId.textContent = "SCOPE · GPIO_0114";

        if(elapsed > MORPH_TIME) {
          state = "square";
          stateStart = now;
        }
        break;
    }

    phase += 0.025;

    const scroll = now * 0.00045;

    scopeWave.setAttribute(
      "d",
      generatePath(blend, scroll, phase)
    );

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();

/* ─────────────────────────────────────────────
   Back to top (from main.js ssBackToTop)
   ───────────────────────────────────────────── */
(function() {
  const btn = document.querySelector('.ss-go-top');
  if (!btn) return;
  if (window.scrollY >= 900) btn.classList.add('link-is-visible');
  window.addEventListener('scroll', () => {
    btn.classList.toggle('link-is-visible', window.scrollY >= 900);
  }, { passive: true });
})();

const canvas = document.createElement("canvas");
canvas.width = 32;
canvas.height = 32;

const ctx = canvas.getContext("2d");
const favicon = document.getElementById("dynamic-favicon");

const COPPER = "#D09B5A";
const POINTS = 80;

function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function interpolateShapes(a, b, t) {
    const pts = [];

    for (let i = 0; i < POINTS; i++) {
        pts.push({
            x: lerp(a[i].x, b[i].x, t),
            y: lerp(a[i].y, b[i].y, t)
        });
    }

    return pts;
}

function spaghettiShape(time) {

    const pts = [];

    for (let i = 0; i < POINTS; i++) {

        const p = i / (POINTS - 1);

        pts.push({
            x: 3 + p * 26,

            y:
                16 +
                4.5 * Math.sin(p * Math.PI * 3 + time * 0.0025) +
                2.5 * Math.sin(p * Math.PI * 7 - time * 0.0015) +
                1.2 * Math.sin(p * Math.PI * 13)
        });
    }

    return pts;
}

function rabbitShape() {

    const pts = [];

    for (let i = 0; i < POINTS; i++) {

        const p = i / (POINTS - 1);

        let y;

        if (p < 0.25) {

            y =
                24 -
                16 *
                Math.sin(
                    (p / 0.25) * Math.PI
                );

        } else if (p < 0.50) {

            y = 24;

        } else if (p < 0.75) {

            y =
                24 -
                16 *
                Math.sin(
                    ((p - 0.50) / 0.25) * Math.PI
                );

        } else {

            y = 24;
        }

        pts.push({
            x: 3 + p * 26,
            y
        });
    }

    return pts;
}

function getCurrentShape(time) {

    const cycle = 20000;
    const t = time % cycle;

    const spaghetti = spaghettiShape(time);
    const rabbit = rabbitShape();

    // 0-6s spaghetti
    if (t < 6000)
        return spaghetti;

    // 6-8s morph
    if (t < 8000)
        return interpolateShapes(
            spaghetti,
            rabbit,
            smoothstep((t - 6000) / 2000)
        );

    // 8-11s rabbit
    if (t < 11000)
        return rabbit;

    // 11-13s morph back
    if (t < 13000)
        return interpolateShapes(
            rabbit,
            spaghetti,
            smoothstep((t - 11000) / 2000)
        );

    // 13-20s spaghetti
    return spaghetti;
}

function drawShape(points) {

    ctx.clearRect(0, 0, 32, 32);

    ctx.strokeStyle = COPPER;
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();

    points.forEach((p, i) => {

        if (i === 0)
            ctx.moveTo(p.x, p.y);
        else
            ctx.lineTo(p.x, p.y);

    });

    ctx.stroke();

    favicon.href = canvas.toDataURL("image/png");
}

function animate() {

    const now = performance.now();

    drawShape(
        getCurrentShape(now)
    );

    setTimeout(animate, 80);
}

animate();