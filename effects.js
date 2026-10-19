/* ============================================================
   رحلة الرياضيات — effects.js
   Confetti، اهتزاز، رسائل، أصوات خفيفة
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var doc = global.document;

  var reduceMotion = false;
  try {
    reduceMotion = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { reduceMotion = false; }

  /* ---------------- Confetti ---------------- */
  var canvas = null, ctx = null, particles = [], rafId = null;

  function ensureCanvas() {
    if (!doc) return false;
    if (!canvas) {
      canvas = doc.getElementById('fx-canvas');
      if (!canvas) return false;
      ctx = canvas.getContext ? canvas.getContext('2d') : null;
    }
    if (!ctx) return false;
    canvas.width = global.innerWidth || 800;
    canvas.height = global.innerHeight || 600;
    return true;
  }

  var COLORS = ['#E8B23A', '#2FB79A', '#A79BFF', '#F27C5C', '#7FD8FF', '#FFE08A'];

  function confetti(amount) {
    if (reduceMotion) return;
    if (!ensureCanvas()) return;
    var n = amount || 90, i;
    for (i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 2.4,
        vy: 2 + Math.random() * 3.6,
        size: 4 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 140 + Math.random() * 90
      });
    }
    if (!rafId) loop();
  }

  function loop() {
    if (!ctx) { rafId = null; return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var alive = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.035; p.rot += p.vr; p.life--;
      if (p.life > 0 && p.y < canvas.height + 40) {
        alive.push(p);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 60));
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    }
    particles = alive;
    if (particles.length) {
      rafId = global.requestAnimationFrame ? global.requestAnimationFrame(loop) : null;
      if (!rafId) { particles = []; }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rafId = null;
    }
  }

  /* ---------------- اهتزاز ---------------- */
  function shake(el) {
    if (!el || reduceMotion) return;
    el.classList.remove('is-shaking');
    // إعادة تشغيل الأنيميشن
    void el.offsetWidth;
    el.classList.add('is-shaking');
    global.setTimeout(function () { el.classList.remove('is-shaking'); }, 500);
  }

  function pop(el) {
    if (!el || reduceMotion) return;
    el.classList.remove('is-popping');
    void el.offsetWidth;
    el.classList.add('is-popping');
    global.setTimeout(function () { el.classList.remove('is-popping'); }, 450);
  }

  /* ---------------- رسائل (toast) ---------------- */
  function toast(message, kind, ms) {
    if (!doc) return;
    var host = doc.getElementById('toast-host');
    if (!host) return;
    var el = doc.createElement('div');
    el.className = 'toast toast--' + (kind || 'info');
    el.setAttribute('role', 'status');
    el.textContent = message;
    host.appendChild(el);
    global.setTimeout(function () {
      el.classList.add('toast--out');
      global.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }, ms || 2600);
  }

  /* ---------------- أصوات خفيفة ---------------- */
  var audioCtx = null;
  function soundOn() {
    var s = MJ.Storage.getSettings();
    return s.sound !== false;
  }
  function beep(freq, duration, type, gainValue) {
    if (!soundOn()) return;
    try {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.value = gainValue === undefined ? 0.05 : gainValue;
      osc.connect(gain); gain.connect(audioCtx.destination);
      var t = audioCtx.currentTime;
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (duration || 0.15));
      osc.start(t); osc.stop(t + (duration || 0.15) + 0.02);
    } catch (e) { /* الصوت غير مدعوم */ }
  }

  var Sound = {
    correct: function () { beep(660, 0.12); global.setTimeout(function () { beep(880, 0.16); }, 110); },
    wrong: function () { beep(240, 0.22, 'triangle', 0.045); },
    click: function () { beep(520, 0.05, 'sine', 0.03); },
    stage: function () { beep(523, 0.12); global.setTimeout(function () { beep(659, 0.12); }, 120); global.setTimeout(function () { beep(784, 0.22); }, 240); },
    tick: function () { beep(400, 0.04, 'square', 0.02); }
  };

  MJ.Effects = {
    confetti: confetti,
    shake: shake,
    pop: pop,
    toast: toast,
    sound: Sound,
    reduceMotion: reduceMotion
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================
   رحلة الرياضيات — نوافذ التأكيد والإدخال (بديل confirm/prompt)
   بعض المتصفحات تحجب نوافذ المتصفح الأصلية (داخل iframe أو بعد
   تفعيل "منع هذه الصفحة من إنشاء نوافذ إضافية")، فتفشل عمليات
   الحذف والتعديل بصمت. هذه النوافذ تعمل في كل البيئات.
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var doc = global.document;
  var esc = function (s) { return MJ.Utils.escapeHtml(s); };
  var openDialog = null;

  function build(o) {
    var isPrompt = o.type === 'prompt';
    return '<div class="dlg-back">' +
      '<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlg-title">' +
        '<h3 class="dlg__title" id="dlg-title">' + esc(o.title || 'تأكيد') + '</h3>' +
        '<p class="dlg__msg">' + esc(o.message || '') + '</p>' +
        (isPrompt ? '<input class="dlg__input" id="dlg-input" type="text" value="' + esc(o.value || '') + '" />' : '') +
        '<div class="dlg__actions">' +
          '<button class="btn" type="button" id="dlg-cancel">' + esc(o.cancelText || 'إلغاء') + '</button>' +
          '<button class="btn ' + (o.danger ? 'btn--danger' : 'btn--primary') + '" type="button" id="dlg-ok">' +
            esc(o.okText || 'تأكيد') + '</button>' +
        '</div>' +
      '</div></div>';
  }

  function show(o) {
    return new global.Promise(function (resolve) {
      var host = doc && doc.getElementById('modal-host');
      if (!host) { resolve(o.type === 'prompt' ? null : false); return; }

      var lastFocus = doc.activeElement;
      host.innerHTML = build(o);
      host.hidden = false;
      openDialog = true;

      var input = doc.getElementById('dlg-input');
      var okBtn = doc.getElementById('dlg-ok');
      var cancelBtn = doc.getElementById('dlg-cancel');
      var back = host.querySelector('.dlg-back');

      function close(value) {
        doc.removeEventListener('keydown', onKey, true);
        host.innerHTML = '';
        host.hidden = true;
        openDialog = null;
        if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
        resolve(value);
      }
      function accept() { close(o.type === 'prompt' ? (input ? input.value : '') : true); }
      function cancel() { close(o.type === 'prompt' ? null : false); }
      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); cancel(); }
        else if (e.key === 'Enter' && (!input || doc.activeElement === input)) { e.preventDefault(); accept(); }
        else if (e.key === 'Tab') {                       // حصر التنقل داخل النافذة
          var f = [input, cancelBtn, okBtn].filter(Boolean);
          var i = f.indexOf(doc.activeElement);
          if (i === -1) { f[0].focus(); e.preventDefault(); return; }
          var n = e.shiftKey ? (i - 1 + f.length) % f.length : (i + 1) % f.length;
          f[n].focus(); e.preventDefault();
        }
      }

      okBtn.addEventListener('click', accept);
      cancelBtn.addEventListener('click', cancel);
      back.addEventListener('click', function (e) { if (e.target === back) cancel(); });
      doc.addEventListener('keydown', onKey, true);

      if (input) { input.focus(); input.select(); } else { okBtn.focus(); }
    });
  }

  MJ.UI = {
    isOpen: function () { return openDialog !== null; },
    confirm: function (o) {
      o = typeof o === 'string' ? { message: o } : (o || {});
      o.type = 'confirm';
      return show(o);
    },
    prompt: function (o) {
      o = typeof o === 'string' ? { message: o } : (o || {});
      o.type = 'prompt';
      o.okText = o.okText || 'حفظ';
      return show(o);
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
