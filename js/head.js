/* ===================================================================
 * head.js — runs synchronously in <head>
 *   1. swaps the no-js class for js (avoids a flash of unstyled state)
 *   2. initialises Google Analytics (gtag)
 * ------------------------------------------------------------------- */

(function () {
  'use strict';
  var html = document.documentElement;
  html.classList.remove('no-js');
  html.classList.add('js');
})();

/* Google Analytics — the loader tag lives in index.html <head> */
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-7YB4EEMD6K');
