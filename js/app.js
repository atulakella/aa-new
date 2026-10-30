/* ─────────────────────────────────────────────
   Achievements Timeline (ported from original)
   ───────────────────────────────────────────── */
(function() {
  const cards = document.getElementById('cards');
  const timelineProgress = document.getElementById('timelineProgress');
  const timelineMarkersEl = document.getElementById('timelineMarkers');
  const cardsScrollbar = document.getElementById('cardsScrollbar');
  const cardsScrollbarThumb = document.getElementById('cardsScrollbarThumb');
  if (!cards || !timelineProgress || !timelineMarkersEl) return;

  const cardEls = Array.from(cards.children);
  const markerWraps = [];

  // Give each card a stable id so its marker button can reference it
  // via aria-controls, tying the two together for screen readers too.
  cardEls.forEach((cardEl, i) => {
    if (!cardEl.id) cardEl.id = `achievement-card-${i}`;
  });

  // Derive ages straight from the cards in the DOM, rather than a
  // hand-maintained list that silently drifts out of sync.
  function ageFor(cardEl) {
    const badge = cardEl.querySelector('.card-age-badge');
    return badge ? badge.textContent.replace(/^Age\s*/i, '').trim() : '';
  }

  function createMarkers() {
    cardEls.forEach((cardEl, index) => {
      const wrap = document.createElement('div');
      wrap.classList.add('timeline-marker-wrap');

      // Real <button>s, each pointing at its achievement card, so the
      // dot is an actual control (keyboard-focusable, announced by
      // screen readers, clickable target) rather than a decorative div.
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.classList.add('timeline-marker');
      marker.setAttribute('aria-controls', cardEl.id);
      marker.setAttribute('aria-label', `Jump to age ${ageFor(cardEl)} achievement`);

      const label = document.createElement('button');
      label.type = 'button';
      label.classList.add('timeline-label');
      label.textContent = `Age ${ageFor(cardEl)}`;
      label.setAttribute('aria-controls', cardEl.id);

      const jump = () => scrollToCard(index);
      marker.addEventListener('click', jump);
      label.addEventListener('click', jump);

      wrap.appendChild(marker);
      wrap.appendChild(label);
      timelineMarkersEl.appendChild(wrap);
      markerWraps.push(wrap);
    });
  }

  function scrollToCard(index) {
    const cardEl = cards.children[index];
    if (!cardEl) return;
    const isLast = index === cardEls.length - 1;
    const maxScroll = cards.scrollWidth - cards.clientWidth;
    // Use the layout position rather than the viewport position so the
    // highlighted card's visual scale transform cannot affect the target.
    const cardContentLeft = cardEl.offsetLeft - cards.offsetLeft;
    const target = isLast ? maxScroll : cardContentLeft;
    cards.scrollTo({ left: Math.max(0, Math.min(maxScroll, target)), behavior: 'smooth' });
  }

  // Real scroll-ratio progress, so the bar always reaches exactly 0–100%
  // regardless of card width, gap, or how many cards there are.
  function updateProgress() {
    const maxScroll = cards.scrollWidth - cards.clientWidth;
    const pct = maxScroll > 0 ? (cards.scrollLeft / maxScroll) * 100 : 100;
    timelineProgress.style.width = Math.min(100, Math.max(0, pct)) + '%';

    if (cardsScrollbar && cardsScrollbarThumb) {
      const thumbTravel = cardsScrollbar.clientWidth - cardsScrollbarThumb.offsetWidth;
      cardsScrollbarThumb.style.transform = `translateX(${thumbTravel * (maxScroll > 0 ? cards.scrollLeft / maxScroll : 0)}px)`;
      cardsScrollbar.setAttribute('aria-valuenow', Math.round(pct));
    }
  }

  if (cardsScrollbar && cardsScrollbarThumb) {
    const scrollFromPointer = (clientX) => {
      const rect = cardsScrollbar.getBoundingClientRect();
      const thumbWidth = cardsScrollbarThumb.offsetWidth;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left - thumbWidth / 2) / (rect.width - thumbWidth)));
      cards.scrollLeft = ratio * (cards.scrollWidth - cards.clientWidth);
    };

    cardsScrollbar.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      cardsScrollbar.setPointerCapture(event.pointerId);
      cardsScrollbarThumb.classList.add('dragging');
      scrollFromPointer(event.clientX);
    });
    cardsScrollbar.addEventListener('pointermove', (event) => {
      if (cardsScrollbar.hasPointerCapture(event.pointerId)) scrollFromPointer(event.clientX);
    });
    cardsScrollbar.addEventListener('pointerup', (event) => {
      cardsScrollbar.releasePointerCapture(event.pointerId);
      cardsScrollbarThumb.classList.remove('dragging');
    });
    cardsScrollbar.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') cards.scrollBy({ left: -cards.clientWidth * 0.2, behavior: 'smooth' });
      if (event.key === 'ArrowRight') cards.scrollBy({ left: cards.clientWidth * 0.2, behavior: 'smooth' });
    });
  }

  // Nearest-card lookup by actual on-screen position (not offsetLeft,
  // which is relative to the nearest positioned ancestor and doesn't
  // line up with .cards' own scroll coordinates).
  function activeIndex() {
    const maxScroll = cards.scrollWidth - cards.clientWidth;
    if (maxScroll <= 0) return 0;
    if (cards.scrollLeft >= maxScroll - 1) return cardEls.length - 1;
    if (cards.scrollLeft <= 1) return 0;
    const containerLeft = cards.getBoundingClientRect().left;
    let closest = 0;
    let closestDiff = Infinity;
    cardEls.forEach((c, i) => {
      const diff = Math.abs(c.getBoundingClientRect().left - containerLeft);
      if (diff < closestDiff) { closestDiff = diff; closest = i; }
    });
    return closest;
  }

  function highlightActive() {
    const idx = activeIndex();
    cardEls.forEach((c, i) => c.classList.toggle('highlighted', i === idx));
    markerWraps.forEach((wrap, i) => {
      const marker = wrap.querySelector('.timeline-marker');
      const label = wrap.querySelector('.timeline-label');
      const isActive = i === idx;
      marker.classList.toggle('active', isActive);
      label.classList.toggle('active', isActive);
      if (isActive) {
        marker.setAttribute('aria-current', 'true');
      } else {
        marker.removeAttribute('aria-current');
      }
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateProgress();
      highlightActive();
      ticking = false;
    });
  }

  cards.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  createMarkers();
  updateProgress();
  highlightActive();
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
