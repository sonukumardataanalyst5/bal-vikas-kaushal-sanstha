/* DEMO BACKEND for the Netlify preview only. Netlify cannot run PHP, so this small script stands in for the server:
   it answers the website's and the admin panel's requests (api/content.php and admin/api.php) from this browser's own storage.
   - Everything you change in /admin is kept ONLY in this browser (localStorage). Nobody else sees it, and clearing browser data removes it.
   - No payments, emails or real uploads happen. Photos you upload are shrunk and kept in this browser.
   - This file is NOT included in the GoDaddy package: there the real PHP server (admin/api.php) does all of this. */
(function () {
  if (window.__bvksDemo) return; window.__bvksDemo = true;
  var KEY = 'bvks_demo_v1', realFetch = window.fetch.bind(window), inAdmin = /\/admin(\/|$)/.test(location.pathname), R = inAdmin ? '../' : '';
  var SECTIONS = ['settings', 'causes', 'images', 'slides', 'how', 'values', 'stats', 'focus', 'drives', 'news', 'newsCats', 'team', 'faq', 'texts'];
  var cache = {};
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function store(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
  function J(url) { return cache[url] || (cache[url] = realFetch(url).then(function (r) { return r.json(); })); }
  function resp(o, st) { return new Response(JSON.stringify(o), { status: st || 200, headers: { 'Content-Type': 'application/json' } }); }
  function bad(msg, st) { return resp({ error: msg }, st || 400); }
  var clone = function (x) { return JSON.parse(JSON.stringify(x)); };
  function sha(t) { var e = new TextEncoder().encode('bvks-demo:' + t); return (window.crypto && crypto.subtle) ? crypto.subtle.digest('SHA-256', e).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }) : Promise.resolve('p:' + t); }

  // ---- same merge rule as api/_lib.php content_all()
  function merge(d, s) {
    var m = Object.assign({}, d, s);
    if (s.settings && typeof s.settings === 'object') {
      m.settings = Object.assign({}, d.settings || {}, s.settings);
      ['bank', 'social'].forEach(function (k) { if (s.settings[k] && typeof s.settings[k] === 'object') m.settings[k] = Object.assign({}, (d.settings || {})[k] || {}, s.settings[k]); });
    }
    return m;
  }
  function savedOnly(s) { var o = {}; SECTIONS.forEach(function (k) { if (s.saved && s.saved[k] !== undefined) o[k] = s.saved[k]; }); return o; }

  // ---- light version of the server-side checks (admin/api.php san_section) so the same messages appear
  var intIn = function (v, mn, mx, def) { v = parseFloat(v); if (isNaN(v)) return def; v = Math.floor(v); return Math.max(mn, Math.min(mx, v)); };
  var slug = function (v, def) { v = String(v || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^[-_]+|[-_]+$/g, '').slice(0, 40); return v || def; };
  var uid = function (p) { return p + '-' + Math.random().toString(16).slice(2, 10); };
  function uniq(seen, k) { var b = k, i = 2; while (seen[k]) k = b + '-' + i++; seen[k] = 1; return k; }
  var bi = function (v) { v = v || {}; return { en: String(v.en || '').trim(), hi: String(v.hi || '').trim() }; };
  function nums(a, n) { var o = []; (a || []).slice(0, n).forEach(function (x) { x = intIn(x, 1, 1e7, 0); if (x && o.indexOf(x) < 0) o.push(x); }); return o.sort(function (a, b) { return a - b; }); }
  function san(sec, v, cur) {
    var seen = {}, seenC = {};
    switch (sec) {
      case 'settings':
        v = v || {}; var b = v.bank || {}, tiers = [], st = {};
        (v.monthlyTiers || []).slice(0, 6).forEach(function (t) { var am = intIn((t || {}).amount, 0, 1e6, 0); if (am > 0 && !st[am]) { st[am] = 1; tiers.push({ amount: am, t: bi((t || {}).t) }); } });
        if (!tiers.length) tiers.push({ amount: intIn(v.monthlyAmount, 1, 1e6, 100), t: { en: 'Monthly Support', hi: 'मासिक सहयोग' } });
        tiers.sort(function (a, b) { return a.amount - b.amount; });
        var upi = String(b.upi || '').trim(); if (upi && !/^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9]{1,30}$/.test(upi)) throw new Error('That UPI ID does not look right. It should look like name@bank.');
        var email = String(v.email || '').trim(); if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('That email address does not look right.');
        var maxA = intIn(v.maxAmount, 1, 1e7, 100000), o = Object.assign({}, v);
        o.monthlyTiers = tiers; o.monthlyAmount = tiers[0].amount; o.minOnce = Math.min(intIn(v.minOnce, 1, 1e7, 1), maxA); o.maxAmount = Math.max(maxA, tiers[0].amount);
        o.chips = nums(v.chips, 12); o.homeChips = nums(v.homeChips, 6); o.email = email;
        o.bank = Object.assign({}, b, { upi: upi, upiName: String(b.upiName || '').trim().slice(0, 60) });
        o.paymentsLive = !!v.paymentsLive; o.has80G = !!v.has80G; o.hasFCRA = !!v.hasFCRA;
        return o;
      case 'causes':
        seen.general = 1;
        return (v || []).slice(0, 30).map(function (x) {
          x = x || {}; var f = x.fund || {}, key = uniq(seen, slug(x.key, uid('c'))), goal = intIn(f.goal, 0, 1e9, 0), on = !!f.on;
          if (on && goal < 1) throw new Error('To open a fundraiser, please enter the goal amount.');
          return { key: key, photo: x.photo || '', t: bi(x.t), d: bi(x.d), amounts: nums(x.amounts, 8), fund: { on: on, goal: goal, raised: intIn(f.raised, 0, 1e9, 0), note: bi(f.note) } };
        });
      case 'focus':
        return (v || []).slice(0, 12).map(function (x) { x = x || {}; var key = uniq(seen, slug(x.key, uid('f'))), cause = uniq(seenC, slug(x.cause, key)); return Object.assign({}, x, { key: key, cause: cause }); });
      case 'drives': return (v || []).map(function (x) { x = x || {}; return Object.assign({}, x, { id: uniq(seen, slug(x.id, uid('d'))) }); });
      case 'news': return (v || []).map(function (x) { x = x || {}; return Object.assign({}, x, { id: uniq(seen, slug(x.id, uid('n'))) }); });
      case 'newsCats': return (v || []).map(function (x) { x = x || {}; return Object.assign({}, x, { key: uniq(seen, slug(x.key, uid('c'))) }); });
      case 'texts': return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
      default: return v;
    }
  }
  function commit(s, extra) { // backup of what was saved before, newest first, keep 10
    s.backups = s.backups || []; s.backups.unshift({ name: 'demo-' + Date.now(), time: Math.floor(Date.now() / 1000), data: clone(s.saved || {}) }); s.backups = s.backups.slice(0, 10);
    if (extra) extra(); return store(s);
  }
  var FULL = 'This browser could not store more demo data. Try removing a photo you uploaded.';

  function content() {
    var s = load(), sv = savedOnly(s);
    if (!Object.keys(sv).length) return Promise.resolve(resp({ custom: false }));
    return Promise.all([J(R + 'assets/data/content.default.json'), J(R + 'assets/data/stock.json')]).then(function (x) {
      var al = {}; (x[1].stock || []).forEach(function (q) { al[q.id] = q.alt; });
      return resp({ custom: true, saved: Object.keys(sv), data: merge(x[0], sv), alts: al, online: {} });
    });
  }

  function resize(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader(); fr.onerror = rej; fr.onload = function () {
        var im = new Image(); im.onerror = function () { rej(new Error('bad')); }; im.onload = function () {
          var m = 1000, r = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.78));
        }; im.src = fr.result;
      }; fr.readAsDataURL(file);
    });
  }

  function admin(a, init) {
    var s = load(), body = {}, auth = sessionStorage.getItem('bvks_demo_auth') === '1';
    if (init.body && typeof init.body === 'string') { try { body = JSON.parse(init.body); } catch (e) {} }
    if (a === 'me') return Promise.resolve(resp({ setup: !s.pw, auth: auth && !!s.pw, csrf: 'demo', setupCode: false, php: 'demo' }));
    if (a === 'setup') {
      if (s.pw) return Promise.resolve(bad('A password is already set.', 403));
      var p = String(body.password || ''); if (p.length < 8) return Promise.resolve(bad('Please choose a password with at least 8 characters.'));
      return sha(p).then(function (h) { s.pw = h; store(s); sessionStorage.setItem('bvks_demo_auth', '1'); return resp({ ok: true, csrf: 'demo' }); });
    }
    if (a === 'login') return sha(String(body.password || '')).then(function (h) { if (!s.pw || h !== s.pw) return bad('That password is not correct.', 401); sessionStorage.setItem('bvks_demo_auth', '1'); return resp({ ok: true, csrf: 'demo' }); });
    if (a === 'logout') { sessionStorage.removeItem('bvks_demo_auth'); return Promise.resolve(resp({ ok: true })); }
    if (!auth) return Promise.resolve(bad('Please sign in again.', 401));
    if (a === 'load') return Promise.all([J(R + 'assets/data/content.default.json'), J(R + 'assets/data/stock.json')]).then(function (x) {
      return resp({ content: merge(x[0], savedOnly(s)), saved: Object.keys(savedOnly(s)), default: x[0], stock: x[1].stock || [], media: s.media || [], serverPayments: false, online: {}, gd: true, writable: true });
    });
    if (a === 'save') {
      var sec = String(body.section || ''); if (SECTIONS.indexOf(sec) < 0) return Promise.resolve(bad('Unknown section'));
      var val; try { val = san(sec, body.value); } catch (e) { return Promise.resolve(bad(e.message)); }
      s.saved = s.saved || {}; return Promise.resolve(commit(s, function () { s.saved[sec] = val; }) ? resp({ ok: true, value: val }) : bad(FULL, 500));
    }
    if (a === 'reset') {
      var sc = String(body.section || ''); return J(R + 'assets/data/content.default.json').then(function (d) { s.saved = s.saved || {}; commit(s, function () { delete s.saved[sc]; }); return resp({ ok: true, value: d[sc] === undefined ? null : d[sc] }); });
    }
    if (a === 'password') return sha(String(body.current || '')).then(function (h) {
      if (h !== s.pw) return bad('Your current password is not correct.', 401);
      var p = String(body.password || ''); if (p.length < 8) return bad('Please choose a password with at least 8 characters.');
      return sha(p).then(function (n) { s.pw = n; store(s); return resp({ ok: true }); });
    });
    if (a === 'backups') return Promise.resolve(resp({ backups: (s.backups || []).map(function (b) { return { name: b.name, time: b.time, size: JSON.stringify(b.data).length }; }) }));
    if (a === 'restore') {
      var b = (s.backups || []).filter(function (x) { return x.name === body.name; })[0]; if (!b) return Promise.resolve(bad('Backup not found'));
      return Promise.resolve(commit(s, function () { s.saved = clone(b.data); }) ? resp({ ok: true }) : bad(FULL, 500));
    }
    if (a === 'import') {
      var j = body.content; if (!j || typeof j !== 'object') return Promise.resolve(bad('That file is not a BVKS content file.'));
      var clean = {}; try { SECTIONS.forEach(function (k) { if (j[k] !== undefined) clean[k] = san(k, j[k]); }); } catch (e) { return Promise.resolve(bad(e.message)); }
      if (!Object.keys(clean).length) return Promise.resolve(bad('Nothing to import'));
      return Promise.resolve(commit(s, function () { s.saved = clean; }) ? resp({ ok: true, sections: Object.keys(clean) }) : bad(FULL, 500));
    }
    if (a === 'media') return Promise.resolve(resp({ media: s.media || [] }));
    if (a === 'upload') {
      var f = init.body && init.body.get ? init.body.get('file') : null; if (!f) return Promise.resolve(bad('No file received.'));
      if (!/^image\//.test(f.type)) return Promise.resolve(bad('Please upload a JPG, PNG, WebP or GIF photo.'));
      return resize(f).then(function (url) {
        s.media = s.media || []; s.media.unshift({ path: url, size: url.length, time: Math.floor(Date.now() / 1000) });
        return store(s) ? resp({ ok: true, path: url, media: s.media }) : (s.media.shift(), bad(FULL, 500));
      }, function () { return bad('Please upload a JPG, PNG, WebP or GIF photo.'); });
    }
    if (a === 'delmedia') { s.media = (s.media || []).filter(function (m) { return m.path !== body.path; }); store(s); return Promise.resolve(resp({ ok: true, media: s.media })); }
    return Promise.resolve(bad('Unknown action', 404));
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '', m = url.match(/(?:^|\/)api\.php\?a=(\w+)/);
    init = init || {};
    if (m && inAdmin) return admin(m[1], init);
    if (/(^|\/)api\/content\.php/.test(url)) return content();
    if (/(^|\/)api\/(create-order|create-subscription|verify)\.php/.test(url)) return Promise.resolve(bad('Payments are not connected in the preview.', 503));
    if (/(^|\/)api\/(upi-note|contact)\.php/.test(url)) return Promise.resolve(resp({ ok: true }));
    return realFetch(input, init);
  };

  document.addEventListener('DOMContentLoaded', function () {
    // "Download content file" is a normal link on the real server; here it is built in the browser
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href$="api.php?a=export"]'); if (!a) return; e.preventDefault();
      Promise.all([J(R + 'assets/data/content.default.json')]).then(function (x) {
        var blob = new Blob([JSON.stringify(merge(x[0], savedOnly(load())), null, 2)], { type: 'application/json' }), l = document.createElement('a');
        l.href = URL.createObjectURL(blob); l.download = 'bvks-content-demo.json'; document.body.appendChild(l); l.click(); l.remove();
      });
    }, true);
    var hi = true; try { hi = ((inAdmin ? localStorage.getItem('bvks_admin_lang') : sessionStorage.getItem('bvks_lang')) || 'hi') !== 'en'; } catch (e) {}
    var has = Object.keys(savedOnly(load())).length > 0; if (!inAdmin && !has) return;
    var bar = document.createElement('div');
    bar.setAttribute('style', inAdmin ? 'background:#F0A500;color:#10201A;font:600 13px/1.4 system-ui,sans-serif;padding:8px 14px;text-align:center'
      : 'position:fixed;z-index:2147483000;left:12px;bottom:84px;max-width:min(420px,calc(100vw - 24px));background:#0F3A2D;color:#fff;font:600 13px/1.4 system-ui,sans-serif;padding:10px 14px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.3)');
    bar.innerHTML = inAdmin ? ('<b>Demo mode</b> · Your changes are saved only in this browser. On the real website they are saved on the server.')
      : ('<b>Preview with demo edits</b> · saved only in this browser. <button type="button" style="margin-left:6px;background:#F0A500;color:#10201A;border:0;border-radius:999px;padding:4px 12px;font:700 12px system-ui;cursor:pointer">Clear</button>');
    var btn = bar.querySelector('button'); if (btn) btn.addEventListener('click', function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); });
    if (inAdmin) { var x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Close'); x.setAttribute('style', 'margin-left:10px;background:transparent;color:#10201A;border:0;font-size:18px;cursor:pointer'); x.onclick = function () { bar.remove(); }; bar.appendChild(x); }
    if (inAdmin) document.body.insertBefore(bar, document.body.firstChild); else document.body.appendChild(bar);
  });
})();
