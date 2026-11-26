/* Shared behaviour: language, nav, reveal, quick-donate, contact form */
(function () {
  var root = document.documentElement;
  var C = window.BVKS || {};
  function setLang(l) {
    root.setAttribute('data-lang', l); root.lang = l === 'hi' ? 'hi' : 'en';
    try { sessionStorage.setItem('bvks_lang', l); } catch (e) {}
    document.querySelectorAll('[data-ph-en]').forEach(function (el) { el.placeholder = el.getAttribute('data-ph-' + l) || el.getAttribute('data-ph-en'); });
    document.querySelectorAll('[data-title-en]').forEach(function (el) { el.title = el.getAttribute('data-title-' + l); });
    document.querySelectorAll('option[data-en]').forEach(function (o) { o.textContent = o.getAttribute('data-' + l) || o.getAttribute('data-en'); });
    var t = document.documentElement.getAttribute('data-t-' + l); if (t) document.title = t;
  }
  window.bvksApplyLang = function () { setLang(root.getAttribute('data-lang') || 'hi'); };
  var saved = 'hi'; try { saved = sessionStorage.getItem('bvks_lang') || 'hi'; } catch (e) {}   // opens in Hindi; the EN toggle sticks for this visit
  var q = new URLSearchParams(location.search).get('lang'); if (q === 'en' || q === 'hi') saved = q;
  setLang(saved);
  document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.set); }); });
  window.bvksLang = function () { return root.getAttribute('data-lang') || 'hi'; };
  window.bvksToast = function (en, hi) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = window.bvksLang() === 'hi' ? hi : en; t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 4200);
  };

  // mobile menu
  var burger = document.querySelector('.burger'), menu = document.querySelector('.menu');
  if (burger) {
    burger.addEventListener('click', function () { var o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.classList.remove('open'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu.classList.remove('open'); });
  }

  // reveal on scroll
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { threshold: .12 }) : null;
  window.bvksReveal = function (scope) { (scope || document).querySelectorAll('.reveal:not(.in)').forEach(function (e) { if (io) io.observe(e); else e.classList.add('in'); }); };
  window.bvksReveal();

  // image fallback (if a hotlinked photo ever fails)
  document.addEventListener('error', function (e) { var i = e.target; if (i && i.tagName === 'IMG' && i.hasAttribute('data-photo')) i.style.display = 'none'; }, true);

  // quick donate on home -> donate.html?amt=&freq=
  var quick = document.getElementById('quick');
  if (quick) {
    var amt = 500, freq = 'monthly', chipsRow = quick.querySelector('.amt-row'), fixedRow = quick.querySelector('.fixed-row');
    quick.querySelectorAll('.chip[data-amt]').forEach(function (c) {
      c.addEventListener('click', function () {
        quick.querySelectorAll('.chip[data-amt]').forEach(function (x) { x.classList.remove('on'); }); c.classList.add('on'); amt = c.dataset.amt; upd();
      });
    });
    quick.querySelectorAll('.chip[data-freq]').forEach(function (c) {
      c.addEventListener('click', function () {
        quick.querySelectorAll('.chip[data-freq]').forEach(function (x) { x.classList.remove('on'); }); c.classList.add('on'); freq = c.dataset.freq; upd();
      });
    });
    function upd() { chipsRow.style.display = freq === 'once' ? 'flex' : 'none'; fixedRow.style.display = freq === 'once' ? 'none' : 'block'; quick.querySelector('a.go').href = 'donate.html?freq=' + freq + (freq === 'once' ? '&amt=' + amt : ''); }
    upd();
  }

  // contact form
  var cf = document.getElementById('contactForm');
  if (cf) cf.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = Object.fromEntries(new FormData(cf).entries());
    var btn = cf.querySelector('button[type=submit]'); btn.disabled = true;
    fetch((C.apiBase || '/api') + '/contact' + (C.apiExt || ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { if (!r.ok) throw 0; cf.reset(); bvksToast('Thank you! We will reply soon.', 'धन्यवाद! हम शीघ्र उत्तर देंगे।'); })
      .catch(function () {
        var m = 'Hello, I am ' + d.name + ' (' + d.phone + '). ' + d.message;
        window.open('https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(m), '_blank', 'noopener,noreferrer');
        bvksToast('Opening WhatsApp to send your message.', 'आपका संदेश भेजने के लिए WhatsApp खुल रहा है।');
      }).finally(function () { btn.disabled = false; });
  });
})();

/* ===== v2 motion & widgets ===== */
(function () {
  var bar = document.createElement('div'); bar.className = 'progress-bar'; document.body.appendChild(bar);
  var top = document.createElement('button'); top.className = 'to-top'; top.setAttribute('aria-label', 'Back to top'); top.textContent = '↑'; document.body.appendChild(top);
  top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  var hdr = document.querySelector('.site-header');
  function onScroll() {
    var h = document.documentElement, y = h.scrollTop || document.body.scrollTop, m = h.scrollHeight - h.clientHeight;
    bar.style.width = (m > 0 ? y / m * 100 : 0) + '%'; top.classList.toggle('show', y > 700); if (hdr) hdr.classList.toggle('scrolled', y > 20);
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  // stagger siblings
  document.querySelectorAll('.grid, .stats, .gallery').forEach(function (g) { Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 6)); }); });
  // counters + progress bars
  function fmt(n) { return n.toLocaleString('en-IN'); }
  var seen = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
    en.forEach(function (x) {
      if (!x.isIntersecting) return; seen.unobserve(x.target); var el = x.target;
      if (el.dataset.count) {
        var end = +el.dataset.count, suf = el.dataset.suffix || '', t0 = null, reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
        (function step(t) { if (!t0) t0 = t; var p = reduce ? 1 : Math.min((t - t0) / 1600, 1); el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - p, 3)))) + suf; if (p < 1) requestAnimationFrame(step); })(performance.now());
      }
      if (el.dataset.fill) el.style.width = el.dataset.fill + '%';
    });
  }, { threshold: .4 }) : null;
  document.querySelectorAll('[data-count],[data-fill]').forEach(function (e) { if (seen) seen.observe(e); else { if (e.dataset.count) e.textContent = fmt(+e.dataset.count) + (e.dataset.suffix || ''); if (e.dataset.fill) e.style.width = e.dataset.fill + '%'; } });
  // tabs
  document.querySelectorAll('.tabs').forEach(function (t) {
    t.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      t.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      document.querySelectorAll('.tabpanel').forEach(function (p) { p.classList.toggle('on', p.id === b.dataset.tab); });
    });
  });
  // news filter
  var fc = document.querySelector('.filters');
  if (fc) fc.addEventListener('click', function (e) {
    var b = e.target.closest('.fchip'); if (!b) return;
    fc.querySelectorAll('.fchip').forEach(function (x) { x.classList.toggle('on', x === b); });
    document.querySelectorAll('.news-card[data-cat]').forEach(function (c) { c.classList.toggle('hide', b.dataset.f !== 'all' && c.dataset.cat !== b.dataset.f); });
  });
  // newsletter (demo)
  var sf = document.getElementById('subForm');
  if (sf) sf.addEventListener('submit', function (e) { e.preventDefault(); sf.reset(); bvksToast('Thank you for subscribing! (demo)', 'सदस्यता के लिए धन्यवाद! (डेमो)'); });
})();

/* ===== v6: hero carousel + palette preview ===== */
(function () {
  var car = document.getElementById('car');
  if (car) {
    var slides, dots, i = 0, t, DUR = 6000, reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    var grab = function () { slides = [].slice.call(car.querySelectorAll('.slide')); dots = [].slice.call(car.querySelectorAll('.dots button')); dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); }); }); };
    var go = function (n) {
      if (!slides.length) return;
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      dots.forEach(function (d, k) { d.classList.remove('on'); if (k === i) { void d.offsetWidth; d.classList.add('on'); } d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      clearTimeout(t); if (!reduce && !car.classList.contains('paused')) t = setTimeout(function () { go(i + 1); }, DUR);
    };
    var hold = function () { car.classList.add('paused'); clearTimeout(t); };
    var rel = function () { car.classList.remove('paused'); go(i); };
    car.addEventListener('mouseenter', hold); car.addEventListener('mouseleave', rel);
    car.addEventListener('focusin', hold); car.addEventListener('focusout', rel);
    car.querySelector('.pv').addEventListener('click', function () { go(i - 1); });
    car.querySelector('.nx').addEventListener('click', function () { go(i + 1); });
    var x0 = null;
    car.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    car.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1); x0 = null; });
    document.addEventListener('visibilitychange', function () { if (document.hidden) clearTimeout(t); else go(i); });
    car._reset = function () { clearTimeout(t); i = 0; grab(); go(0); };
    grab(); go(0);
  }

  var C = window.BVKS || {}, root = document.documentElement;
  var THEMES = [['saffron', 'Saffron & Ink', '#E8741E', '#1C1814'], ['forest', 'Forest & Marigold', '#F0A500', '#0F3A2D'], ['teal', 'Teal & Coral', '#F2705E', '#0B3C40'], ['plum', 'Plum & Gold', '#E3A02B', '#3A1B47'], ['clay', 'Clay & Sage', '#CC5A33', '#2F3A2E']];
  var cur = C.theme || 'saffron';
  if (C.showThemes) { var q = new URLSearchParams(location.search).get('theme'); try { cur = q || localStorage.getItem('bvks_theme') || cur; } catch (e) { cur = q || cur; } }
  var setTheme = function (n) { root.setAttribute('data-theme', n); if (C.showThemes) { try { localStorage.setItem('bvks_theme', n); } catch (e) {} } [].forEach.call(document.querySelectorAll('.themer button'), function (b) { b.classList.toggle('on', b.dataset.t === n); }); };
  if (C.showThemes) {
    var box = document.createElement('div'); box.className = 'themer'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Preview colour palette');
    box.innerHTML = '<b>Preview palette</b><div class="sw">' + THEMES.map(function (t) { return '<button type="button" data-t="' + t[0] + '" title="' + t[1] + '"><i style="--a:' + t[3] + ';--b:' + t[2] + '"></i>' + t[1].split(' ')[0] + '</button>'; }).join('') + '</div>';
    box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setTheme(b.dataset.t); });
    document.body.appendChild(box);
  }
  setTheme(cur);
  // certificate zoom lightbox
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-cert-zoom]');
    if (!btn) return;
    var modal = document.getElementById('certModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'certModal';
      modal.className = 'cert-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML = '<div class="cert-modal-box"><div class="cert-modal-bar"><b id="certModalTitle"></b><button type="button" class="cert-modal-close" aria-label="Close">×</button></div><img id="certModalImg" src="" alt=""></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', function (ev) { if (ev.target === modal || ev.target.closest('.cert-modal-close')) modal.classList.remove('open'); });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') modal.classList.remove('open'); });
    }
    var src = btn.getAttribute('data-cert-zoom'), title = btn.getAttribute('data-cert-title') || 'Government 80G Certificate (Form No. 10AC)';
    var img = document.getElementById('certModalImg'), ttl = document.getElementById('certModalTitle');
    img.src = src; img.alt = title; ttl.textContent = title;
    modal.classList.add('open');
  });
})();

/* ===== Homepage 3D Logo Intro ===== */
(function () {
  var intro = document.getElementById('bvksIntro');
  if (!intro || document.documentElement.classList.contains('no-intro')) return;
  var closed = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function closeIntro() {
    if (closed) return;
    closed = true;
    intro.classList.add('out');
    setTimeout(function () { intro.classList.add('gone'); }, 580);
  }
  var timer = setTimeout(closeIntro, reduce ? 750 : 2500);
  intro.addEventListener('click', function () { clearTimeout(timer); closeIntro(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { clearTimeout(timer); closeIntro(); } });
})();
