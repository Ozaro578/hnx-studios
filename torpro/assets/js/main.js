/* TorPro – allgemeine Seitenlogik */
(function () {
  var C = window.TORPRO_CONFIG, co = C.company;
  var $ = function (s) { return document.querySelector(s); };

  /* Kontaktdaten aus config.js einsetzen */
  document.querySelectorAll('[data-phone-link]').forEach(function (a) { a.href = 'tel:' + co.phone.replace(/\s/g, ''); if (a.textContent.trim() && !a.classList.contains('call-fab')) a.textContent = co.phoneDisplay; });
  document.querySelectorAll('[data-mail-link]').forEach(function (a) { a.href = 'mailto:' + co.email; a.textContent = co.email; });
  var oh = $('#opening-hours'); if (oh) oh.innerHTML = co.openingHours.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('');
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* Navigation */
  var tog = $('.nav-toggle'), nav = $('#nav');
  if (tog) { tog.addEventListener('click', function () { var o = nav.classList.toggle('open'); tog.setAttribute('aria-expanded', o); }); nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); }); }); }

  /* Toast */
  window.torproToast = function (t) { var el = $('#toast'); if (!el) return; el.textContent = t; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 2800); };

  /* Einsatzgebiet-Karte */
  var m = $('#map-public');
  if (m && !window.L) m.innerHTML = '<div class="empty" style="display:grid;place-items:center;height:100%;color:var(--muted);font-size:.9rem;padding:1rem;text-align:center">Kartenansicht: Heilbronn und Umkreis von ' + co.serviceRadiusKm + ' km (wird auf der Live-Seite geladen)</div>';
  if (m && window.L) {
    var map = L.map(m, { scrollWheelZoom: false }).setView([co.lat, co.lng], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    L.circle([co.lat, co.lng], { radius: co.serviceRadiusKm * 1000, color: '#1f6fd6', fillColor: '#1f6fd6', fillOpacity: .08, weight: 2 }).addTo(map);
    L.marker([co.lat, co.lng]).addTo(map).bindPopup('<b>' + co.name + '</b><br>' + co.street + '<br>' + co.zip + ' ' + co.city);
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
      msg.innerHTML = '<div class="notice ok">Vielen Dank! Ihre Nachricht ist eingegangen. Wir melden uns schnellstmöglich.</div>'; cf.reset(); torproToast('Nachricht gesendet');
    }).catch(function () {
      var body = encodeURIComponent('Name: ' + f.name + '\nTelefon: ' + f.phone + '\nE-Mail: ' + f.email + '\nAnliegen: ' + f.topic + '\n\n' + f.message);
      msg.innerHTML = '<div class="notice err">Senden nicht möglich. <a href="mailto:' + co.email + '?subject=' + encodeURIComponent('Anfrage: ' + f.topic) + '&body=' + body + '">Hier klicken, um die Nachricht per E-Mail zu senden.</a></div>';
    });
  });
})();
