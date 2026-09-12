/* =========================================================
   TorPro Datenschicht
   - Firebase (Auth + Firestore), wenn in config.js konfiguriert
   - sonst lokaler Demo-Modus (localStorage) mit Demo-Login
   Einheitliche API für Website und Adminbereich.
   ========================================================= */
window.TorProStore = (function () {
  var cfg = window.TORPRO_CONFIG || {};
  var COLS = ['orders', 'requests', 'team', 'events', 'customers'];
  var LS_KEY = 'torpro_db_v1';
  var SESSION_KEY = 'torpro_session_v1';
  var mode = cfg.firebase && cfg.firebase.apiKey ? 'firebase' : 'local';
  var fb = null;
  var authListeners = [];
  var localUser = null;
  var initPromise = null;

  /* ---------- Helpers ---------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function now() { return new Date().toISOString(); }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Script konnte nicht geladen werden: ' + src)); };
      document.head.appendChild(s);
    });
  }

  /* ---------- Local adapter ---------- */
  function readDb() {
    try { var d = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); COLS.forEach(function (c) { if (!Array.isArray(d[c])) d[c] = []; }); return d; }
    catch (e) { var e2 = {}; COLS.forEach(function (c) { e2[c] = []; }); return e2; }
  }
  function writeDb(db) { localStorage.setItem(LS_KEY, JSON.stringify(db)); window.dispatchEvent(new CustomEvent('torpro:change')); }

  var local = {
    list: function (col) { return Promise.resolve(readDb()[col].slice().sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); })); },
    add: function (col, data) { var db = readDb(); var item = Object.assign({}, data, { id: uid(), createdAt: now(), updatedAt: now() }); db[col].push(item); writeDb(db); return Promise.resolve(item.id); },
    update: function (col, id, patch) { var db = readDb(); var i = db[col].findIndex(function (x) { return x.id === id; }); if (i < 0) return Promise.reject(new Error('nicht gefunden')); db[col][i] = Object.assign({}, db[col][i], patch, { updatedAt: now() }); writeDb(db); return Promise.resolve(); },
    remove: function (col, id) { var db = readDb(); db[col] = db[col].filter(function (x) { return x.id !== id; }); writeDb(db); return Promise.resolve(); },
    watch: function (col, cb) { var h = function () { local.list(col).then(cb); }; h(); window.addEventListener('torpro:change', h); window.addEventListener('storage', h); return function () { window.removeEventListener('torpro:change', h); window.removeEventListener('storage', h); }; },
    exportAll: function () { return Promise.resolve(readDb()); },
    importAll: function (obj) { var db = readDb(); COLS.forEach(function (c) { if (Array.isArray(obj[c])) db[c] = obj[c]; }); writeDb(db); return Promise.resolve(); }
  };

  var localAuth = {
    current: function () { if (localUser) return localUser; try { localUser = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { } return localUser; },
    login: function (email, password) {
      var u = (cfg.demoUsers || []).find(function (x) { return x.email.toLowerCase() === String(email).toLowerCase() && x.password === password; });
      if (!u) return Promise.reject(new Error('E-Mail oder Passwort falsch.'));
      localUser = { uid: 'demo-' + u.email, email: u.email, name: u.name, role: u.role || 'monteur' };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(localUser));
      authListeners.forEach(function (f) { f(localUser); });
      return Promise.resolve(localUser);
    },
    logout: function () { localUser = null; sessionStorage.removeItem(SESSION_KEY); authListeners.forEach(function (f) { f(null); }); return Promise.resolve(); },
    onChange: function (f) { authListeners.push(f); setTimeout(function () { f(localAuth.current()); }, 0); }
  };

  /* ---------- Firebase adapter ---------- */
  function initFirebase() {
    var v = '10.12.2';
    return loadScript('https://www.gstatic.com/firebasejs/' + v + '/firebase-app-compat.js')
      .then(function () { return Promise.all([
        loadScript('https://www.gstatic.com/firebasejs/' + v + '/firebase-auth-compat.js'),
        loadScript('https://www.gstatic.com/firebasejs/' + v + '/firebase-firestore-compat.js')
      ]); })
      .then(function () {
        var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg.firebase);
        fb = { app: app, auth: firebase.auth(), db: firebase.firestore() };
        fb.db.enablePersistence({ synchronizeTabs: true }).catch(function () { });
      });
  }
  function docToObj(d) { return Object.assign({ id: d.id }, d.data()); }
  var remote = {
    list: function (col) { return fb.db.collection(col).orderBy('createdAt', 'desc').get().then(function (s) { return s.docs.map(docToObj); }); },
    add: function (col, data) { return fb.db.collection(col).add(Object.assign({}, data, { createdAt: now(), updatedAt: now() })).then(function (r) { return r.id; }); },
    update: function (col, id, patch) { return fb.db.collection(col).doc(id).update(Object.assign({}, patch, { updatedAt: now() })); },
    remove: function (col, id) { return fb.db.collection(col).doc(id).delete(); },
    watch: function (col, cb) { return fb.db.collection(col).orderBy('createdAt', 'desc').onSnapshot(function (s) { cb(s.docs.map(docToObj)); }, function (err) { console.error(err); cb([]); }); },
    exportAll: function () { return Promise.all(COLS.map(function (c) { return remote.list(c); })).then(function (arr) { var o = {}; COLS.forEach(function (c, i) { o[c] = arr[i]; }); return o; }); },
    importAll: function (obj) {
      var batch = fb.db.batch(), n = 0;
      COLS.forEach(function (c) { (obj[c] || []).forEach(function (item) { var id = item.id || uid(); var d = Object.assign({}, item); delete d.id; batch.set(fb.db.collection(c).doc(id), d); n++; }); });
      return n ? batch.commit() : Promise.resolve();
    }
  };
  var remoteAuth = {
    current: function () { var u = fb && fb.auth.currentUser; return u ? { uid: u.uid, email: u.email, name: u.displayName || u.email.split('@')[0] } : null; },
    login: function (email, password) { return fb.auth.signInWithEmailAndPassword(email, password).then(function () { return remoteAuth.current(); }).catch(function (e) { throw new Error(translateAuthError(e)); }); },
    logout: function () { return fb.auth.signOut(); },
    onChange: function (f) { fb.auth.onAuthStateChanged(function () { f(remoteAuth.current()); }); }
  };
  function translateAuthError(e) {
    var c = e && e.code || '';
    if (/wrong-password|invalid-credential|user-not-found|invalid-login/.test(c)) return 'E-Mail oder Passwort falsch.';
    if (/too-many-requests/.test(c)) return 'Zu viele Versuche. Bitte später erneut versuchen.';
    if (/network/.test(c)) return 'Keine Verbindung zum Server.';
    return e.message || 'Anmeldung fehlgeschlagen.';
  }

  /* ---------- Public API ---------- */
  function init() {
    if (!initPromise) initPromise = (mode === 'firebase' ? initFirebase() : Promise.resolve()).catch(function (e) { console.warn('Firebase nicht verfügbar, wechsle in lokalen Modus:', e); mode = 'local'; });
    return initPromise;
  }
  function impl() { return mode === 'firebase' && fb ? remote : local; }
  function authImpl() { return mode === 'firebase' && fb ? remoteAuth : localAuth; }

  return {
    get mode() { return mode; },
    init: init,
    list: function (c) { return init().then(function () { return impl().list(c); }); },
    add: function (c, d) { return init().then(function () { return impl().add(c, d); }); },
    update: function (c, id, p) { return init().then(function () { return impl().update(c, id, p); }); },
    remove: function (c, id) { return init().then(function () { return impl().remove(c, id); }); },
    watch: function (c, cb) { var un = null, dead = false; init().then(function () { if (!dead) un = impl().watch(c, cb); }); return function () { dead = true; if (un) un(); }; },
    exportAll: function () { return init().then(function () { return impl().exportAll(); }); },
    importAll: function (o) { return init().then(function () { return impl().importAll(o); }); },
    auth: {
      current: function () { return authImpl().current(); },
      login: function (e, p) { return init().then(function () { return authImpl().login(e, p); }); },
      logout: function () { return init().then(function () { return authImpl().logout(); }); },
      onChange: function (f) { init().then(function () { authImpl().onChange(f); }); }
    },
    uid: uid,
    COLS: COLS
  };
})();
