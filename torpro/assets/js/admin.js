/* =========================================================
   TorPro Adminbereich – Dashboard, Kalender, Karte, Aufträge,
   Anfragen, Kunden, Team, Einstellungen
   ========================================================= */
(function () {
  var S = window.TorProStore, C = window.TORPRO_CONFIG, co = C.company;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmtEur = function (n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(+n || 0); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var toISO = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var todayISO = function () { return toISO(new Date()); };
  var parseISO = function (s) { var p = (s || '').split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var addDays = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };
  var fmtDate = function (s) { if (!s) return '–'; var d = parseISO(s); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); };
  var fmtDateTime = function (iso) { if (!iso) return '–'; var d = new Date(iso); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  var WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  var STATUS = { offen: { label: 'Offen', color: '#6b7280' }, geplant: { label: 'Geplant', color: '#1f6fd6' }, in_arbeit: { label: 'In Arbeit', color: '#f47a1f' }, erledigt: { label: 'Erledigt', color: '#16a34a' }, abgerechnet: { label: 'Abgerechnet', color: '#111827' }, storniert: { label: 'Storniert', color: '#b91c1c' } };
  var TYPES = ['Montage', 'Wartung / UVV', 'Reparatur', 'Aufmaß', 'Notdienst', 'Lieferung', 'Sonstiges'];
  var REQ_STATUS = { neu: { label: 'Neu', color: '#f47a1f' }, kontaktiert: { label: 'Kontaktiert', color: '#1f6fd6' }, angebot: { label: 'Angebot gesendet', color: '#7c3aed' }, gewonnen: { label: 'Gewonnen', color: '#16a34a' }, verloren: { label: 'Verloren', color: '#6b7280' } };
  var EVENT_TYPES = { urlaub: 'Urlaub', krank: 'Krank', schulung: 'Schulung', intern: 'Intern / Büro', sonstiges: 'Sonstiges' };
  var TEAM_COLORS = ['#1f6fd6', '#f47a1f', '#16a34a', '#7c3aed', '#db2777', '#0891b2', '#ca8a04', '#4b5563'];

  var data = { orders: [], requests: [], team: [], events: [] };
  var user = null, unsubs = [], current = null, calState = { mode: 'month', cursor: new Date(), team: '' }, mapState = { map: null, layer: null, status: '', team: '', range: 'upcoming' };

  /* ---------- Toast / Modal ---------- */
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 2600); }
  function openModal(title, body, foot) { $('#modal-title').textContent = title; $('#modal-body').innerHTML = body; $('#modal-foot').innerHTML = foot || ''; $('#modal').hidden = false; document.body.style.overflow = 'hidden'; return $('#modal'); }
  function closeModal() { $('#modal').hidden = true; document.body.style.overflow = ''; }
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', function (e) { if (e.target === $('#modal')) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
  function confirmDlg(text) { return new Promise(function (res) { openModal('Bestätigen', '<p>' + esc(text) + '</p>', '<button class="btn btn-ghost" id="c-no">Abbrechen</button><button class="btn btn-danger" id="c-yes">Ja, löschen</button>'); $('#c-no').onclick = function () { closeModal(); res(false); }; $('#c-yes').onclick = function () { closeModal(); res(true); }; }); }

  /* ---------- Helpers ---------- */
  function teamById(id) { return data.team.find(function (t) { return t.id === id; }); }
  function teamName(id) { var t = teamById(id); return t ? t.name : '?'; }
  function avatars(ids) { return (ids || []).map(function (id) { var t = teamById(id); return t ? '<span class="avatar" title="' + esc(t.name) + '" style="background:' + t.color + '">' + esc(initials(t.name)) + '</span>' : ''; }).join(''); }
  function initials(n) { return (n || '?').split(/\s+/).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase(); }
  function chip(st, map) { var s = (map || STATUS)[st] || { label: st, color: '#6b7280' }; return '<span class="chip" style="background:' + s.color + '">' + esc(s.label) + '</span>'; }
  function orderColor(o) { var t = o.assigned && o.assigned.length ? teamById(o.assigned[0]) : null; return t ? t.color : (STATUS[o.status] || STATUS.offen).color; }
  function addr(o) { var a = o.address || {}; return [a.street, [a.zip, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', '); }
  function nextOrderNr() { var y = new Date().getFullYear(); var n = data.orders.filter(function (o) { return (o.nr || '').indexOf('A-' + y) === 0; }).length + 1; return 'A-' + y + '-' + ('000' + n).slice(-4); }
  function mapsUrl(o) { return o.lat && o.lng ? 'https://www.google.com/maps/dir/?api=1&destination=' + o.lat + ',' + o.lng : 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(addr(o)); }
  function geocode(q) {
    return fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=de&q=' + encodeURIComponent(q), { headers: { 'Accept-Language': 'de' } })
      .then(function (r) { return r.json(); }).then(function (j) { if (!j || !j.length) throw new Error('Adresse nicht gefunden'); return { lat: +j[0].lat, lng: +j[0].lon, display: j[0].display_name }; });
  }
  function download(name, text) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); }
  function selectOpts(obj, sel, labelFn) { return Object.keys(obj).map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(labelFn ? labelFn(obj[k]) : obj[k]) + '</option>'; }).join(''); }

  /* ---------- Auth ---------- */
  $('#login-mode').innerHTML = S.mode === 'firebase' ? 'Verbunden mit Firebase – Anmeldung mit Ihrem Mitarbeiterkonto.' : '<b>Demo-Modus</b> (kein Firebase konfiguriert): Daten werden nur in diesem Browser gespeichert.<br>Login: <code>' + esc(C.demoUsers[0].email) + '</code> / <code>' + esc(C.demoUsers[0].password) + '</code>';
  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault(); var m = $('#login-msg'); m.innerHTML = '';
    S.auth.login($('#l-email').value.trim(), $('#l-pass').value).catch(function (err) { m.innerHTML = '<div class="notice err" style="margin-bottom:1rem">' + esc(err.message) + '</div>'; });
  });
  $('#logout').addEventListener('click', function () { S.auth.logout(); });
  S.auth.onChange(function (u) { user = u; if (u) showApp(); else showLogin(); });
  function showLogin() { unsubs.forEach(function (f) { f(); }); unsubs = []; $('#app').hidden = true; $('#login').hidden = false; }
  function showApp() {
    $('#login').hidden = true; $('#app').hidden = false;
    $('#user-name').textContent = user.name || user.email; $('#user-email').textContent = user.email;
    var pill = $('#mode-pill'); pill.textContent = S.mode === 'firebase' ? 'LIVE · Firebase' : 'DEMO · lokal'; pill.classList.toggle('live', S.mode === 'firebase');
    ['orders', 'requests', 'team', 'events'].forEach(function (c) { unsubs.push(S.watch(c, function (rows) { data[c] = rows; onData(); })); });
    route();
  }
  function onData() {
    var n = data.requests.filter(function (r) { return r.status === 'neu'; }).length; var b = $('#badge-req'); b.textContent = n; b.hidden = !n;
    if (current) render(current, true);
  }

  /* ---------- Routing ---------- */
  var VIEWS = { dashboard: ['Dashboard', renderDashboard], kalender: ['Kalender', renderCalendar], karte: ['Auftragskarte', renderMap], auftraege: ['Aufträge', renderOrders], anfragen: ['Anfragen', renderRequests], kunden: ['Kunden', renderCustomers], team: ['Team', renderTeam], einstellungen: ['Einstellungen', renderSettings] };
  window.addEventListener('hashchange', route);
  $('#side-toggle').addEventListener('click', function () { $('#sidebar').classList.toggle('open'); });
  $$('#sidebar nav a').forEach(function (a) { a.addEventListener('click', function () { $('#sidebar').classList.remove('open'); }); });
  function route() { var v = (location.hash || '#dashboard').slice(1).split('?')[0]; if (!VIEWS[v]) v = 'dashboard'; render(v, false); }
  function render(v, isUpdate) {
    current = v; var def = VIEWS[v];
    $('#view-title').textContent = def[0];
    $$('#sidebar nav a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-view') === v); });
    if (!isUpdate) $('#top-actions').innerHTML = '';
    def[1](isUpdate);
  }
  function setActions(html) { $('#top-actions').innerHTML = html; }

  /* ================= DASHBOARD ================= */
  function renderDashboard() {
    var t = todayISO(), in7 = toISO(addDays(new Date(), 7)), month = t.slice(0, 7);
    var newReq = data.requests.filter(function (r) { return r.status === 'neu'; }).length;
    var open = data.orders.filter(function (o) { return ['offen', 'geplant', 'in_arbeit'].indexOf(o.status) >= 0; }).length;
    var todayJobs = data.orders.filter(function (o) { return o.date === t && o.status !== 'storniert'; });
    var revenue = data.orders.filter(function (o) { return ['erledigt', 'abgerechnet'].indexOf(o.status) >= 0 && (o.date || '').slice(0, 7) === month; }).reduce(function (s, o) { return s + (+o.price || 0); }, 0);
    var upcoming = data.orders.filter(function (o) { return o.date && o.date >= t && o.date <= in7 && o.status !== 'storniert' && o.status !== 'erledigt'; }).sort(function (a, b) { return (a.date + (a.timeStart || '')).localeCompare(b.date + (b.timeStart || '')); });
    var unplanned = data.orders.filter(function (o) { return !o.date && o.status === 'offen'; });
    setActions('<button class="btn btn-primary btn-sm" id="a-new-order">+ Auftrag</button>');
    $('#view').innerHTML =
      '<div class="kpis">' +
      '<div class="kpi orange" onclick="location.hash=\'anfragen\'"><b>' + newReq + '</b><span>Neue Anfragen</span></div>' +
      '<div class="kpi blue" onclick="location.hash=\'auftraege\'"><b>' + open + '</b><span>Offene Aufträge</span></div>' +
      '<div class="kpi" onclick="location.hash=\'kalender\'"><b>' + todayJobs.length + '</b><span>Termine heute</span></div>' +
      '<div class="kpi green"><b>' + fmtEur(revenue) + '</b><span>Umsatz ' + MONTHS[+month.slice(5) - 1] + ' (erledigt)</span></div>' +
      '</div>' +
      '<div class="grid dash">' +
      '<div class="panel"><h3>Nächste 7 Tage <a href="#kalender">Kalender →</a></h3>' + orderList(upcoming, true) + '</div>' +
      '<div class="panel"><h3>Neueste Anfragen <a href="#anfragen">Alle →</a></h3>' + requestList(data.requests.slice(0, 6)) + '</div>' +
      '<div class="panel"><h3>Aufträge ohne Termin</h3>' + orderList(unplanned, false) + '</div>' +
      '<div class="panel"><h3>Team heute</h3>' + teamToday() + '</div>' +
      '</div>';
    $('#a-new-order').onclick = function () { orderForm(null); };
    bindLists();
  }
  function orderList(list, withDate) {
    if (!list.length) return '<div class="empty">Keine Einträge</div>';
    return '<ul class="list">' + list.map(function (o) { return '<li data-order="' + o.id + '"><span class="when">' + (withDate ? (o.date === todayISO() ? 'Heute' : fmtDate(o.date).slice(0, 6)) + (o.timeStart ? '<br><small>' + esc(o.timeStart) + '</small>' : '') : esc(o.nr || '')) + '</span><span class="what"><b>' + esc(o.title || o.type) + ' – ' + esc(o.customer && o.customer.name) + '</b><small>' + esc(addr(o)) + '</small></span>' + avatars(o.assigned) + ' ' + chip(o.status) + '</li>'; }).join('') + '</ul>';
  }
  function requestList(list) {
    if (!list.length) return '<div class="empty">Keine Anfragen</div>';
    return '<ul class="list">' + list.map(function (r) { return '<li data-request="' + r.id + '"><span class="when">' + fmtDate((r.createdAt || '').slice(0, 10)).slice(0, 6) + '</span><span class="what"><b>' + esc(r.contact && r.contact.name) + ' · ' + (r.kind === 'konfigurator' ? 'Konfigurator' : esc(r.topic || 'Kontakt')) + '</b><small>' + (r.priceGross ? 'ca. ' + fmtEur(r.priceGross) + ' · ' : '') + esc((r.contact && r.contact.city) || (r.message || '').slice(0, 60)) + '</small></span>' + chip(r.status, REQ_STATUS) + '</li>'; }).join('') + '</ul>';
  }
  function teamToday() {
    if (!data.team.length) return '<div class="empty">Noch keine Monteure angelegt – <a href="#team">Team anlegen</a></div>';
    var t = todayISO();
    return '<ul class="list">' + data.team.map(function (m) {
      var abs = data.events.find(function (e) { return e.teamId === m.id && e.start <= t && (e.end || e.start) >= t; });
      var jobs = data.orders.filter(function (o) { return o.date === t && (o.assigned || []).indexOf(m.id) >= 0; });
      return '<li style="cursor:default"><span class="avatar" style="background:' + m.color + ';margin-right:.4rem">' + esc(initials(m.name)) + '</span><span class="what"><b>' + esc(m.name) + '</b><small>' + (abs ? EVENT_TYPES[abs.type] || abs.title : jobs.length ? jobs.length + ' Termin(e) heute' : 'frei') + '</small></span></li>';
    }).join('') + '</ul>';
  }
  function bindLists() {
    $$('[data-order]').forEach(function (li) { li.addEventListener('click', function () { var o = data.orders.find(function (x) { return x.id === li.getAttribute('data-order'); }); if (o) orderForm(o); }); });
    $$('[data-request]').forEach(function (li) { li.addEventListener('click', function () { var r = data.requests.find(function (x) { return x.id === li.getAttribute('data-request'); }); if (r) requestDetail(r); }); });
  }

  /* ================= KALENDER ================= */
  function renderCalendar() {
    var cs = calState, d = cs.cursor;
    setActions('<button class="btn btn-ghost btn-sm" id="a-new-event">+ Abwesenheit</button><button class="btn btn-primary btn-sm" id="a-new-order">+ Termin / Auftrag</button>');
    var title = cs.mode === 'month' ? MONTHS[d.getMonth()] + ' ' + d.getFullYear() : 'KW ' + isoWeek(d) + ' · ' + fmtDate(toISO(startOfWeek(d))) + ' – ' + fmtDate(toISO(addDays(startOfWeek(d), 6)));
    var html = '<div class="cal-head"><button class="btn btn-ghost btn-sm" id="cal-prev">‹</button><button class="btn btn-ghost btn-sm" id="cal-today">Heute</button><button class="btn btn-ghost btn-sm" id="cal-next">›</button><h2>' + title + '</h2>' +
      '<span class="seg"><button data-mode="month" class="' + (cs.mode === 'month' ? 'active' : '') + '">Monat</button><button data-mode="week" class="' + (cs.mode === 'week' ? 'active' : '') + '">Woche</button><button data-mode="list" class="' + (cs.mode === 'list' ? 'active' : '') + '">Liste</button></span>' +
      '<select id="cal-team" style="width:auto"><option value="">Alle Monteure</option>' + data.team.map(function (t) { return '<option value="' + t.id + '"' + (cs.team === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="cal-legend">' + data.team.map(function (t) { return '<span><i style="background:' + t.color + '"></i>' + esc(t.name) + '</span>'; }).join('') + '<span><i style="background:#6b7280"></i>nicht zugewiesen</span><span><i style="background:#b4b9c2"></i>Abwesenheit</span></div>';
    if (cs.mode === 'month') html += monthGrid(d); else if (cs.mode === 'week') html += weekGrid(d); else html += listView();
    $('#view').innerHTML = html;
    $('#cal-prev').onclick = function () { cs.cursor = cs.mode === 'month' ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : addDays(d, -7); renderCalendar(); };
    $('#cal-next').onclick = function () { cs.cursor = cs.mode === 'month' ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : addDays(d, 7); renderCalendar(); };
    $('#cal-today').onclick = function () { cs.cursor = new Date(); renderCalendar(); };
    $$('.seg button').forEach(function (b) { b.onclick = function () { cs.mode = b.getAttribute('data-mode'); renderCalendar(); }; });
    $('#cal-team').onchange = function (e) { cs.team = e.target.value; renderCalendar(); };
    $('#a-new-order').onclick = function () { orderForm(null, { date: todayISO() }); };
    $('#a-new-event').onclick = function () { eventForm(null, { start: todayISO() }); };
    $$('[data-day]').forEach(function (el) { el.addEventListener('click', function (e) { if (e.target.closest('[data-order],[data-event]')) return; dayMenu(el.getAttribute('data-day')); }); });
    $$('[data-event]').forEach(function (el) { el.addEventListener('click', function () { var ev = data.events.find(function (x) { return x.id === el.getAttribute('data-event'); }); if (ev) eventForm(ev); }); });
    bindLists();
  }
  function startOfWeek(d) { var x = new Date(d); var day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
  function isoWeek(d) { var x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); var day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day); var y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x - y) / 864e5 + 1) / 7); }
  function itemsOn(iso) {
    var t = calState.team;
    var orders = data.orders.filter(function (o) { return o.date === iso && o.status !== 'storniert' && (!t || (o.assigned || []).indexOf(t) >= 0); }).sort(function (a, b) { return (a.timeStart || '').localeCompare(b.timeStart || ''); });
    var events = data.events.filter(function (e) { return e.start <= iso && (e.end || e.start) >= iso && (!t || e.teamId === t); });
    return { orders: orders, events: events };
  }
  function calItem(o) { return '<span class="cal-item" data-order="' + o.id + '" style="background:' + orderColor(o) + '" title="' + esc((o.title || o.type) + ' – ' + (o.customer && o.customer.name)) + '">' + (o.timeStart ? '<small>' + esc(o.timeStart) + '</small> ' : '') + esc(o.customer && o.customer.name || o.title) + '<br><small>' + esc(o.type) + (o.address && o.address.city ? ' · ' + esc(o.address.city) : '') + '</small></span>'; }
  function calEvent(e) { var t = teamById(e.teamId); return '<span class="cal-item absence" data-event="' + e.id + '" style="color:#111">' + esc(t ? t.name : '') + ': ' + esc(EVENT_TYPES[e.type] || e.title) + '</span>'; }
  function monthGrid(d) {
    var first = new Date(d.getFullYear(), d.getMonth(), 1), start = startOfWeek(first), t = todayISO();
    var h = '<div class="cal-grid">' + ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(function (w) { return '<div class="dow">' + w + '</div>'; }).join('');
    for (var i = 0; i < 42; i++) {
      var day = addDays(start, i), iso = toISO(day); if (i >= 35 && day.getMonth() !== d.getMonth()) break;
      var it = itemsOn(iso), cls = 'cal-day' + (day.getMonth() !== d.getMonth() ? ' other' : '') + (iso === t ? ' today' : '') + (day.getDay() % 6 === 0 ? ' weekend' : '');
      var all = it.events.map(calEvent).concat(it.orders.map(calItem));
      h += '<div class="' + cls + '" data-day="' + iso + '"><span class="dnum">' + day.getDate() + '</span>' + all.slice(0, 4).join('') + (all.length > 4 ? '<span class="cal-more">+ ' + (all.length - 4) + ' weitere</span>' : '') + '</div>';
    }
    return h + '</div>';
  }
  function weekGrid(d) {
    var start = startOfWeek(d), t = todayISO(), h = '<div class="cal-week">';
    for (var i = 0; i < 7; i++) {
      var day = addDays(start, i), iso = toISO(day), it = itemsOn(iso);
      h += '<div class="wday' + (iso === t ? ' today' : '') + '" data-day="' + iso + '"><h4>' + WD[day.getDay()] + '<b>' + day.getDate() + '.' + (day.getMonth() + 1) + '.</b></h4>' + it.events.map(calEvent).join('') + it.orders.map(calItem).join('') + (!it.orders.length && !it.events.length ? '<div class="empty" style="padding:.5rem">–</div>' : '') + '</div>';
    }
    return h + '</div>';
  }
  function listView() {
    var t = todayISO(), end = toISO(addDays(new Date(), 60));
    var list = data.orders.filter(function (o) { return o.date && o.date >= t && o.date <= end && o.status !== 'storniert' && (!calState.team || (o.assigned || []).indexOf(calState.team) >= 0); }).sort(function (a, b) { return (a.date + (a.timeStart || '')).localeCompare(b.date + (b.timeStart || '')); });
    return '<div class="panel"><h3>Termine der nächsten 60 Tage</h3>' + orderList(list, true) + '</div>';
  }
  function dayMenu(iso) {
    openModal(fmtDate(iso), '<p>Was möchten Sie für diesen Tag anlegen?</p>', '<button class="btn btn-ghost" id="dm-ev">Abwesenheit</button><button class="btn btn-primary" id="dm-or">Termin / Auftrag</button>');
    $('#dm-or').onclick = function () { orderForm(null, { date: iso }); };
    $('#dm-ev').onclick = function () { eventForm(null, { start: iso }); };
  }

  /* ================= KARTE ================= */
  function renderMap(isUpdate) {
    var ms = mapState;
    if (!isUpdate || !$('#map-admin')) {
      $('#view').innerHTML = '<div class="toolbar"><select id="m-status"><option value="">Alle Status</option>' + selectOpts(STATUS, ms.status, function (s) { return s.label; }) + '</select>' +
        '<select id="m-team"><option value="">Alle Monteure</option>' + data.team.map(function (t) { return '<option value="' + t.id + '"' + (ms.team === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select>' +
        '<select id="m-range"><option value="upcoming"' + (ms.range === 'upcoming' ? ' selected' : '') + '>Anstehend & ohne Termin</option><option value="today"' + (ms.range === 'today' ? ' selected' : '') + '>Nur heute</option><option value="week"' + (ms.range === 'week' ? ' selected' : '') + '>Diese Woche</option><option value="all"' + (ms.range === 'all' ? ' selected' : '') + '>Alle Aufträge</option></select>' +
        '<span class="spacer"></span><button class="btn btn-ghost btn-sm" id="m-geocode-all">Fehlende Koordinaten ermitteln</button></div>' +
        '<div class="map-layout"><div id="map-admin"></div><div class="map-side panel"><h3>Aufträge <span id="m-count"></span></h3><ul class="list" id="m-list"></ul></div></div>';
      $('#m-status').onchange = function (e) { ms.status = e.target.value; renderMap(true); };
      $('#m-team').onchange = function (e) { ms.team = e.target.value; renderMap(true); };
      $('#m-range').onchange = function (e) { ms.range = e.target.value; renderMap(true); };
      $('#m-geocode-all').onclick = geocodeAll;
      ms.map = null;
    }
    var list = filteredMapOrders();
    if (!window.L) { $('#map-admin').innerHTML = '<div class="empty" style="padding:2rem">Kartenbibliothek (Leaflet) konnte nicht geladen werden – bitte Internetverbindung prüfen.</div>'; }
    else {
      if (!ms.map) {
        ms.map = L.map('map-admin').setView([co.lat, co.lng], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(ms.map);
        L.marker([co.lat, co.lng], { icon: L.divIcon({ className: '', html: '<div class="marker-pin home"></div>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(ms.map).bindPopup('<b>' + esc(co.name) + '</b><br>' + esc(co.street) + ', ' + esc(co.zip + ' ' + co.city));
        ms.layer = L.layerGroup().addTo(ms.map);
      }
      ms.layer.clearLayers(); var bounds = [[co.lat, co.lng]];
      list.filter(function (o) { return o.lat && o.lng; }).forEach(function (o) {
        var m = L.marker([o.lat, o.lng], { icon: L.divIcon({ className: '', html: '<div class="marker-pin" style="background:' + orderColor(o) + '"></div>', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -26] }) }).addTo(ms.layer);
        m.bindPopup('<b>' + esc(o.nr || '') + ' ' + esc(o.title || o.type) + '</b><br>' + esc(o.customer && o.customer.name) + '<br>' + esc(addr(o)) + '<br>' + (o.date ? fmtDate(o.date) + ' ' + esc(o.timeStart || '') : 'kein Termin') + ' · ' + chip(o.status) + '<br><a href="#" data-open-order="' + o.id + '">Öffnen</a> · <a href="' + mapsUrl(o) + '" target="_blank" rel="noopener">Route</a>');
        m.on('popupopen', function () { var a = $('[data-open-order="' + o.id + '"]'); if (a) a.onclick = function (e) { e.preventDefault(); orderForm(o); }; });
        o._marker = m; bounds.push([o.lat, o.lng]);
      });
      if (bounds.length > 1) ms.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      setTimeout(function () { ms.map.invalidateSize(); }, 100);
    }
    $('#m-count').textContent = '(' + list.length + ')';
    $('#m-list').innerHTML = list.length ? list.map(function (o) { return '<li data-mo="' + o.id + '"><span class="when" style="color:' + orderColor(o) + '">' + (o.date ? fmtDate(o.date).slice(0, 6) : '–') + '</span><span class="what"><b>' + esc(o.customer && o.customer.name) + ' · ' + esc(o.type) + '</b><small>' + esc(addr(o)) + (o.lat ? '' : ' · <em style="color:#b45309">keine Koordinaten</em>') + '</small></span>' + chip(o.status) + '</li>'; }).join('') : '<div class="empty">Keine Aufträge im Filter</div>';
    $$('[data-mo]').forEach(function (li) { li.onclick = function () { var o = list.find(function (x) { return x.id === li.getAttribute('data-mo'); }); if (o && o._marker && ms.map) { ms.map.setView([o.lat, o.lng], 14); o._marker.openPopup(); } else if (o) orderForm(o); }; });
  }
  function filteredMapOrders() {
    var ms = mapState, t = todayISO(), ws = toISO(startOfWeek(new Date())), we = toISO(addDays(startOfWeek(new Date()), 6));
    return data.orders.filter(function (o) {
      if (o.status === 'storniert' && ms.status !== 'storniert') return false;
      if (ms.status && o.status !== ms.status) return false;
      if (ms.team && (o.assigned || []).indexOf(ms.team) < 0) return false;
      if (ms.range === 'today') return o.date === t;
      if (ms.range === 'week') return o.date >= ws && o.date <= we;
      if (ms.range === 'upcoming') return (!o.date || o.date >= t) && ['erledigt', 'abgerechnet'].indexOf(o.status) < 0;
      return true;
    }).sort(function (a, b) { return (a.date || '9999').localeCompare(b.date || '9999'); });
  }
  function geocodeAll() {
    var todo = data.orders.filter(function (o) { return !o.lat && addr(o); }); if (!todo.length) return toast('Alle Aufträge haben Koordinaten.');
    toast(todo.length + ' Adressen werden ermittelt …'); var i = 0;
    (function next() { if (i >= todo.length) return toast('Fertig.'); var o = todo[i++]; geocode(addr(o)).then(function (g) { return S.update('orders', o.id, { lat: g.lat, lng: g.lng }); }).catch(function () { }).then(function () { setTimeout(next, 1100); }); })();
  }

  /* ================= AUFTRÄGE ================= */
  var orderFilter = { q: '', status: '', team: '' };
  function renderOrders() {
    var f = orderFilter;
    setActions('<button class="btn btn-primary btn-sm" id="a-new-order">+ Auftrag</button>');
    var list = data.orders.filter(function (o) {
      if (f.status && o.status !== f.status) return false; if (f.team && (o.assigned || []).indexOf(f.team) < 0) return false;
      if (f.q) { var s = [o.nr, o.title, o.type, o.customer && o.customer.name, o.customer && o.customer.phone, addr(o), o.notes].join(' ').toLowerCase(); if (s.indexOf(f.q.toLowerCase()) < 0) return false; }
      return true;
    }).sort(function (a, b) { return (b.date || '0000').localeCompare(a.date || '0000') || (b.createdAt || '').localeCompare(a.createdAt || ''); });
    $('#view').innerHTML = '<div class="toolbar"><input id="o-q" placeholder="Suche (Kunde, Nr., Ort …)" value="' + esc(f.q) + '"><select id="o-status"><option value="">Alle Status</option>' + selectOpts(STATUS, f.status, function (s) { return s.label; }) + '</select><select id="o-team"><option value="">Alle Monteure</option>' + data.team.map(function (t) { return '<option value="' + t.id + '"' + (f.team === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select><span class="spacer"></span><span class="hint">' + list.length + ' Aufträge</span></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>Nr.</th><th>Termin</th><th>Kunde</th><th>Auftrag</th><th>Adresse</th><th>Monteure</th><th>Status</th><th>Preis</th></tr></thead><tbody>' +
      (list.length ? list.map(function (o) { return '<tr class="row" data-order="' + o.id + '"><td>' + esc(o.nr) + '</td><td>' + (o.date ? fmtDate(o.date) + (o.timeStart ? '<br><small>' + esc(o.timeStart) + (o.timeEnd ? '–' + esc(o.timeEnd) : '') + '</small>' : '') : '<em style="color:#b45309">offen</em>') + '</td><td><b>' + esc(o.customer && o.customer.name) + '</b><br><small>' + esc(o.customer && o.customer.phone) + '</small></td><td class="wrap">' + esc(o.title || '') + '<br><small>' + esc(o.type) + '</small></td><td class="wrap">' + esc(addr(o)) + '</td><td>' + avatars(o.assigned) + '</td><td>' + chip(o.status) + '</td><td>' + (o.price ? fmtEur(o.price) : '–') + '</td></tr>'; }).join('') : '<tr><td colspan="8" class="empty">Keine Aufträge gefunden</td></tr>') + '</tbody></table></div>';
    $('#o-q').oninput = function (e) { f.q = e.target.value; renderOrders(); var i = $('#o-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
    $('#o-status').onchange = function (e) { f.status = e.target.value; renderOrders(); };
    $('#o-team').onchange = function (e) { f.team = e.target.value; renderOrders(); };
    $('#a-new-order').onclick = function () { orderForm(null); };
    bindLists();
  }
  function orderForm(o, preset) {
    var isNew = !o; o = Object.assign({ nr: nextOrderNr(), title: '', type: 'Montage', status: 'offen', customer: { name: '', phone: '', email: '' }, address: { street: '', zip: '', city: '' }, date: '', timeStart: '', timeEnd: '', assigned: [], price: '', notes: '', lat: null, lng: null }, preset || {}, o || {});
    o.customer = o.customer || {}; o.address = o.address || {};
    var body = '<div class="row"><div class="field"><label>Auftragsnr.</label><input id="f-nr" value="' + esc(o.nr) + '"></div><div class="field"><label>Art</label><select id="f-type">' + TYPES.map(function (t) { return '<option' + (t === o.type ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div><div class="field"><label>Status</label><select id="f-status">' + selectOpts(STATUS, o.status, function (s) { return s.label; }) + '</select></div></div>' +
      '<div class="field"><label>Bezeichnung</label><input id="f-title" placeholder="z. B. Sektionaltor 2500×2125 anthrazit inkl. Antrieb" value="' + esc(o.title) + '"></div>' +
      '<div class="row"><div class="field"><label>Kunde *</label><input id="f-cname" value="' + esc(o.customer.name) + '" required></div><div class="field"><label>Telefon</label><input id="f-cphone" value="' + esc(o.customer.phone) + '"></div><div class="field"><label>E-Mail</label><input id="f-cemail" value="' + esc(o.customer.email) + '"></div></div>' +
      '<div class="row"><div class="field" style="grid-column:span 2"><label>Straße, Nr.</label><input id="f-street" value="' + esc(o.address.street) + '"></div><div class="field"><label>PLZ</label><input id="f-zip" value="' + esc(o.address.zip) + '"></div><div class="field"><label>Ort</label><input id="f-city" value="' + esc(o.address.city) + '"></div></div>' +
      '<div class="field"><button type="button" class="btn btn-ghost btn-sm" id="f-geo">📍 Koordinaten aus Adresse ermitteln</button> <span class="hint" id="f-geo-msg" style="display:inline">' + (o.lat ? 'Position: ' + (+o.lat).toFixed(4) + ', ' + (+o.lng).toFixed(4) : 'noch keine Position für die Karte') + '</span></div>' +
      '<div class="row"><div class="field"><label>Datum</label><input id="f-date" type="date" value="' + esc(o.date) + '"></div><div class="field"><label>Von</label><input id="f-ts" type="time" value="' + esc(o.timeStart) + '"></div><div class="field"><label>Bis</label><input id="f-te" type="time" value="' + esc(o.timeEnd) + '"></div><div class="field"><label>Preis (brutto)</label><input id="f-price" type="number" step="1" value="' + esc(o.price) + '"></div></div>' +
      '<div class="field"><label>Monteure</label><div class="team-checks" id="f-team">' + (data.team.length ? data.team.map(function (t) { var on = (o.assigned || []).indexOf(t.id) >= 0; return '<label class="' + (on ? 'on' : '') + '"><input type="checkbox" value="' + t.id + '"' + (on ? ' checked' : '') + '><span class="color-dot" style="background:' + t.color + '"></span>' + esc(t.name) + '</label>'; }).join('') : '<span class="hint">Noch keine Monteure – unter „Team“ anlegen.</span>') + '</div></div>' +
      '<div class="field"><label>Notizen / Material / Checkliste</label><textarea id="f-notes">' + esc(o.notes) + '</textarea></div>';
    var foot = '<div class="left">' + (!isNew ? '<button class="btn btn-danger btn-sm" id="f-del">Löschen</button><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + mapsUrl(o) + '">Route</a>' + (o.customer.phone ? '<a class="btn btn-ghost btn-sm" href="tel:' + esc(o.customer.phone) + '">Anrufen</a>' : '') + '<button class="btn btn-ghost btn-sm" id="f-print">Drucken</button>' : '') + '</div><button class="btn btn-ghost" id="f-cancel">Abbrechen</button><button class="btn btn-primary" id="f-save">Speichern</button>';
    openModal(isNew ? 'Neuer Auftrag' : 'Auftrag ' + o.nr, body, foot);
    $$('#f-team label').forEach(function (l) { l.querySelector('input').onchange = function (e) { l.classList.toggle('on', e.target.checked); }; });
    $('#f-cancel').onclick = closeModal;
    $('#f-geo').onclick = function () { var q = [$('#f-street').value, $('#f-zip').value, $('#f-city').value].filter(Boolean).join(', '); if (!q) return; $('#f-geo-msg').textContent = 'suche …'; geocode(q).then(function (g) { o.lat = g.lat; o.lng = g.lng; $('#f-geo-msg').textContent = 'Gefunden: ' + g.display; }).catch(function (e) { $('#f-geo-msg').textContent = e.message; }); };
    $('#f-save').onclick = function () {
      var d = { nr: $('#f-nr').value.trim(), type: $('#f-type').value, status: $('#f-status').value, title: $('#f-title').value.trim(), customer: { name: $('#f-cname').value.trim(), phone: $('#f-cphone').value.trim(), email: $('#f-cemail').value.trim() }, address: { street: $('#f-street').value.trim(), zip: $('#f-zip').value.trim(), city: $('#f-city').value.trim() }, date: $('#f-date').value, timeStart: $('#f-ts').value, timeEnd: $('#f-te').value, price: +$('#f-price').value || 0, assigned: $$('#f-team input:checked').map(function (i) { return i.value; }), notes: $('#f-notes').value.trim(), lat: o.lat || null, lng: o.lng || null, requestId: o.requestId || null };
      if (!d.customer.name) { toast('Bitte Kundenname eingeben'); return; }
      if (d.status === 'offen' && d.date) d.status = 'geplant';
      var save = function () { return isNew ? S.add('orders', d) : S.update('orders', o.id, d); };
      var geo = (!d.lat && (d.address.street || d.address.city)) ? geocode([d.address.street, d.address.zip, d.address.city].filter(Boolean).join(', ')).then(function (g) { d.lat = g.lat; d.lng = g.lng; }).catch(function () { }) : Promise.resolve();
      geo.then(save).then(function () { if (o.requestId && isNew) S.update('requests', o.requestId, { status: 'gewonnen' }).catch(function () { }); closeModal(); toast('Auftrag gespeichert'); }).catch(function (e) { toast('Fehler: ' + e.message); });
    };
    if (!isNew) {
      $('#f-del').onclick = function () { confirmDlg('Auftrag ' + o.nr + ' wirklich löschen?').then(function (ok) { if (ok) S.remove('orders', o.id).then(function () { toast('Gelöscht'); }); }); };
      $('#f-print').onclick = function () { printOrder(o); };
    }
  }
  function printOrder(o) {
    var w = window.open('', '_blank'); if (!w) return;
    w.document.write('<html><head><title>Montageauftrag ' + esc(o.nr) + '</title><style>body{font-family:Arial,sans-serif;padding:24px;max-width:720px;margin:auto;color:#111}h1{font-size:22px;margin:0 0 4px}h2{font-size:14px;color:#555;margin:0 0 16px}dl{display:grid;grid-template-columns:150px 1fr;gap:6px 12px}dt{font-weight:bold;color:#555}dd{margin:0}.box{border:1px solid #ccc;border-radius:8px;padding:12px;margin-top:16px;min-height:120px}.sig{display:flex;gap:40px;margin-top:40px}.sig div{flex:1;border-top:1px solid #333;padding-top:6px;font-size:12px;color:#555}</style></head><body>' +
      '<h1>Montageauftrag ' + esc(o.nr) + '</h1><h2>' + esc(co.name) + ' · ' + esc(co.street) + ', ' + esc(co.zip + ' ' + co.city) + ' · ' + esc(co.phoneDisplay) + '</h2>' +
      '<dl><dt>Art</dt><dd>' + esc(o.type) + '</dd><dt>Bezeichnung</dt><dd>' + esc(o.title || '–') + '</dd><dt>Kunde</dt><dd>' + esc(o.customer.name) + '<br>' + esc(o.customer.phone) + ' ' + esc(o.customer.email) + '</dd><dt>Adresse</dt><dd>' + esc(addr(o)) + '</dd><dt>Termin</dt><dd>' + fmtDate(o.date) + ' ' + esc(o.timeStart || '') + (o.timeEnd ? ' – ' + esc(o.timeEnd) : '') + '</dd><dt>Monteure</dt><dd>' + esc((o.assigned || []).map(teamName).join(', ') || '–') + '</dd><dt>Preis</dt><dd>' + (o.price ? fmtEur(o.price) : '–') + '</dd><dt>Status</dt><dd>' + esc((STATUS[o.status] || {}).label) + '</dd></dl>' +
      '<div class="box"><b>Notizen / Material</b><br>' + esc(o.notes || '').replace(/\n/g, '<br>') + '</div><div class="box"><b>Arbeitsbericht / Abnahme</b></div>' +
      '<div class="sig"><div>Datum, Unterschrift Monteur</div><div>Datum, Unterschrift Kunde</div></div><script>window.print()<\/script></body></html>');
    w.document.close();
  }

  /* ================= ANFRAGEN ================= */
  var reqFilter = { status: '' };
  function renderRequests() {
    var list = data.requests.filter(function (r) { return !reqFilter.status || r.status === reqFilter.status; });
    $('#view').innerHTML = '<div class="toolbar"><div class="subnav"><button data-s="" class="' + (!reqFilter.status ? 'active' : '') + '">Alle (' + data.requests.length + ')</button>' + Object.keys(REQ_STATUS).map(function (k) { return '<button data-s="' + k + '" class="' + (reqFilter.status === k ? 'active' : '') + '">' + REQ_STATUS[k].label + ' (' + data.requests.filter(function (r) { return r.status === k; }).length + ')</button>'; }).join('') + '</div></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>Eingang</th><th>Kontakt</th><th>Art</th><th>Details</th><th>Richtpreis</th><th>Status</th></tr></thead><tbody>' +
      (list.length ? list.map(function (r) { return '<tr class="row" data-request="' + r.id + '"><td>' + fmtDateTime(r.createdAt) + '</td><td><b>' + esc(r.contact && r.contact.name) + '</b><br><small>' + esc(r.contact && r.contact.phone) + ' · ' + esc(r.contact && r.contact.email) + '</small></td><td>' + (r.kind === 'konfigurator' ? 'Konfigurator' : 'Kontakt') + '</td><td class="wrap">' + esc(r.kind === 'konfigurator' ? (r.config ? C.pricing.types[r.config.type].label + ' ' + r.config.width + '×' + r.config.height + ' · ' + ((r.contact.zip || '') + ' ' + (r.contact.city || '')) : '') : (r.topic || '') + ': ' + (r.message || '').slice(0, 80)) + '</td><td>' + (r.priceGross ? fmtEur(r.priceGross) : '–') + '</td><td>' + chip(r.status, REQ_STATUS) + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="empty">Keine Anfragen</td></tr>') + '</tbody></table></div>';
    $$('.subnav button').forEach(function (b) { b.onclick = function () { reqFilter.status = b.getAttribute('data-s'); renderRequests(); }; });
    bindLists();
  }
  function requestDetail(r) {
    var c = r.contact || {};
    var body = '<div class="detail"><dl><dt>Eingang</dt><dd>' + fmtDateTime(r.createdAt) + '</dd><dt>Name</dt><dd>' + esc(c.name) + '</dd><dt>Telefon</dt><dd><a href="tel:' + esc(c.phone) + '">' + esc(c.phone) + '</a></dd><dt>E-Mail</dt><dd><a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></dd>' + (c.street || c.city ? '<dt>Adresse</dt><dd>' + esc([c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')) + '</dd>' : '') + (r.topic ? '<dt>Anliegen</dt><dd>' + esc(r.topic) + '</dd>' : '') + '<dt>Status</dt><dd><select id="r-status" style="width:auto">' + selectOpts(REQ_STATUS, r.status, function (s) { return s.label; }) + '</select></dd></dl>' +
      (r.configText ? '<b>Konfiguration</b>' + (r.configUrl ? ' · <a href="' + esc(r.configUrl) + '" target="_blank" rel="noopener">im Konfigurator öffnen ↗</a>' : '') + '<pre class="config">' + esc(r.configText) + '</pre>' : '') + (c.callback ? '<div class="notice" style="margin-bottom:.8rem">📞 Rückruf gewünscht' + (c.callbackTime ? ': ' + esc(c.callbackTime) : '') + '</div>' : '') + ((r.message || c.message) ? '<b>Nachricht</b><pre class="config">' + esc(r.message || c.message) + '</pre>' : '') + '</div>';
    var foot = '<div class="left"><button class="btn btn-danger btn-sm" id="r-del">Löschen</button></div><a class="btn btn-ghost" href="mailto:' + esc(c.email) + '?subject=' + encodeURIComponent('Ihre Anfrage bei TorPro Zugangstechnik') + '">Antworten</a><button class="btn btn-primary" id="r-convert">→ In Auftrag umwandeln</button>';
    openModal('Anfrage von ' + (c.name || ''), body, foot);
    $('#r-status').onchange = function (e) { S.update('requests', r.id, { status: e.target.value }).then(function () { toast('Status gespeichert'); }); };
    $('#r-del').onclick = function () { confirmDlg('Anfrage wirklich löschen?').then(function (ok) { if (ok) S.remove('requests', r.id).then(closeModal); }); };
    $('#r-convert').onclick = function () {
      var cfg = r.config; var title = cfg ? C.pricing.types[cfg.type].label + ' ' + cfg.width + '×' + cfg.height + ' mm' + (cfg.drive !== 'none' ? ' inkl. Antrieb' : '') : (r.topic || 'Anfrage');
      orderForm(null, { title: title, type: r.topic && /Wartung/.test(r.topic) ? 'Wartung / UVV' : r.topic && /Reparatur/.test(r.topic) ? 'Reparatur' : cfg ? 'Aufmaß' : 'Sonstiges', customer: { name: c.name || '', phone: c.phone || '', email: c.email || '' }, address: { street: c.street || '', zip: c.zip || '', city: c.city || '' }, price: r.priceGross || '', notes: (r.configText || r.message || '') + (c.message ? '\n' + c.message : ''), requestId: r.id });
    };
  }

  /* ================= KUNDEN ================= */
  function renderCustomers() {
    var map = {};
    data.orders.forEach(function (o) { var c = o.customer || {}; var k = (c.email || c.phone || c.name || '').toLowerCase(); if (!k) return; map[k] = map[k] || { name: c.name, phone: c.phone, email: c.email, address: addr(o), orders: 0, sum: 0, last: '' }; map[k].orders++; map[k].sum += +o.price || 0; if ((o.date || '') > map[k].last) map[k].last = o.date; });
    data.requests.forEach(function (r) { var c = r.contact || {}; var k = (c.email || c.phone || c.name || '').toLowerCase(); if (!k || map[k]) return; map[k] = { name: c.name, phone: c.phone, email: c.email, address: [c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', '), orders: 0, sum: 0, last: '', lead: true }; });
    var list = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
    $('#view').innerHTML = '<p class="hint" style="margin-bottom:1rem">Kunden werden automatisch aus Aufträgen und Anfragen zusammengestellt.</p><div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Telefon</th><th>E-Mail</th><th>Adresse</th><th>Aufträge</th><th>Umsatz</th><th>Letzter Termin</th></tr></thead><tbody>' +
      (list.length ? list.map(function (c) { return '<tr class="row" data-cust="' + esc(c.name) + '"><td><b>' + esc(c.name) + '</b>' + (c.lead ? ' <span class="chip" style="background:#f47a1f">Interessent</span>' : '') + '</td><td>' + esc(c.phone) + '</td><td>' + esc(c.email) + '</td><td class="wrap">' + esc(c.address) + '</td><td>' + c.orders + '</td><td>' + fmtEur(c.sum) + '</td><td>' + fmtDate(c.last) + '</td></tr>'; }).join('') : '<tr><td colspan="7" class="empty">Noch keine Kunden</td></tr>') + '</tbody></table></div>';
    $$('[data-cust]').forEach(function (tr) { tr.onclick = function () { orderFilter.q = tr.getAttribute('data-cust'); orderFilter.status = ''; location.hash = 'auftraege'; }; });
  }

  /* ================= TEAM ================= */
  function renderTeam() {
    setActions('<button class="btn btn-primary btn-sm" id="a-new-team">+ Monteur</button>');
    $('#view').innerHTML = '<div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Rolle</th><th>Telefon</th><th>E-Mail</th><th>Aufträge (offen)</th></tr></thead><tbody>' +
      (data.team.length ? data.team.map(function (t) { var n = data.orders.filter(function (o) { return (o.assigned || []).indexOf(t.id) >= 0 && ['erledigt', 'abgerechnet', 'storniert'].indexOf(o.status) < 0; }).length; return '<tr class="row" data-team="' + t.id + '"><td><span class="color-dot" style="background:' + t.color + '"></span><b>' + esc(t.name) + '</b></td><td>' + esc(t.role || 'Monteur') + '</td><td>' + esc(t.phone) + '</td><td>' + esc(t.email) + '</td><td>' + n + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="empty">Noch keine Teammitglieder. Legen Sie Ihre Monteure an – sie erscheinen dann im Kalender, auf der Karte und in den Aufträgen.</td></tr>') + '</tbody></table></div>' +
      '<p class="hint" style="margin-top:1rem">Hinweis: Die Team-Liste dient der Einsatzplanung. Login-Konten werden ' + (S.mode === 'firebase' ? 'in der Firebase-Konsole unter „Authentication“ angelegt.' : 'im Demo-Modus in <code>assets/js/config.js</code> (demoUsers) gepflegt.') + '</p>';
    $('#a-new-team').onclick = function () { teamForm(null); };
    $$('[data-team]').forEach(function (tr) { tr.onclick = function () { teamForm(teamById(tr.getAttribute('data-team'))); }; });
  }
  function teamForm(t) {
    var isNew = !t; t = t || { name: '', role: 'Monteur', phone: '', email: '', color: TEAM_COLORS[data.team.length % TEAM_COLORS.length] };
    openModal(isNew ? 'Neues Teammitglied' : t.name, '<div class="row"><div class="field"><label>Name *</label><input id="t-name" value="' + esc(t.name) + '"></div><div class="field"><label>Rolle</label><select id="t-role">' + ['Monteur', 'Meister', 'Büro', 'Inhaber', 'Azubi'].map(function (r) { return '<option' + (r === t.role ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></div></div><div class="row"><div class="field"><label>Telefon</label><input id="t-phone" value="' + esc(t.phone) + '"></div><div class="field"><label>E-Mail (Login)</label><input id="t-email" value="' + esc(t.email) + '"></div></div><div class="field"><label>Farbe im Kalender</label><div class="team-checks">' + TEAM_COLORS.map(function (c) { return '<label class="' + (c === t.color ? 'on' : '') + '"><input type="radio" name="t-color" value="' + c + '"' + (c === t.color ? ' checked' : '') + '><span class="color-dot" style="background:' + c + '"></span></label>'; }).join('') + '</div></div>',
      '<div class="left">' + (!isNew ? '<button class="btn btn-danger btn-sm" id="t-del">Entfernen</button>' : '') + '</div><button class="btn btn-ghost" id="t-cancel">Abbrechen</button><button class="btn btn-primary" id="t-save">Speichern</button>');
    $$('input[name=t-color]').forEach(function (i) { i.onchange = function () { $$('input[name=t-color]').forEach(function (x) { x.parentNode.classList.toggle('on', x.checked); }); }; });
    $('#t-cancel').onclick = closeModal;
    $('#t-save').onclick = function () { var d = { name: $('#t-name').value.trim(), role: $('#t-role').value, phone: $('#t-phone').value.trim(), email: $('#t-email').value.trim(), color: ($('input[name=t-color]:checked') || {}).value || t.color }; if (!d.name) return toast('Name fehlt'); (isNew ? S.add('team', d) : S.update('team', t.id, d)).then(function () { closeModal(); toast('Gespeichert'); }); };
    if (!isNew) $('#t-del').onclick = function () { confirmDlg(t.name + ' aus dem Team entfernen?').then(function (ok) { if (ok) S.remove('team', t.id).then(closeModal); }); };
  }

  /* ================= ABWESENHEITEN ================= */
  function eventForm(ev, preset) {
    var isNew = !ev; ev = Object.assign({ type: 'urlaub', teamId: data.team[0] ? data.team[0].id : '', start: todayISO(), end: '', title: '', note: '' }, preset || {}, ev || {});
    openModal(isNew ? 'Abwesenheit / Termin eintragen' : 'Eintrag bearbeiten', '<div class="row"><div class="field"><label>Art</label><select id="e-type">' + selectOpts(EVENT_TYPES, ev.type) + '</select></div><div class="field"><label>Mitarbeiter</label><select id="e-team"><option value="">– alle / Betrieb –</option>' + data.team.map(function (t) { return '<option value="' + t.id + '"' + (t.id === ev.teamId ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select></div></div><div class="row"><div class="field"><label>Von</label><input type="date" id="e-start" value="' + esc(ev.start) + '"></div><div class="field"><label>Bis (optional)</label><input type="date" id="e-end" value="' + esc(ev.end) + '"></div></div><div class="field"><label>Bezeichnung / Notiz</label><input id="e-title" value="' + esc(ev.title) + '" placeholder="z. B. Urlaub, Schulung SOMMER …"></div>',
      '<div class="left">' + (!isNew ? '<button class="btn btn-danger btn-sm" id="e-del">Löschen</button>' : '') + '</div><button class="btn btn-ghost" id="e-cancel">Abbrechen</button><button class="btn btn-primary" id="e-save">Speichern</button>');
    $('#e-cancel').onclick = closeModal;
    $('#e-save').onclick = function () { var d = { type: $('#e-type').value, teamId: $('#e-team').value, start: $('#e-start').value, end: $('#e-end').value || $('#e-start').value, title: $('#e-title').value.trim() }; if (!d.start) return toast('Datum fehlt'); if (d.end < d.start) d.end = d.start; (isNew ? S.add('events', d) : S.update('events', ev.id, d)).then(function () { closeModal(); toast('Gespeichert'); }); };
    if (!isNew) $('#e-del').onclick = function () { S.remove('events', ev.id).then(closeModal); };
  }

  /* ================= EINSTELLUNGEN ================= */
  function renderSettings() {
    $('#view').innerHTML = '<div class="settings-grid">' +
      '<div class="panel"><h3>Betriebsmodus</h3><p>Aktuell: <b>' + (S.mode === 'firebase' ? 'LIVE – Firebase (' + esc(C.firebase.projectId) + ')' : 'DEMO – lokaler Browser-Speicher') + '</b></p>' + (S.mode === 'firebase' ? '<p class="hint">Daten werden zentral gespeichert und sind für alle angemeldeten Mitarbeiter auf allen Geräten sichtbar.</p>' : '<p class="hint">Im Demo-Modus sind die Daten nur in diesem Browser gespeichert und werden nicht zwischen Geräten oder Monteuren geteilt. Für den echten Betrieb Firebase einrichten:</p><ol><li>Auf <a href="https://console.firebase.google.com" target="_blank" rel="noopener">console.firebase.google.com</a> ein Projekt „torpro“ anlegen.</li><li><b>Authentication</b> → Anmeldemethode „E-Mail/Passwort“ aktivieren → unter „Users“ jeden Monteur mit E-Mail + Passwort anlegen.</li><li><b>Firestore Database</b> anlegen (Region europe-west3) → Regeln aus <code>torpro/firestore.rules</code> einfügen.</li><li>Projekteinstellungen → „Web-App“ hinzufügen → die <code>firebaseConfig</code> in <code>assets/js/config.js</code> bei <code>firebase:</code> eintragen.</li><li>Seite neu laden – die Anmeldung läuft dann über Firebase.</li></ol>') + '</div>' +
      '<div class="panel"><h3>Daten sichern / übertragen</h3><p class="hint">Alle Aufträge, Anfragen, Termine und Teammitglieder als JSON exportieren oder importieren (z. B. Demo-Daten nach Firebase übernehmen).</p><div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" id="s-export">Export (JSON)</button><label class="btn btn-ghost btn-sm" style="cursor:pointer">Import (JSON)<input type="file" id="s-import" accept="application/json" style="display:none"></label></div></div>' +
      '<div class="panel"><h3>Demo-Daten</h3><p class="hint">Beispiel-Monteure, Aufträge und Anfragen anlegen, um Kalender und Karte auszuprobieren.</p><div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn btn-blue btn-sm" id="s-seed">Demo-Daten anlegen</button>' + (S.mode === 'local' ? '<button class="btn btn-danger btn-sm" id="s-clear">Alle lokalen Daten löschen</button>' : '') + '</div></div>' +
      '<div class="panel"><h3>Konfigurator & Website</h3><p class="hint">Preise, Firmendaten, Öffnungszeiten und Telefonnummer werden in <code>torpro/assets/js/config.js</code> gepflegt. Anfragen aus dem Konfigurator landen automatisch unter „Anfragen“. Optional kann unter <code>requestWebhook</code> eine URL (z. B. Formspree/Make) eingetragen werden, damit Anfragen zusätzlich per E-Mail zugestellt werden.</p><p class="hint">Angemeldet als: ' + esc(user.email) + '</p></div>' +
      '</div>';
    $('#s-export').onclick = function () { S.exportAll().then(function (o) { download('torpro-export-' + todayISO() + '.json', JSON.stringify(o, null, 2)); }); };
    $('#s-import').onchange = function (e) { var f = e.target.files[0]; if (!f) return; f.text().then(function (t) { return S.importAll(JSON.parse(t)); }).then(function () { toast('Import abgeschlossen'); }).catch(function (err) { toast('Import fehlgeschlagen: ' + err.message); }); };
    $('#s-seed').onclick = seedDemo;
    if ($('#s-clear')) $('#s-clear').onclick = function () { confirmDlg('Wirklich ALLE lokalen Daten löschen?').then(function (ok) { if (ok) { localStorage.removeItem('torpro_db_v1'); location.reload(); } }); };
  }
  function seedDemo() {
    var t = new Date();
    var team = [{ name: 'Max Mustermann', role: 'Meister', phone: '0171 1234567', email: 'max@torpro.de', color: '#1f6fd6' }, { name: 'Ali Demir', role: 'Monteur', phone: '0172 7654321', email: 'ali@torpro.de', color: '#f47a1f' }];
    Promise.all(team.map(function (m) { return S.add('team', m); })).then(function (ids) {
      var orders = [
        { nr: nextOrderNr(), title: 'Sektionaltor 2500×2125 RAL 7016 inkl. SOMMER base+', type: 'Montage', status: 'geplant', customer: { name: 'Familie Schneider', phone: '07131 555123', email: 'schneider@example.de' }, address: { street: 'Kirchstraße 12', zip: '74072', city: 'Heilbronn' }, lat: 49.1427, lng: 9.2109, date: toISO(t), timeStart: '08:00', timeEnd: '12:00', assigned: [ids[0], ids[1]], price: 3890, notes: 'Altes Schwingtor demontieren, Strom in Garage vorhanden.' },
        { nr: 'A-' + t.getFullYear() + '-0002', title: 'UVV-Prüfung Industrietore Halle 2', type: 'Wartung / UVV', status: 'geplant', customer: { name: 'Logistik Müller GmbH', phone: '07132 99887', email: 'technik@mueller-logistik.de' }, address: { street: 'Industriestraße 5', zip: '74172', city: 'Neckarsulm' }, lat: 49.1898, lng: 9.2263, date: toISO(addDays(t, 1)), timeStart: '13:00', timeEnd: '16:00', assigned: [ids[0]], price: 480, notes: '4 Sektionaltore, Prüfplaketten mitnehmen.' },
        { nr: 'A-' + t.getFullYear() + '-0003', title: 'Antrieb defekt – Notdienst', type: 'Reparatur', status: 'offen', customer: { name: 'Petra Kaiser', phone: '0176 4455667', email: '' }, address: { street: 'Hauptstraße 44', zip: '74354', city: 'Besigheim' }, lat: 49.0002, lng: 9.1428, date: '', assigned: [], price: 0, notes: 'Tor lässt sich nicht öffnen, Kunde bittet um Rückruf.' },
        { nr: 'A-' + t.getFullYear() + '-0004', title: 'Aufmaß Rolltor Doppelgarage', type: 'Aufmaß', status: 'geplant', customer: { name: 'Bauunternehmen Weber', phone: '07141 22334', email: 'info@weber-bau.de' }, address: { street: 'Marktplatz 3', zip: '71634', city: 'Ludwigsburg' }, lat: 48.8974, lng: 9.1919, date: toISO(addDays(t, 3)), timeStart: '10:00', timeEnd: '11:00', assigned: [ids[1]], price: 0, notes: '' },
        { nr: 'A-' + t.getFullYear() + '-0005', title: 'Seitensektionaltor 3000×2250 Golden Oak', type: 'Montage', status: 'erledigt', customer: { name: 'Thomas Braun', phone: '07131 887766', email: 'braun@example.de' }, address: { street: 'Gartenweg 8', zip: '74078', city: 'Heilbronn' }, lat: 49.1721, lng: 9.2045, date: toISO(addDays(t, -6)), timeStart: '08:00', timeEnd: '15:00', assigned: [ids[0], ids[1]], price: 4650, notes: 'Abgenommen, Kunde zufrieden.' }
      ];
      var reqs = [{ kind: 'konfigurator', status: 'neu', contact: { name: 'Sabine Vogt', phone: '07131 123987', email: 'vogt@example.de', street: 'Neckarstraße 21', zip: '74076', city: 'Heilbronn' }, config: { type: 'sektional_premium', width: 3000, height: 2250, sicke: 'glatt', surface: 'silkgrain', color: 'ral7016', insulation: '60', drive: 'pro', handsender: 2, driveExtras: ['smart'], extras: ['fenster'], montage: ['montage', 'demontage'] }, configText: 'Tortyp: Sektionaltor Premium (Alu)\nMaße: 3000 x 2250 mm\nSickung: Flächenbündig / glatt | Oberfläche: Silkgrain\nFarbe: RAL 7016 Anthrazitgrau\nDämmung: 60 mm Premium\nAntrieb: SOMMER pro+, 2 Handsender\nAntriebs-Extras: Smartphone-Steuerung\nExtras: Fensterreihe\nMontage: Montage durch TorPro, Demontage & Entsorgung Alttor', priceNet: 5290, priceGross: 6295 },
      { kind: 'kontakt', status: 'kontaktiert', contact: { name: 'Hans Krämer', phone: '0170 9988776', email: 'kraemer@example.de' }, topic: 'Wartung / UVV-Prüfung', message: 'Bitte Angebot für jährliche Wartung von 2 Garagentoren (Hörmann) in Sinsheim.' }];
      return Promise.all(orders.map(function (o) { return S.add('orders', o); }).concat(reqs.map(function (r) { return S.add('requests', r); })).concat([S.add('events', { type: 'urlaub', teamId: ids[1], start: toISO(addDays(t, 7)), end: toISO(addDays(t, 11)), title: 'Urlaub' })]));
    }).then(function () { toast('Demo-Daten angelegt'); location.hash = 'dashboard'; });
  }

  /* ---------- Init ---------- */
  S.init();
})();
