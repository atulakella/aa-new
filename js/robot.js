/* ===================================================================
 * robot.js — the little footer companion
 *
 * A tiny service robot that quietly wanders an organic grass clearing.
 * Movement uses steering + layered sine-wave wander so it never repeats
 * an obvious path: inertia, acceleration, gentle turns, pauses to
 * "think", and a centre bias so it never touches the border. When idle
 * it breathes, blinks, sways its head and glances around. A short
 * speech bubble appears only occasionally — never spam.
 * ------------------------------------------------------------------- */

(function () {
  'use strict';

  var wrap    = document.getElementById('bot-wrap');
  var bubble  = document.getElementById('bot-bubble');
  var btext   = document.getElementById('bot-bubble-text');
  var body    = document.getElementById('bot-body');
  var headEl  = document.getElementById('bot-head');
  var eyes    = document.getElementById('bot-eyes');
  var antenna = document.getElementById('bot-antenna');
  var pupilL  = document.getElementById('bot-pupil-l');
  var pupilR  = document.getElementById('bot-pupil-r');
  var led     = document.getElementById('bot-led');

  if (!wrap || !body || !headEl || !eyes) return;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- playground geometry: the ellipse the feet stay inside ------- */
  var CX = 130, CY = 120, RX = 84, RY = 42;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---- state ------------------------------------------------------- */
  var pos = { x: CX, y: CY };
  var vel = { x: 0, y: 0 };
  var target = { x: CX, y: CY };

  var thinking = false;
  var thinkUntil = 0;
  var headTiltGoal = 0;

  var lean = 0, headTilt = 0;
  var pupil = { x: 0, y: 0 };
  var pupilTarget = { x: 0, y: 0 };

  var glanceUntil = 0, nextGlance = 0;
  var blinkUntil = 0, nextBlink = 1500;

  /* pick a fresh destination, biased toward the middle of the clearing */
  function pickTarget() {
    var ang = Math.random() * Math.PI * 2;
    var rr = Math.pow(Math.random(), 1.7) * 0.92;
    target.x = CX + Math.cos(ang) * RX * rr;
    target.y = CY + Math.sin(ang) * RY * rr;
  }
  pickTarget();

  /* ---- speech bubble ----------------------------------------------- */
  var messages = [
  "i've read datasheets. for fun.",
  "i fix bugs with a logic analyzer, not hope.",
  "race conditions fear me. occasionally.",
  "your uart isn't haunted. prove me wrong.",
  "i know why your AXI bus is stalling.",
  "bare metal. actual bare metal.",
  "i've written drivers from scratch.",
  "i trust oscilloscopes more than printf.",
  "i've bricked boards. i've unbricked them too.",
  "freeRTOS never hurt me. much.",
  "six months from now you'll wonder why you waited.",
  "a referral is cheaper than another recruiter call.",
  "i won't ghost you. recruiters already cover that.",
  "if you're hiring firmware, this is your sign.",
  "still scrolling? you could've referred me by now.",
  "one message. that's all it takes."
];
  var msgIndex = Math.floor(Math.random() * messages.length);

  function showMsg() {
    btext.textContent = messages[msgIndex % messages.length];
    msgIndex++;
    bubble.classList.add('is-visible');
    setTimeout(function () { bubble.classList.remove('is-visible'); }, 3000);
  }
  function scheduleMsg() {
    setTimeout(function () {
      if (Math.random() < 0.7) showMsg();   // occasionally — never spam
      scheduleMsg();
    }, rand(6000, 9000));
  }

  /* ---- motion tuning ----------------------------------------------- */
  var MAX_SPEED = 0.55;
  var ACC = 0.018;
  var FRICTION = 0.93;
  var ARRIVE = 7;

  /* two out-of-phase sine waves → non-repeating curved wander */
  function wander(t) {
    return Math.sin(t * 0.0013) * 0.6 + Math.sin(t * 0.0007 + 1.7) * 0.4;
  }

  function frame(now) {
    var t = now;

    /* ---- choose how to move ---------------------------------------- */
    var dx = target.x - pos.x;
    var dy = target.y - pos.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (thinking) {
      vel.x *= 0.8; vel.y *= 0.8;
      if (t > thinkUntil) { thinking = false; pickTarget(); }
    } else if (dist < ARRIVE) {
      vel.x *= 0.78; vel.y *= 0.78;
      if (dist < 2.5) {
        thinking = true;
        thinkUntil = t + rand(700, 2200);
        headTiltGoal = rand(-7, 7);   // tilt head while it "thinks"
      }
    } else {
      var nx = dx / dist, ny = dy / dist;
      var w = wander(t) * 0.9;        // curve toward the target
      vel.x += (nx + (-ny) * w) * ACC;
      vel.y += (ny + (nx) * w) * ACC;
    }

    /* clamp + damp velocity */
    var sp = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    if (sp > MAX_SPEED) { vel.x = vel.x / sp * MAX_SPEED; vel.y = vel.y / sp * MAX_SPEED; }
    vel.x *= FRICTION; vel.y *= FRICTION;

    pos.x += vel.x; pos.y += vel.y;

    /* soft containment — ease back in, never touch the border */
    var ex = (pos.x - CX) / RX, ey = (pos.y - CY) / RY;
    var rr = ex * ex + ey * ey;
    if (rr > 1) {
      var k = 1 / Math.sqrt(rr);
      pos.x = CX + (pos.x - CX) * k * 0.99;
      pos.y = CY + (pos.y - CY) * k * 0.99;
      vel.x *= 0.5; vel.y *= 0.5;
    }

    sp = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    var moving = sp > 0.06;

    /* ---- pseudo-depth: closer (lower) = slightly larger ------------ */
    var depth = 0.82 + ((pos.y - (CY - RY)) / (2 * RY)) * 0.32;

    /* ---- bank gently into horizontal motion ------------------------ */
    lean += (clamp(vel.x * 14, -9, 9) - lean) * 0.1;

    /* ---- breathing while idle, soft bounce while walking ----------- */
    var bob = moving
      ? Math.sin(t * 0.02) * 0.5 * Math.min(sp / MAX_SPEED, 1)
      : Math.sin(t * 0.004) * 0.7;
    var breathe = moving ? 1 : 1 + Math.sin(t * 0.004) * 0.02;
    body.style.transform =
      'translateY(' + bob.toFixed(2) + 'px) rotate(' + lean.toFixed(2) +
      'deg) scaleY(' + breathe.toFixed(3) + ')';

    /* ---- head sway / thinking tilt --------------------------------- */
    var headGoal = moving
      ? -lean * 0.4 + Math.sin(t * 0.01) * 1.5
      : headTiltGoal + Math.sin(t * 0.002) * 2;
    headTilt += (headGoal - headTilt) * 0.08;
    headEl.style.transform = 'rotate(' + headTilt.toFixed(2) + 'deg)';

    /* ---- antenna wobble -------------------------------------------- */
    if (antenna) {
      var ant = Math.sin(t * 0.012) * 5 * (0.6 + Math.min(sp / MAX_SPEED, 1));
      antenna.style.transform = 'rotate(' + ant.toFixed(2) + 'deg)';
    }

    /* ---- eyes: glance around when idle, look ahead when moving ----- */
    if (!moving && t > glanceUntil && t > nextGlance) {
      glanceUntil = t + rand(500, 1100);
      nextGlance = glanceUntil + rand(1500, 4500);
      var d = Math.random();
      if (d < 0.4) pupilTarget = { x: -1.5, y: 0 };
      else if (d < 0.8) pupilTarget = { x: 1.5, y: 0 };
      else pupilTarget = { x: 0, y: -1.4 };
    }
    if (t > glanceUntil) {
      pupilTarget = moving
        ? { x: clamp(vel.x * 3, -1.6, 1.6), y: clamp(vel.y * 3, -1.2, 1.2) }
        : { x: 0, y: 0 };
    }
    pupil.x += (pupilTarget.x - pupil.x) * 0.12;
    pupil.y += (pupilTarget.y - pupil.y) * 0.12;
    var pt = 'translate(' + pupil.x.toFixed(2) + 'px,' + pupil.y.toFixed(2) + 'px)';
    pupilL.style.transform = pt;
    pupilR.style.transform = pt;

    /* ---- blink ----------------------------------------------------- */
    if (t > nextBlink) { blinkUntil = t + 120; nextBlink = t + rand(5000, 12000); }
    eyes.style.transform = 'scaleY(' + (t < blinkUntil ? 0.12 : 1) + ')';

    /* ---- power LED pulse ------------------------------------------- */
    if (led) led.style.opacity = (0.45 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.005))).toFixed(3);

    /* ---- commit ---------------------------------------------------- */
    wrap.style.left = pos.x.toFixed(2) + 'px';
    wrap.style.top = pos.y.toFixed(2) + 'px';
    wrap.style.transform = 'translate(-50%,-100%) scale(' + depth.toFixed(3) + ')';

    requestAnimationFrame(frame);
  }

  /* ---- reduced motion: sit still and calm -------------------------- */
  if (reduce) {
    wrap.style.left = CX + 'px';
    wrap.style.top = CY + 'px';
    wrap.style.transform = 'translate(-50%,-100%) scale(1)';
    return;
  }

  scheduleMsg();
  setTimeout(showMsg, 2200);
  requestAnimationFrame(frame);
})();
