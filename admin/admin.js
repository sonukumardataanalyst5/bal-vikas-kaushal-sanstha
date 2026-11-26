/* BVKS website admin. Plain JavaScript, no libraries. Talks to admin/api.php. */
(function () {
  'use strict';
  const app = document.getElementById('app'), API = 'api.php';
  let csrf = '', ST = null, toastT, AUTO = '';

  // ---------------------------------------------------------------- language (Hindi / English)
  // Every visible English text is translated from the dictionary in lang-hi.js. A small observer
  // translates anything that is drawn on the screen, so new screens do not need extra work.
  let LANG = 'hi'; try { LANG = localStorage.getItem('bvks_admin_lang') === 'en' ? 'en' : 'hi'; } catch (e) { }
  const HI = window.BVKS_HI || {}, HIP = window.BVKS_HI_PATTERNS || [];
  function tr(s) {
    if (LANG !== 'hi' || typeof s !== 'string') return s;
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), k = m[2]; if (!k) return s;
    if (Object.prototype.hasOwnProperty.call(HI, k)) return m[1] + HI[k] + m[3];
    for (let i = 0; i < HIP.length; i++) { const r = HIP[i][0].exec(k); if (r) return m[1] + HIP[i][1].replace(/\$(\d)/g, (x, n) => { const g = r[+n] || ''; return Object.prototype.hasOwnProperty.call(HI, g) ? HI[g] : g; }) + m[3]; }
    return s;
  }
  const TR_ATTR = ['placeholder', 'aria-label', 'title'];
  function trNode(n) {
    if (LANG !== 'hi' || !n) return;
    if (n.nodeType === 3) { const p = n.parentNode; if (p && /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName)) return; const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; return; }
    if (n.nodeType !== 1 || n.hasAttribute('data-notr')) return;
    TR_ATTR.forEach(a => { if (n.hasAttribute(a)) { const v = n.getAttribute(a), t = tr(v); if (t !== v) n.setAttribute(a, t); } });
    for (let c = n.firstChild; c; c = c.nextSibling) trNode(c);
  }
  new MutationObserver(list => { if (LANG !== 'hi') return; list.forEach(m => { if (m.type === 'childList') m.addedNodes.forEach(trNode); else if (m.type === 'characterData') trNode(m.target); else trNode(m.target); }); })
    .observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TR_ATTR });
  document.documentElement.lang = LANG; trNode(document.body);
  function setLang(l) { LANG = l; try { localStorage.setItem('bvks_admin_lang', l); } catch (e) { } document.documentElement.lang = l; if (ST) { shell(); route(); } else init(); }
  function langSwitch() { return h('div', { class: 'lang', role: 'group', 'aria-label': 'Language' }, [['hi', 'हिंदी'], ['en', 'English']].map(l => h('button', { type: 'button', class: LANG === l[0] ? 'on' : '', 'aria-pressed': LANG === l[0] ? 'true' : 'false', onclick: () => { if (LANG !== l[0]) setLang(l[0]); } }, l[1]))); }

  // ---------------------------------------------------------------- tiny helpers
  function h(tag, attrs, kids) {
    const e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(k => {
      const v = attrs[k]; if (v == null || v === false) return;
      if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (k === 'value') e.value = v; else if (v === true) e.setAttribute(k, ''); else e.setAttribute(k, v);
    });
    (kids == null ? [] : [].concat(kids)).forEach(c => { if (c == null || c === false) return; e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c); });
    return e;
  }
  const $ = (s, r) => (r || document).querySelector(s);
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bi0 = () => ({ en: '', hi: '' });
  const nm = o => (o && (LANG === 'hi' ? (o.hi || o.en) : (o.en || o.hi))) || '(no title)';
  const MON = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MON_HI = ['', 'जन॰', 'फ़र॰', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल॰', 'अग॰', 'सित॰', 'अक्टू॰', 'नव॰', 'दिस॰'];
  const fmtDate = s => { const p = String(s).split('-'); return p.length === 3 ? (+p[2]) + ' ' + (LANG === 'hi' ? MON_HI : MON)[+p[1]] + ' ' + p[0] : s; };
  const todayIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  const inr = n => Number(n).toLocaleString('en-IN');
  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setP = (o, p, v) => { const ks = p.split('.'); let a = o; ks.slice(0, -1).forEach(k => { a = a[k] = a[k] || {}; }); a[ks[ks.length - 1]] = v; };
  const thumb = (ref, w) => !ref ? '' : /^photo-/.test(ref) ? 'https://images.unsplash.com/' + ref + '?auto=format&fit=crop&w=' + (w || 300) + '&q=70' : /^(uploads|assets)\//.test(ref) ? '../' + ref : ref;

  function toast(msg, bad) { let t = $('#toast'); if (!t) { t = h('div', { id: 'toast', role: 'status' }); document.body.appendChild(t); } t.textContent = msg; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, bad ? 6000 : 3200); }

  function api(a, body, raw) {
    const opt = { credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf } };
    if (body !== undefined) { opt.method = 'POST'; if (raw) opt.body = body; else { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); } }
    return fetch(API + '?a=' + a, opt).then(r => r.text().then(t => {
      let j; try { j = JSON.parse(t); } catch (e) { throw new Error('NOPHP'); }
      if (!r.ok) { const er = new Error(j.error || 'Something went wrong. Please try again.'); er.status = r.status; if (r.status === 401 && ST) { ST = null; showLogin('Please sign in again.'); } throw er; }
      return j;
    }));
  }
  const fail = e => { if (e && e.message !== 'NOPHP') toast(e.message, true); else toast('Could not reach the server.', true); };

  // ---------------------------------------------------------------- modal + confirm
  function modal(o) {
    const ov = h('div', { class: 'ov', role: 'dialog', 'aria-modal': 'true' });
    const close = () => { ov.remove(); document.removeEventListener('keydown', key); if (o.onclose) o.onclose(); };
    const key = e => { if (e.key === 'Escape' && ov === [].slice.call(document.querySelectorAll('.ov')).pop()) close(); };
    const foot = h('footer', {}, (o.buttons || []).map(b => h('button', { class: 'btn ' + (b.cls || 'line'), type: 'button', onclick: () => b.fn(close) }, b.label)));
    const dlg = h('div', { class: 'dlg' + (o.wide ? ' wide' : '') }, [h('header', {}, [h('h2', {}, o.title), h('button', { class: 'x', type: 'button', 'aria-label': 'Close', onclick: close }, '×')]), h('div', { class: 'bd' }, o.body), (o.buttons || []).length ? foot : null]);
    ov.appendChild(dlg); ov.addEventListener('mousedown', e => { if (e.target === ov && !o.sticky) close(); });
    document.body.appendChild(ov); document.addEventListener('keydown', key);
    const f = $('input,textarea,select', dlg); if (f && !o.nofocus) setTimeout(() => f.focus(), 30);
    return { close, el: dlg };
  }
  function confirmBox(msg, ok, danger) {
    return new Promise(res => modal({ title: 'Please confirm', body: h('p', {}, msg), buttons: [{ label: 'Cancel', fn: c => { c(); res(false); } }, { label: ok || 'Yes', cls: danger ? 'danger' : 'pri', fn: c => { c(); res(true); } }], onclose: () => res(false) }));
  }

  // ---------------------------------------------------------------- photo picker
  function pickPhoto(current) {
    return new Promise(res => {
      let chosen = null, m, tab = ST.media.length ? 'mine' : 'stock';
      const body = h('div');
      const draw = () => {
        body.innerHTML = '';
        const tabs = h('div', { class: 'tabs' }, [['mine', 'My photos (' + ST.media.length + ')'], ['stock', 'Free photo library'], ['up', 'Upload a photo'], ['link', 'Photo link']].map(t => h('button', { type: 'button', class: tab === t[0] ? 'on' : '', onclick: () => { tab = t[0]; draw(); } }, t[1])));
        body.appendChild(tabs);
        if (tab === 'mine') {
          if (!ST.media.length) body.appendChild(h('div', { class: 'empty' }, 'You have not uploaded any photos yet. Use "Upload a photo".'));
          else body.appendChild(h('div', { class: 'pgrid' }, ST.media.map(x => h('button', { class: 'p' + (current === x.path ? ' on' : ''), type: 'button', onclick: () => { chosen = x.path; m.close(); } }, [h('img', { src: thumb(x.path), alt: '', loading: 'lazy' })]))));
        } else if (tab === 'stock') {
          body.appendChild(h('p', { class: 'sub', style: 'color:#5b6b64;margin-top:0' }, 'Free photos already used on the website. They load from the internet.'));
          body.appendChild(h('div', { class: 'pgrid' }, ST.stock.map(x => h('button', { class: 'p' + (current === x.id ? ' on' : ''), type: 'button', title: x.alt, onclick: () => { chosen = x.id; m.close(); } }, [h('img', { src: thumb(x.id, 300), alt: x.alt, loading: 'lazy', onerror: function () { this.style.opacity = .2; } }), h('span', {}, x.label)]))));
        } else if (tab === 'up') {
          body.appendChild(uploader(path => { chosen = path; m.close(); }));
        } else {
          const inp = h('input', { class: 'in', type: 'url', placeholder: 'https://...' });
          body.appendChild(h('div', { class: 'fld' }, [h('label', { class: 'l' }, 'Link to a photo on the internet'), inp, h('p', { class: 'help' }, 'Tip: uploading your own photo is more reliable than linking.'), h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn pri', type: 'button', onclick: () => { if (/^https?:\/\//i.test(inp.value.trim())) { chosen = inp.value.trim(); m.close(); } else toast('Please paste a link starting with https://', true); } }, 'Use this photo'))]));
        }
      };
      m = modal({ title: 'Choose a photo', body, wide: true, buttons: current ? [{ label: 'Remove photo', cls: 'danger', fn: c => { chosen = ''; c(); } }, { label: 'Cancel', fn: c => c() }] : [{ label: 'Cancel', fn: c => c() }], onclose: () => res(chosen), nofocus: true });
      draw();
    });
  }
  function uploader(done) {
    const input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', multiple: true, hidden: true });
    const status = h('p', { class: 'help' }, 'JPG, PNG or WebP, up to 12 MB. Photos are resized and hidden location data is removed.');
    const send = files => {
      const list = [].slice.call(files); if (!list.length) return; let last = null, n = 0;
      const next = () => {
        const f = list.shift(); if (!f) { status.textContent = 'Done.'; if (last) done(last); return; }
        status.textContent = 'Uploading ' + (++n) + '...'; const fd = new FormData(); fd.append('file', f);
        api('upload', fd, true).then(r => { ST.media = r.media; last = r.path; next(); }).catch(e => { status.textContent = ''; fail(e); });
      };
      next();
    };
    input.addEventListener('change', () => send(input.files));
    const drop = h('div', { class: 'drop' }, [h('p', { style: 'margin:0 0 12px;font-weight:700;color:#10201A' }, 'Drag photos here, or'), h('button', { class: 'btn pri', type: 'button', onclick: () => input.click() }, 'Choose photos from this device'), input, status]);
    ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => send(e.dataTransfer.files));
    return drop;
  }

  // ---------------------------------------------------------------- form fields
  const POS = [['50% 15%', 'Top'], ['50% 38%', 'Upper middle'], ['50% 50%', 'Middle'], ['50% 70%', 'Lower middle'], ['50% 90%', 'Bottom']];
  function field(f, val) {
    const wrap = h('div', { class: 'fld' }); let get, input, extra = [];
    const label = f.label ? h('label', { class: 'l' }, [f.label, f.req ? h('span', { class: 'req' }, ' *') : null]) : null;
    const help = f.help ? h('p', { class: 'help' }, f.help) : null;
    const mk = (tag, extraAttrs) => h(tag, Object.assign({ class: 'in' }, extraAttrs || {}));
    if (f.type === 'bi' || f.type === 'bi-area') {
      const tg = f.type === 'bi' ? 'input' : 'textarea', v = val || bi0();
      const en = mk(tg, { placeholder: (f.ph || [])[0] || '', maxlength: f.max || 400 }), hi = mk(tg, { placeholder: (f.ph || [])[1] || '', maxlength: f.max || 400, lang: 'hi', class: 'in hi-in' });
      en.value = v.en || ''; hi.value = v.hi || '';
      wrap.appendChild(label); wrap.appendChild(h('div', { class: 'bi' }, [h('div', {}, [h('span', { class: 'lg' }, 'English'), en]), h('div', {}, [h('span', { class: 'lg' }, 'हिंदी (Hindi)'), hi])]));
      get = () => ({ en: en.value.trim(), hi: hi.value.trim() }); input = en;
      wrap._valid = () => !f.req || !!(en.value.trim() || hi.value.trim());
      wrap._mark = on => { en.classList.toggle('err', on); hi.classList.toggle('err', on); };
    } else if (f.type === 'photo') {
      let cur = val || ''; const pv = h('div', { class: 'pv' }), btn = h('button', { class: 'btn line', type: 'button' }, 'Choose photo');
      const draw = () => { pv.innerHTML = ''; if (cur) pv.appendChild(h('img', { src: thumb(cur, 300), alt: '', onerror: function () { this.remove(); pv.textContent = 'Preview not available'; } })); else pv.textContent = 'No photo'; btn.textContent = cur ? 'Change photo' : 'Choose photo'; };
      btn.addEventListener('click', () => pickPhoto(cur).then(r => { if (r !== null) { cur = r; draw(); } }));
      draw(); wrap.appendChild(label); wrap.appendChild(h('div', { class: 'photo-pick' }, [pv, btn])); get = () => cur; wrap._valid = () => !f.req || !!cur; wrap._mark = () => {};
    } else if (f.type === 'helps') {
      const box = h('div', { class: 'helps' }); const rows = [];
      const add = v => { const en = mk('input', { maxlength: 120, placeholder: 'e.g. School fees and supplies' }), hi = mk('input', { maxlength: 120, lang: 'hi', placeholder: 'हिंदी' }); en.value = (v || {}).en || ''; hi.value = (v || {}).hi || ''; hi.classList.add('hi-in');
        const r = h('div', { class: 'h' }, [h('div', { class: 'bi' }, [en, hi]), h('button', { class: 'btn danger sm', type: 'button', onclick: () => { r.remove(); rows.splice(rows.indexOf(o), 1); } }, 'Remove')]); const o = { en, hi }; rows.push(o); box.appendChild(r); };
      (val || []).forEach(add);
      wrap.appendChild(label); wrap.appendChild(box); wrap.appendChild(h('button', { class: 'btn line sm', type: 'button', style: 'margin-top:10px', onclick: () => add() }, '+ Add a line'));
      get = () => rows.map(o => ({ en: o.en.value.trim(), hi: o.hi.value.trim() })).filter(o => o.en || o.hi); wrap._valid = () => true; wrap._mark = () => {};
    } else if (f.type === 'bool') {
      const cb = h('input', { type: 'checkbox' }); cb.checked = !!val;
      wrap.appendChild(h('label', { class: 'switch' }, [cb, h('div', {}, [h('b', {}, f.label), h('span', {}, f.help || '')])])); get = () => cb.checked; wrap._valid = () => true; wrap._mark = () => {};
      return Object.assign(wrap, { get });
    } else {
      if (f.type === 'area') input = mk('textarea', { maxlength: f.max || 1000 });
      else if (f.type === 'select') { input = mk('select'); (f.options() || []).forEach(o => input.appendChild(h('option', { value: o[0] }, o[1]))); }
      else if (f.type === 'date') input = mk('input', { type: 'date' });
      else if (f.type === 'int') input = mk('input', { type: 'number', min: f.min || 0, step: 1, inputmode: 'numeric' });
      else if (f.type === 'nums') input = mk('input', { type: 'text', inputmode: 'numeric', placeholder: '100, 250, 500, 1000' });
      else if (f.type === 'url') input = mk('input', { type: 'url', placeholder: 'https://...' });
      else if (f.type === 'pos') { input = mk('select'); const cur = val || '50% 50%', list = POS.slice(); if (!list.some(p => p[0] === cur)) list.push([cur, 'Current setting']); list.forEach(p => input.appendChild(h('option', { value: p[0] }, p[1]))); }
      else input = mk('input', { type: f.type || 'text', maxlength: f.max || 200, placeholder: f.ph || '' });
      if (f.type === 'nums') input.value = (val || []).join(', '); else input.value = val == null ? '' : val;
      wrap.appendChild(label); wrap.appendChild(input);
      get = () => f.type === 'int' ? (input.value === '' ? '' : Number(input.value)) : f.type === 'nums' ? input.value.split(/[ ,;]+/).map(x => parseInt(x.replace(/\D/g, ''), 10)).filter(x => x > 0) : input.value.trim();
      wrap._valid = () => { const v = get(); return !f.req || (Array.isArray(v) ? v.length : v !== ''); };
      wrap._mark = on => input.classList.toggle('err', on);
    }
    if (help) wrap.appendChild(help);
    wrap.get = get; return wrap;
  }
  function buildForm(fields, data) {
    const root = h('div', { class: 'form' }), items = [];
    if (fields.some(f => f.type === 'bi' || f.type === 'bi-area')) root.appendChild(h('div', { class: 'note info' }, 'Write in Hindi or English. If you fill only one, it is shown on both the Hindi and the English website.'));
    const grid = (cols, fs) => { const g = h('div', { class: cols === 2 ? 'two' : 'three' }); fs.forEach(f => g.appendChild(add(f))); return g; };
    const add = f => { const fl = field(f, getP(data, f.k)); items.push([f, fl]); return fl; };
    fields.forEach(f => { if (f.row) root.appendChild(grid(f.row.length, f.row)); else root.appendChild(add(f)); });
    return { root, collect() { const o = clone(data); let ok = true, first = null; items.forEach(([f, fl]) => { if (!fl._valid()) { ok = false; fl._mark(true); if (!first) first = fl; } else fl._mark(false); setP(o, f.k, fl.get()); }); if (!ok) { toast('Please fill in the fields marked with a red star.', true); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); return null; } return o; } };
  }

  // ---------------------------------------------------------------- saving
  function saveSection(name, value) {
    return api('save', { section: name, value }).then(r => { ST.content[name] = name === 'texts' && Array.isArray(r.value) ? {} : r.value; if (ST.saved.indexOf(name) < 0) ST.saved.push(name); toast('Saved. Your website is updated.'); return r.value; }).catch(e => { fail(e); throw e; });
  }
  const focusOpts = () => [['', '(none)']].concat((ST.content.focus || []).map(f => [f.key, nm(f.t)]));
  const catOpts = () => [['', '(no category)']].concat((ST.content.newsCats || []).map(c => [c.key, nm(c.t)]));

  // ---------------------------------------------------------------- generic ordered list editor
  function listView(c, cfg) {
    const draw = () => {
      c.innerHTML = '';
      const arr = ST.content[cfg.section];
      if (cfg.help) c.appendChild(h('div', { class: 'note info' }, cfg.help));
      c.appendChild(h('div', { style: 'margin-bottom:14px' }, h('button', { class: 'btn pri', type: 'button', onclick: () => edit(null) }, '+ ' + cfg.add)));
      if (!arr.length) c.appendChild(h('div', { class: 'empty' }, cfg.empty || 'Nothing here yet.'));
      else c.appendChild(h('div', { class: 'rows' }, arr.map((it, i) => row(cfg, it, i, arr, edit, save))));
    };
    const save = next => saveSection(cfg.section, next).then(() => { draw(); return true; }).catch(() => false);   // false = not saved: the edit window stays open so nothing typed is lost
    const edit = i => editItem(cfg, i === null ? null : ST.content[cfg.section][i], v => { const a = clone(ST.content[cfg.section]); if (i === null) a.push(v); else a[i] = v; return save(a); });
    draw();
    if (AUTO === cfg.section) { AUTO = ''; const b = c.querySelector('.btn.pri'); if (b) b.click(); }
  }
  function row(cfg, it, i, arr, edit, save, noOrder) {
    const info = cfg.row(it, i);
    const th = h('div', { class: 'th' + (info.photo === undefined || info.photo === '' ? ' none' : '') }, info.photo ? h('img', { src: thumb(info.photo, 160), alt: '', loading: 'lazy', onerror: function () { this.remove(); } }) : (info.photo === undefined ? String(i + 1) : 'no photo'));
    const mv = d => { const a = clone(arr); const j = i + d; if (j < 0 || j >= a.length) return; const t = a[i]; a[i] = a[j]; a[j] = t; save(a); };
    const acts = [];
    if (cfg.order !== false && !noOrder) acts.push(h('button', { class: 'btn line sm', type: 'button', 'aria-label': 'Move up', disabled: i === 0, onclick: () => mv(-1) }, '↑'), h('button', { class: 'btn line sm', type: 'button', 'aria-label': 'Move down', disabled: i === arr.length - 1, onclick: () => mv(1) }, '↓'));
    acts.push(h('button', { class: 'btn line sm', type: 'button', onclick: () => edit(i) }, 'Edit'));
    if (cfg.copy) acts.push(h('button', { class: 'btn line sm', type: 'button', onclick: () => { const a = clone(arr), n = clone(it); n.id = ''; if (n.t && n.t.en) n.t.en += ' (copy)'; a.push(n); save(a); } }, 'Copy'));
    acts.push(h('button', { class: 'btn danger sm', type: 'button', onclick: () => confirmBox('Delete "' + info.title + '"? This cannot be undone (but you can restore a backup from Backup & security).', 'Delete', true).then(ok => { if (ok) { const a = clone(arr); a.splice(i, 1); save(a); } }) }, 'Delete'));
    return h('div', { class: 'row' }, [th, h('div', { class: 'tt' }, [h('b', {}, info.title), h('span', {}, [info.pill ? h('span', { class: 'pill' }, info.pill) : null, info.sub || ''])]), h('div', { class: 'acts' }, acts)]);
  }
  function editItem(cfg, item, onSave) {
    const isNew = !item, data = item ? clone(item) : cfg.blank();
    const form = buildForm(cfg.fields, data);
    const m = modal({ title: (isNew ? 'Add ' : 'Edit ') + cfg.noun, body: form.root, wide: true, sticky: true, buttons: [{ label: 'Cancel', fn: c => c() }, { label: 'Save', cls: 'pri', fn: c => {
      const v = form.collect(); if (!v) return; if (cfg.before) cfg.before(v, isNew);
      onSave(v).then(r => { if (r !== false) c(); }).catch(() => {});
    } }] });
    return m;
  }

  // ---------------------------------------------------------------- view configs
  const CFG = {
    drives: { section: 'drives', noun: 'drive', add: 'Add a drive', copy: true, order: false,
      blank: () => ({ id: '', date: todayIso(), tag: ((ST.content.focus || [])[0] || {}).key || '', photo: '', t: bi0(), place: bi0(), time: bi0(), d: bi0(), result: bi0() }),
      row: d => ({ title: nm(d.t), sub: fmtDate(d.date) + (nm(d.place) !== '(no title)' ? ' · ' + nm(d.place) : ''), photo: d.photo, pill: nm(((ST.content.focus || []).filter(f => f.key === d.tag)[0] || { t: {} }).t) }),
      fields: [
        { k: 't', type: 'bi', label: 'Name of the drive', req: true, ph: ['Winter Clothes Drive', 'सर्दी के कपड़े अभियान'], max: 120 },
        { row: [{ k: 'date', type: 'date', label: 'Date', req: true, help: 'A drive with today\'s or a future date shows under "Upcoming". After that date it moves to "Drives we have held" by itself.' }, { k: 'tag', type: 'select', label: 'Category', options: focusOpts }] },
        { row: [{ k: 'place', type: 'bi', label: 'Place', ph: ['Faridabad, Haryana', 'फरीदाबाद, हरियाणा'], max: 120 }, { k: 'time', type: 'bi', label: 'Time (optional)', ph: ['10:00 AM onwards', 'सुबह 10:00 बजे से'], max: 60 }] },
        { k: 'photo', type: 'photo', label: 'Photo' },
        { k: 'd', type: 'bi-area', label: 'Short description', max: 400, ph: ['What will happen at this drive?', 'इस अभियान में क्या होगा?'] },
        { k: 'result', type: 'bi', label: 'Result (fill in after the drive)', help: 'For example: "About 150 children received kits". It shows on past drives only.', max: 160 }
      ] },
    news: { section: 'news', noun: 'news article', add: 'Add a news article', order: false,
      blank: () => ({ id: '', cat: '', photo: '', date: todayIso(), source: bi0(), t: bi0(), d: bi0(), url: '' }),
      row: n => ({ title: nm(n.t), sub: fmtDate(n.date) + ' · ' + nm(n.source), photo: n.photo, pill: nm(((ST.content.newsCats || []).filter(c => c.key === n.cat)[0] || { t: {} }).t) }),
      fields: [
        { k: 't', type: 'bi', label: 'Headline', req: true, max: 160 },
        { row: [{ k: 'date', type: 'date', label: 'Date', req: true }, { k: 'cat', type: 'select', label: 'Category', options: catOpts }] },
        { k: 'source', type: 'bi', label: 'Where it is from', help: 'For example "Our own update", or the newspaper or website name.', max: 80 },
        { k: 'd', type: 'bi-area', label: 'Short summary (2 to 3 sentences, in your own words)', max: 600 },
        { k: 'url', type: 'url', label: 'Link to read more (optional)', help: 'Leave empty if there is no link. Always link to the original page for articles written by others.' },
        { k: 'photo', type: 'photo', label: 'Photo' }
      ] },
    newsCats: { section: 'newsCats', noun: 'category', add: 'Add a category', empty: 'No categories yet. Categories become the filter buttons on the News page.',
      blank: () => ({ key: '', t: bi0() }), row: c => ({ title: nm(c.t), sub: '' }), before: (v, isNew) => { if (isNew || !v.key) v.key = slug(v.t.en) || ''; },
      fields: [{ k: 't', type: 'bi', label: 'Category name', req: true, max: 40, ph: ['Health', 'स्वास्थ्य'] }] },
    slides: { section: 'slides', noun: 'banner picture', add: 'Add a banner picture', help: 'These pictures slide automatically in the big banner at the top of the Home page. 3 to 6 pictures work best.',
      blank: () => ({ photo: '', pos: '50% 50%', t: bi0(), d: bi0() }), row: s => ({ title: nm(s.t), sub: nm(s.d), photo: s.photo || '' }),
      fields: [{ k: 'photo', type: 'photo', label: 'Picture', req: true }, { k: 't', type: 'bi', label: 'Heading on the picture', req: true, max: 80 }, { k: 'd', type: 'bi', label: 'One short line below it', max: 200 }, { k: 'pos', type: 'pos', label: 'Which part of the picture to keep in view', help: 'Pictures are cropped to fit. Choose "Top" if faces are cut off.' }] },
    how: { section: 'how', noun: 'step', add: 'Add a step', help: 'The numbered cards under "How we work" on the Home page. Numbers are added automatically.',
      blank: () => ({ t: bi0(), d: bi0() }), row: x => ({ title: nm(x.t), sub: nm(x.d) }),
      fields: [{ k: 't', type: 'bi', label: 'Title', req: true, max: 80 }, { k: 'd', type: 'bi-area', label: 'Description', max: 300 }] },
    stats: { section: 'stats', noun: 'number', add: 'Add a number', help: 'The big numbers in the dark "Why it matters" section on the Home page. Always name the source.',
      blank: () => ({ big: '', d: bi0(), src: bi0(), url: '' }), row: x => ({ title: x.big + '  ' + nm(x.d), sub: nm(x.src) }),
      fields: [{ k: 'big', type: 'text', label: 'The big number', req: true, max: 16, ph: '51.9%' }, { k: 'd', type: 'bi-area', label: 'What it means', req: true, max: 300 }, { k: 'src', type: 'bi', label: 'Source name', max: 150 }, { k: 'url', type: 'url', label: 'Link to the source (optional)' }] },
    values: { section: 'values', noun: 'value', add: 'Add a value', help: 'The cards under "What guides us" on the About page.',
      blank: () => ({ t: bi0(), d: bi0() }), row: x => ({ title: nm(x.t), sub: nm(x.d) }),
      fields: [{ k: 't', type: 'bi', label: 'Title', req: true, max: 80 }, { k: 'd', type: 'bi-area', label: 'Description', max: 300 }] },
    team: { section: 'team', noun: 'person', add: 'Add a person', help: 'Shown on the About page under "The people behind the work".',
      blank: () => ({ name: bi0(), role: bi0() }), row: x => ({ title: nm(x.name), sub: nm(x.role) }),
      fields: [{ k: 'name', type: 'bi', label: 'Name', req: true, max: 80, ph: ['Shri Subodh Kumar', 'श्री सुबोध कुमार'] }, { k: 'role', type: 'bi', label: 'Role', max: 60, ph: ['President', 'अध्यक्ष'] }] },
    focus: { section: 'focus', noun: 'focus area', add: 'Add a focus area', help: 'Each focus area appears on the Our Work page. The category name is also used on drive cards. The causes people donate to are in "Causes & fundraisers".',
      blank: () => ({ key: '', cause: '', photo: '', tag: bi0(), t: bi0(), d: bi0(), helps: [] }), row: f => ({ title: nm(f.t), sub: nm(f.d), photo: f.photo }),
      before: (v, isNew) => { if (isNew || !v.key) { v.key = slug(v.t.en) || ''; v.cause = v.key; } if (!v.tag.en && !v.tag.hi) v.tag = clone(v.t); },
      fields: [{ k: 't', type: 'bi', label: 'Name', req: true, max: 80 }, { k: 'tag', type: 'bi', label: 'Short name for drive cards (optional)', max: 30, help: 'For example "Health". If empty the full name is used.' }, { k: 'd', type: 'bi-area', label: 'One-line description', max: 300 }, { k: 'photo', type: 'photo', label: 'Photo' }, { k: 'helps', type: 'helps', label: 'What this area helps with (a few short lines)' }] },
    causes: { section: 'causes', noun: 'cause', add: 'Add a cause', order: true,
      help: 'Each cause is a card on the Home page and a choice on the Donate page. To raise money for one particular person or case, add a cause for it, switch on "Open a fundraiser" and enter the goal. Online donations are added to the progress bar automatically.',
      blank: () => ({ key: '', photo: '', t: bi0(), d: bi0(), amounts: [], fund: { on: false, goal: 0, raised: 0, note: bi0() } }),
      row: c => { const f = c.fund || {}, on = !!(f.on && f.goal > 0), got = (f.raised || 0) + ((ST.online || {})[c.key] || 0); return { title: nm(c.t), sub: on ? '₹' + inr(got) + ' of ₹' + inr(f.goal) + ' raised' : nm(c.d), photo: c.photo, pill: on ? 'Fundraiser open' : '' }; },
      before: (v, isNew) => { if (isNew || !v.key) v.key = slug(v.t.en) || ''; },
      fields: [
        { k: 't', type: 'bi', label: 'Name of the cause', req: true, max: 80, ph: ['Children\'s Education Support', 'बच्चों की शिक्षा सहायता'] },
        { k: 'd', type: 'bi-area', label: 'One or two lines about it', max: 300 },
        { k: 'photo', type: 'photo', label: 'Photo', help: 'Use a photo only if the people shown (or their guardians) have agreed.' },
        { k: 'amounts', type: 'nums', label: 'Amount buttons for this cause (optional)', help: 'Smallest to largest, for example: 500, 1000, 2000, 3000, 5000, 10000. Leave empty to use the standard list from "Donation amounts".' },
        { k: 'fund.on', type: 'bool', label: 'Open a fundraiser for this cause', help: 'Shows a progress bar and a "Fundraiser" label. Switch it off to close the fundraiser (donations are still accepted for the cause).' },
        { row: [{ k: 'fund.goal', type: 'int', min: 0, label: 'Goal (₹)', help: 'Required when the fundraiser is open.' }, { k: 'fund.raised', type: 'int', min: 0, label: 'Collected outside the website (₹)', help: 'Cash or bank transfers you have received. Online donations are added by themselves.' }] },
        { k: 'fund.note', type: 'bi', label: 'Short note shown under the bar (optional)', max: 160, ph: ['For Riya\'s wedding in March', 'मार्च में रिया के विवाह हेतु'] }
      ] },
    faq: { section: 'faq', noun: 'question', add: 'Add a question', help: 'Shown at the bottom of the Donate page.',
      blank: () => ({ q: bi0(), a: bi0() }), row: x => ({ title: nm(x.q), sub: nm(x.a) }),
      fields: [{ k: 'q', type: 'bi', label: 'Question', req: true, max: 200 }, { k: 'a', type: 'bi-area', label: 'Answer', req: true, max: 1200 }] }
  };

  // ---------------------------------------------------------------- views
  const V = {};
  function head(title, sub, right) { return h('div', { class: 'pagehead' }, [h('div', {}, [h('h1', {}, title), sub ? h('p', {}, sub) : null]), right || null]); }
  function tabbed(c, tabs) {
    const box = h('div'); const bar = h('div', { class: 'tabs' }); let cur = tabs[0][0];
    const draw = () => { bar.innerHTML = ''; tabs.forEach(t => bar.appendChild(h('button', { type: 'button', class: cur === t[0] ? 'on' : '', onclick: () => { cur = t[0]; draw(); } }, t[1]))); box.innerHTML = ''; tabs.filter(t => t[0] === cur)[0][2](box); };
    c.appendChild(bar); c.appendChild(box); draw();
  }

  V.dashboard = c => {
    const C = ST.content, S = C.settings;
    const go = (id, add) => { AUTO = add || ''; if (location.hash === '#/' + id) route(); else location.hash = '#/' + id; };
    c.appendChild(head('Welcome', 'What would you like to do today? Pick one below. Your changes go live as soon as you press Save.', h('a', { class: 'btn line', href: '../', target: '_blank', rel: 'noopener' }, 'View the website ↗')));
    const tile = (ico, title, sub, label, fn, cls) => h('button', { class: 'tile' + (cls ? ' ' + cls : ''), type: 'button', onclick: fn }, [h('span', { class: 'ti', html: ICO(ico) }), h('b', {}, title), h('small', {}, sub), h('span', { class: 'go' }, label + ' →')]);
    c.appendChild(h('div', { class: 'tiles' }, [
      tile(IC.cal, 'Add a drive or event', 'Tell people about an upcoming drive, or one you have finished.', 'Add a drive', () => go('drives', 'drives'), 'big'),
      tile(IC.news, 'Add a news article', 'Share an update, or a link to a news story.', 'Add news', () => go('news', 'news'), 'big'),
      tile(IC.phone, 'Phone, email and address', 'Change the contact details shown on the website.', 'Open', () => go('contact')),
      tile(IC.target, 'Causes & fundraisers', 'Open a fundraiser or change a cause card.', 'Open', () => go('causes')),
      tile(IC.heart, 'Donation amounts', 'Monthly plans start from ₹' + inr(S.monthlyAmount), 'Open', () => go('donations')),
      tile(IC.text, 'Change a sentence', 'Edit any heading or paragraph, in Hindi and English.', 'Open', () => go('texts')),
      tile(IC.photo, 'Change photos', 'Upload your own photos and use them on the website.', 'Open', () => go('photos'))
    ]));
    const sv = n => ST.saved.indexOf(n) > -1;
    const todo = [
      [sv('settings') && S.email && S.phone, 'Check your phone, email and address', 'contact', 'These show in the footer, the Contact page and receipts.'],
      [sv('drives'), 'Replace the sample drives with your real ones', 'drives', 'Right now the website shows example drives so you can see how it looks.'],
      [sv('team'), 'Add the real names of your team', 'about', 'The Secretary and Treasurer names are still placeholders.'],
      [!!(S.bank && S.bank.upi), 'Add your UPI ID to show the QR code', 'donations', 'Donors can then scan a QR code or open their UPI app. Until then a sample is shown in test mode and the box is hidden once payments are on.'],
      [sv('causes'), 'Check the cause cards (photos and wording)', 'causes', 'The nine causes on the Home and Donate pages are drafts from your first list.'],
      [!!(S.bank && S.bank.account && S.bank.ifsc), 'Add bank details for bank transfers (optional)', 'donations', 'Leave empty to hide the "Prefer a bank transfer?" box.'],
      [!!S.paymentsLive, 'Turn on online payments once Razorpay is ready', 'donations', 'Until then the Donate page runs in test mode and no money is taken.'],
      [sv('news') && C.news.some(n => /^n\d+$/.test(n.id) === false), 'Add your own news and updates', 'news', 'The News page currently shows articles from other publishers.']
    ];
    c.appendChild(h('div', { class: 'card' }, [h('h2', {}, 'Getting ready to go live'), h('p', { class: 'sub' }, 'A short checklist. Tick-marks appear as you complete each step.'), h('ul', { class: 'check' }, todo.map(x => h('li', { class: x[0] ? 'done' : 'todo' }, [h('span', { class: 'dot' }, x[0] ? '✓' : ''), h('div', {}, [h('a', { href: '#/' + x[2], style: 'font-weight:700' }, x[1]), h('div', { style: 'color:#5b6b64;font-size:.9rem' }, x[3])])])))]));
  };

  V.donations = c => {
    const S = clone(ST.content.settings);
    c.appendChild(head('Donation amounts', 'Set the monthly plans, the one-time amount buttons, the UPI ID for the QR code and the limits.'));
    if (!ST.serverPayments) c.appendChild(h('div', { class: 'note' }, 'Razorpay keys are not on the server yet, so real payments cannot start. You can still change everything here. Turn "Online payments" on only after the keys are added (setup guide, step 5).'));
    // ---- monthly plans (e.g. 100 / 200 / 500)
    const plans = (S.monthlyTiers && S.monthlyTiers.length ? S.monthlyTiers : [{ amount: S.monthlyAmount || 100, t: { en: 'Monthly Support', hi: 'मासिक सहयोग' } }]).map(x => ({ amount: x.amount, t: { en: (x.t || {}).en || '', hi: (x.t || {}).hi || '' } }));
    const pbox = h('div', { class: 'plans' }), card0 = h('div', { class: 'card' }, [h('h2', {}, 'Monthly plans'), h('p', { class: 'sub' }, 'Donors who give every month choose one of these plans. Up to 6. If you change a plan, only new monthly donors get it. People already subscribed keep the amount they chose.'), pbox]);
    const drawPlans = () => {
      pbox.innerHTML = '';
      plans.forEach((p, i) => {
        const am = h('input', { type: 'number', min: 1, step: 1, inputmode: 'numeric', 'aria-label': 'Monthly amount' }), en = h('input', { type: 'text', maxlength: 40, placeholder: 'Plan name, e.g. Monthly Support' }), hi = h('input', { type: 'text', maxlength: 40, lang: 'hi', class: 'hi-in', placeholder: 'हिंदी' });
        am.value = p.amount || ''; en.value = p.t.en; hi.value = p.t.hi;
        am.addEventListener('input', () => { p.amount = parseInt(am.value, 10) || 0; }); en.addEventListener('input', () => { p.t.en = en.value; }); hi.addEventListener('input', () => { p.t.hi = hi.value; });
        pbox.appendChild(h('div', { class: 'plan' }, [h('label', { class: 'amt' }, [h('span', {}, '₹ per month'), am]), h('div', { class: 'bi' }, [en, hi]), h('button', { class: 'btn danger sm', type: 'button', disabled: plans.length < 2, onclick: () => { plans.splice(i, 1); drawPlans(); } }, 'Remove')]));
      });
      if (plans.length < 6) pbox.appendChild(h('button', { class: 'btn line sm', type: 'button', style: 'margin-top:10px', onclick: () => { plans.push({ amount: 0, t: bi0() }); drawPlans(); } }, '+ Add a plan'));
    };
    drawPlans();
    const F = [
      { row: [{ k: 'minOnce', type: 'int', min: 1, label: 'One-time donation: smallest amount (₹)', req: true }, { k: 'maxAmount', type: 'int', min: 1, label: 'One-time donation: largest amount (₹)', req: true }] },
      { k: 'chips', type: 'nums', label: 'One-time amount buttons (standard list)', help: 'Smallest to largest, for example: 500, 1000, 2000, 3000, 5000, 10000. Shown on every cause card (first 6) and on the Donate page. A single cause can have its own list in "Causes & fundraisers".' },
      { k: 'homeChips', type: 'nums', label: 'Amount buttons in the Home page "Give once" card', help: 'Up to 6 amounts.' },
      { k: 'paymentsLive', type: 'bool', label: 'Online payments are ON', help: 'Off = test mode (no money is taken, a demo receipt is shown). Turn on only when Razorpay is set up on the server.' },
      { k: 'has80G', type: 'bool', label: 'We have an 80G certificate', help: 'Adds the PAN field and an 80G line on receipts. Leave off until you have the certificate.' },
      { k: 'hasFCRA', type: 'bool', label: 'We have FCRA registration', help: 'Only turn on once you are registered to receive foreign contributions.' }
    ];
    const card1 = h('div', { class: 'card' }), fm = buildForm(F, S); card1.appendChild(fm.root);
    const upiF = [{ row: [{ k: 'bank.upi', type: 'text', label: 'UPI ID of the trust', max: 80, help: 'For example name@bank. Always copy it from the trust\'s bank app and check it twice: money goes straight to this ID.' }, { k: 'bank.upiName', type: 'text', label: 'Name shown in the UPI app', max: 60, help: 'The trust\'s name as on the bank account.' }] }];
    const uf = buildForm(upiF, S);
    const card3 = h('div', { class: 'card' }, [h('h2', {}, 'Pay by UPI (QR code)'), h('p', { class: 'sub' }, 'Adds a QR code and an "Open my UPI app" button on the Donate page for one-time gifts. The amount is filled in for the donor. Payments made this way are not confirmed automatically: you get an email, then match the payment with the bank statement and send the receipt. Leave empty to hide this box.'), uf.root]);
    const bankF = [{ row: [{ k: 'bank.holder', type: 'text', label: 'Account holder name', max: 120 }, { k: 'bank.bankName', type: 'text', label: 'Bank and branch', max: 120 }] }, { row: [{ k: 'bank.account', type: 'text', label: 'Account number', max: 40 }, { k: 'bank.ifsc', type: 'text', label: 'IFSC code', max: 20 }] }];
    const bf = buildForm(bankF, S);
    const card2 = h('div', { class: 'card' }, [h('h2', {}, 'Bank transfer details'), h('p', { class: 'sub' }, 'Shown on the Donate page under "Prefer a bank transfer?". Leave the account number empty to hide the whole box.'), bf.root]);
    // ---- ready-made links to send on WhatsApp (like "click the link and join us")
    const base = location.origin + location.pathname.replace(/admin\/(index\.html)?$/, '');
    const links = [['Donate page (donor chooses everything)', base + 'donate.html']];
    ((S.monthlyTiers && S.monthlyTiers.length ? S.monthlyTiers : [{ amount: S.monthlyAmount || 100 }]).filter(p => p.amount > 0)).forEach(p => links.push(['Monthly ₹' + p.amount.toLocaleString('en-IN') + ' (opens ready to start)', base + 'donate.html?freq=monthly&amt=' + p.amount]));
    (ST.content.causes || []).forEach(x => links.push([(x.t && (x.t.en || x.t.hi)) || x.key, base + 'donate.html?cause=' + encodeURIComponent(x.key) + '&freq=once']));
    const lbox = h('div', { class: 'links' });
    links.forEach(([name, url]) => {
      const msg = 'बाल विकास कौशल संस्था से जुड़ें और बच्चों के भविष्य में सहयोग करें / Join Bal Vikash Kaushal Sanstha and support a child\'s future: ' + url;
      const cp = h('button', { class: 'btn line sm', type: 'button', onclick: () => { const done = () => toast('Link copied.'); if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => toast(url)); else toast(url); } }, 'Copy link');
      const wa = h('a', { class: 'btn pri sm', href: 'https://wa.me/?text=' + encodeURIComponent(msg), target: '_blank', rel: 'noopener' }, 'Share on WhatsApp');
      lbox.appendChild(h('div', { class: 'lk' }, [h('div', { class: 'lkn' }, [h('b', {}, name), h('small', {}, url.replace(/^https?:\/\//, ''))]), h('div', { class: 'lka' }, [cp, wa])]));
    });
    const cardL = h('div', { class: 'card' }, [h('h2', {}, 'Links to share'), h('p', { class: 'sub' }, 'Send these on WhatsApp or print them as a QR. The donor opens the page already set up, so they only add their name and mobile number and pay.'), lbox]);
    c.appendChild(cardL); c.appendChild(card0); c.appendChild(card1); c.appendChild(card3); c.appendChild(card2);
    c.appendChild(h('div', { class: 'savebar' }, h('button', { class: 'btn pri', type: 'button', onclick: () => {
      const a = fm.collect(); if (!a) return; const u = uf.collect(); if (!u) return; const b = bf.collect(); if (!b) return;
      const ok = plans.filter(p => p.amount > 0); if (!ok.length) return toast('Please add at least one monthly plan with an amount.', true);
      if (new Set(ok.map(p => p.amount)).size !== ok.length) return toast('Two monthly plans have the same amount. Please change one.', true);
      const o = clone(ST.content.settings); ['minOnce', 'maxAmount', 'chips', 'homeChips', 'paymentsLive', 'has80G', 'hasFCRA'].forEach(k => { o[k] = a[k]; });
      o.monthlyTiers = ok.map(p => ({ amount: p.amount, t: { en: p.t.en.trim(), hi: p.t.hi.trim() } })); o.monthlyAmount = Math.min.apply(null, ok.map(p => p.amount));
      o.bank = Object.assign({}, b.bank, { upi: u.bank.upi, upiName: u.bank.upiName });
      if (!o.chips.length) return toast('Please add at least one amount button for the Donate page.', true);
      if (o.paymentsLive && !ST.serverPayments) return confirmBox('Razorpay keys are not on the server yet. If you turn payments on now, donors will see an error when they try to pay. Turn it on anyway?', 'Turn on anyway', true).then(ok2 => { if (ok2) saveSection('settings', o).then(() => route()).catch(() => {}); });
      saveSection('settings', o).then(() => route()).catch(() => {});
    } }, 'Save donation settings')));
  };

  V.contact = c => {
    const S = clone(ST.content.settings);
    c.appendChild(head('Phone, email, address', 'Shown in the footer, on the Contact page and on receipts.'));
    const F = [
      { row: [{ k: 'phone', type: 'text', label: 'Phone number', req: true, max: 15, help: '10 digits, no spaces.' }, { k: 'whatsapp', type: 'text', label: 'WhatsApp number', max: 15, help: 'Leave empty to use the phone number.' }] },
      { row: [{ k: 'email', type: 'text', label: 'Email', req: true, max: 120 }, { k: 'regNo', type: 'text', label: 'Registration number', max: 40 }] },
      { k: 'president', type: 'bi', label: 'President (shown on the Contact page)', max: 120 },
      { k: 'city', type: 'bi', label: 'Head office city (short)', max: 120, help: 'Shown in the footer and on receipts.', ph: ['Faridabad, Haryana', 'फरीदाबाद, हरियाणा'] },
      { k: 'address', type: 'bi-area', label: 'Full address (Contact page)', max: 400 },
      { k: 'mapEmbed', type: 'url', label: 'Map link (optional)', help: 'In Google Maps: Share → Embed a map → copy the link inside src="...". Leave empty to hide the map.' }
    ];
    const SO = [{ row: [{ k: 'social.facebook', type: 'url', label: 'Facebook page link' }, { k: 'social.instagram', type: 'url', label: 'Instagram link' }, { k: 'social.youtube', type: 'url', label: 'YouTube link' }] }];
    const f1 = buildForm(F, S), f2 = buildForm(SO, S);
    c.appendChild(h('div', { class: 'card' }, f1.root));
    c.appendChild(h('div', { class: 'card' }, [h('h2', {}, 'Social media (optional)'), h('p', { class: 'sub' }, 'Icons appear in the footer only for the links you fill in.'), f2.root]));
    c.appendChild(h('div', { class: 'savebar' }, h('button', { class: 'btn pri', type: 'button', onclick: () => {
      const a = f1.collect(); if (!a) return; const b = f2.collect(); if (!b) return;
      const o = clone(ST.content.settings); ['phone', 'whatsapp', 'email', 'regNo', 'president', 'city', 'address', 'mapEmbed'].forEach(k => { o[k] = a[k]; }); o.social = b.social; if (!o.whatsapp || (a.whatsapp === ST.content.settings.whatsapp && ST.content.settings.whatsapp === ST.content.settings.phone)) o.whatsapp = o.phone;
      saveSection('settings', o).catch(() => {});
    } }, 'Save details')));
  };

  // drives: grouped by date
  V.drives = c => {
    c.appendChild(head('Drives & events', 'Add a drive and it appears on the Home page and the Our Work page. Drives move from "Upcoming" to "Drives we have held" by themselves once the date has passed.'));
    const cfg = CFG.drives, draw = () => {
      box.innerHTML = '';
      const arr = ST.content.drives, t = todayIso();
      const idx = a => a.map(d => arr.indexOf(d));
      const save = next => saveSection('drives', next).then(() => { draw(); return true; }).catch(() => false);
      const edit = i => editItem(cfg, i === null ? null : arr[i], v => { const a = clone(ST.content.drives); if (i === null) a.push(v); else a[i] = v; return save(a); });
      box.appendChild(h('div', { style: 'margin-bottom:6px' }, h('button', { class: 'btn pri', type: 'button', onclick: () => edit(null) }, '+ Add a drive')));
      const group = (title, list, empty) => {
        box.appendChild(h('div', { class: 'grp-h' }, [h('h2', {}, title), h('span', { class: 'n' }, list.length)]));
        if (!list.length) box.appendChild(h('div', { class: 'empty' }, empty));
        else box.appendChild(h('div', { class: 'rows' }, list.map(d => { const i = arr.indexOf(d); return row(cfg, d, i, arr, edit, save, true); })));
      };
      group('Upcoming', arr.filter(d => d.date >= t).sort((a, b) => a.date < b.date ? -1 : 1), 'No upcoming drives. Add one and it will show on your Home page.');
      group('Held so far', arr.filter(d => d.date < t).sort((a, b) => a.date < b.date ? 1 : -1), 'Past drives will appear here.');
    };
    const box = h('div'); c.appendChild(box); draw();
    if (AUTO === 'drives') { AUTO = ''; const b = box.querySelector('.btn.pri'); if (b) b.click(); }
  };
  V.news = c => { c.appendChild(head('News', 'Articles shown on the News page (the latest 3 also show on the Home page).')); tabbed(c, [['a', 'Articles', b => listView(b, CFG.news)], ['c', 'Filter categories', b => listView(b, CFG.newsCats)]]); };
  V.home = c => { c.appendChild(head('Home page', 'The pictures, steps and numbers on the first page. For other words on the page, use "Page texts".')); tabbed(c, [['s', 'Banner pictures', b => listView(b, CFG.slides)], ['h', 'How we work', b => listView(b, CFG.how)], ['n', 'Why it matters (numbers)', b => listView(b, CFG.stats)]]); };
  V.about = c => { c.appendChild(head('About page', 'Values and team. The story, mission and vision words are in "Page texts".')); tabbed(c, [['t', 'Team', b => listView(b, CFG.team)], ['v', 'Values', b => listView(b, CFG.values)]]); };
  V.focus = c => { c.appendChild(head('Focus areas', 'The areas of work shown on the Our Work page.')); const b = h('div'); c.appendChild(b); listView(b, CFG.focus); };
  V.causes = c => { c.appendChild(head('Causes & fundraisers', 'The causes people can give to. Open a fundraiser for a particular case when you need to raise a set amount.')); const b = h('div'); c.appendChild(b); listView(b, CFG.causes); };
  V.faq = c => { c.appendChild(head('Donate page questions', 'Questions and answers shown at the bottom of the Donate page.')); const b = h('div'); c.appendChild(b); listView(b, CFG.faq); };

  const IMGF = [['homeAbout', 'Home page: "About us" section'], ['aboutMain', 'About page: story photo'], ['founder', 'Founder photo (About page and Home page)'], ['ctaBand', 'Blue banner near the bottom of pages ("Be part of a child\'s brighter tomorrow")'], ['waysMonthly', 'Home page: "Give every month" card'], ['waysOnce', 'Home page: "Give once" card'], ['donateSide', 'Donate page: side picture']];
  V.photos = c => {
    c.appendChild(head('Photos', 'Upload your own photos and choose the main pictures used around the website.'));
    tabbed(c, [['p', 'Page pictures', b => {
      const fm = buildForm(IMGF.map(x => ({ k: x[0], type: 'photo', label: x[1], req: true })), clone(ST.content.images));
      b.appendChild(h('div', { class: 'card' }, fm.root)); b.appendChild(h('div', { class: 'savebar' }, h('button', { class: 'btn pri', type: 'button', onclick: () => { const v = fm.collect(); if (v) saveSection('images', v).catch(() => {}); } }, 'Save pictures')));
    }], ['l', 'My photo library', b => {
      const draw = () => {
        b.innerHTML = ''; b.appendChild(h('div', { class: 'card' }, [h('h2', {}, 'Upload photos'), h('div', { style: 'margin-top:12px' }, uploader(() => draw()))]));
        b.appendChild(h('div', { class: 'note info' }, 'Only upload photos of children when their parents or guardians have agreed. Photos you upload are resized and their hidden location data is removed.'));
        if (!ST.media.length) b.appendChild(h('div', { class: 'empty' }, 'No photos uploaded yet.'));
        else b.appendChild(h('div', { class: 'pgrid' }, ST.media.map(x => h('div', { class: 'cell' }, [h('div', { class: 'p', style: 'cursor:default' }, h('img', { src: thumb(x.path), alt: '', loading: 'lazy' })), h('button', { class: 'btn danger sm', type: 'button', onclick: () => {
          const used = JSON.stringify(ST.content).indexOf(x.path) > -1;
          confirmBox(used ? 'This photo is used somewhere on the website. If you delete it, that place will show no picture. Delete it?' : 'Delete this photo?', 'Delete', true).then(ok => { if (ok) api('delmedia', { path: x.path }).then(r => { ST.media = r.media; toast('Photo deleted.'); draw(); }).catch(fail); });
        } }, 'Delete')]))));
      };
      draw();
    }]]);
  };

  // page texts (friendly markers: **words** = highlighted colour, {dot} = the small dots between words)
  const toEdit = x => String(x).replace(/<span class="hl">(.*?)<\/span>/g, '**$1**').replace(/<i><\/i>/g, '{dot}');
  const toStore = x => String(x).replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>').replace(/\{dot\}/g, '<i></i>');
  V.texts = c => {
    c.appendChild(head('Page texts', 'Change any sentence or heading on the website, in English and Hindi. Pick a page, edit the words and press Save.'));
    const box = h('div', { class: 'card' }, h('p', {}, 'Loading...')); c.appendChild(box);
    fetch('catalog.json', { cache: 'no-cache' }).then(r => r.json()).then(cat => {
      const draft = clone(ST.content.texts || {}); let page = 'index', q = '', shown = 40;
      const pageName = k => (cat.pages.filter(p => p.key === k)[0] || {}).name || k;
      const sel = h('select', { class: 'in', style: 'max-width:300px' }, [h('option', { value: '*' }, 'All pages')].concat(cat.pages.map(p => h('option', { value: p.key }, p.name))));
      sel.value = page; const search = h('input', { class: 'in', type: 'search', placeholder: 'Search words...' });
      const list = h('div'); const count = h('span', { style: 'color:#5b6b64' });
      const dirty = () => JSON.stringify(draft) !== JSON.stringify(ST.content.texts || {});
      const draw = () => {
        list.innerHTML = '';
        const ql = q.toLowerCase(), items = cat.texts.filter(t => (page === '*' || t.page === page) && (!ql || (toEdit(t.en) + ' ' + t.hi + ' ' + ((draft[t.k] || {}).en || '') + ' ' + ((draft[t.k] || {}).hi || '')).toLowerCase().indexOf(ql) > -1));
        count.textContent = items.length + ' texts';
        items.slice(0, shown).forEach(t => {
          const o = draft[t.k], en = h('textarea', { class: 'in', rows: 2 }), hi = h('textarea', { class: 'in hi-in', rows: 2, lang: 'hi' });
          en.value = toEdit(o ? o.en : t.en); hi.value = toEdit(o ? o.hi : t.hi);
          const meta = h('div', { class: 'meta' }), tr = h('div', { class: 'trow' + (o ? ' ed' : '') });
          const upd = () => { const e1 = toStore(en.value), h1 = toStore(hi.value), same = e1 === t.en && h1 === t.hi; if (same) delete draft[t.k]; else draft[t.k] = { en: e1, hi: h1 }; tr.classList.toggle('ed', !same); mm(); };
          const mm = () => { meta.innerHTML = ''; meta.appendChild(h('span', {}, pageName(t.page) + (draft[t.k] ? '  ·  edited' : ''))); if (draft[t.k]) meta.appendChild(h('a', { href: '#', onclick: e => { e.preventDefault(); delete draft[t.k]; en.value = toEdit(t.en); hi.value = toEdit(t.hi); tr.classList.remove('ed'); mm(); } }, 'Restore original')); };
          en.addEventListener('input', upd); hi.addEventListener('input', upd); mm();
          tr.appendChild(meta); tr.appendChild(h('div', { class: 'bi' }, [h('div', {}, [h('span', { class: 'lg' }, 'English'), en]), h('div', {}, [h('span', { class: 'lg' }, 'हिंदी'), hi])])); list.appendChild(tr);
        });
        if (items.length > shown) list.appendChild(h('button', { class: 'btn line', type: 'button', onclick: () => { shown += 40; draw(); } }, 'Show more (' + (items.length - shown) + ' left)'));
        if (!items.length) list.appendChild(h('div', { class: 'empty' }, 'No texts match.'));
      };
      sel.addEventListener('change', () => { page = sel.value; shown = 40; draw(); }); search.addEventListener('input', () => { q = search.value; shown = 40; draw(); });
      box.replaceWith(h('div', {}, [
        h('div', { class: 'note info' }, [h('b', {}, 'Good to know: '), 'Words in double square brackets, like [[monthly]], [[phone]], [[email]], [[reg]] and [[city]], are filled in automatically from your Donation and Contact settings, so please keep them in the text. Put two stars around words to show them in colour, like **this**. If you empty both languages of a line, it is hidden.']),
        h('div', { class: 'toolbar' }, [sel, search, count]), list,
        h('div', { class: 'savebar' }, [h('button', { class: 'btn pri', type: 'button', onclick: () => { saveSection('texts', draft).then(v => { toast('Saved. ' + Object.keys(v).length + ' text(s) changed.'); }).catch(() => {}); } }, 'Save text changes'), h('button', { class: 'btn line', type: 'button', onclick: () => { if (!dirty()) return toast('Nothing to discard.'); route(); } }, 'Discard unsaved changes')])]));
      draw();
    }).catch(() => { box.textContent = 'Could not load the list of texts (admin/catalog.json is missing).'; });
  };

  // safety
  V.safety = c => {
    c.appendChild(head('Backup & security', 'Every save keeps a backup. You can also change your password here.'));
    const pw = h('div', { class: 'card' }); const cur = h('input', { class: 'in', type: 'password', autocomplete: 'current-password' }), n1 = h('input', { class: 'in', type: 'password', autocomplete: 'new-password' }), n2 = h('input', { class: 'in', type: 'password', autocomplete: 'new-password' });
    pw.appendChild(h('h2', {}, 'Change password')); pw.appendChild(h('div', { class: 'form', style: 'margin-top:12px;max-width:420px' }, [h('div', { class: 'fld' }, [h('label', { class: 'l' }, 'Current password'), cur]), h('div', { class: 'fld' }, [h('label', { class: 'l' }, 'New password (at least 8 characters)'), n1]), h('div', { class: 'fld' }, [h('label', { class: 'l' }, 'New password again'), n2]),
      h('div', {}, h('button', { class: 'btn pri', type: 'button', onclick: () => { if (n1.value !== n2.value) return toast('The two new passwords do not match.', true); api('password', { current: cur.value, password: n1.value }).then(() => { toast('Password changed.'); cur.value = n1.value = n2.value = ''; }).catch(fail); } }, 'Change password'))]));
    c.appendChild(pw);
    const bk = h('div', { class: 'card' }, [h('h2', {}, 'Backups'), h('p', { class: 'sub' }, 'A backup is made automatically every time you save. The last 30 are kept.')]); const bl = h('div', {}, 'Loading...'); bk.appendChild(bl); c.appendChild(bk);
    api('backups').then(r => { bl.innerHTML = ''; if (!r.backups.length) { bl.textContent = 'No backups yet. They appear after your first change.'; return; }
      bl.appendChild(h('table', { class: 't' }, r.backups.slice(0, 15).map(b => h('tr', {}, [h('td', {}, new Date(b.time * 1000).toLocaleString()), h('td', { style: 'text-align:right' }, h('button', { class: 'btn line sm', type: 'button', onclick: () => confirmBox('Restore the website content from this backup? Your current content is backed up first.', 'Restore').then(ok => { if (ok) api('restore', { name: b.name }).then(() => { toast('Restored.'); init(); }).catch(fail); }) }, 'Restore'))])))); }).catch(() => { bl.textContent = 'Could not load backups.'; });
    const imp = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    imp.addEventListener('change', () => { const f = imp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { let j; try { j = JSON.parse(rd.result); } catch (e) { return toast('That file is not valid.', true); } confirmBox('Replace the website content with the content in this file?', 'Import', true).then(ok => { if (ok) api('import', { content: j }).then(() => { toast('Imported.'); init(); }).catch(fail); }); }; rd.readAsText(f); });
    c.appendChild(h('div', { class: 'card' }, [h('h2', {}, 'Download or restore everything'), h('p', { class: 'sub' }, 'Keep a copy of all your website content on your computer.'), h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, [h('a', { class: 'btn line', href: API + '?a=export' }, 'Download content file'), h('button', { class: 'btn line', type: 'button', onclick: () => imp.click() }, 'Import a content file'), imp])]));
    const names = { settings: 'Donation & contact settings', images: 'Page pictures', slides: 'Banner pictures', how: 'How we work', values: 'Values', stats: 'Numbers', focus: 'Focus areas', drives: 'Drives', news: 'News articles', newsCats: 'News categories', team: 'Team', faq: 'Donate page questions', texts: 'Page texts' };
    const rs = h('div', { class: 'card' }, [h('h2', {}, 'Go back to the original'), h('p', { class: 'sub' }, 'Undo all your changes in one part and bring back the original sample content. A backup is saved first.')]);
    const t = h('table', { class: 't' }); Object.keys(names).forEach(k => { if (ST.saved.indexOf(k) < 0) return; t.appendChild(h('tr', {}, [h('td', {}, names[k]), h('td', { style: 'text-align:right' }, h('button', { class: 'btn danger sm', type: 'button', onclick: () => confirmBox('Bring back the original "' + names[k] + '"? Your changes in this part will be removed.', 'Restore original', true).then(ok => { if (ok) api('reset', { section: k }).then(r => { ST.content[k] = k === 'texts' && Array.isArray(r.value) ? {} : r.value; ST.saved = ST.saved.filter(x => x !== k); toast('Original restored.'); route(); }).catch(fail); }) }, 'Restore original'))])); });
    rs.appendChild(t.children.length ? t : h('p', { style: 'color:#5b6b64' }, 'You have not changed anything yet.')); c.appendChild(rs);
    c.appendChild(h('div', { class: 'card' }, [h('h2', {}, 'Server check'), h('dl', { class: 'kv', style: 'margin-top:10px' }, [
      h('dt', {}, 'Saving changes'), h('dd', {}, ST.writable ? h('span', { class: 'tag-ok' }, 'Working') : h('span', { class: 'tag-bad' }, 'The "data" folder is not writable')),
      h('dt', {}, 'Photo uploads'), h('dd', {}, ST.gd ? h('span', { class: 'tag-ok' }, 'Working (photos are resized automatically)') : h('span', {}, 'Working (photos are kept as uploaded)')),
      h('dt', {}, 'Razorpay keys on server'), h('dd', {}, ST.serverPayments ? h('span', { class: 'tag-ok' }, 'Found') : h('span', {}, 'Not added yet (see the setup guide)'))]) ]));
  };

  // ---------------------------------------------------------------- shell + routing
  const ICO = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const IC = {
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5"/>',
    phone: '<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    heart: '<path d="M12 20s-7-4.600-9-9.200C1.600 7.400 3.600 4 7 4c2 0 3.400 1 5 3 1.600-2 3-3 5-3 3.400 0 5.400 3.400 4 6.800C19 15.400 12 20 12 20z"/>',
    text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9a2.500 2.500 0 1 1 3.500 2.300c-.700.400-1 1-1 1.700M12 17h.01"/>',
    shield: '<path d="M12 3l8 3v6c0 4.500-3.200 7.800-8 9-4.800-1.200-8-4.500-8-9V6z"/>'
  };
  // 'grp' = a heading, 'more' = everything after it is tucked into a "More options" fold
  const NAV = [
    ['dashboard', 'Start', IC.home],
    ['grp', 'Everyday tasks'],
    ['drives', 'Drives & events', IC.cal], ['news', 'News', IC.news], ['contact', 'Phone, email, address', IC.phone], ['causes', 'Causes & fundraisers', IC.target], ['donations', 'Donation amounts', IC.heart],
    ['more', 'More options'],
    ['home', 'Home page', IC.screen], ['about', 'About page', IC.user], ['focus', 'Focus areas', IC.target], ['faq', 'Donate page questions', IC.help], ['texts', 'Page texts', IC.text], ['photos', 'Photos', IC.photo], ['safety', 'Backup & security', IC.shield]
  ];
  const MORE = NAV.slice(NAV.findIndex(n => n[0] === 'more') + 1).map(n => n[0]);
  const TITLES = {}; NAV.forEach(n => { if (n[0] !== 'grp' && n[0] !== 'more') TITLES[n[0]] = n[1]; });

  function shell() {
    app.innerHTML = '';
    const link = n => h('a', { href: '#/' + n[0], 'data-id': n[0], html: ICO(n[2]) + '<span>' + esc(n[1]) + '</span>' });
    const k = NAV.findIndex(n => n[0] === 'more'), main = NAV.slice(0, k), more = NAV.slice(k + 1);
    const cur = (location.hash.replace(/^#\//, '') || 'dashboard');
    const side = h('aside', { class: 'side', id: 'side' }, [
      h('div', { class: 'brand' }, [h('img', { src: '../assets/img/logo.svg', alt: '' }), h('b', {}, ['Website admin', h('small', {}, 'Bal Vikash Kaushal Sanstha')])]),
      h('nav', { 'aria-label': 'Admin menu' }, main.map(n => n[0] === 'grp' ? h('div', { class: 'grp' }, n[1]) : link(n)).concat([h('details', { class: 'more', open: MORE.indexOf(cur) > -1 }, [h('summary', {}, NAV[k][1])].concat(more.map(link)))])),
      h('div', { class: 'foot' }, [langSwitch(), h('a', { href: '../', target: '_blank', rel: 'noopener' }, 'View website ↗'), h('button', { type: 'button', onclick: () => api('logout', {}).then(() => { ST = null; showLogin(); }).catch(fail) }, 'Sign out')])]);
    const top = h('div', { class: 'top' }, [h('button', { type: 'button', 'aria-label': 'Menu', onclick: () => side.classList.toggle('open') }, '☰'), h('b', {}, 'Website admin'), langSwitch()]);
    side.addEventListener('click', e => { if (e.target.closest('a')) side.classList.remove('open'); });
    app.appendChild(top); app.appendChild(h('div', { class: 'shell' }, [side, h('main', { class: 'main', id: 'main' })]));
  }
  function route() {
    if (!ST) return; const id = (location.hash.replace(/^#\//, '') || 'dashboard'), v = V[id] ? id : 'dashboard', m = $('#main');
    [].forEach.call(document.querySelectorAll('.side nav a'), a => a.classList.toggle('on', a.dataset.id === v));
    const dm = $('.side details.more'); if (dm && MORE.indexOf(v) > -1) dm.open = true;
    m.innerHTML = ''; V[v](m); window.scrollTo(0, 0); document.title = tr(TITLES[v]) + ' | ' + tr('Website admin');
  }
  window.addEventListener('hashchange', route);

  // ---------------------------------------------------------------- auth screens
  function authBox(title, intro, body, btnLabel, onGo) {
    app.innerHTML = '';
    const err = h('p', { style: 'color:#B3261E;font-weight:600;margin:10px 0 0;min-height:1.4em' }), btn = h('button', { class: 'btn pri', type: 'submit', style: 'width:100%;margin-top:6px' }, btnLabel);
    const f = h('form', { class: 'form', onsubmit: e => { e.preventDefault(); err.textContent = ''; btn.disabled = true; onGo(err).finally(() => { btn.disabled = false; }); } }, [].concat(body, btn, err));
    app.appendChild(h('div', { class: 'auth' }, h('div', { class: 'box' }, [h('div', { style: 'display:flex;justify-content:flex-end;margin:-6px 0 6px' }, langSwitch()), h('div', { class: 'logo' }, [h('img', { src: '../assets/img/logo.svg', alt: '' }), h('div', {}, [h('h1', {}, title), h('small', { style: 'color:#5b6b64' }, 'Bal Vikash Kaushal Sanstha')])]), intro ? h('p', {}, intro) : null, f])));
    const i = $('input'); if (i) i.focus();
  }
  const pwField = (id, label, auto) => h('div', { class: 'fld' }, [h('label', { class: 'l', for: id }, label), h('input', { class: 'in', id, type: 'password', autocomplete: auto || 'current-password', required: true })]);
  function showLogin(msg) {
    authBox('Sign in', msg || 'Enter your admin password to manage the website.', [pwField('pw', 'Password')], 'Sign in', err =>
      api('login', { password: $('#pw').value }).then(r => { csrf = r.csrf; return init(); }).catch(e => { err.textContent = e.message === 'NOPHP' ? 'The server did not answer.' : e.message; }));
  }
  function showSetup(needCode) {
    const body = [pwField('pw', 'Choose a password (at least 8 characters)', 'new-password'), pwField('pw2', 'Type it again', 'new-password')];
    if (needCode) body.push(h('div', { class: 'fld' }, [h('label', { class: 'l', for: 'code' }, 'Setup code'), h('input', { class: 'in', id: 'code', required: true }), h('p', { class: 'help' }, 'The setup code is in your api/config.php file (ADMIN_SETUP_CODE).')]));
    authBox('Create your admin password', 'Welcome! This is the first time the admin is opened. Choose a password you will remember. Write it down somewhere safe.', body, 'Create password and continue', err => {
      if ($('#pw').value !== $('#pw2').value) { err.textContent = 'The two passwords do not match.'; return Promise.resolve(); }
      return api('setup', { password: $('#pw').value, code: needCode ? $('#code').value : '' }).then(r => { csrf = r.csrf; return init(); }).catch(e => { err.textContent = e.message; });
    });
  }
  function showNoPhp() {
    app.innerHTML = ''; app.appendChild(h('div', { class: 'auth' }, h('div', { class: 'box' }, [h('h1', {}, 'The admin needs PHP hosting'), h('p', {}, 'This page could not reach the admin server. The admin panel runs on PHP hosting such as GoDaddy cPanel. It does not run on the Netlify preview, which only shows the website design.'), h('p', {}, 'If you are already on GoDaddy, check that the "admin" and "api" folders were uploaded and that PHP is switched on for the domain.'), h('a', { class: 'btn line', href: '../' }, 'Back to the website'), h('div', { style: 'margin-top:14px' }, langSwitch())])));
  }

  function init() {
    return api('me').then(me => {
      csrf = me.csrf;
      if (me.setup) return showSetup(me.setupCode);
      if (!me.auth) return showLogin();
      return api('load').then(d => { if (Array.isArray(d.content.texts)) d.content.texts = {}; ST = { content: d.content, saved: d.saved, stock: d.stock, media: d.media, serverPayments: d.serverPayments, online: d.online || {}, gd: d.gd, writable: d.writable }; shell(); route(); });
    }).catch(e => { if (e.message === 'NOPHP') showNoPhp(); else { app.innerHTML = ''; app.appendChild(h('p', { class: 'boot' }, e.message)); } });
  }
  init();
})();
