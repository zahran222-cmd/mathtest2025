/* ============================================================
   رحلة الرياضيات — app.js
   نقطة البداية: التنقل بين الشاشات وربط كل الواجهات
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var U = MJ.Utils, S = MJ.Storage, FX = MJ.Effects, ST = MJ.Students;
  var doc = global.document;

  function $(id) { return doc.getElementById(id); }

  var SCREENS = ['home', 'teacher-login', 'teacher', 'student-login', 'map', 'game', 'stage-done', 'results', 'send', 'review'];
  var current = 'home';
  var pendingStudent = null;
  var pendingMatches = null;

  var App = {
    show: function (name) {
      if (SCREENS.indexOf(name) === -1) name = 'home';
      current = name;
      SCREENS.forEach(function (s) {
        var elx = $('screen-' + s);
        if (elx) elx.classList.toggle('is-hidden', s !== name);
      });
      doc.body.classList.toggle('is-teacher', name === 'teacher' || name === 'teacher-login');
      doc.body.classList.toggle('is-playing', name === 'game' || name === 'map' || name === 'stage-done');
      var main = $('app');
      if (main) main.scrollTop = 0;
      if (global.scrollTo) global.scrollTo(0, 0);
      var head = doc.querySelector('#screen-' + name + ' h1, #screen-' + name + ' h2');
      if (head && head.focus) { head.setAttribute('tabindex', '-1'); head.focus({ preventScroll: true }); }
    },
    current: function () { return current; }
  };
  MJ.App = App;

  /* ---------------- خلفية الصفحة الرئيسية ---------------- */
  function buildBackdrop() {
    var host = $('backdrop');
    if (!host) return;
    var glyphs = ['45°', '90°', '120°', '180°', '∠', '△', '📐', '✦', '30°', '★', '∠', '60°', '⌾', '150°'];
    var html = '';
    for (var i = 0; i < glyphs.length; i++) {
      var left = Math.round((i / glyphs.length) * 92 + Math.random() * 6);
      var delay = (Math.random() * 12).toFixed(1);
      var dur = (16 + Math.random() * 14).toFixed(1);
      var size = (0.8 + Math.random() * 1.3).toFixed(2);
      html += '<span class="glyph" style="right:' + left + '%;animation-delay:-' + delay + 's;animation-duration:' + dur + 's;font-size:' + size + 'rem">' + glyphs[i] + '</span>';
    }
    host.innerHTML = html;
  }

  /* ---------------- الصفحة الرئيسية ---------------- */
  function bindHome() {
    $('go-teacher').addEventListener('click', function () {
      FX.sound.click();
      $('teacher-msg').textContent = '';
      $('teacher-msg').className = 'inline-msg';
      $('teacher-user').value = '';
      $('teacher-pass').value = '';
      App.show('teacher-login');
      showLoginPane('login');
    });
    $('go-student').addEventListener('click', function () {
      FX.sound.click();
      resetStudentLogin();
      App.show('student-login');
      $('student-name').focus();
    });
    var demo = $('hero-angle');
    if (demo) {
      var degrees = [45, 90, 120, 180, 60, 135], idx = 0;
      function paint() {
        demo.innerHTML = MJ.Angles.generateAngle(degrees[idx], 20, 200, { showMeasure: true });
        var cap = $('hero-caption');
        if (cap) cap.textContent = MJ.Angles.typeFull(degrees[idx]) + ' · ' + degrees[idx] + '°';
        idx = (idx + 1) % degrees.length;
      }
      paint();
      global.setInterval(paint, 2600);
    }
  }

  /* ---------------- دخول المعلم ---------------- */
  function paintAccountsHint() {
    var hint = $('accounts-hint');
    if (!hint) return;
    var list = MJ.Auth.accounts();
    hint.textContent = list.length
      ? 'الحسابات على هذا الجهاز: ' + list.map(function (a) { return a.displayName; }).join(' · ')
      : '';
  }

  function showLoginPane(which) {
    $('login-pane').hidden = which !== 'login';
    $('register-pane').hidden = which !== 'register';
    if (which === 'login') { paintAccountsHint(); $('teacher-user').focus(); }
    else { $('reg-name').focus(); }
  }

  function bindTeacherLogin() {
    function attempt() {
      var r = MJ.Auth.login($('teacher-user').value, $('teacher-pass').value);
      var msg = $('teacher-msg');
      if (r.ok) {
        msg.className = 'inline-msg inline-msg--ok';
        msg.textContent = '✅ ' + r.message;
        FX.sound.correct();
        MJ.Teacher.open('overview');
      } else {
        msg.className = 'inline-msg inline-msg--bad';
        msg.textContent = '⚠️ ' + r.message;
        FX.sound.wrong();
        FX.shake($('teacher-login-card'));
      }
    }

    $('show-register').addEventListener('click', function () {
      ['reg-name', 'reg-user', 'reg-pass', 'reg-pass2'].forEach(function (id) { $(id).value = ''; });
      $('register-msg').textContent = '';
      $('register-msg').className = 'inline-msg';
      showLoginPane('register');
    });
    $('show-login').addEventListener('click', function () { showLoginPane('login'); });

    $('register-btn').addEventListener('click', function () {
      var r = MJ.Auth.register({
        displayName: $('reg-name').value,
        username: $('reg-user').value,
        password: $('reg-pass').value,
        confirm: $('reg-pass2').value
      });
      var msg = $('register-msg');
      msg.className = 'inline-msg ' + (r.ok ? 'inline-msg--ok' : 'inline-msg--bad');
      msg.textContent = (r.ok ? '✅ ' : '⚠️ ') + r.message;
      if (!r.ok) { FX.shake($('teacher-login-card')); return; }
      FX.toast('تم إنشاء حساب ' + r.teacher.displayName + ' برقم ' + r.teacher.number + '.', 'ok');
      MJ.UI.confirm({
        title: 'تم إنشاء الحساب',
        message: 'رقم المعلم الخاص بك هو ' + r.teacher.number + '. احتفظ به، ويمكنك الدخول به أو باسم المستخدم ' + r.teacher.username + '.',
        okText: 'الدخول الآن', cancelText: 'لاحقًا'
      }).then(function (go) {
        showLoginPane('login');
        $('teacher-user').value = r.teacher.username;
        $('teacher-pass').value = '';
        if (go) $('teacher-pass').focus();
      });
    });

    $('teacher-login-btn').addEventListener('click', attempt);
    $('teacher-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(); });
    $('teacher-user').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('teacher-pass').focus(); });
    $('teacher-back').addEventListener('click', function () { App.show('home'); });
    $('teacher-logout').addEventListener('click', function () {
      MJ.Auth.logout();
      MJ.Teacher.closeModal();
      FX.toast('تم تسجيل الخروج.', 'info');
      App.show('home');
    });
  }

  /* ---------------- دخول الطالب ---------------- */
  function resetStudentLogin() {
    pendingStudent = null;
    pendingMatches = null;
    $('student-name').value = '';
    $('student-name').disabled = false;
    $('student-msg').textContent = '';
    $('student-msg').className = 'inline-msg';
    $('student-welcome').hidden = true;
    $('student-check').hidden = false;
    $('teacher-picker').hidden = true;
    $('student-teacher').innerHTML = '';
  }


  /* ---------------- الانضمام إلى صف عبر رابط أو كود ---------------- */
  function joinClass(code, quiet) {
    var msg = $('join-msg');
    try {
      var info = MJ.Share.applyClass(MJ.Share.decodeClass(code));
      if (msg) {
        msg.className = 'inline-msg inline-msg--ok';
        msg.textContent = '✅ انضممت إلى صف ' + info.teacherName + ' (' + info.count + ' طالبًا). اكتب اسمك للبدء.';
      }
      var box = $('joinbox');
      if (box) box.open = false;
      FX.toast('تم تحميل صف ' + info.teacherName + '. اكتب اسمك للبدء.', 'ok');
      $('student-name').focus();
      return true;
    } catch (e) {
      if (!quiet && msg) {
        msg.className = 'inline-msg inline-msg--bad';
        msg.textContent = '⚠️ ' + e.message;
      }
      if (!quiet) FX.toast('كود الصف غير صالح.', 'warn');
      return false;
    }
  }

  /* رابط الصف السحابي: .../index.html#c=<مفتاح>&s=<عنوان الخادم> */
  function readCloudLink() {
    var loc = global.location;
    if (!loc || !loc.hash) return false;
    var key = /[#&]c=([^&]+)/.exec(loc.hash);
    var srv = /[#&]s=([^&]+)/.exec(loc.hash);
    if (!key || !srv) return false;

    var msg = $('student-msg');
    resetStudentLogin();
    App.show('student-login');
    msg.className = 'inline-msg';
    msg.textContent = 'جارٍ تحميل قائمة صفّك…';

    MJ.Sync.joinFromServer(decodeURIComponent(key[1]), decodeURIComponent(srv[1]))
      .then(function (info) {
        msg.className = 'inline-msg inline-msg--ok';
        msg.textContent = 'أهلًا بك في صف ' + info.teacherName + '! اكتب اسمك للبدء.';
        FX.toast('تم تحميل قائمة الصف (' + info.count + ' طالبًا).', 'ok');
        MJ.Sync.flushOutbox();
        $('student-name').focus();
      })
      .catch(function (e) {
        msg.className = 'inline-msg inline-msg--bad';
        msg.textContent = '⚠️ ' + e.message + ' يمكنك استخدام كود الصف بدلًا من الرابط.';
      });

    try { global.history.replaceState(null, '', loc.pathname + loc.search); }
    catch (e) { loc.hash = ''; }
    return true;
  }

  /* رابط مثل: .../index.html#class=MJC1.... */
  function readClassFromLink() {
    if (readCloudLink()) return true;
    var loc = global.location;
    if (!loc || !loc.hash) return false;
    var m = /[#&]class=([^&]+)/.exec(loc.hash);
    if (!m) return false;
    var ok = false;
    try { ok = joinClass(decodeURIComponent(m[1]), true); } catch (e) { ok = false; }
    try { global.history.replaceState(null, '', loc.pathname + loc.search); }
    catch (e) { loc.hash = ''; }
    if (ok) {
      resetStudentLogin();
      App.show('student-login');
      var msg = $('student-msg');
      msg.className = 'inline-msg inline-msg--ok';
      msg.textContent = 'أهلًا بك! اكتب اسمك كما سجّله معلمك.';
    } else {
      FX.toast('رابط الصف غير صالح أو منتهٍ. اطلب من معلمك رابطًا جديدًا.', 'warn');
    }
    return ok;
  }

  function bindStudentLogin() {
    function accept(match) {
      pendingStudent = match.student;
      var msg = $('student-msg');
      msg.textContent = '';
      msg.className = 'inline-msg';
      $('student-name').disabled = true;      // منع تغيير الاسم أثناء المحاولة
      $('student-check').hidden = true;
      $('teacher-picker').hidden = true;
      var w = $('student-welcome');
      w.hidden = false;
      w.querySelector('.welcome__text').textContent = 'مرحبًا بك يا ' + match.student.name + '! ' +
        (match.teacher ? 'صفّك مع ' + match.teacher.displayName + '. ' : '') + 'هل أنت مستعد للمغامرة؟';
      FX.sound.correct();
      $('start-journey').focus();
    }

    function check() {
      var name = $('student-name').value;
      var msg = $('student-msg');
      if (!String(name).trim()) {
        msg.className = 'inline-msg inline-msg--bad';
        msg.textContent = '⚠️ اكتب اسمك أولًا.';
        return;
      }

      var matches = ST.findMatches(name);
      if (!matches.length) {
        msg.className = 'inline-msg inline-msg--bad';
        msg.textContent = '⚠️ عذرًا، هذا الاسم غير مسجل. يرجى مراجعة المعلم.';
        FX.sound.wrong();
        FX.shake($('student-login-card'));
        return;
      }

      if (matches.length === 1) { accept(matches[0]); return; }

      // الاسم نفسه مسجّل لدى أكثر من معلم: يختار الطالب صفّه
      var picker = $('teacher-picker'), sel = $('student-teacher');
      sel.innerHTML = matches.map(function (m, i) {
        var label = m.teacher ? m.teacher.displayName + ' (رقم ' + m.teacher.number + ')' : 'معلم غير معروف';
        return '<option value="' + i + '">' + U.escapeHtml(label) + '</option>';
      }).join('');
      picker.hidden = false;
      msg.className = 'inline-msg';
      msg.textContent = 'اختر معلمك ثم اضغط تحقق من الاسم.';
      pendingMatches = matches;
      sel.focus();

      if (pendingMatches && !picker.dataset.bound) {
        picker.dataset.bound = '1';
      }
    }

    $('join-class').addEventListener('click', function () { joinClass($('class-join-code').value, false); });

    $('student-check').addEventListener('click', function () {
      if (pendingMatches && !$('teacher-picker').hidden) {
        var i = parseInt($('student-teacher').value, 10) || 0;
        var m = pendingMatches[i];
        pendingMatches = null;
        if (m) { accept(m); return; }
      }
      check();
    });
    $('student-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
    $('student-back').addEventListener('click', function () { resetStudentLogin(); App.show('home'); });
    $('change-name').addEventListener('click', function () { resetStudentLogin(); $('student-name').focus(); });

    $('start-journey').addEventListener('click', function () {
      if (!pendingStudent) return;
      FX.sound.stage();
      MJ.Game.start(pendingStudent);
    });
  }

  /* ---------------- أزرار عامة ---------------- */
  function bindGlobal() {
    // زر الصوت
    var sb = $('sound-toggle');
    function paintSound() {
      var on = S.getSettings().sound !== false;
      sb.textContent = on ? '🔊' : '🔇';
      sb.setAttribute('aria-pressed', on ? 'true' : 'false');
      sb.title = on ? 'إيقاف الصوت' : 'تشغيل الصوت';
    }
    sb.addEventListener('click', function () {
      var s = S.getSettings();
      s.sound = !(s.sound !== false);
      S.setSettings(s);
      paintSound();
      if (s.sound) FX.sound.click();
      FX.toast(s.sound ? 'الصوت مفعّل.' : 'الصوت متوقف.', 'info');
    });
    paintSound();

    // الخروج من الرحلة
    Array.prototype.forEach.call(doc.querySelectorAll('[data-quit]'), function (b) {
      b.addEventListener('click', function () {
        MJ.UI.confirm({
          title: 'إنهاء الرحلة',
          message: 'الخروج الآن يلغي تقدمك في هذه الرحلة ولن تُحفظ النتيجة.',
          okText: 'خروج', cancelText: 'متابعة اللعب', danger: true
        }).then(function (ok) {
          if (!ok) return;
          MJ.Game.abandon();
          App.show('home');
        });
      });
    });

    // إغلاق النافذة المنبثقة بمفتاح Escape
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (MJ.UI.isOpen()) return;   // نافذة التأكيد تغلق نفسها
        var host = $('modal-host');
        if (host && !host.hidden) MJ.Teacher.closeModal();
      }
    });

    // تحذير عند مغادرة الصفحة أثناء اللعب
    global.addEventListener('beforeunload', function (e) {
      var st = MJ.Game.getState();
      if (st && !st.finished && st.answeredCount > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  /* ---------------- التهيئة ---------------- */
  function init() {
    S.init();
    buildBackdrop();
    bindHome();
    bindTeacherLogin();
    bindStudentLogin();
    bindGlobal();

    var v = $('bank-count');
    if (v) v.textContent = MJ.Questions.count();

    // إذا لم يوجد أي طالب، اعرض تلميحًا للمعلم في الصفحة الرئيسية
    if (!ST.allDevice().length) {
      var note = $('home-note');
      if (note) note.hidden = false;
    }

    App.show('home');
    readClassFromLink();      // إذا فُتح الموقع برابط صف من المعلم
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();

  MJ.init = init;

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
