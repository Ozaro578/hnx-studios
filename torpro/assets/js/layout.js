/* TorPro – gemeinsamer Seitenrahmen (Topbar, Header, Footer) für alle Unterseiten */
(function () {
  var co = (window.TORPRO_CONFIG || {}).company || {};
  var page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  var NAV = [
    ['index', 'Start'], ['leistungen', 'Leistungen'], ['referenzen', 'Referenzen'],
    ['ueber-uns', 'Über uns'], ['kontakt', 'Kontakt']
  ];
  var tel = 'tel:' + (co.phone || '').replace(/\s/g, '');
  var header = document.getElementById('site-header');
  if (header) header.outerHTML =
    '<div class="topbar"><div class="container">' +
    '<span>📍 ' + co.street + ' · ' + co.zip + ' ' + co.city + '</span>' +
    '<span>📞 <a href="' + tel + '">' + co.phoneDisplay + '</a> &nbsp;·&nbsp; ✉️ <a href="mailto:' + co.email + '">' + co.email + '</a></span>' +
    '</div></div>' +
    '<header class="site"><div class="container">' +
    '<a class="brand" href="index.html" aria-label="TorPro Startseite"><span data-logo="mark"></span></a>' +
    '<button class="nav-toggle" aria-label="Menü" aria-expanded="false">☰</button>' +
    '<nav class="main" id="nav"><ul>' +
    NAV.map(function (n) { return '<li><a href="' + n[0] + '.html"' + (n[0] === page ? ' class="active" aria-current="page"' : '') + '>' + n[1] + '</a></li>'; }).join('') +
    '<li><a class="btn btn-primary btn-sm" href="konfigurator.html">Tor konfigurieren</a></li>' +
    '</ul></nav></div></header>';
  var footer = document.getElementById('site-footer');
  if (footer) footer.outerHTML =
    '<footer class="site"><div class="container">' +
    '<div><div class="brand"><span data-logo></span></div><p>Montage, Wartung und Reparatur von Garagentoren, Industrietoren und Antrieben in Heilbronn und Umgebung. Partner von M-M Alu-Door (Kirchheim am Neckar) und Frankentore (Heilbronn).</p></div>' +
    '<div><h4>Leistungen</h4><ul><li><a href="leistungen.html#garagentore">Garagentore</a></li><li><a href="leistungen.html#industrietore">Industrietore</a></li><li><a href="leistungen.html#antriebe">Antriebe &amp; Smart Home</a></li><li><a href="leistungen.html#wartung">Wartung &amp; UVV-Prüfung</a></li><li><a href="leistungen.html#reparatur">Reparatur &amp; Notdienst</a></li><li><a href="konfigurator.html">Tor-Konfigurator</a></li></ul></div>' +
    '<div><h4>Kontakt</h4><ul><li>' + co.name + '</li><li>' + co.street + '</li><li>' + co.zip + ' ' + co.city + '</li><li><a href="' + tel + '">' + co.phoneDisplay + '</a></li><li><a href="mailto:' + co.email + '">' + co.email + '</a></li></ul></div>' +
    '</div><div class="container footer-bottom" style="display:flex">' +
    '<span>© ' + new Date().getFullYear() + ' ' + co.name + ' · ' + co.city + '</span>' +
    '<span><a href="impressum.html">Impressum</a> · <a href="datenschutz.html">Datenschutz</a> · <a href="admin/">Mitarbeiter-Login</a></span>' +
    '</div></footer>' +
    '<a class="call-fab" href="' + tel + '" aria-label="Anrufen">📞</a><div class="toast" id="toast"></div>';
  var tog = document.querySelector('.nav-toggle'), nav = document.getElementById('nav');
  if (tog && nav) { tog.addEventListener('click', function () { var o = nav.classList.toggle('open'); tog.setAttribute('aria-expanded', o); }); }
  window.torproToast = function (t) { var el = document.getElementById('toast'); if (!el) return; el.textContent = t; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 2800); };
})();
