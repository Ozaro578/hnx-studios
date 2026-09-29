/* =========================================================
   TorPro Garagentor-Konfigurator v2
   – Fassaden-Vorschau, tortypabhängige Optionen, Preisspanne,
     Konfiguration teilen/drucken, Wiederherstellung, WhatsApp
   ========================================================= */
(function () {
  var C = window.TORPRO_CONFIG, P = C.pricing, co = C.company;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var konf = $('#konf'); if (!konf) return;
  var SEKTIONAL = ['sektional', 'sektional_premium', 'seitensektional'];

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
    oak:     { label: 'Holzdekor Golden Oak', hex: '#B07A3A', price: P.colorRal, wood: true },
    walnut:  { label: 'Holzdekor Nussbaum', hex: '#5A3A22', price: P.colorRal, wood: true },
    special: { label: 'Sonderfarbe (RAL nach Wahl)', hex: '#8a8f98', swatch: 'linear-gradient(135deg,#f47a1f,#1f6fd6)', price: P.colorSpecial }
  };
  var TYPE_DESC = {
    sektional: 'Öffnet platzsparend senkrecht nach oben. Gedämmt, robust, der Klassiker.',
    sektional_premium: 'M-M Alu-Door Premium+: Aluminium, millimetergenau, bis 8 m Breite.',
    rolltor: 'Rollt kompakt auf – ideal bei wenig Platz unter der Decke.',
    schwingtor: 'Einteiliges Torblatt, preiswert, für Standardgaragen.',
    seitensektional: 'Fährt seitlich an der Wand entlang – Decke bleibt frei.'
  };
  var OPT = {
    type: Object.keys(P.types).map(function (k) { return { key: k, label: P.types[k].label, desc: TYPE_DESC[k], price: 'ab ' + fmt(P.types[k].base) }; }),
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
    color: Object.keys(RAL).map(function (k) { return { key: k, label: RAL[k].label, price: RAL[k].price, swatch: RAL[k].swatch || RAL[k].hex }; }),
    insulation: [
      { key: '40', label: '40 mm Standard', desc: 'PU-geschäumte Paneele', price: 0 },
      { key: '60', label: '60 mm Premium', desc: 'Beste Dämmung für beheizte Garagen', price: '+15 %' }
    ],
    drive: [
      { key: 'none', label: 'Ohne Antrieb', desc: 'Manuelle Bedienung', price: 0 },
      { key: 'aperto550', label: 'Aperto A 550 L', brand: 'Aperto by SOMMER', desc: '550 N · für Standardtore bis 3,5 m Breite / 100 kg · 1 Handsender', price: P.drive.aperto550, maxWidth: 3500 },
      { key: 'aperto800', label: 'Aperto A 800 XL', brand: 'Aperto by SOMMER', desc: '800 N · Tore bis 6 m Breite / 140 kg · nur 1 W Standby · 1 Handsender', price: P.drive.aperto800, maxWidth: 6000 },
      { key: 'base', label: 'SOMMER base+', brand: 'SOMMER', desc: 'Laufwagen-Antrieb, besonders leise · SOMloq2-Funk (128-Bit AES) · 1 Handsender', price: P.drive.base },
      { key: 'pro', label: 'SOMMER pro+', brand: 'SOMMER', desc: 'Separate Wandsteuerung mit Taster · Akku- und App-Option · SOMloq2 · 1 Handsender', price: P.drive.pro }
    ],
    driveExtras: [
      { key: 'codetaster', label: 'Funk-Codetaster', desc: 'Öffnen per PIN ohne Sender', price: P.codetaster },
      { key: 'smart', label: 'Smartphone-Steuerung', desc: 'SOMweb – Tor per App bedienen', price: P.smart },
      { key: 'lichtschranke', label: 'Lichtschranke', desc: 'Zusätzliche Absicherung', price: P.lichtschranke },
      { key: 'griff', label: 'Außengriff mit Notentriegelung', desc: 'Öffnen bei Stromausfall ohne zweiten Zugang', price: P.griff }
    ],
    extras: [
      { key: 'fenster', label: 'Fensterreihe', desc: 'Lichtausschnitte im oberen Paneel', price: P.fenster, not: ['rolltor'] },
      { key: 'schlupftuer', label: 'Schlupftür', desc: 'Tür im Tor, ohne Schwelle', price: P.schlupftuer, only: ['sektional', 'sektional_premium'] },
      { key: 'nebentuer', label: 'Passende Nebentür', desc: 'Gleiche Optik wie das Tor', price: P.nebentuer },
      { key: 'lueftung', label: 'Lüftungsgitter', desc: 'Belüftung im unteren Paneel', price: P.lueftung, not: ['rolltor'] },
      { key: 'sicherheit', label: 'Sicherheitspaket', desc: 'Aufschiebesicherung, Fingerklemmschutz, Federbruchsicherung', price: P.sicherheit, only: SEKTIONAL }
    ],
    montage: [
      { key: 'montage', label: 'Montage durch TorPro', desc: 'Inkl. Einstellung & Einweisung', price: 'je Tortyp' },
      { key: 'demontage', label: 'Demontage & Entsorgung Alttor', desc: 'Fachgerecht, inkl. Abtransport', price: P.demontage }
    ]
  };
  var DEFAULT = { type: 'sektional', width: 2500, height: 2125, sturz: 'unknown', einbau: 'austausch', opening: 'links', sicke: 'gross', surface: 'woodgrain', color: 'ral7016', colorSpecial: '', insulation: '40', drive: 'aperto800', handsender: 2, driveExtras: [], extras: [], montage: ['montage'], wunsch: '', facade: 'putz' };
  var state = JSON.parse(JSON.stringify(DEFAULT));
  var step = 0, STEPS = ['Tortyp', 'Maße', 'Design', 'Antrieb', 'Extras', 'Angebot'];

  /* ---------- Zustand speichern / laden ---------- */
  function encode() { return encodeURIComponent(JSON.stringify(state)); }
  function shareUrl() { return location.origin + location.pathname + '#c=' + encode(); }
  function restore() {
    var src = null, m = location.hash.match(/^#c=(.+)$/);
    try { if (m) src = JSON.parse(decodeURIComponent(m[1])); else src = JSON.parse(localStorage.getItem('torpro_konf') || 'null'); } catch (e) { }
    if (src && P.types[src.type]) { Object.keys(DEFAULT).forEach(function (k) { if (src[k] !== undefined) state[k] = src[k]; }); return !!m ? 'link' : 'local'; }
    return null;
  }
  function persist() { try { localStorage.setItem('torpro_konf', JSON.stringify(state)); } catch (e) { } }

  /* ---------- Verfügbarkeit je Tortyp ---------- */
  function available(group, o) {
    if (o.only && o.only.indexOf(state.type) < 0) return false;
    if (o.not && o.not.indexOf(state.type) >= 0) return false;
    if (o.maxWidth && state.width > o.maxWidth) return false;
    return true;
  }
  /* SOMMER-Modellvariante nach Torfläche: 600 N bis ~8 m², 800 N bis ~12 m², darüber 1100 N */
  function driveModel() {
    var area = (state.width / 1000) * (state.height / 1000), k = state.drive;
    if (k === 'base' || k === 'pro') { var v = area <= 8 ? ['S 9060', '600 N'] : area <= 12 ? ['S 9080', '800 N'] : ['S 9110', '1100 N']; return 'SOMMER ' + v[0] + ' ' + (k === 'base' ? 'base+' : 'pro+') + ' (' + v[1] + ')'; }
    if (k === 'aperto550') return 'Aperto A 550 L (550 N)';
    if (k === 'aperto800') return 'Aperto A 800 XL (800 N)';
    return 'ohne Antrieb';
  }
  function sanitize() {
    ['extras', 'driveExtras'].forEach(function (g) { state[g] = state[g].filter(function (k) { var o = byKey(g, k); return o && available(g, o); }); });
    var d = byKey('drive'); if (!d || !available('drive', d)) state.drive = 'aperto800';
    if (state.drive === 'none') state.driveExtras = state.driveExtras.filter(function (k) { return k === 'griff'; });
  }

  /* ---------- Rendering der Optionen ---------- */
  function renderGroup(group) {
    var wrap = $('[data-group="' + group + '"]', konf); if (!wrap) return;
    var multi = wrap.hasAttribute('data-multi');
    wrap.innerHTML = OPT[group].filter(function (o) { return available(group, o); }).map(function (o) {
      var sel = multi ? state[group].indexOf(o.key) >= 0 : state[group] === o.key;
      var price = typeof o.price === 'number' ? (o.price ? '+ ' + fmt(o.price) : 'inklusive') : o.price;
      return '<button type="button" class="opt' + (sel ? ' selected' : '') + '" data-key="' + o.key + '" aria-pressed="' + sel + '">' +
        (o.swatch ? '<span class="swatch" style="background:' + o.swatch + '"></span>' : '') +
        (o.brand ? '<span class="brand-tag">' + o.brand + '</span>' : '') +
        '<b>' + o.label + '</b>' + (o.desc ? '<small>' + o.desc + '</small>' : '') + '<span class="price">' + price + '</span></button>';
    }).join('');
    $$('.opt', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-key');
        if (multi) { var i = state[group].indexOf(k); i >= 0 ? state[group].splice(i, 1) : state[group].push(k); }
        else state[group] = k;
        if (group === 'type') { sanitize(); Object.keys(OPT).forEach(renderGroup); applyTypeUI(); }
        else renderGroup(group);
        update();
      });
    });
  }
  function applyTypeUI() {
    var t = state.type, isSek = SEKTIONAL.indexOf(t) >= 0;
    $('#k-design-sicke').hidden = !isSek && t !== 'schwingtor';
    $('#k-design-insulation').hidden = !isSek;
    $('#k-design-note').innerHTML = t === 'rolltor' ? '<div class="notice">Rolltore bestehen aus ausgeschäumten 77-mm-Aluminium-Lamellen. Sickung und Dämmstärke entfallen; die Farbe gilt für Lamellen und Kasten.</div>' :
      t === 'schwingtor' ? '<div class="notice">Schwingtore sind einwandig (ungedämmt). Für beheizte Garagen empfehlen wir ein Sektionaltor.</div>' : '';
    $('#k-opening-wrap').hidden = t !== 'seitensektional';
    $('#k-drive-extras-wrap').hidden = state.drive === 'none';
    $('#k-handsender-wrap').hidden = state.drive === 'none';
  }
  function renderSteps() {
    $('#konf-steps').innerHTML = STEPS.map(function (s, i) { return '<button type="button" class="' + (i === step ? 'active' : i < step ? 'done' : '') + '" data-i="' + i + '">' + (i + 1) + '. ' + s + '</button>'; }).join('');
    $$('#konf-steps button').forEach(function (b) { b.addEventListener('click', function () { go(+b.getAttribute('data-i')); }); });
    $$('.konf-panel', konf).forEach(function (p) { p.classList.toggle('active', +p.getAttribute('data-step') === step); });
    $('#konf-prev').style.visibility = step === 0 ? 'hidden' : 'visible';
    $('#konf-next').style.display = step === STEPS.length - 1 ? 'none' : '';
    $('#konf-progress').style.width = ((step + 1) / STEPS.length * 100) + '%';
    var bar = $('#konf-bar-next'); if (bar) bar.textContent = step === STEPS.length - 1 ? 'Angebot anfordern' : 'Weiter: ' + STEPS[step + 1];
    if (step === STEPS.length - 1) renderSummary();
  }
  function go(i) { step = Math.max(0, Math.min(STEPS.length - 1, i)); renderSteps(); konf.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  /* ---------- Preis ---------- */
  function calc() {
    var t = P.types[state.type], area = (state.width / 1000) * (state.height / 1000), isSek = SEKTIONAL.indexOf(state.type) >= 0;
    var lines = [];
    var door = t.base + Math.max(0, area - t.baseArea) * t.perM2;
    lines.push({ label: t.label + ' ' + state.width + ' × ' + state.height + ' mm', val: door });
    if (isSek) { var ins = P.insulation[state.insulation] || 0; if (ins) lines.push({ label: 'Dämmung 60 mm', val: door * ins }); }
    if ((isSek || state.type === 'schwingtor') && P.sicke[state.sicke]) lines.push({ label: 'Sickung: ' + byKey('sicke').label, val: P.sicke[state.sicke] });
    if (P.surface[state.surface]) lines.push({ label: 'Oberfläche: ' + byKey('surface').label, val: P.surface[state.surface] });
    var col = RAL[state.color]; if (col.price) lines.push({ label: 'Farbe: ' + (state.color === 'special' && state.colorSpecial ? state.colorSpecial : col.label), val: col.price });
    if (state.drive !== 'none') {
      lines.push({ label: 'Antrieb: ' + driveModel(), val: P.drive[state.drive] });
      var hs = Math.max(0, state.handsender - 1); if (hs) lines.push({ label: hs + ' zusätzl. Handsender', val: hs * P.handsender });
    }
    state.driveExtras.forEach(function (k) { lines.push({ label: byKey('driveExtras', k).label, val: P[k] }); });
    state.extras.forEach(function (k) { lines.push({ label: byKey('extras', k).label, val: P[k] }); });
    if (state.montage.indexOf('montage') >= 0) lines.push({ label: 'Montage', val: t.montage });
    if (state.montage.indexOf('demontage') >= 0) lines.push({ label: 'Demontage & Entsorgung', val: P.demontage });
    var net = lines.reduce(function (s, l) { return s + l.val; }, 0), gross = net * (1 + P.vat);
    return { lines: lines, net: net, gross: gross, low: Math.round(gross * .94 / 10) * 10, high: Math.round(gross * 1.06 / 10) * 10, area: area };
  }
  function byKey(group, key) { key = key || state[group]; return OPT[group].find(function (o) { return o.key === key; }) || (key ? { label: key } : null); }

  /* ---------- Fassaden-Vorschau (SVG) ---------- */
  function preview() {
    var W = 640, H = 420, groundY = 340;
    var dw = Math.round(200 + (state.width - 2000) / 6000 * 300), dh = Math.round(150 + (state.height - 1800) / 1700 * 120);
    var dx = Math.round((W - dw) / 2), dy = groundY - dh;
    var col = RAL[state.color], hex = col.hex, dark = isDark(hex);
    var line = dark ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.2)', hi = dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.45)', sh = dark ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.12)';
    var wall = { putz: '#e8e4dc', weiss: '#f4f4f2', grau: '#b9bcc0', klinker: '#a8624a' }[state.facade] || '#e8e4dc';
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vorschau Ihres Tores">';
    s += '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3f7"/><stop offset="1" stop-color="#eef4fa"/></linearGradient>' +
      '<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa0a6"/><stop offset="1" stop-color="#6b7178"/></linearGradient>' +
      '<linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + hi + '"/><stop offset=".5" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="' + sh + '"/></linearGradient>' +
      '<pattern id="wood" width="6" height="40" patternUnits="userSpaceOnUse"><rect width="6" height="40" fill="' + hex + '"/><path d="M1,0 V40 M4,0 V40" stroke="rgba(0,0,0,.14)" stroke-width="1"/></pattern>' +
      '<pattern id="brick" width="40" height="20" patternUnits="userSpaceOnUse"><rect width="40" height="20" fill="' + wall + '"/><path d="M0,10 H40 M20,0 V10 M0,10 V20 M40,10 V20" stroke="rgba(0,0,0,.18)" stroke-width="1.5" fill="none"/></pattern>' +
      '<pattern id="lam" width="10" height="9" patternUnits="userSpaceOnUse"><rect width="10" height="9" fill="' + hex + '"/><rect y="7" width="10" height="2" fill="' + line + '"/><rect y="0" width="10" height="1" fill="' + hi + '"/></pattern></defs>';
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>';
    s += '<path d="M0,' + groundY + ' H' + W + ' V' + H + ' H0 Z" fill="url(#ground)"/>';
    s += '<path d="M' + (dx - 30) + ',' + groundY + ' L' + (dx - 80) + ',' + H + ' H' + (dx + dw + 80) + ' L' + (dx + dw + 30) + ',' + groundY + ' Z" fill="#7d838a"/>';
    s += '<rect x="40" y="70" width="' + (W - 80) + '" height="' + (groundY - 70) + '" fill="' + (state.facade === 'klinker' ? 'url(#brick)' : wall) + '"/>';
    s += '<rect x="30" y="54" width="' + (W - 60) + '" height="18" fill="#3b4148"/><rect x="30" y="52" width="' + (W - 60) + '" height="4" fill="#20252b"/>';
    s += '<rect x="' + (W - 150) + '" y="120" width="70" height="90" rx="2" fill="#dde8f2" stroke="#fff" stroke-width="4"/><path d="M' + (W - 115) + ',120 V210 M' + (W - 150) + ',165 H' + (W - 80) + '" stroke="#fff" stroke-width="3"/>';
    s += '<rect x="' + (dx - 10) + '" y="' + (dy - 10) + '" width="' + (dw + 20) + '" height="' + (dh + 10) + '" fill="#2b3036"/>';
    var fill = col.wood ? 'url(#wood)' : hex, t = state.type;
    s += '<rect x="' + dx + '" y="' + dy + '" width="' + dw + '" height="' + dh + '" fill="' + fill + '"/>';
    var g = '<g transform="translate(' + dx + ',' + dy + ')">';
    if (t === 'sektional' || t === 'sektional_premium') {
      var n = Math.max(3, Math.round(dh / 55)), ph = dh / n;
      for (var i = 0; i < n; i++) {
        var y = i * ph;
        g += '<rect x="0" y="' + y + '" width="' + dw + '" height="' + ph + '" fill="url(#panel)"/><line x1="0" y1="' + y + '" x2="' + dw + '" y2="' + y + '" stroke="' + line + '" stroke-width="1.5"/>';
        if (state.sicke === 'gross') g += '<line x1="0" y1="' + (y + ph / 2) + '" x2="' + dw + '" y2="' + (y + ph / 2) + '" stroke="' + line + '" stroke-width="2.5"/>';
        if (state.sicke === 'mittel') g += '<line x1="0" y1="' + (y + ph / 3) + '" x2="' + dw + '" y2="' + (y + ph / 3) + '" stroke="' + line + '" stroke-width="1.5"/><line x1="0" y1="' + (y + 2 * ph / 3) + '" x2="' + dw + '" y2="' + (y + 2 * ph / 3) + '" stroke="' + line + '" stroke-width="1.5"/>';
        if (state.sicke === 'kassette') { var kn = Math.max(2, Math.round(dw / 90)), kw = dw / kn; for (var k = 0; k < kn; k++) g += '<rect x="' + (k * kw + 8) + '" y="' + (y + 7) + '" width="' + (kw - 16) + '" height="' + (ph - 14) + '" fill="none" stroke="' + line + '" stroke-width="2" rx="2"/>'; }
      }
      if (state.extras.indexOf('fenster') >= 0) { var fn = Math.max(3, Math.round(dw / 90)), fw = dw / fn; for (var f = 0; f < fn; f++) g += '<rect x="' + (f * fw + 8) + '" y="' + (ph * .22) + '" width="' + (fw - 16) + '" height="' + (ph * .56) + '" rx="3" fill="#cfe3f7" stroke="#fff" stroke-width="2"/>'; }
    } else if (t === 'rolltor') {
      g += '<rect x="0" y="0" width="' + dw + '" height="' + dh + '" fill="url(#lam)"/><rect x="-10" y="-10" width="' + (dw + 20) + '" height="22" fill="' + hex + '" stroke="' + line + '"/><path d="M-10,12 H' + (dw + 10) + '" stroke="' + sh + '" stroke-width="3"/>';
    } else if (t === 'schwingtor') {
      var vn = Math.max(8, Math.round(dw / 22)); for (var v = 1; v < vn; v++) g += '<line x1="' + (v * dw / vn) + '" y1="0" x2="' + (v * dw / vn) + '" y2="' + dh + '" stroke="' + line + '" stroke-width="1.5"/>';
      g += '<rect x="0" y="0" width="' + dw + '" height="' + dh + '" fill="url(#panel)"/>';
      if (state.extras.indexOf('fenster') >= 0) for (var q = 0; q < 4; q++) g += '<rect x="' + (q * dw / 4 + 10) + '" y="' + (dh * .12) + '" width="' + (dw / 4 - 20) + '" height="' + (dh * .16) + '" rx="3" fill="#cfe3f7" stroke="#fff" stroke-width="2"/>';
      g += '<rect x="' + (dw / 2 - 12) + '" y="' + (dh / 2 - 6) + '" width="24" height="12" rx="3" fill="#222"/>';
    } else if (t === 'seitensektional') {
      var sn = Math.max(5, Math.round(dw / 45)); for (var p = 0; p < sn; p++) { var px = p * dw / sn; g += '<rect x="' + px + '" y="0" width="' + (dw / sn) + '" height="' + dh + '" fill="url(#panel)"/><line x1="' + px + '" y1="0" x2="' + px + '" y2="' + dh + '" stroke="' + line + '" stroke-width="1.5"/>'; }
      if (state.extras.indexOf('fenster') >= 0) for (var w = 0; w < sn; w++) g += '<rect x="' + (w * dw / sn + 5) + '" y="' + (dh * .12) + '" width="' + (dw / sn - 10) + '" height="' + (dh * .16) + '" rx="2" fill="#cfe3f7" stroke="#fff" stroke-width="2"/>';
    }
    if (state.extras.indexOf('schlupftuer') >= 0) g += '<rect x="' + (dw * .62) + '" y="' + (dh * .08) + '" width="' + (dw * .28) + '" height="' + (dh * .92) + '" fill="none" stroke="' + (dark ? '#fff' : '#111') + '" stroke-width="2.5" rx="2"/><circle cx="' + (dw * .66) + '" cy="' + (dh * .55) + '" r="3.5" fill="' + (dark ? '#fff' : '#111') + '"/>';
    if (state.extras.indexOf('lueftung') >= 0) g += '<rect x="' + (dw * .06) + '" y="' + (dh * .86) + '" width="' + (dw * .2) + '" height="' + (dh * .08) + '" fill="' + line + '" rx="2"/>';
    if (state.driveExtras.indexOf('griff') >= 0) g += '<rect x="' + (dw / 2 - 14) + '" y="' + (dh * .55) + '" width="28" height="8" rx="4" fill="' + (dark ? '#d5d9e0' : '#333') + '"/>';
    if (state.extras.indexOf('nebentuer') >= 0) { var ndx = dx - 90, ndw = 46, ndh = Math.round(dh * .85); s += '<rect x="' + (ndx - 6) + '" y="' + (groundY - ndh - 6) + '" width="' + (ndw + 12) + '" height="' + (ndh + 6) + '" fill="#2b3036"/><rect x="' + ndx + '" y="' + (groundY - ndh) + '" width="' + ndw + '" height="' + ndh + '" fill="' + fill + '"/><rect x="' + ndx + '" y="' + (groundY - ndh) + '" width="' + ndw + '" height="' + ndh + '" fill="url(#panel)"/><circle cx="' + (ndx + ndw - 9) + '" cy="' + (groundY - ndh / 2) + '" r="3" fill="' + (dark ? '#fff' : '#111') + '"/>'; }
    if (state.drive !== 'none') s += '<rect x="' + (dx + dw / 2 - 16) + '" y="' + (dy - 30) + '" width="32" height="12" rx="3" fill="#1f6fd6"/><circle cx="' + (dx + dw / 2) + '" cy="' + (dy - 24) + '" r="3" fill="#fff"/>';
    s += g + '</g>';
    s += '<rect x="' + (W - 70) + '" y="' + (groundY - 60) + '" width="6" height="60" fill="#3b4148"/><circle cx="' + (W - 67) + '" cy="' + (groundY - 64) + '" r="7" fill="#f6d68a" stroke="#3b4148" stroke-width="2"/>';
    s += '<line x1="' + dx + '" y1="' + (groundY + 18) + '" x2="' + (dx + dw) + '" y2="' + (groundY + 18) + '" stroke="#fff" stroke-width="1.5"/><text x="' + (dx + dw / 2) + '" y="' + (groundY + 34) + '" text-anchor="middle" font-size="12" fill="#fff" font-family="Inter,Arial" font-weight="600">' + state.width + ' mm</text>';
    s += '<line x1="' + (dx + dw + 22) + '" y1="' + dy + '" x2="' + (dx + dw + 22) + '" y2="' + groundY + '" stroke="#3b4148" stroke-width="1.5"/><text x="' + (dx + dw + 30) + '" y="' + (dy + dh / 2 + 4) + '" font-size="12" fill="#3b4148" font-family="Inter,Arial" font-weight="600">' + state.height + ' mm</text>';
    return s + '</svg>';
  }
  function isDark(hex) { if (!/^#/.test(hex)) return false; var c = parseInt(hex.slice(1), 16); return ((c >> 16) * 299 + ((c >> 8) & 255) * 587 + (c & 255) * 114) / 1000 < 128; }

  /* ---------- Zusammenfassung ---------- */
  function update() {
    persist(); var r = calc();
    $('#konf-preview').innerHTML = preview();
    $('#konf-table').innerHTML = r.lines.map(function (l) { return '<tr><td>' + esc(l.label) + '</td><td>' + fmt(l.val) + '</td></tr>'; }).join('') +
      '<tr><td>Netto</td><td>' + fmt(r.net) + '</td></tr><tr><td>zzgl. 19 % MwSt.</td><td>' + fmt(r.gross - r.net) + '</td></tr>';
    $('#konf-total').innerHTML = 'ca. ' + fmt(r.low) + ' – ' + fmt(r.high) + '<small>Preisspanne inkl. 19 % MwSt., unverbindlich · Mittelwert ' + fmt(r.gross) + '</small>';
    var bar = $('#konf-bar-price'); if (bar) bar.textContent = 'ca. ' + fmt(r.gross);
    $('#k-color-special-wrap').style.display = state.color === 'special' ? '' : 'none';
    $('#konf-mail').href = mailtoLink(r);
    var wa = $('#konf-wa'); if (wa) { var num = (co.whatsapp || '').replace(/\D/g, ''); if (num) { wa.hidden = false; wa.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent('Hallo TorPro, ich interessiere mich für folgendes Tor:\n\n' + summaryText(r) + '\n\nLink: ' + shareUrl()); } else wa.hidden = true; }
    if (step === STEPS.length - 1) renderSummary();
  }
  function summaryText(r) {
    var t = [];
    t.push('Tortyp: ' + P.types[state.type].label);
    t.push('Maße: ' + state.width + ' x ' + state.height + ' mm (' + r.area.toFixed(2) + ' m²)');
    t.push('Sturz: ' + $('#k-sturz option:checked').textContent + ' | Einbau: ' + $('#k-einbau option:checked').textContent);
    if (state.type === 'seitensektional') t.push('Öffnungsrichtung: ' + (state.opening === 'links' ? 'nach links' : 'nach rechts'));
    if (SEKTIONAL.indexOf(state.type) >= 0 || state.type === 'schwingtor') t.push('Sickung: ' + byKey('sicke').label);
    t.push('Oberfläche: ' + byKey('surface').label);
    t.push('Farbe: ' + RAL[state.color].label + (state.colorSpecial ? ' (' + state.colorSpecial + ')' : ''));
    if (SEKTIONAL.indexOf(state.type) >= 0) t.push('Dämmung: ' + byKey('insulation').label);
    t.push('Antrieb: ' + driveModel() + (state.drive !== 'none' ? ', ' + state.handsender + ' Handsender' : ''));
    if (state.driveExtras.length) t.push('Zubehör: ' + state.driveExtras.map(function (k) { return byKey('driveExtras', k).label; }).join(', '));
    if (state.extras.length) t.push('Extras: ' + state.extras.map(function (k) { return byKey('extras', k).label; }).join(', '));
    t.push('Montage: ' + (state.montage.length ? state.montage.map(function (k) { return byKey('montage', k).label; }).join(', ') : 'keine'));
    if (state.wunsch) t.push('Wunschtermin: ' + state.wunsch);
    t.push('Richtpreis: ca. ' + fmt(r.low) + ' – ' + fmt(r.high) + ' inkl. MwSt. (netto ca. ' + fmt(r.net) + ')');
    return t.join('\n');
  }
  function mailtoLink(r) {
    var body = 'Guten Tag,\n\nich interessiere mich für folgendes Tor:\n\n' + summaryText(r) + '\n\nKonfiguration: ' + shareUrl() + '\n\nName: \nTelefon: \nAdresse: \n\nBitte senden Sie mir ein Angebot.';
    return 'mailto:' + co.email + '?subject=' + encodeURIComponent('Anfrage Garagentor-Konfigurator') + '&body=' + encodeURIComponent(body);
  }
  function renderSummary() {
    var r = calc(), el = $('#konf-summary'); if (!el) return;
    el.innerHTML = '<dl>' + summaryText(r).split('\n').map(function (l) { var p = l.split(': '); return '<dt>' + esc(p.shift()) + '</dt><dd>' + esc(p.join(': ')) + '</dd>'; }).join('') + '</dl>';
  }
  function printSummary() {
    var r = calc(), w = window.open('', '_blank'); if (!w) return;
    w.document.write('<html><head><title>Torkonfiguration – TorPro</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:auto;padding:24px;color:#111}h1{font-size:22px;margin:0}h2{font-size:13px;color:#555;margin:0 0 18px;font-weight:normal}dl{display:grid;grid-template-columns:170px 1fr;gap:6px 12px}dt{font-weight:bold;color:#555}dd{margin:0}table{width:100%;border-collapse:collapse;margin-top:18px}td{padding:5px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right}.tot{font-size:18px;font-weight:bold;margin-top:12px}.hint{font-size:11px;color:#666;margin-top:18px}</style></head><body>' +
      '<h1>Ihre Torkonfiguration</h1><h2>' + esc(co.name) + ' · ' + esc(co.street) + ', ' + esc(co.zip + ' ' + co.city) + ' · ' + esc(co.phoneDisplay) + ' · ' + esc(co.email) + '</h2>' +
      '<dl>' + summaryText(r).split('\n').map(function (l) { var p = l.split(': '); return '<dt>' + esc(p.shift()) + '</dt><dd>' + esc(p.join(': ')) + '</dd>'; }).join('') + '</dl>' +
      '<table>' + r.lines.map(function (l) { return '<tr><td>' + esc(l.label) + '</td><td>' + fmt(l.val) + '</td></tr>'; }).join('') + '<tr><td>Netto</td><td>' + fmt(r.net) + '</td></tr><tr><td>19 % MwSt.</td><td>' + fmt(r.gross - r.net) + '</td></tr></table>' +
      '<div class="tot">Richtpreis ca. ' + fmt(r.low) + ' – ' + fmt(r.high) + ' inkl. MwSt.</div>' +
      '<p class="hint">Unverbindlicher Richtpreis auf Basis von Standardwerten. Das verbindliche Angebot erstellt TorPro nach Aufmaß. Konfiguration erneut öffnen: ' + esc(shareUrl()) + '</p><script>window.print()<\/script></body></html>');
    w.document.close();
  }

  /* ---------- Absenden ---------- */
  function submit(e) {
    e.preventDefault();
    var msg = $('#konf-msg'), btn = $('#konf-submit');
    var f = { name: $('#c-name').value.trim(), phone: $('#c-phone').value.trim(), email: $('#c-email').value.trim(), street: $('#c-street').value.trim(), zip: $('#c-zip').value.trim(), city: $('#c-city').value.trim(), message: $('#c-msg').value.trim(), callback: $('#c-callback').checked, callbackTime: $('#c-callback-time').value };
    if ($('#c-hp').value) return;
    if (!f.name || !f.phone || !f.email || !f.zip || !f.city || !$('#c-privacy').checked) { msg.innerHTML = '<div class="notice err">Bitte alle Pflichtfelder (*) ausfüllen und der Datenschutzerklärung zustimmen.</div>'; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) { msg.innerHTML = '<div class="notice err">Bitte eine gültige E-Mail-Adresse angeben.</div>'; return; }
    var r = calc();
    var req = { kind: 'konfigurator', status: 'neu', contact: f, config: JSON.parse(JSON.stringify(state)), configText: summaryText(r), configUrl: shareUrl(), priceNet: Math.round(r.net), priceGross: Math.round(r.gross), source: location.href };
    btn.disabled = true; btn.textContent = 'Wird gesendet …';
    var jobs = [window.TorProStore.add('requests', req)];
    if (C.requestWebhook) jobs.push(fetch(C.requestWebhook, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(req) }).catch(function (err) { console.warn('Webhook fehlgeschlagen', err); }));
    Promise.all(jobs).then(function () {
      msg.innerHTML = '<div class="notice ok"><b>Vielen Dank, ' + esc(f.name) + '!</b> Ihre Anfrage ist bei uns eingegangen. Wir melden uns innerhalb von 24 Stunden mit Ihrem Angebot' + (f.callback ? ' und rufen Sie ' + esc(f.callbackTime || 'zeitnah') + ' zurück' : '') + '.</div>';
      btn.textContent = 'Anfrage gesendet ✓'; try { localStorage.removeItem('torpro_konf'); } catch (e) { }
      window.torproToast && torproToast('Anfrage gesendet');
    }).catch(function (err) {
      console.error(err); btn.disabled = false; btn.textContent = 'Unverbindliches Angebot anfordern';
      msg.innerHTML = '<div class="notice err">Die Anfrage konnte nicht gespeichert werden. Bitte nutzen Sie „Per E-Mail senden“ oder rufen Sie uns an.</div>';
    });
  }

  /* ---------- Init ---------- */
  var restored = restore(); sanitize();
  Object.keys(OPT).forEach(renderGroup);
  ['k-width', 'k-height'].forEach(function (id) { var key = id === 'k-width' ? 'width' : 'height'; $('#' + id).value = state[key]; $('#' + id + '-n').value = state[key]; });
  $('#k-sturz').value = state.sturz; $('#k-einbau').value = state.einbau; $('#k-handsender').value = state.handsender; $('#k-color-special').value = state.colorSpecial; $('#k-wunsch').value = state.wunsch; $('#k-opening').value = state.opening; $('#k-facade').value = state.facade;
  applyTypeUI(); renderSteps(); update();
  if (restored && window.torproToast) setTimeout(function () { torproToast(restored === 'link' ? 'Konfiguration aus Link geladen' : 'Ihre letzte Konfiguration wurde wiederhergestellt'); }, 400);
  function bindRange(id, key) {
    var r = $('#' + id), n = $('#' + id + '-n');
    r.addEventListener('input', function () { state[key] = +r.value; n.value = r.value; sanitize(); renderGroup('drive'); update(); });
    n.addEventListener('change', function () { var v = Math.max(+n.min, Math.min(+n.max, +n.value || +n.min)); n.value = v; r.value = v; state[key] = v; sanitize(); renderGroup('drive'); update(); });
  }
  bindRange('k-width', 'width'); bindRange('k-height', 'height');
  [['k-sturz', 'sturz'], ['k-einbau', 'einbau'], ['k-opening', 'opening'], ['k-facade', 'facade'], ['k-wunsch', 'wunsch']].forEach(function (p) { $('#' + p[0]).addEventListener('change', function (e) { state[p[1]] = e.target.value; update(); }); });
  $('#k-handsender').addEventListener('change', function (e) { state.handsender = +e.target.value; update(); });
  $('#k-color-special').addEventListener('input', function (e) { state.colorSpecial = e.target.value; update(); });
  $('[data-group="drive"]').addEventListener('click', function () { sanitize(); renderGroup('driveExtras'); applyTypeUI(); });
  $('#konf-prev').addEventListener('click', function () { go(step - 1); });
  $('#konf-next').addEventListener('click', function () { go(step + 1); });
  var barNext = $('#konf-bar-next'); if (barNext) barNext.addEventListener('click', function () { if (step === STEPS.length - 1) $('#konf-submit').click(); else go(step + 1); });
  $('#konf-form').addEventListener('submit', submit);
  $('#konf-print').addEventListener('click', printSummary);
  $('#konf-share').addEventListener('click', function () { var u = shareUrl(); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { torproToast('Link kopiert'); }, function () { prompt('Link zur Konfiguration:', u); }); });
  $('#konf-reset').addEventListener('click', function () { state = JSON.parse(JSON.stringify(DEFAULT)); try { localStorage.removeItem('torpro_konf'); } catch (e) { } history.replaceState(null, '', location.pathname); location.reload(); });
  $('#c-callback').addEventListener('change', function (e) { $('#c-callback-time').disabled = !e.target.checked; });
})();
