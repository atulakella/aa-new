(function () {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  var ctx = canvas.getContext('2d');
  var favicon = document.getElementById('dynamic-favicon');
  if (!favicon || !ctx) return;

  var COPPER = '#D09B5A';
  var POINTS = 80;
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function interpolateShapes(a, b, t) {
    return a.map(function (point, index) {
      return { x: lerp(point.x, b[index].x, t), y: lerp(point.y, b[index].y, t) };
    });
  }
  function spaghettiShape(time) {
    var points = [];
    for (var i = 0; i < POINTS; i += 1) {
      var p = i / (POINTS - 1);
      points.push({ x: 3 + p * 26, y: 16 + 4.5 * Math.sin(p * Math.PI * 3 + time * .0025) + 2.5 * Math.sin(p * Math.PI * 7 - time * .0015) + 1.2 * Math.sin(p * Math.PI * 13) });
    }
    return points;
  }
  function rabbitShape() {
    var points = [];
    for (var i = 0; i < POINTS; i += 1) {
      var p = i / (POINTS - 1);
      var y;
      if (p < .25) y = 24 - 16 * Math.sin((p / .25) * Math.PI);
      else if (p < .5) y = 24;
      else if (p < .75) y = 24 - 16 * Math.sin(((p - .5) / .25) * Math.PI);
      else y = 24;
      points.push({ x: 3 + p * 26, y: y });
    }
    return points;
  }
  function currentShape(time) {
    var t = time % 20000;
    var spaghetti = spaghettiShape(time);
    var rabbit = rabbitShape();
    if (t < 6000) return spaghetti;
    if (t < 8000) return interpolateShapes(spaghetti, rabbit, smoothstep((t - 6000) / 2000));
    if (t < 11000) return rabbit;
    if (t < 13000) return interpolateShapes(rabbit, spaghetti, smoothstep((t - 11000) / 2000));
    return spaghetti;
  }
  function animate() {
    ctx.clearRect(0, 0, 32, 32);
    ctx.strokeStyle = COPPER;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    currentShape(performance.now()).forEach(function (point, index) {
      if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    favicon.href = canvas.toDataURL('image/png');
    window.setTimeout(animate, 80);
  }
  animate();
}());
