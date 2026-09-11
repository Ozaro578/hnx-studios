/* =========================================================
   TorPro Garagentor-Konfigurator
   ========================================================= */
(function () {
  var C = window.TORPRO_CONFIG, P = C.pricing;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); };
  var konf = $('#konf'); if (!konf) return;

  /* ---------- Optionen ---------- */
  var RAL = {
    ral9016: { label: 'RAL 9016 Verkehrsweiß', hex: '#F1F1F1', price: P.colorStandard },
    ral7016: { label: 'RAL 7016 Anthrazitgrau', hex: '#383E42', price: P.colorRal },
    ral9006: { label: 'RAL 9006 Weißaluminium', hex: '#A5A8A6', price: P.colorRal },
    ral9007: { label: 'RAL 9007 Graualuminium', hex: '#8F8F8C', price: P.colorRal },
    ral7035: { label: 'RAL 7035 Lichtgrau', hex: '#C5C7C4', price: P.colorRal },
    ral8014: { label: 'RAL 8014 Sepiabraun', hex: '#4A3526', price: P.colorRal },
    ral6009: { label: 'RAL 6009 Tannengrün', hex: '#27352A', price: P.colorRal },
    ral3003: { label: 'RAL 3003 Rubinrot', hex: '#8D1D2C', price: P.colorRal },
    ral5010: { label: 'RAL 5010 Enzianblau', hex: '#0E294B', price: P.colorRal },
    ral9005: { label: 'RAL 9005 Tiefschwarz', hex: '#0A0A0D', price: P.colorRal },
    oak:     { label: 'Holzdekor Golden Oak', hex: '#B07A3A', price: P.colorRal },
    walnut:  { label: 'Holzdekor Nussbaum', hex: '#5A3A22', price: P.colorRal },
    special: { label: 'Sonderfarbe (RAL nach Wahl)', hex: 'linear-gradient(135deg,#f47a1f,#1f6fd6)', price: P.colorSpecial }
  };
  var OPT = {
    type: Object.keys(P.types).map(function (k) { return { key: k, label: P.types[k].label, desc: ({
      sektional: 'Öffnet platzsparend senkrecht nach oben. Gedämmt, robust, der Klassiker.',
      sektional_premium: 'Alu-Door Premium+: Aluminium, millimetergenau, bis 8 m Breite.',
      rolltor: 'Rollt kompakt auf – ideal bei wenig Platz unter der Decke.',
      schwingtor: 'Einteiliges Torblatt, preiswert, für Standardgaragen.',
      seitensektional: 'Fährt seitlich an der Wand entlang – Decke bleibt frei.'
    })[k], price: 'ab ' + fmt(P.types[k].base) }; }),
    sicke: [
      { key: 'gross', label: 'Großsicke', desc: 'Eine Sicke pro Paneel', price: P.sicke.gross },
      { key: 'mittel', label: 'Mittelsicke', desc: 'Zwei Sicken pro Paneel', price: P.sicke.mittel },
      { key: 'kassette', label: 'Kassette', desc: 'Klassische Kassettenoptik', price: P.sicke.kassette },
      { key: 'glatt', label: 'Flächenbündig / glatt', desc: 'Modern, ohne Sicken', price: P.sicke.glatt }
    ],
    surface: [
      { key: 'woodgrain', label: 'Woodgrain', desc: 'Holzstruktur-Prägung', price: P.surface.woodgrain },
      { key: 'silkgrain', label: 'Silkgrain', desc: 'Feine, glatte Struktur', price: P.surface.silkgrain },
      { key: 'micrograin', label: 'Micrograin', desc: 'Feinstruktur, edel matt', price: P.surface.micrograin },
      { key: 'holzdekor', label: 'Holzdekor', desc: 'Täuschend echte Holzoptik', price: P.surface.holzdekor }
    ],
    color: Object.keys(RAL).map(function (k) { return { key: k, label: RAL[k].label, price: RAL[k].price, swatch: RAL[k].hex }; }),
    insulation: [
      { key: '40', label: '40 mm Standard', desc: 'PU-geschäumte Paneele', price: 0 },
      { key: '60', label: '60 mm Premium', desc: 'Beste Dämmung für beheizte Garagen', price: '+15 %' }
    ],
    drive: [
      { key: 'none', label: 'Ohne Antrieb', desc: 'Manuelle Bedienung', price: 0 },
      { key: 'base', label: 'SOMMER base+', desc: 'Leiser Schienenantrieb, 1 Handsender, SOMloq2-Funk', price: P.drive.base },
      { key: 'pro', label: 'SOMMER pro+', desc: 'Mehr Zugkraft, Notentriegelung, Akku-Option, App-fähig', price: P.drive.pro }
    ],
    driveExtras: [
      { key: 'codetaster', label: 'Funk-Codetaster', desc: 'Öffnen per PIN ohne Sender', price: P.codetaster },
      { key: 'smart', label: 'Smartphone-Steuerung', desc: 'SOMweb – Tor per App bedienen', price: P.smart },
      { key: 'lichtschranke', label: 'Lichtschranke', desc: 'Zusätzliche Absicherung', price: P.lichtschranke }
    ],
    extras: [
      { key: 'fenster', label: 'Fensterreihe', desc: 'Lichtausschnitte im oberen Paneel', price: P.fenster },
      { key: 'schlupftuer', label: 'Schlupftür', desc: 'Tür im Tor, ohne Schwelle', price: P.schlupftuer },
      { key: 'nebentuer', label: 'Passende Nebentür', desc: 'Gleiche Optik wie das Tor', price: P.nebentuer },
      { key: 'lueftung', label: 'Lüftungsgitter', desc: 'Belüftung im unteren Paneel', price: P.lueftung }
    ],
    montage: [
      { key: 'montage', label: 'Montage durch TorPro', desc: 'Inkl. Einstellung & Einweisung', price: 'je Tortyp' },
      { key: 'demontage', label: 'Demontage & Entsorgung Alttor', desc: 'Fachgerecht, inkl. Abtransport', price: P.demontage }
    ]
  };

  var state = { type: 'sektional', width: 2500, height: 2125, sturz: 'unknown', einbau: 'austausch', sicke: 'gross', surface: 'woodgrain', color: 'ral9016', colorSpecial: '', insulation: '40', drive: 'base', handsender: 2, driveExtras: [], extras: [], montage: ['montage'], wunsch: '' };
  var step = 0, STEPS = ['Tortyp', 'Maße', 'Design', 'Antrieb', 'Extras', 'Angebot'];

  /* ---------- Rendering der Optionen ---------- */
  function renderGroup(group) {
    var wrap = $('[data-group="' + group + '"]', konf), multi = wrap.hasAttribute('data-multi');
    wrap.innerHTML = OPT[group].map(function (o) {
      var sel = multi ? state[group].indexOf(o.key) >= 0 : state[group] === o.key;
      var price = typeof o.price === 'number' ? (o.price ? '+ ' + fmt(o.price) : 'inklusive') : o.price;
      return '<button type="button" class="opt' + (sel ? ' selected' : '') + '" data-key="' + o.key + '">' +
        (o.swatch ? '<span class="swatch" style="background:' + o.swatch + '"></span>' : '') +
        '<b>' + o.label + '</b>' + (o.desc ? '<small>' + o.desc + '</small>' : '') + '<span class="price">' + price + '</span></button>';
    }).join('');
    $$('.opt', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-key');
        if (multi) { var i = state[group].indexOf(k); i >= 0 ? state[group].splice(i, 1) : state[group].push(k); }
        else state[group] = k;
        renderGroup(group); update();
      });
    });
  }
  function renderSteps() {
    $('#konf-steps').innerHTML = STEPS.map(function (s, i) { return '<button type="button" class="' + (i === step ? 'active' : i < step ? 'done' : '') + '" data-i="' + i + '">' + (i + 1) + '. ' + s + '</button>'; }).join('');
    $$('#konf-steps button').forEach(function (b) { b.addEventListener('click', function () { go(+b.getAttribute('data-i')); }); });
    $$('.konf-panel', konf).forEach(function (p) { p.classList.toggle('active', +p.getAttribute('data-step') === step); });
    $('#konf-prev').style.visibility = step === 0 ? 'hidden' : 'visible';
    $('#konf-next').style.display = step === STEPS.length - 1 ? 'none' : '';
  }
  function go(i) { step = Math.max(0, Math.min(STEPS.length - 1, i)); renderSteps(); if (window.innerWidth < 1000) konf.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  /* ---------- Preis ---------- */
  function calc() {
    var t = P.types[state.type], area = (state.width / 1000) * (state.height / 1000);
    var lines = [];
    var door = t.base + Math.max(0, area - t.baseArea) * t.perM2;
    lines.push({ label: t.label + ' ' + state.width + ' × ' + state.height + ' mm', val: door });
    var ins = P.insulation[state.insulation] || 0; if (ins) lines.push({ label: 'Dämmung 60 mm', val: door * ins });
    if (P.sicke[state.sicke]) lines.push({ label: 'Sickung: ' + byKey('sicke').label, val: P.sicke[state.sicke] });
    if (P.surface[state.surface]) lines.push({ label: 'Oberfläche: ' + byKey('surface').label, val: P.surface[state.surface] });
    var col = RAL[state.color]; if (col.price) lines.push({ label: 'Farbe: ' + (state.color === 'special' && state.colorSpecial ? state.colorSpecial : col.label), val: col.price });
    if (state.drive !== 'none') {
      lines.push({ label: 'Antrieb: ' + byKey('drive').label, val: P.drive[state.drive] });
      var hs = Math.max(0, state.handsender - 1); if (hs) lines.push({ label: hs + ' zusätzl. Handsender', val: hs * P.handsender });
      state.driveExtras.forEach(function (k) { lines.push({ label: byKey('driveExtras', k).label, val: P[k] }); });
    }
    state.extras.forEach(function (k) { lines.push({ label: byKey('extras', k).label, val: P[k] }); });
    if (state.montage.indexOf('montage') >= 0) lines.push({ label: 'Montage', val: t.montage });
    if (state.montage.indexOf('demontage') >= 0) lines.push({ label: 'Demontage & Entsorgung', val: P.demontage });
    var net = lines.reduce(function (s, l) { return s + l.val; }, 0);
    return { lines: lines, net: net, gross: net * (1 + P.vat), area: area };
  }
  function byKey(group, key) { key = key || state[group]; return OPT[group].find(function (o) { return o.key === key; }) || { label: key }; }

  /* ---------- Vorschau (SVG) ---------- */
  function preview() {
    var W = 320, ratio = state.height / state.width, H = Math.round(W * Math.min(1.2, Math.max(.45, ratio)));
    var col = state.color === 'special' ? '#8a8f98' : RAL[state.color].hex;
    var dark = isDark(col), line = dark ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.22)', shade = dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)';
    var s = '<svg viewBox="-20 -20 ' + (W + 40) + ' ' + (H + 40) + '" xmlns="http://www.w3.org/2000/svg">';
    s += '<rect x="-20" y="-20" width="' + (W + 40) + '" height="' + (H + 40) + '" fill="#d9dee6"/>';
    s += '<rect x="-20" y="' + H + '" width="' + (W + 40) + '" height="20" fill="#9aa3ad"/>';
    s += '<rect x="-10" y="-10" width="' + (W + 20) + '" height="' + (H + 10) + '" fill="#f0f2f5"/>';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + col + '"/>';
    var t = state.type;
    if (t === 'sektional' || t === 'sektional_premium') {
      var n = Math.max(3, Math.round(H / 70)), ph = H / n;
      for (var i = 0; i < n; i++) {
        var y = i * ph;
        s += '<rect x="0" y="' + y + '" width="' + W + '" height="' + ph + '" fill="' + (i % 2 ? shade : 'transparent') + '" stroke="' + line + '" stroke-width="2"/>';
        if (state.sicke === 'gross') s += '<line x1="0" y1="' + (y + ph / 2) + '" x2="' + W + '" y2="' + (y + ph / 2) + '" stroke="' + line + '" stroke-width="3"/>';
        if (state.sicke === 'mittel') { s += '<line x1="0" y1="' + (y + ph / 3) + '" x2="' + W + '" y2="' + (y + ph / 3) + '" stroke="' + line + '" stroke-width="2"/><line x1="0" y1="' + (y + 2 * ph / 3) + '" x2="' + W + '" y2="' + (y + 2 * ph / 3) + '" stroke="' + line + '" stroke-width="2"/>'; }
        if (state.sicke === 'kassette') { var kw = W / 4; for (var k = 0; k < 4; k++) s += '<rect x="' + (k * kw + 8) + '" y="' + (y + 8) + '" width="' + (kw - 16) + '" height="' + (ph - 16) + '" fill="none" stroke="' + line + '" stroke-width="2" rx="2"/>'; }
      }
      if (state.extras.indexOf('fenster') >= 0) { var fw = W / 4; for (var f = 0; f < 4; f++) s += '<rect x="' + (f * fw + 10) + '" y="' + (ph * .2) + '" width="' + (fw - 20) + '" height="' + (ph * .6) + '" rx="3" fill="#bfe0ff" stroke="#fff" stroke-width="2"/>'; }
    } else if (t === 'rolltor') {
      var rn = Math.round(H / 12); for (var r = 0; r < rn; r++) s += '<line x1="0" y1="' + (r * H / rn) + '" x2="' + W + '" y2="' + (r * H / rn) + '" stroke="' + line + '" stroke-width="1.5"/>';
      s += '<rect x="-10" y="-10" width="' + (W + 20) + '" height="26" fill="#6b7280"/>';
    } else if (t === 'schwingtor') {
      var vn = Math.max(6, Math.round(W / 30)); for (var v = 0; v < vn; v++) s += '<line x1="' + (v * W / vn) + '" y1="0" x2="' + (v * W / vn) + '" y2="' + H + '" stroke="' + line + '" stroke-width="2"/>';
      s += '<rect x="' + (W / 2 - 14) + '" y="' + (H / 2 - 8) + '" width="28" height="16" rx="3" fill="#333"/>';
      if (state.extras.indexOf('fenster') >= 0) for (var g = 0; g < 4; g++) s += '<rect x="' + (g * W / 4 + 10) + '" y="' + (H * .12) + '" width="' + (W / 4 - 20) + '" height="' + (H * .16) + '" rx="3" fill="#bfe0ff" stroke="#fff" stroke-width="2"/>';
    } else if (t === 'seitensektional') {
      var sn = Math.max(5, Math.round(W / 50)); for (var q = 0; q < sn; q++) { s += '<rect x="' + (q * W / sn) + '" y="0" width="' + (W / sn) + '" height="' + H + '" fill="' + (q % 2 ? shade : 'transparent') + '" stroke="' + line + '" stroke-width="2"/>'; }
      if (state.extras.indexOf('fenster') >= 0) for (var w = 0; w < sn; w++) s += '<rect x="' + (w * W / sn + 6) + '" y="' + (H * .12) + '" width="' + (W / sn - 12) + '" height="' + (H * .15) + '" rx="2" fill="#bfe0ff" stroke="#fff" stroke-width="2"/>';
    }
    if (state.extras.indexOf('schlupftuer') >= 0) { s += '<rect x="' + (W * .62) + '" y="' + (H * .08) + '" width="' + (W * .28) + '" height="' + (H * .92) + '" fill="none" stroke="' + (dark ? '#fff' : '#111') + '" stroke-width="3" rx="2"/><circle cx="' + (W * .66) + '" cy="' + (H * .55) + '" r="4" fill="' + (dark ? '#fff' : '#111') + '"/>'; }
    if (state.extras.indexOf('lueftung') >= 0) { s += '<rect x="' + (W * .06) + '" y="' + (H * .86) + '" width="' + (W * .2) + '" height="' + (H * .08) + '" fill="' + line + '" rx="2"/>'; }
    if (state.drive !== 'none') s += '<rect x="' + (W / 2 - 18) + '" y="-18" width="36" height="12" rx="3" fill="#1f6fd6"/>';
    s += '<text x="' + (W / 2) + '" y="' + (H + 14) + '" text-anchor="middle" font-size="11" fill="#333" font-family="Inter,Arial">' + state.width + ' mm</text>';
    s += '<text x="' + (W + 12) + '" y="' + (H / 2) + '" text-anchor="middle" font-size="11" fill="#333" font-family="Inter,Arial" transform="rotate(90 ' + (W + 12) + ' ' + (H / 2) + ')">' + state.height + ' mm</text>';
    return s + '</svg>';
  }
  function isDark(hex) { if (!/^#/.test(hex)) return false; var c = parseInt(hex.slice(1), 16); var r = c >> 16, g = (c >> 8) & 255, b = c & 255; return (r * 299 + g * 587 + b * 114) / 1000 < 128; }

  /* ---------- Zusammenfassung ---------- */
  function update() {
    var r = calc();
    $('#konf-preview').innerHTML = preview();
    $('#konf-table').innerHTML = r.lines.map(function (l) { return '<tr><td>' + l.label + '</td><td>' + fmt(l.val) + '</td></tr>'; }).join('') +
      '<tr><td>Netto</td><td>' + fmt(r.net) + '</td></tr><tr><td>zzgl. 19 % MwSt.</td><td>' + fmt(r.gross - r.net) + '</td></tr>';
    $('#konf-total').innerHTML = 'ca. ' + fmt(r.gross) + '<small>Richtpreis inkl. 19 % MwSt., unverbindlich</small>';
    $('#k-color-special-wrap').style.display = state.color === 'special' ? '' : 'none';
    $('#konf-mail').href = mailtoLink(r);
  }
  function summaryText(r) {
    var t = [];
    t.push('Tortyp: ' + P.types[state.type].label);
    t.push('Maße: ' + state.width + ' x ' + state.height + ' mm (' + r.area.toFixed(2) + ' m²)');
    t.push('Sturz: ' + $('#k-sturz option:checked').textContent + ' | Einbau: ' + $('#k-einbau option:checked').textContent);
    t.push('Sickung: ' + byKey('sicke').label + ' | Oberfläche: ' + byKey('surface').label);
    t.push('Farbe: ' + RAL[state.color].label + (state.colorSpecial ? ' (' + state.colorSpecial + ')' : ''));
    t.push('Dämmung: ' + byKey('insulation').label);
    t.push('Antrieb: ' + byKey('drive').label + (state.drive !== 'none' ? ', ' + state.handsender + ' Handsender' : ''));
    if (state.driveExtras.length) t.push('Antriebs-Extras: ' + state.driveExtras.map(function (k) { return byKey('driveExtras', k).label; }).join(', '));
    if (state.extras.length) t.push('Extras: ' + state.extras.map(function (k) { return byKey('extras', k).label; }).join(', '));
    t.push('Montage: ' + (state.montage.length ? state.montage.map(function (k) { return byKey('montage', k).label; }).join(', ') : 'keine'));
    if (state.wunsch) t.push('Wunschtermin: ' + state.wunsch);
    t.push('Richtpreis: ca. ' + fmt(r.gross) + ' inkl. MwSt. (netto ' + fmt(r.net) + ')');
    return t.join('\n');
  }
  function mailtoLink(r) {
    var body = 'Guten Tag,\n\nich interessiere mich für folgendes Tor:\n\n' + summaryText(r) + '\n\nName: \nTelefon: \nAdresse: \n\nBitte senden Sie mir ein Angebot.';
    return 'mailto:' + C.company.email + '?subject=' + encodeURIComponent('Anfrage Garagentor-Konfigurator') + '&body=' + encodeURIComponent(body);
  }

  /* ---------- Absenden ---------- */
  function submit(e) {
    e.preventDefault();
    var msg = $('#konf-msg'), btn = $('#konf-submit');
    var f = { name: $('#c-name').value.trim(), phone: $('#c-phone').value.trim(), email: $('#c-email').value.trim(), street: $('#c-street').value.trim(), zip: $('#c-zip').value.trim(), city: $('#c-city').value.trim(), message: $('#c-msg').value.trim() };
    if ($('#c-hp').value) return;
    if (!f.name || !f.phone || !f.email || !f.zip || !f.city || !$('#c-privacy').checked) { msg.innerHTML = '<div class="notice err">Bitte alle Pflichtfelder (*) ausfüllen und der Datenschutzerklärung zustimmen.</div>'; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) { msg.innerHTML = '<div class="notice err">Bitte eine gültige E-Mail-Adresse angeben.</div>'; return; }
    var r = calc();
    var req = { kind: 'konfigurator', status: 'neu', contact: f, config: JSON.parse(JSON.stringify(state)), configText: summaryText(r), priceNet: Math.round(r.net), priceGross: Math.round(r.gross), source: location.href };
    btn.disabled = true; btn.textContent = 'Wird gesendet …';
    var jobs = [window.TorProStore.add('requests', req)];
    if (C.requestWebhook) jobs.push(fetch(C.requestWebhook, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(req) }).catch(function (err) { console.warn('Webhook fehlgeschlagen', err); }));
    Promise.all(jobs).then(function () {
      msg.innerHTML = '<div class="notice ok"><b>Vielen Dank, ' + escapeHtml(f.name) + '!</b> Ihre Anfrage ist bei uns eingegangen. Wir melden uns innerhalb von 24 Stunden mit Ihrem Angebot. Zur Sicherheit können Sie die Konfiguration zusätzlich per E-Mail senden.</div>';
      btn.textContent = 'Anfrage gesendet ✓';
      window.torproToast && torproToast('Anfrage gesendet');
    }).catch(function (err) {
      console.error(err); btn.disabled = false; btn.textContent = 'Unverbindliches Angebot anfordern';
      msg.innerHTML = '<div class="notice err">Die Anfrage konnte nicht gespeichert werden. Bitte nutzen Sie den Button „Konfiguration per E-Mail senden“ oder rufen Sie uns an.</div>';
    });
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- Init ---------- */
  Object.keys(OPT).forEach(renderGroup);
  renderSteps(); update();
  function bindRange(id, key) {
    var r = $('#' + id), n = $('#' + id + '-n');
    r.addEventListener('input', function () { state[key] = +r.value; n.value = r.value; update(); });
    n.addEventListener('change', function () { var v = Math.max(+n.min, Math.min(+n.max, +n.value || +n.min)); n.value = v; r.value = v; state[key] = v; update(); });
  }
  bindRange('k-width', 'width'); bindRange('k-height', 'height');
  $('#k-sturz').addEventListener('change', function (e) { state.sturz = e.target.value; update(); });
  $('#k-einbau').addEventListener('change', function (e) { state.einbau = e.target.value; update(); });
  $('#k-handsender').addEventListener('change', function (e) { state.handsender = +e.target.value; update(); });
  $('#k-color-special').addEventListener('input', function (e) { state.colorSpecial = e.target.value; update(); });
  $('#k-wunsch').addEventListener('change', function (e) { state.wunsch = e.target.value; update(); });
  $('#konf-prev').addEventListener('click', function () { go(step - 1); });
  $('#konf-next').addEventListener('click', function () { go(step + 1); });
  $('#konf-form').addEventListener('submit', submit);
})();
