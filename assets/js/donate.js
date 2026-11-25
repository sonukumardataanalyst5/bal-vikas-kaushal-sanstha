/* Donate page: cause choice, monthly plans, one-time amount ladder, validation, Razorpay checkout (one-time + monthly UPI AutoPay),
   direct UPI (QR + app link) and demo mode. Cause, plan and amount lists are read from the page itself (built from the admin's content). */
(window.bvksReady || Promise.resolve()).then(function () {
  var C = window.BVKS, $ = function (s) { return document.querySelector(s); };
  var form = $('#donateForm'); if (!form) return;
  var MINONCE = C.minOnce || 1, MAXAMT = C.maxAmount || 100000;
  var qp = new URLSearchParams(location.search), esc = function (x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  function L() { return window.bvksLang(); }

  var CAUSES = {}, FIRST = 'general';
  [].forEach.call(form.querySelectorAll('input[name=cause]'), function (r, i) {
    CAUSES[r.value] = { en: r.getAttribute('data-en'), hi: r.getAttribute('data-hi'), amts: (r.getAttribute('data-amts') || '').split(',').map(Number).filter(function (n) { return n > 0; }) };
    if (i === 0) FIRST = r.value;
  });
  var TIERS = [].map.call(form.querySelectorAll('input[name=tier]'), function (r) { return +r.value; });
  var state = { freq: 'once', cause: '', amt: 0 };
  var lastOnce = 0;

  // starting point from the link (home cards link here with ?cause=&freq=&amt=)
  if (qp.get('freq') === 'once' || qp.get('freq') === 'monthly') state.freq = qp.get('freq');
  if (CAUSES[qp.get('cause')]) state.cause = qp.get('cause');
  else if (location.hash !== '#choose' && CAUSES.general) state.cause = 'general';   // simplest path: start on "where it is needed most"; the donor can tap Change
  var qa = parseInt(qp.get('amt'), 10);
  if (state.freq === 'monthly') state.amt = TIERS.indexOf(qa) > -1 ? qa : (TIERS[0] || C.monthlyAmount || 100);
  else { lastOnce = qa >= MINONCE && qa <= MAXAMT ? qa : 0; state.amt = lastOnce || 0; }

  var chipBox = $('#amtChips'), custom = $('#customAmt');
  function ladder() { return (CAUSES[state.cause] || CAUSES.general || { amts: [] }).amts; }
  var grid = $('#causeGrid'), done = $('#causeDone');
  function showCause(collapse) {
    var r = form.querySelector('input[name=cause][value="' + state.cause + '"]');
    if (collapse && r) { $('#cdName').innerHTML = r.parentNode.querySelector('.cpi').innerHTML; done.style.display = 'flex'; grid.style.display = 'none'; } else { done.style.display = 'none'; grid.style.display = ''; }
  }

  function drawChips() {
    chipBox.innerHTML = ladder().map(function (n) { return '<button type="button" class="chip" data-amt="' + n + '">' + fmt(n) + '</button>'; }).join('');
    [].forEach.call(chipBox.querySelectorAll('.chip'), function (c) { c.addEventListener('click', function () { state.amt = lastOnce = +c.dataset.amt; custom.value = ''; sync(); }); });
  }

  /* ---------- UPI (direct): link + QR drawn in the browser; nothing is sent anywhere until the donor taps "I have paid" ---------- */
  var upiId = (C.bank && C.bank.upi) || '', sample = false;
  if (!upiId && !C.paymentsLive) { upiId = 'sample@invalid'; sample = true; }
  function upiLink() {
    var q = function (x) { return encodeURIComponent(x); };
    return 'upi://pay?pa=' + q(upiId) + '&pn=' + q((C.bank && C.bank.upiName) || C.name_en) + (state.amt > 0 ? '&am=' + Number(state.amt).toFixed(2) : '') + '&cu=INR&tn=' + q('Donation ' + state.cause);
  }
  function drawQr(text) {
    var box = $('#upiQr'); if (!window.qrcode) { box.textContent = ''; return; }
    var q = window.qrcode(0, 'H'); q.addData(text); q.make();
    var n = q.getModuleCount(), m = 3, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
    var s = n + m * 2, cx = s / 2, rOuter = +(s * 0.115).toFixed(2), rInner = +(s * 0.092).toFixed(2), fs = +(s * 0.115).toFixed(2), ty = +(cx + s * 0.04).toFixed(2);
    var badge = sample ? '' : '<circle cx="' + cx + '" cy="' + cx + '" r="' + rOuter + '" fill="#fff"/><circle cx="' + cx + '" cy="' + cx + '" r="' + rInner + '" fill="#5f259f"/><text x="' + cx + '" y="' + ty + '" text-anchor="middle" fill="#fff" font-size="' + fs + '" font-weight="700" font-family="sans-serif">पे</text>';
    box.innerHTML = '<svg viewBox="0 0 ' + s + ' ' + s + '" shape-rendering="crispEdges" aria-hidden="true"><rect width="' + s + '" height="' + s + '" fill="#fff"/><path d="' + d + '" fill="#111827"/>' + badge + '</svg>' + (sample ? '<span class="qr-sample">SAMPLE</span>' : '');
    box.setAttribute('data-upi', text);
  }
  function syncUpi() {
    var box = $('#upiBox'), show = state.freq === 'once' && !!upiId && (!!(C.bank && C.bank.upi) || sample);
    box.style.display = show ? 'block' : 'none';
    var hideDemoMain = !C.paymentsLive && show && !sample;
    if ($('#payBtn')) $('#payBtn').style.display = hideDemoMain ? 'none' : '';
    if ($('#secureRow')) $('#secureRow').style.display = hideDemoMain ? 'none' : '';
    if (!show) return;
    $('#upiId').textContent = sample ? 'yourtrust@bank' : upiId; $('#upiSample').style.display = sample ? 'block' : 'none';
    var ppRow = $('#phonepeRow'), ppNo = (C.bank && C.bank.phonepe) || '';
    if (ppRow) { ppRow.style.display = (!sample && ppNo) ? '' : 'none'; if (ppNo) $('#phonepeNo').textContent = ppNo; }
    if ($('#qrVpa')) $('#qrVpa').textContent = sample ? 'yourtrust@bank' : upiId;
    if ($('#qrAmtPill')) $('#qrAmtPill').textContent = state.amt > 0 ? fmt(state.amt) + (L() === 'hi' ? ' · UPI से दें' : ' · Pay via UPI') : (L() === 'hi' ? 'कोई भी राशि · UPI' : 'Any Amount · UPI');
    var amtValid = state.amt >= MINONCE && state.amt <= MAXAMT, canQr = !sample && (state.amt === 0 || amtValid), link = upiLink(), a = $('#upiApp'), pp = $('#phonepeApp');
    var ppLink = link.replace(/^upi:\/\//, 'phonepe://');
    box.classList.toggle('noamt', !canQr);
    if (canQr) drawQr(link); else $('#upiQr').innerHTML = '<span class="qr-wait">' + (L() === 'hi' ? 'सही राशि चुनें' : 'Enter a valid amount') + '</span>';
    a.href = !canQr ? '#' : link; a.setAttribute('aria-disabled', !canQr ? 'true' : 'false');
    if (pp) {
      pp.href = !canQr ? '#' : ppLink; pp.setAttribute('aria-disabled', !canQr ? 'true' : 'false');
      if ($('#ppBtnEn')) $('#ppBtnEn').textContent = state.amt > 0 ? 'Pay ' + fmt(state.amt) + ' via PhonePe App' : 'Open PhonePe App';
      if ($('#ppBtnHi')) $('#ppBtnHi').textContent = state.amt > 0 ? 'PhonePe ऐप से ' + fmt(state.amt) + ' दें' : 'PhonePe ऐप खोलें';
    }
  }

  function altSync() {   // show the "UPI QR / bank transfer" fold only when it has something to show
    var a = $('#altPay'), bk = document.querySelector('.bank'); if (!a) return;
    var any = ($('#upiBox').style.display !== 'none') || (bk && bk.style.display !== 'none'); a.style.display = any ? '' : 'none';
  }
  window.bvksAltSync = altSync;
  function sync() {
    var once = state.freq === 'once';
    form.querySelectorAll('input[name=freq]').forEach(function (r) { r.checked = r.value === state.freq; });
    form.querySelectorAll('input[name=cause]').forEach(function (r) { r.checked = r.value === state.cause; });
    $('#amtBlock').style.display = once ? 'block' : 'none'; $('#fixedBlock').style.display = once ? 'none' : 'block';
    if (!once && TIERS.indexOf(state.amt) < 0) state.amt = TIERS[0] || state.amt;
    form.querySelectorAll('input[name=tier]').forEach(function (r) { r.checked = once ? false : +r.value === state.amt; });
    if (once) {
      drawChips(); var preset = false;
      chipBox.querySelectorAll('.chip').forEach(function (c) { var on = +c.dataset.amt === state.amt; c.classList.toggle('on', on); if (on) preset = true; });
      if (!preset && state.amt > 0) custom.value = state.amt; else if (document.activeElement !== custom) custom.value = '';
    }
    $('#sFreq').innerHTML = once ? '<span class="en">One-time</span><span class="hi">एक बार</span>' : '<span class="en">Monthly</span><span class="hi">मासिक</span>';
    var c = CAUSES[state.cause];
    $('#sCause').innerHTML = c ? '<span class="en">' + esc(c.en) + '</span><span class="hi">' + esc(c.hi) + '</span>' : '—';
    $('#sAmt').textContent = state.amt > 0 ? fmt(state.amt) + (once ? '' : ' / ' + (L() === 'hi' ? 'माह' : 'mo')) : '—';
    var has = state.amt > 0;
    $('#payBtnEn').textContent = !has ? 'Choose an amount' : once ? 'Donate ' + fmt(state.amt) + ' now' : 'Start my monthly donation · ' + fmt(state.amt);
    $('#payBtnHi').textContent = !has ? 'राशि चुनें' : once ? fmt(state.amt) + ' का सहयोग करें' : 'मासिक सहयोग शुरू करें · ' + fmt(state.amt);
    $('#monthlyNote').style.display = once ? 'none' : 'block';
    syncUpi(); altSync();
  }

  form.querySelectorAll('input[name=freq]').forEach(function (r) { r.addEventListener('change', function () {
    state.freq = r.value; if (r.value === 'once') state.amt = lastOnce; else state.amt = TIERS.indexOf(state.amt) > -1 ? state.amt : (TIERS[0] || state.amt); sync(); }); });
  form.querySelectorAll('input[name=cause]').forEach(function (r) { r.addEventListener('change', function () { state.cause = r.value; $('#causeErr').style.display = 'none'; sync(); showCause(true); var s2 = $('#step2'); if (s2 && s2.scrollIntoView) s2.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
  $('#causeChange').addEventListener('click', function () { showCause(false); grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  form.querySelectorAll('input[name=tier]').forEach(function (r) { r.addEventListener('change', function () { state.amt = +r.value; sync(); }); });
  custom.addEventListener('input', function () { var v = parseInt(custom.value, 10); state.amt = lastOnce = v > 0 ? v : 0; chipBox.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', +c.dataset.amt === state.amt); }); sync(); });
  function copyBtn(btn, val) {
    if (!btn || !val) return;
    var done = function () { var o = btn.innerHTML; btn.innerHTML = '✓'; setTimeout(function () { btn.innerHTML = o; }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(val).then(done, function () {}); else { var t = document.createElement('textarea'); t.value = val; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) {} t.remove(); }
  }
  $('#upiCopy').addEventListener('click', function () { if (!sample) copyBtn(this, upiId); });
  if ($('#phonepeCopy')) $('#phonepeCopy').addEventListener('click', function () { copyBtn(this, (C.bank && C.bank.phonepe) || ''); });
  [$('#upiApp'), $('#phonepeApp')].forEach(function (el) {
    if (!el) return;
    el.addEventListener('click', function (e) {
      if (this.getAttribute('aria-disabled') === 'true') {
        e.preventDefault();
        return bvksToast(sample ? 'Preview only: the real UPI ID is not added yet.' : 'Please enter a valid amount.', sample ? 'केवल प्रीव्यू: असली UPI आईडी अभी जोड़ी नहीं गई है।' : 'कृपया सही राशि चुनें।');
      }
      if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
        e.preventDefault();
        bvksToast('Direct UPI app works on mobile phones — please scan the QR code using PhonePe / GPay.', 'सीधा UPI ऐप मोबाइल पर खुलता है — लैपटॉप/डेस्कटॉप से PhonePe / GPay से QR कोड स्कैन करें।');
      }
    });
  });
  sync(); showCause(!!state.cause);
  document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', function () { setTimeout(sync, 0); }); });
  if (location.hash === '#choose') { var ch = $('#choose'); if (ch) ch.scrollIntoView(); }

  function err(el, on) { el.classList.toggle('err', on); var m = el.parentNode.querySelector('.errmsg'); if (m) m.style.display = on ? 'block' : 'none'; return !on; }
  function validate() {
    var ok = true, em = form.email.value.trim();
    var cOk = !!CAUSES[state.cause]; $('#causeErr').style.display = cOk ? 'none' : 'block'; ok = cOk && ok;
    ok = err(form.name, form.name.value.trim().length < 2) && ok;
    ok = err(form.phone, !/^[6-9]\d{9}$/.test(form.phone.value.replace(/\D/g, '').slice(-10))) && ok;
    var emBad = em !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em); if (emBad) $('#moreOpt').open = true;
    ok = err(form.email, emBad) && ok;
    var amtOk = state.freq === 'monthly' ? TIERS.indexOf(state.amt) > -1 : (state.amt >= MINONCE && state.amt <= MAXAMT);
    if (state.freq === 'once') { custom.classList.toggle('err', !amtOk); $('#amtErr').style.display = amtOk ? 'none' : 'block'; }
    ok = amtOk && ok;
    var c = form.consent.checked; $('#consentErr').style.display = c ? 'none' : 'block'; ok = c && ok;
    return ok;
  }
  function who() { return { name: form.name.value.trim(), email: form.email.value.trim(), phone: form.phone.value.replace(/\D/g, '').slice(-10), pan: (form.pan && form.pan.value.trim().toUpperCase()) || '' }; }

  function finish(extra) {
    var c = CAUSES[state.cause] || CAUSES.general || { en: '', hi: '' }, r = Object.assign(who(), { amount: state.amt, freq: state.freq, cause: state.cause, causeEn: c.en, causeHi: c.hi, date: new Date().toISOString() }, extra);
    try { sessionStorage.setItem('bvks_receipt', JSON.stringify(r)); } catch (e) {}
    location.href = 'thank-you.html';
  }
  function api(path, body) {
    return fetch(C.apiBase + path + (C.apiExt || ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Server error'); return j; }); });
  }
  function loadRzp() {
    return new Promise(function (res, rej) {
      if (window.Razorpay) return res();
      var s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = function () { rej(new Error('Could not load Razorpay')); }; document.head.appendChild(s);
    });
  }

  // direct UPI: the donor paid in their own UPI app and tells us; we only note it (the trust matches it with the bank statement)
  $('#upiPaid').addEventListener('click', function () {
    if (!validate()) { var f = form.querySelector('.err'); if (f) f.focus(); else $('#choose').scrollIntoView({ behavior: 'smooth' }); return; }
    var btn = this; btn.disabled = true;
    var go = function () { finish({ upi: true, paymentId: '' }); };
    if (!C.paymentsLive) return setTimeout(go, 300);
    api('/upi-note', Object.assign(who(), { amount: state.amt, cause: state.cause })).then(go, go);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault(); if (!validate()) { var f = form.querySelector('.err'); if (f) f.focus(); else $('#choose').scrollIntoView({ behavior: 'smooth' }); return; }
    var btn = $('#payBtn'); btn.disabled = true;
    if (!C.paymentsLive) { // DEMO MODE
      return setTimeout(function () { finish({ demo: true, paymentId: 'demo_' + Date.now().toString(36) }); }, 500);
    }
    var w = who(), body = Object.assign({ amount: state.amt, freq: state.freq, cause: state.cause }, w), cs = CAUSES[state.cause] || CAUSES.general;
    Promise.all([loadRzp(), api(state.freq === 'monthly' ? '/create-subscription' : '/create-order', body)]).then(function (x) {
      var d = x[1];
      var opt = {
        key: d.key || C.razorpayKeyId, name: C.name_en, description: (state.freq === 'monthly' ? 'Monthly support – ' : 'Donation – ') + cs.en,
        image: location.origin + '/assets/img/logo.svg', prefill: { name: w.name, email: w.email, contact: w.phone },
        notes: { cause: state.cause }, theme: { color: '#1f6fd6' },
        modal: { ondismiss: function () { btn.disabled = false; } },
        handler: function (resp) {
          api('/verify', Object.assign({}, resp, { freq: state.freq, amount: state.amt, name: w.name, email: w.email, phone: w.phone, cause: state.cause }))
            .then(function (v) { finish({ demo: false, paymentId: resp.razorpay_payment_id, receiptNo: v.receiptNo, subscriptionId: resp.razorpay_subscription_id || '' }); })
            .catch(function () { finish({ demo: false, paymentId: resp.razorpay_payment_id, unverified: true }); });
        }
      };
      if (state.freq === 'monthly') opt.subscription_id = d.subscriptionId; else { opt.order_id = d.orderId; opt.amount = state.amt * 100; opt.currency = 'INR'; }
      var rz = new Razorpay(opt);
      rz.on('payment.failed', function (r) { bvksToast('Payment failed: ' + (r.error && r.error.description || 'please try again'), 'भुगतान विफल रहा, कृपया पुनः प्रयास करें।'); btn.disabled = false; });
      rz.open();
    }).catch(function (er) { bvksToast(er.message, 'कुछ गड़बड़ हुई, कृपया पुनः प्रयास करें।'); btn.disabled = false; });
  });
});
