/* TorPro Wortmarke als Inline-SVG (nachgebaut aus der Logovorlage).
   Verwendung: <span data-logo></span>  oder  <span data-logo="mark"></span> (nur Wortmarke, ohne Subline)
   Farben lassen sich über CSS-Variablen --logo-blue / --logo-orange / --logo-grey steuern. */
(function () {
  var t = 22;                // Strichstärke
  var gap = 12;
  function T(x, c) {
    return '<g fill="' + c + '" transform="translate(' + x + ',0)">' +
      '<rect x="0" y="0" width="80" height="' + t + '"/>' +
      '<rect x="29" y="0" width="' + t + '" height="100"/></g>';
  }
  function O(x, c) {
    // Garagentor-O: Rahmen mit rechteckigem Ausschnitt und Lamellen
    return '<g fill="' + c + '" transform="translate(' + x + ',0)">' +
      '<path fill-rule="evenodd" d="M16,0 H74 A16,16 0 0 1 90,16 V84 A16,16 0 0 1 74,100 H16 A16,16 0 0 1 0,84 V16 A16,16 0 0 1 16,0 Z ' +
      'M22,18 H68 A4,4 0 0 1 72,22 V78 A4,4 0 0 1 68,82 H22 A4,4 0 0 1 18,78 V22 A4,4 0 0 1 22,18 Z"/>' +
      '<rect x="18" y="24" width="54" height="7" rx="1.5"/>' +
      '<rect x="18" y="36" width="54" height="7" rx="1.5"/>' +
      '<rect x="18" y="48" width="54" height="7" rx="1.5"/>' +
      '<rect x="18" y="60" width="54" height="7" rx="1.5"/>' +
      '</g>';
  }
  function P(x, c, leg) {
    var s = '<g fill="' + c + '" transform="translate(' + x + ',0)">' +
      '<rect x="0" y="0" width="' + t + '" height="100"/>' +
      '<path fill="none" stroke="' + c + '" stroke-width="' + t + '" d="M11,11 H54 A16.5,16.5 0 0 1 54,44 H11"/>';
    if (leg) s += '<path d="M33,55 L60,100 H84 L57,55 Z"/>';
    return s + '</g>';
  }
  function build(opts) {
    opts = opts || {};
    var blue = 'var(--logo-blue,#1f6fd6)', orange = 'var(--logo-orange,#f47a1f)', grey = 'var(--logo-grey,#b8bcc4)';
    var x = 0, parts = [];
    parts.push(T(x, blue)); x += 80 + gap;
    parts.push(O(x, blue)); x += 90 + gap;
    parts.push(P(x, blue, true)); x += 84 + gap;
    parts.push(P(x, orange, false)); x += 78 + gap;
    parts.push(P(x, orange, true)); x += 84 + gap;
    parts.push(O(x, orange)); x += 90;
    var w = x, h = opts.sub === false ? 100 : 150;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -2 ' + w + ' ' + (h + 4) + '" role="img" aria-label="TorPro Zugangstechnik" class="torpro-logo">' +
      parts.join('');
    if (opts.sub !== false) {
      svg += '<text x="' + (w / 2) + '" y="140" text-anchor="middle" fill="' + grey +
        '" font-family="\'Exo 2\',\'Segoe UI\',Arial,sans-serif" font-weight="500" font-size="40" letter-spacing="2">Zugangstechnik</text>';
    }
    return svg + '</svg>';
  }
  window.TorProLogo = { svg: build };
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-logo]').forEach(function (el) {
      el.innerHTML = build({ sub: el.getAttribute('data-logo') !== 'mark' });
    });
  });
})();
