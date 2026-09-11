/* TorPro – Seitenlogik (Kontaktdaten, Karten, Galerie, Kontaktformular) */
(function () {
  var C = window.TORPRO_CONFIG, co = C.company;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* Kontaktdaten aus config.js einsetzen */
  document.querySelectorAll('[data-phone-link]').forEach(function (a) { a.href = 'tel:' + co.phone.replace(/\s/g, ''); a.textContent = co.phoneDisplay; });
  document.querySelectorAll('[data-mail-link]').forEach(function (a) { a.href = 'mailto:' + co.email; a.textContent = co.email; });
  var oh = $('#opening-hours'); if (oh) oh.innerHTML = co.openingHours.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* Standort-Karte (dunkles Kartendesign) */
  var ms = $('#map-standort');
  if (ms && window.L) {
    var map = L.map(ms, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([co.lat, co.lng], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>', subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    L.circle([co.lat, co.lng], { radius: 2500, color: '#1f6fd6', fillColor: '#1f6fd6', fillOpacity: .06, weight: 1.5, dashArray: '6 6' }).addTo(map);
    var pin = L.divIcon({ className: '', html: '<div class="map-pin"><div class="ring"></div><div class="dot"></div></div>', iconSize: [46, 46], iconAnchor: [23, 23], popupAnchor: [0, -18] });
    L.marker([co.lat, co.lng], { icon: pin }).addTo(map).bindPopup('<b>' + esc(co.name) + '</b><br>' + esc(co.street) + '<br>' + esc(co.zip + ' ' + co.city));
    /* Karte auf großen Bildschirmen nach rechts versetzen, damit die Infokarte links Platz hat */
    function offset() { if (window.innerWidth > 700) map.panBy([-Math.min(220, window.innerWidth * .18), 0], { animate: false }); }
    setTimeout(function () { map.invalidateSize(); map.setView([co.lat, co.lng], 13, { animate: false }); offset(); }, 150);
  } else if (ms) {
    ms.innerHTML = '<div style="display:grid;place-items:center;height:100%;min-height:320px;color:#8b93a1;font-size:.9rem;padding:1rem;text-align:center">Karte: ' + esc(co.street) + ', ' + esc(co.zip + ' ' + co.city) + '</div>';
  }

  /* Einsatzgebiet-Karte */
  var m = $('#map-public');
  if (m && window.L) {
    var map2 = L.map(m, { scrollWheelZoom: false }).setView([co.lat, co.lng], 8);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd' }).addTo(map2);
    L.circle([co.lat, co.lng], { radius: co.serviceRadiusKm * 1000, color: '#1f6fd6', fillColor: '#1f6fd6', fillOpacity: .08, weight: 2 }).addTo(map2);
    L.marker([co.lat, co.lng]).addTo(map2).bindPopup('<b>' + esc(co.name) + '</b><br>' + esc(co.street) + '<br>' + esc(co.zip + ' ' + co.city));
  } else if (m) {
    m.innerHTML = '<div class="empty" style="display:grid;place-items:center;height:100%;color:var(--muted);font-size:.9rem;padding:1rem;text-align:center">Einsatzgebiet: Heilbronn und Umkreis von ' + co.serviceRadiusKm + ' km</div>';
  }

  /* Galerie (Referenzen) + Lightbox */
  document.querySelectorAll('.gallery[id]').forEach(function (g) {
    var limit = +g.getAttribute('data-limit') || 999;
    var items = (C.slides || []).slice(0, limit);
    g.innerHTML = items.map(function (s) { return '<figure data-src="' + esc(s.src) + '"><img src="' + esc(s.src) + '" alt="' + esc(s.alt || '') + '" loading="lazy" onerror="this.closest(\'figure\').remove()"><figcaption>' + esc(s.caption || '') + '</figcaption></figure>'; }).join('');
    g.querySelectorAll('figure').forEach(function (f) { f.addEventListener('click', function () { openLightbox(f.getAttribute('data-src'), f.querySelector('img').alt); }); });
    /* Abschnitt ausblenden, solange keine Fotos vorhanden sind */
    var sec = g.closest('section'); if (sec) setTimeout(function () { if (!g.querySelector('figure')) sec.hidden = true; }, 1500);
  });
  var lb = null;
  function openLightbox(src, alt) {
    if (!lb) { lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = '<button type="button" aria-label="Schließen">✕</button><img alt="">'; document.body.appendChild(lb); lb.addEventListener('click', function () { lb.classList.remove('open'); }); document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lb.classList.remove('open'); }); }
    var img = lb.querySelector('img'); img.src = src; img.alt = alt || ''; lb.classList.add('open');
  }

  /* Kontaktformular */
  var cf = $('#contact-form');
  if (cf) cf.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('#contact-msg');
    if ($('#cf-hp').value) return;
    var f = { name: $('#cf-name').value.trim(), phone: $('#cf-phone').value.trim(), email: $('#cf-email').value.trim(), topic: $('#cf-topic').value, message: $('#cf-msg').value.trim() };
    if (!f.name || !f.email || !f.message || !$('#cf-privacy').checked) { msg.innerHTML = '<div class="notice err">Bitte Name, E-Mail, Nachricht ausfüllen und der Datenschutzerklärung zustimmen.</div>'; return; }
    var req = { kind: 'kontakt', status: 'neu', contact: { name: f.name, phone: f.phone, email: f.email }, topic: f.topic, message: f.message, source: location.href };
    var jobs = [window.TorProStore.add('requests', req)];
    if (C.requestWebhook) jobs.push(fetch(C.requestWebhook, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(req) }).catch(function () { }));
    Promise.all(jobs).then(function () {
      msg.innerHTML = '<div class="notice ok">Vielen Dank! Ihre Nachricht ist eingegangen. Wir melden uns schnellstmöglich.</div>'; cf.reset(); window.torproToast && torproToast('Nachricht gesendet');
    }).catch(function () {
      var body = encodeURIComponent('Name: ' + f.name + '\nTelefon: ' + f.phone + '\nE-Mail: ' + f.email + '\nAnliegen: ' + f.topic + '\n\n' + f.message);
      msg.innerHTML = '<div class="notice err">Senden nicht möglich. <a href="mailto:' + co.email + '?subject=' + encodeURIComponent('Anfrage: ' + f.topic) + '&body=' + body + '">Hier klicken, um die Nachricht per E-Mail zu senden.</a></div>';
    });
  });
})();
