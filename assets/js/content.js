/* Loads content saved in the admin panel (api/content.php) and applies it to the page.
   Until something is saved in /admin the API answers {custom:false} and the pages stay exactly as they were built.
   Markup here mirrors tools/build.py so edited and unedited pages look identical. */
(function () {
  var C = window.BVKS = window.BVKS || {}, root = document.documentElement, done_;
  window.bvksReady = new Promise(function (r) { done_ = r; });
  function done() { root.classList.remove('hyd'); done_(); }

  var svg = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var ICON = {
    pin: svg('<path d="M12 21s7-6.200 7-11.500A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>'),
    check: svg('<path d="M5 12.500l4.500 4.500L19 7.500"/>'),
    heart: svg('<path d="M12 20s-7-4.6-9-9.2C1.6 7.4 3.6 4 7 4c2 0 3.4 1 5 3 1.6-2 3-3 5-3 3.400 0 5.400 3.400 4 6.800C19 15.400 12 20 12 20z"/>'),
    fb: svg('<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>'),
    ig: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.500" cy="6.500" r=".6" fill="currentColor"/>'),
    yt: svg('<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9.500v5l4.500-2.500z"/>')
  };
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  var MON_EN = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MON_HI_S = ['', 'जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सितं', 'अक्टू', 'नव', 'दिसं'];
  var MON_HI = ['', 'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

  var D, S, ALT = {};
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c]; }); };
  var safeUrl = function (u, allowDataImg) {
    u = String(u == null ? '' : u).trim();
    if (!u) return '';
    if (allowDataImg && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(u)) return u;
    if (/^(https?:\/\/|[a-z0-9_./-]+\.(?:png|jpe?g|webp|gif|svg|html)(?:[?#].*)?$)/i.test(u)) return u;
    return '';
  };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var TD = function (en, hi) { return '<span class="en">' + en + '</span><span class="hi" lang="hi">' + hi + '</span>'; };
  var TE = function (o) { o = o || {}; return TD(esc(o.en || o.hi), esc(o.hi || o.en)); };
  var has = function (o) { return !!(o && (o.en || o.hi)); };
  var inr = function (n) { return Number(n).toLocaleString('en-IN'); };
  var photoUrl = function (ref, w) { return /^photo-[a-zA-Z0-9_-]+$/.test(ref) ? 'https://images.unsplash.com/' + ref + '?auto=format&fit=crop&w=' + w + '&q=75' : safeUrl(ref, true); };
  function IMG(ref, alt, w, eager, pos) {
    if (!ref) return '';
    return '<img data-photo' + (pos ? ' style="object-position:' + esc(pos) + '"' : '') + ' src="' + esc(photoUrl(ref, w)) + '" alt="' + esc(ALT[ref] || alt) + '" ' + (eager ? '' : 'loading="lazy" ') + 'decoding="async">';
  }
  var ymd = function (s) { var p = String(s).split('-'); return [+p[0], +p[1], +p[2]]; };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  var ladder = function (c) { return (c.amounts && c.amounts.length) ? c.amounts : (S.chips || []); };
  function fund(c) {
    var f = c.fund || {}, g = +f.goal || 0; if (!f.on || g <= 0) return '';
    var r = (+f.raised || 0) + ((window.BVKS_ONLINE || {})[c.key] || 0), pct = Math.min(100, Math.floor(r * 100 / g));
    var note = has(f.note) ? '<p class="fnote">' + TE(f.note) + '</p>' : '', done = pct >= 100 ? '<p class="fgoal">' + TD('Goal reached. Thank you!', 'लक्ष्य पूरा हुआ। धन्यवाद!') + '</p>' : '';
    return '<div class="fund"><div class="bar"><i style="width:' + pct + '%"></i></div><p class="fnum"><span>' + TD('<b>₹' + inr(r) + '</b> raised of <b>₹' + inr(g) + '</b>', '<b>₹' + inr(g) + '</b> के लक्ष्य में से <b>₹' + inr(r) + '</b> जुटाए गए') + '</span><em>' + pct + '%</em></p>' + done + note + '</div>';
  }
  function ccard(c) {
    var k = esc(c.key), f = fund(c), ft = f ? '<span class="ctag">' + TD('Fundraiser', 'फंडरेज़र') + '</span>' : '';
    return '<article class="ccard reveal" id="c-' + k + '"><div class="ph">' + IMG(c.photo, c.t.en, 700) + ft + '</div><div class="cb"><h3>' + TE(c.t) + '</h3><p>' + TE(c.d) + '</p>' + f +
      '<div class="cact"><a class="btn btn-gold" href="donate.html?cause=' + k + '">' + TD('Donate', 'सहयोग करें') + ARROW + '</a><a class="cmon" href="donate.html?cause=' + k + '&amp;freq=monthly">' + TD('or monthly from ', 'या मासिक, शुरुआत ') + '<span data-t="monthly">₹' + inr(S.monthlyAmount) + '</span></a></div></div></article>';
  }
  function cpick(c) {
    var mini = '', f = c.fund || {};
    if (f.on && +f.goal > 0) { var r = (+f.raised || 0) + ((window.BVKS_ONLINE || {})[c.key] || 0); mini = '<i class="cpb"><u style="width:' + Math.min(100, Math.floor(r * 100 / +f.goal)) + '%"></u></i>'; }
    return '<label class="cp"><input type="radio" name="cause" value="' + esc(c.key) + '" data-amts="' + ladder(c).join(',') + '" data-en="' + esc(c.t.en || c.t.hi) + '" data-hi="' + esc(c.t.hi || c.t.en) + '"><span class="cpi"><span class="cpph">' + IMG(c.photo, '', 300) + '</span><span class="cpt">' + TE(c.t) + mini + '</span></span></label>';
  }

  // ---------- renderers (same markup as tools/build.py)
  var R = {
    slides: function () {
      var sl = D.slides || [], n = sl.length;
      var s = sl.map(function (x, i) { return '<figure class="slide' + (i === 0 ? ' on' : '') + '">' + IMG(x.photo, '', 1000, i === 0, x.pos) + '<figcaption><em>' + pad(i + 1) + ' / ' + pad(n) + '</em><b>' + TE(x.t) + '</b><small>' + TE(x.d) + '</small></figcaption></figure>'; }).join('');
      var d = sl.map(function (x, i) { return '<button type="button" aria-label="Slide ' + (i + 1) + '"' + (i === 0 ? ' class="on"' : '') + '></button>'; }).join('');
      each('[data-render=slides]', function (el) { el.innerHTML = s; });
      each('[data-render=dots]', function (el) { el.innerHTML = d; });
      var car = document.getElementById('car'); if (car && car._reset) car._reset();
    },
    how: function (el) { el.innerHTML = (D.how || []).map(function (x, i) { return '<div class="val reveal"><span class="vn">' + pad(i + 1) + '</span><h3>' + TE(x.t) + '</h3><p>' + TE(x.d) + '</p></div>'; }).join(''); },
    values: function (el) { el.innerHTML = (D.values || []).map(function (x) { return '<div class="val reveal"><h3>' + TE(x.t) + '</h3><p>' + TE(x.d) + '</p></div>'; }).join(''); },
    team: function (el) { el.innerHTML = (D.team || []).map(function (x) { return '<div class="person reveal"><h3>' + TE(x.name) + '</h3><p>' + TE(x.role) + '</p></div>'; }).join(''); },
    stats: function (el) {
      el.innerHTML = (D.stats || []).map(function (x) {
        var src = '';
        if (has(x.src)) { var nm = TE(x.src), su = safeUrl(x.url); src = '<small>' + TD('Source', 'स्रोत') + ': ' + (su ? '<a href="' + esc(su) + '" target="_blank" rel="noopener noreferrer">' + nm + '</a>' : nm) + '</small>'; }
        return '<div class="stat"><b>' + esc(x.big) + '</b><div><p>' + TE(x.d) + '</p>' + src + '</div></div>';
      }).join('');
    },
    faq: function (el) { el.innerHTML = (D.faq || []).map(function (x) { return '<details><summary>' + TE(x.q) + '</summary><p>' + TE(x.a) + '</p></details>'; }).join(''); },
    focus: function (el) {
      var compact = el.getAttribute('data-mode') === 'compact';
      el.innerHTML = (D.focus || []).map(function (f, i) {
        var link = compact ? '<a class="go" href="our-work.html#' + esc(f.key) + '">' + TD('Learn more', 'और जानें') + ARROW + '</a>' : '<a class="go" href="donate.html#choose">' + TD('Give to this cause', 'इस कार्य हेतु सहयोग करें') + ARROW + '</a>';
        var lis = (f.helps || []).map(function (h) { return '<li>' + TE(h) + '</li>'; }).join('');
        return '<article class="pcard reveal" id="' + esc(f.key) + '"><div class="ph">' + IMG(f.photo, f.t.en, 700) + '<span class="num">' + pad(i + 1) + '</span></div><div class="pb"><h3>' + TE(f.t) + '</h3><p>' + TE(f.d) + '</p><ul>' + lis + '</ul>' + link + '</div></article>';
      }).join('');
    },
    ticker: function (el) {
      var one = (D.focus || []).map(function (f) { return '<div class="mqi">' + TE(f.t) + '</div>'; }).join('');
      el.innerHTML = [1, 2, 3, 4].map(function () { return '<div class="mqset">' + one + '</div>'; }).join('');
    },
    causes: function (el) { el.innerHTML = (D.causes || []).map(ccard).join(''); },
    causepick: function (el) {
      var cur = (el.querySelector('input:checked') || {}).value;
      el.innerHTML = (D.causes || []).map(cpick).join('') + '<label class="cp"><input type="radio" name="cause" value="general" data-amts="' + (S.chips || []).join(',') + '" data-en="General Fund - where it is needed most" data-hi="सामान्य कोष - जहाँ सबसे अधिक जरूरत हो"><span class="cpi"><span class="cpph cpg">' + ICON.heart + '</span><span class="cpt">' + TD('General Fund', 'सामान्य कोष') + '<small>' + TD('Where it is needed most', 'जहाँ सबसे अधिक जरूरत हो') + '</small></span></span></label>';
      if (cur) { var r = el.querySelector('input[value="' + cur + '"]'); if (r) r.checked = true; }
    },
    tiers: function (el) { el.innerHTML = (S.monthlyTiers || []).map(function (t) { return '<label class="tier"><input type="radio" name="tier" value="' + t.amount + '"><span class="tl"><b>₹' + inr(t.amount) + '</b><em>' + TE(t.t) + '</em></span></label>'; }).join(''); },
    hometiers: function (el) { el.innerHTML = (S.monthlyTiers || []).map(function (t) { return '<a href="donate.html?freq=monthly&amp;amt=' + t.amount + '">₹' + inr(t.amount) + '</a>'; }).join(''); },
    'drives-up': function (el) { drives(el, 'up'); },
    'drives-past': function (el) { drives(el, 'past'); },
    news: function (el) {
      var list = (D.news || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      var lim = +el.getAttribute('data-limit') || 0; if (lim) list = list.slice(0, lim);
      el.innerHTML = list.map(function (n) {
        var y = ymd(n.date), nu = safeUrl(n.url), link = nu ? '<a class="go" href="' + esc(nu) + '" target="_blank" rel="noopener noreferrer">' + TD('Read at the source', 'मूल लेख पढ़ें') + EXT + '</a>' : '';
        return '<article class="news-card reveal" data-cat="' + esc(n.cat) + '"><div class="ph">' + IMG(n.photo, n.t.en, 700) + '</div><div class="nb"><div class="meta"><span>' + TE(n.source) + '</span><span class="sep">·</span><span>' + TD(y[2] + ' ' + MON_EN[y[1]] + ' ' + y[0], y[2] + ' ' + MON_HI[y[1]] + ' ' + y[0]) + '</span></div><h3>' + TE(n.t) + '</h3><p>' + TE(n.d) + '</p>' + link + '</div></article>';
      }).join('');
    },
    newsfilter: function (el) {
      var chip = function (f, o, on) { return '<button class="fchip' + (on || '') + '" data-f="' + esc(f) + '">' + TE(o) + '</button>'; };
      el.innerHTML = chip('all', { en: 'All', hi: 'सभी' }, ' on') + (D.newsCats || []).map(function (c) { return chip(c.key, c.t); }).join('');
    },
    homechips: function (el) { el.innerHTML = S.homeChips.map(function (n) { return '<a href="donate.html?freq=once&amp;amt=' + n + '">₹' + inr(n) + '</a>'; }).join('') + '<a href="donate.html?freq=once">' + TD('Other', 'अन्य') + '</a>'; },
    social: function (el) {
      var so = S.social || {}, items = [['facebook', 'Facebook', ICON.fb], ['instagram', 'Instagram', ICON.ig], ['youtube', 'YouTube', ICON.yt]];
      el.innerHTML = items.filter(function (x) { return safeUrl(so[x[0]]); }).map(function (x) { return '<a href="' + esc(safeUrl(so[x[0]])) + '" target="_blank" rel="noopener noreferrer" aria-label="' + x[1] + '">' + x[2] + '</a>'; }).join('');
    }
  };
  var DEPS = { slides: ['slides'], how: ['how'], values: ['values'], team: ['team'], stats: ['stats'], faq: ['faq'], focus: ['focus'], ticker: ['focus'], causes: ['causes', 'settings'], causepick: ['causes', 'settings'], tiers: ['settings'], hometiers: ['settings'],
    'drives-up': ['drives', 'focus'], 'drives-past': ['drives', 'focus'], news: ['news'], newsfilter: ['newsCats'], homechips: ['settings'], social: ['settings'] };

  function drives(el, kind) {
    var t = today(), fb = {}; (D.focus || []).forEach(function (f) { fb[f.key] = f; });
    var list = (D.drives || []).filter(function (d) { return (d.date >= t) === (kind === 'up'); });
    list.sort(function (a, b) { var r = a.date < b.date ? -1 : a.date > b.date ? 1 : 0; return kind === 'past' ? -r : r; });
    var lim = +el.getAttribute('data-limit') || 0; if (lim) list = list.slice(0, lim);
    el.innerHTML = list.map(function (d) {
      var y = ymd(d.date), f = fb[d.tag], past = kind === 'past', res, when = '';
      var tag = f ? '<span class="tag">' + TE(f.tag) + '</span>' : '';
      if (past) res = has(d.result) ? '<div class="res">' + ICON.check + TE(d.result) + '</div>' : '';
      else { res = '<a class="go" href="contact.html">' + TD('Join as a volunteer', 'स्वयंसेवक बनें') + ARROW + '</a>'; if (has(d.time)) when = ' · ' + TE(d.time); }
      var where = (has(d.place) || when) ? '<div class="where">' + ICON.pin + '<span>' + TE(d.place) + when + '</span></div>' : '';
      return '<article class="dcard reveal"><div class="ph">' + IMG(d.photo, d.t.en, 700) + '<span class="date"><b>' + pad(y[2]) + '</b><small>' + TD(MON_EN[y[1]], MON_HI_S[y[1]]) + '</small></span>' + tag + '</div><div class="db">' + where + '<h3>' + TE(d.t) + '</h3><p>' + TE(d.d) + '</p>' + res + '</div></article>';
    }).join('') || (kind === 'up' ? '<p class="empty">' + TD('New drives will be announced here soon.', 'नए अभियानों की जानकारी जल्द यहाँ दी जाएगी।') + '</p>' : '<p class="empty">' + TD('Our completed drives will be listed here.', 'हमारे पूरे हुए अभियान यहाँ दिखेंगे।') + '</p>');
    if (el.hasAttribute('data-empty-hide')) { var sec = el.closest('section'); if (sec) sec.hidden = !list.length; }
  }

  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }

  // ---------- safe HTML for edited page texts (plain text + a few formatting tags)
  function sanitize(h) {
    var t = document.createElement('template'); t.innerHTML = h;
    (function walk(n) {
      [].slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 1) {
          var tn = c.nodeName.toLowerCase();
          if (['b', 'strong', 'i', 'em', 'br', 'span', 'a'].indexOf(tn) < 0) { while (c.firstChild) n.insertBefore(c.firstChild, c); n.removeChild(c); return; }
          [].slice.call(c.attributes).forEach(function (a) {
            var ok = (tn === 'span' && (a.name === 'class' && a.value === 'hl' || a.name === 'data-t')) || (tn === 'a' && (a.name === 'target' && a.value === '_blank' || a.name === 'href' && /^(https?:\/\/|mailto:|tel:|[a-z0-9_-]+\.html)/i.test(a.value)));
            if (!ok) c.removeAttribute(a.name);
          });
          if (tn === 'a') c.setAttribute('rel', 'noopener');
          walk(c);
        }
      });
    })(t.content);
    return t.innerHTML;
  }
  function tokVal(t, lang) {
    switch (t) {
      case 'monthly': return '₹' + inr(S.monthlyAmount);
      case 'minOnce': return '₹' + inr(S.minOnce);
      case 'maxAmount': return '₹' + inr(S.maxAmount);
      case 'phone': return S.phone; case 'email': return S.email; case 'reg': return S.regNo;
      case 'city': return (S.city || {})[lang] || '';
    }
    return '';
  }
  function fillTokens() { each('[data-t]', function (el) { el.textContent = tokVal(el.getAttribute('data-t'), el.closest('.hi') ? 'hi' : 'en'); }); }
  function applyTexts(texts) {
    Object.keys(texts || {}).forEach(function (k) {
      var o = texts[k];
      each('[data-k="' + k + '"]', function (el) {
        var lang = el.classList.contains('hi') ? 'hi' : 'en', v = o[lang] == null ? '' : o[lang];
        el.innerHTML = sanitize(v.replace(/\[\[(\w+)\]\]/g, '<span data-t="$1"></span>'));
        var p = el.parentElement;
        if (p && p.querySelectorAll(':scope > [data-k]').length === p.children.length && !(o.en || '').trim() && !(o.hi || '').trim()) p.hidden = true;
      });
    });
  }
  function applySettings() {
    C.regNo = S.regNo; C.phone = S.phone; C.email = S.email; C.whatsapp = (S.whatsapp.length === 10 ? '91' : '') + S.whatsapp;
    C.monthlyAmount = S.monthlyAmount; C.minOnce = S.minOnce; C.maxAmount = S.maxAmount;
    C.paymentsLive = !!S.paymentsLive; C.has80G = !!S.has80G; C.hasFCRA = !!S.hasFCRA;
    C.bank = S.bank || C.bank; C.monthlyTiers = S.monthlyTiers || C.monthlyTiers; C.social = S.social || C.social;
    C.president_en = (S.president || {}).en; C.president_hi = (S.president || {}).hi;
  }
  function applyLinks() {
    each('[data-link]', function (a) { var t = a.getAttribute('data-link'); a.href = t === 'tel' ? 'tel:' + S.phone : t === 'mail' ? 'mailto:' + S.email : 'https://wa.me/' + C.whatsapp; });
    each('[data-bi]', function (el) { el.innerHTML = TE(S[el.getAttribute('data-bi')]); });
    each('[data-map]', function (m) { var f = m.querySelector('iframe'); if (!S.mapEmbed) { m.hidden = true; } else if (f && f.getAttribute('src') !== S.mapEmbed) f.setAttribute('src', S.mapEmbed); });
  }

  function apply(j) {
    D = j.data; S = D.settings; ALT = j.alts || {}; window.BVKS_ONLINE = j.online || {}; var saved = j.saved || [];
    applySettings();
    Object.keys(R).forEach(function (k) {
      if (!(DEPS[k] || []).some(function (d) { return saved.indexOf(d) > -1; })) return;
      if (k === 'slides') return R.slides();
      each('[data-render=' + k + ']', function (el) { R[k](el); if (window.bvksReveal) window.bvksReveal(el); });
    });
    if (saved.indexOf('images') > -1) each('[data-img]', function (el) { var ref = (D.images || {})[el.getAttribute('data-img')]; if (ref) { el.src = photoUrl(ref, +el.getAttribute('data-w') || 900); el.alt = ALT[ref] || el.getAttribute('alt') || ''; el.style.display = ''; } });
    if (saved.indexOf('texts') > -1) applyTexts(D.texts);
    applyLinks(); fillTokens();
    if (window.bvksApplyLang) window.bvksApplyLang();
  }

  var p = window.__bvc || fetch('api/content.php', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  p.then(function (j) { if (j && j.custom && j.data) { try { apply(j); } catch (e) { if (window.console) console.error('content.js', e); } } done(); }, done);
})();
