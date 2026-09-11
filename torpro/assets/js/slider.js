/* TorPro – Hero-Diashow (Referenzfotos, wandfüllend, einheitliche Höhe, Überblendung) */
(function () {
  var root = document.getElementById('hero-slider'); if (!root) return;
  var slides = (window.TORPRO_CONFIG.slides || []).slice();
  var track = root.querySelector('.slides'), dots = root.querySelector('.slide-dots');
  var loaded = [], i = 0, timer;
  function build() {
    if (!loaded.length) { root.classList.add('no-images'); return; }
    track.innerHTML = loaded.map(function (s, n) { return '<div class="slide' + (n === 0 ? ' active' : '') + '"><img src="' + s.src + '" alt="' + (s.alt || '') + '" loading="' + (n === 0 ? 'eager' : 'lazy') + '" decoding="async"><div class="slide-caption">' + (s.caption ? '<span>' + s.caption + '</span>' : '') + '</div></div>'; }).join('');
    dots.innerHTML = loaded.map(function (_, n) { return '<button type="button" aria-label="Bild ' + (n + 1) + '"' + (n === 0 ? ' class="active"' : '') + '></button>'; }).join('');
    dots.querySelectorAll('button').forEach(function (b, n) { b.addEventListener('click', function () { go(n); restart(); }); });
    root.querySelector('.slide-prev').addEventListener('click', function () { go(i - 1); restart(); });
    root.querySelector('.slide-next').addEventListener('click', function () { go(i + 1); restart(); });
    root.addEventListener('mouseenter', function () { clearInterval(timer); });
    root.addEventListener('mouseleave', restart);
    var x0 = null;
    root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { go(dx < 0 ? i + 1 : i - 1); restart(); } x0 = null; });
    if (loaded.length > 1) restart(); else root.classList.add('single');
  }
  function go(n) {
    var all = track.querySelectorAll('.slide'); if (!all.length) return;
    i = (n + all.length) % all.length;
    all.forEach(function (s, k) { s.classList.toggle('active', k === i); });
    dots.querySelectorAll('button').forEach(function (b, k) { b.classList.toggle('active', k === i); });
  }
  function restart() { clearInterval(timer); if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(function () { go(i + 1); }, 5500); }
  /* Nur Bilder verwenden, die tatsächlich existieren (Vorab-Check) */
  var pending = slides.length; if (!pending) return build();
  slides.forEach(function (s, n) {
    var img = new Image();
    img.onload = function () { loaded[n] = s; if (--pending === 0) { loaded = loaded.filter(Boolean); build(); } };
    img.onerror = function () { if (--pending === 0) { loaded = loaded.filter(Boolean); build(); } };
    img.src = s.src;
  });
})();
