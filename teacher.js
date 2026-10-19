/* ============================================================
   رحلة الرياضيات — teacher.js
   لوحة تحكم المعلم
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var U = MJ.Utils, S = MJ.Storage, ST = MJ.Students, SC = MJ.Scoring, FX = MJ.Effects, A = MJ.Angles;
  var doc = global.document;

  function $(id) { return doc.getElementById(id); }

  var view = 'overview';
  var resultSort = { key: 'date', dir: 'desc' };
  var searchTerm = '';

  var TABS = [
    { key: 'overview', label: 'نظرة عامة', icon: '📊' },
    { key: 'students', label: 'إدارة الطلاب', icon: '👨‍🎓' },
    { key: 'results',  label: 'نتائج الطلاب', icon: '📋' },
    { key: 'share',    label: 'مشاركة الصف', icon: '🔗' },
    { key: 'own',      label: 'أسئلتي (Excel)', icon: '📥' },
    { key: 'ai',       label: 'مولّد الأسئلة', icon: '🤖' },
    { key: 'analysis', label: 'تحليل الأداء', icon: '🔎' },
    { key: 'settings', label: 'إعدادات اللعبة', icon: '⚙️' },
    { key: 'account',  label: 'إعدادات الحساب', icon: '🔐' },
    { key: 'backup',   label: 'النسخ الاحتياطي', icon: '💾' }
  ];

  function open(tab) {
    if (!MJ.Auth.guard()) return;
    view = tab || view;
    paintIdentity();
    render();
    MJ.App.show('teacher');
  }

  /* اسم المعلم ورقمه في ترويسة اللوحة */
  function paintIdentity() {
    var t = MJ.Auth.current();
    var el = doc.querySelector('.thead__sub');
    if (el && t) {
      el.innerHTML = U.escapeHtml(t.displayName) + ' · رقم المعلم ' +
        '<b>' + U.escapeHtml(t.number) + '</b> · الصف السابع — درس الزوايا';
    }
  }

  function render() {
    paintIdentity();
    renderTabs();
    var host = $('teacher-view');
    if (!host) return;
    switch (view) {
      case 'students': host.innerHTML = studentsView(); bindStudents(); break;
      case 'results':  host.innerHTML = resultsView();  bindResults();  autoFetch();  break;
      case 'share':    host.innerHTML = shareView();    bindShare();    break;
      case 'own':      host.innerHTML = ownView();      bindOwn();      break;
      case 'ai':       host.innerHTML = aiView();       bindAI();       break;
      case 'analysis': host.innerHTML = analysisView(); bindAnalysis(); break;
      case 'settings': host.innerHTML = settingsView(); bindSettings(); break;
      case 'account':  host.innerHTML = accountView();  bindAccount();  break;
      case 'backup':   host.innerHTML = backupView();   bindBackup();   break;
      default:         host.innerHTML = overviewView(); bindOverview(); break;
    }
  }

  function renderTabs() {
    var host = $('teacher-tabs');
    if (!host) return;
    host.innerHTML = TABS.map(function (t) {
      return '<button class="tab' + (t.key === view ? ' is-active' : '') + '" data-tab="' + t.key + '" type="button">' +
        '<span aria-hidden="true">' + t.icon + '</span> ' + t.label + '</button>';
    }).join('');
    Array.prototype.forEach.call(host.querySelectorAll('.tab'), function (b) {
      b.addEventListener('click', function () { view = b.dataset.tab; render(); });
    });
  }

  /* ================= نظرة عامة ================= */
  function overviewView() {
    var students = ST.all(), results = ST.resultsAll();
    var st = SC.classStats(results, students);

    var cards = [
      { icon: '👨‍🎓', v: st.studentCount, k: 'عدد الطلاب' },
      { icon: '🏆', v: st.completedCount, k: 'أكملوا الرحلة' },
      { icon: '⭐', v: st.highest + '%', k: 'أعلى درجة' },
      { icon: '📊', v: st.average + '%', k: 'متوسط الدرجات' },
      { icon: '🎯', v: st.accuracy + '%', k: 'نسبة الإجابات الصحيحة' },
      { icon: '🧭', v: st.attempts, k: 'عدد المحاولات' }
    ].map(function (c) {
      return '<div class="tcard"><div class="tcard__icon">' + c.icon + '</div>' +
        '<div class="tcard__v">' + c.v + '</div><div class="tcard__k">' + c.k + '</div></div>';
    }).join('');

    // آخر النتائج
    var latest = results.slice().sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 5);
    var latestHtml = latest.length ? latest.map(function (r) {
      return '<li><span class="dot dot--' + rankClass(r.percentage) + '"></span>' +
        U.escapeHtml(r.studentName) + ' — ' + r.score + '/' + r.maxScore + ' (' + r.percentage + '%) · ' + r.date + '</li>';
    }).join('') : '<li class="muted">لا توجد نتائج بعد. أضف طلابًا ثم اطلب منهم بدء الرحلة.</li>';

    return '<div class="tsection">' +
      '<h2 class="tsection__title">لوحة الصف</h2>' +
      '<div class="tcards">' + cards + '</div>' +
      '<div class="tgrid">' +
        '<div class="panel"><h3 class="panel__title">درجات الطلاب</h3>' + chartStudents(results) + '</div>' +
        '<div class="panel"><h3 class="panel__title">توزيع مستويات التقييم</h3>' + chartRanks(results) + '</div>' +
      '</div>' +
      '<div class="panel"><h3 class="panel__title">آخر المحاولات</h3><ul class="feed">' + latestHtml + '</ul></div>' +
      '</div>';
  }
  function bindOverview() { /* لا توجد أحداث إضافية */ }

  function rankClass(p) {
    if (p >= 90) return 'gold'; if (p >= 80) return 'jade';
    if (p >= 70) return 'teal'; if (p >= 60) return 'violet'; return 'rose';
  }

  function chartStudents(results) {
    var best = {};
    results.forEach(function (r) {
      if (!best[r.studentName] || r.percentage > best[r.studentName]) best[r.studentName] = r.percentage;
    });
    var names = Object.keys(best);
    if (!names.length) return '<p class="muted">لا توجد بيانات لعرضها بعد.</p>';
    names = names.slice(0, 12);
    var w = 460, h = 210, pad = 28;
    var bw = (w - pad * 2) / names.length;
    var bars = names.map(function (n, i) {
      var v = best[n];
      var bh = (h - pad * 2) * (v / 100);
      var x = pad + i * bw + bw * 0.15;
      var y = h - pad - bh;
      return '<rect x="' + x + '" y="' + y + '" width="' + (bw * 0.7) + '" height="' + Math.max(2, bh) + '" rx="4" class="chart__bar chart__bar--' + rankClass(v) + '"/>' +
        '<text class="chart__val" x="' + (x + bw * 0.35) + '" y="' + (y - 6) + '" text-anchor="middle">' + v + '</text>' +
        '<text class="chart__name" x="' + (x + bw * 0.35) + '" y="' + (h - pad + 14) + '" text-anchor="middle">' + U.escapeHtml(n.split(' ')[0]) + '</text>';
    }).join('');
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="مخطط أعمدة لدرجات الطلاب">' +
      '<line class="chart__axis" x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '"/>' +
      bars + '</svg>';
  }

  function chartRanks(results) {
    if (!results.length) return '<p class="muted">لا توجد بيانات لعرضها بعد.</p>';
    var buckets = [
      { label: 'بطل الزوايا (90+)', min: 90, cls: 'gold', n: 0 },
      { label: 'متميز (80-89)', min: 80, cls: 'jade', n: 0 },
      { label: 'جيد (70-79)', min: 70, cls: 'teal', n: 0 },
      { label: 'تقدم جيد (60-69)', min: 60, cls: 'violet', n: 0 },
      { label: 'يحتاج تدريبًا (<60)', min: 0, cls: 'rose', n: 0 }
    ];
    results.forEach(function (r) {
      for (var i = 0; i < buckets.length; i++) if (r.percentage >= buckets[i].min) { buckets[i].n++; break; }
    });
    var max = Math.max.apply(null, buckets.map(function (b) { return b.n; })) || 1;
    return '<div class="hbars">' + buckets.map(function (b) {
      return '<div class="hbar"><span class="hbar__label">' + b.label + '</span>' +
        '<span class="hbar__track"><span class="hbar__fill hbar__fill--' + b.cls + '" style="width:' + Math.round((b.n / max) * 100) + '%"></span></span>' +
        '<span class="hbar__v">' + b.n + '</span></div>';
    }).join('') + '</div>';
  }

  /* ================= إدارة الطلاب ================= */
  function studentsView() {
    var students = ST.all();
    var rows = students.length ? students.map(function (s) {
      var status = ST.statusOf(s.id);
      var r = status.result;
      return '<tr>' +
        '<td class="td-name">' + U.escapeHtml(s.name) + '</td>' +
        '<td><span class="pill pill--' + status.key + '">' + status.icon + ' ' + status.label + '</span></td>' +
        '<td>' + (r ? r.score + '/' + r.maxScore + ' <span class="muted">(' + r.percentage + '%)</span>' : '—') + '</td>' +
        '<td class="td-actions">' +
          '<button class="ibtn" data-act="edit" data-id="' + s.id + '" title="تعديل الاسم" aria-label="تعديل ' + U.escapeHtml(s.name) + '">✏️</button>' +
          '<button class="ibtn" data-act="view" data-id="' + s.id + '" title="عرض النتيجة" aria-label="عرض نتيجة ' + U.escapeHtml(s.name) + '">📊</button>' +
          '<button class="ibtn" data-act="reset" data-id="' + s.id + '" title="إعادة النتيجة" aria-label="إعادة نتيجة ' + U.escapeHtml(s.name) + '">🔄</button>' +
          '<button class="ibtn ibtn--danger" data-act="del" data-id="' + s.id + '" title="حذف" aria-label="حذف ' + U.escapeHtml(s.name) + '">🗑</button>' +
        '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="4" class="muted">لا يوجد طلاب بعد. أضف أول طالب من الحقل أعلاه.</td></tr>';

    return '<div class="tsection">' +
      '<h2 class="tsection__title">إدارة الطلاب</h2>' +
      '<div class="panel">' +
        '<div class="formrow">' +
          '<label class="field field--inline"><span class="field__label">اسم الطالب</span>' +
          '<input class="field__input" id="new-student" type="text" placeholder="مثال: أحمد محمد" /></label>' +
          '<button class="btn btn--primary" id="add-student" type="button">إضافة الطالب</button>' +
        '</div>' +
        '<details class="bulk"><summary>إضافة عدة طلاب دفعة واحدة</summary>' +
          '<textarea class="field__input field__area" id="bulk-students" rows="4" placeholder="اكتب كل اسم في سطر"></textarea>' +
          '<button class="btn" id="add-bulk" type="button">إضافة القائمة</button>' +
        '</details>' +
      '</div>' +
      '<div class="panel">' +
        '<table class="table"><thead><tr><th>الطالب</th><th>الحالة</th><th>الدرجة</th><th>الإجراءات</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table>' +
        '<p class="muted small">عدد الطلاب: ' + students.length + '</p>' +
      '</div>' +
    '</div>';
  }

  function bindStudents() {
    var input = $('new-student');
    function add() {
      var r = ST.add(input.value);
      FX.toast(r.message, r.ok ? 'ok' : 'warn');
      if (r.ok) { input.value = ''; render(); }
    }
    $('add-student').addEventListener('click', add);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });

    $('add-bulk').addEventListener('click', function () {
      var r = ST.addMany($('bulk-students').value);
      FX.toast(r.message, r.added ? 'ok' : 'warn');
      render();
    });

    Array.prototype.forEach.call(doc.querySelectorAll('#teacher-view [data-act]'), function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.id, act = b.dataset.act, s = ST.get(id);
        if (!s) return;
        if (act === 'edit') {
          MJ.UI.prompt({
            title: 'تعديل اسم الطالب',
            message: 'اكتب الاسم الجديد للطالب ' + s.name + '.',
            value: s.name
          }).then(function (name) {
            if (name === null) return;
            var r = ST.update(id, name);
            FX.toast(r.message, r.ok ? 'ok' : 'warn');
            render();
          });
        } else if (act === 'del') {
          MJ.UI.confirm({
            title: 'حذف طالب',
            message: 'سيُحذف الطالب ' + s.name + ' وجميع نتائجه نهائيًا.',
            okText: 'حذف الطالب', danger: true
          }).then(function (ok) {
            if (!ok) return;
            FX.toast(ST.remove(id).message, 'ok');
            render();
          });
        } else if (act === 'reset') {
          MJ.UI.confirm({
            title: 'إعادة ضبط النتيجة',
            message: 'ستُحذف نتائج ' + s.name + ' ليبدأ الرحلة من جديد.',
            okText: 'إعادة الضبط'
          }).then(function (ok) {
            if (!ok) return;
            FX.toast(ST.resetStudentResults(id).message, 'ok');
            render();
          });
        } else if (act === 'view') {
          var res = ST.latestResult(id);
          if (!res) { FX.toast('لم يُكمل هذا الطالب الرحلة بعد.', 'info'); return; }
          showResultModal(res);
        }
      });
    });
  }

  /* ================= نتائج الطلاب ================= */
  function sortedResults() {
    var list = ST.resultsAll().slice();
    if (searchTerm) {
      var n = U.normalizeArabic(searchTerm);
      list = list.filter(function (r) { return U.normalizeArabic(r.studentName).indexOf(n) !== -1; });
    }
    var k = resultSort.key, dir = resultSort.dir === 'asc' ? 1 : -1;
    list.sort(function (a, b) {
      if (k === 'name') return dir * String(a.studentName).localeCompare(String(b.studentName), 'ar');
      if (k === 'score') return dir * (a.percentage - b.percentage);
      return dir * (a.createdAt - b.createdAt);
    });
    return list;
  }

  function resultsView() {
    var list = sortedResults();
    var rows = list.length ? list.map(function (r) {
      return '<tr>' +
        '<td class="td-name">' + U.escapeHtml(r.studentName) + '</td>' +
        '<td>' + r.score + '/' + r.maxScore + '</td>' +
        '<td><span class="pill pill--' + rankClass(r.percentage) + '">' + r.percentage + '%</span></td>' +
        '<td>' + r.correct + '</td><td>' + r.wrong + '</td>' +
        '<td>' + r.timeText + '</td><td class="muted small">' + r.date + '</td>' +
        '<td class="td-actions">' +
          '<button class="ibtn" data-res="' + r.id + '" data-act="details" title="عرض التفاصيل">🔍</button>' +
          '<button class="ibtn ibtn--danger" data-res="' + r.id + '" data-act="delete" title="حذف النتيجة">🗑</button>' +
        '</td></tr>';
    }).join('') : '<tr><td colspan="8" class="muted">لا توجد نتائج مطابقة.</td></tr>';

    return '<div class="tsection">' +
      '<h2 class="tsection__title">نتائج الطلاب</h2>' +
      '<div class="panel">' +
        '<div class="toolbar">' +
          '<label class="field field--inline"><span class="field__label">🔍 بحث</span>' +
          '<input class="field__input" id="res-search" type="search" value="' + U.escapeHtml(searchTerm) + '" placeholder="اسم الطالب" /></label>' +
          '<div class="toolbar__group">' +
            '<button class="btn btn--sm' + (resultSort.key === 'score' ? ' is-active' : '') + '" data-sort="score" type="button">ترتيب حسب الدرجة</button>' +
            '<button class="btn btn--sm' + (resultSort.key === 'name' ? ' is-active' : '') + '" data-sort="name" type="button">ترتيب حسب الاسم</button>' +
            '<button class="btn btn--sm' + (resultSort.key === 'date' ? ' is-active' : '') + '" data-sort="date" type="button">ترتيب حسب التاريخ</button>' +
          '</div>' +
        '</div>' +
        '<div class="table-wrap"><table class="table">' +
          '<thead><tr><th>الاسم</th><th>الدرجة</th><th>النسبة</th><th>الصحيح</th><th>الخطأ</th><th>الزمن</th><th>التاريخ</th><th>الإجراءات</th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table></div>' +
      '</div></div>';
  }

  function bindResults() {
    var s = $('res-search');
    s.addEventListener('input', function () {
      searchTerm = s.value;
      var host = $('teacher-view');
      host.innerHTML = resultsView();
      bindResults();
      var ns = $('res-search');
      ns.focus();
      ns.setSelectionRange(ns.value.length, ns.value.length);
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-sort]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.sort;
        if (resultSort.key === k) resultSort.dir = resultSort.dir === 'asc' ? 'desc' : 'asc';
        else { resultSort.key = k; resultSort.dir = k === 'name' ? 'asc' : 'desc'; }
        render();
      });
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-res]'), function (b) {
      b.addEventListener('click', function () {
        var r = ST.resultsAll().filter(function (x) { return x.id === b.dataset.res; })[0];
        if (!r) return;
        if (b.dataset.act === 'details') { showResultModal(r); return; }
        MJ.UI.confirm({
          title: 'حذف نتيجة',
          message: 'ستُحذف نتيجة ' + r.studentName + ' المسجّلة بتاريخ ' + r.date + '.',
          okText: 'حذف النتيجة', danger: true
        }).then(function (ok) {
          if (!ok) return;
          FX.toast(ST.deleteResult(r.id).message, 'ok');
          render();
        });
      });
    });
  }

  /* ================= تحليل الأداء ================= */
  function analysisView() {
    var students = ST.all();
    var opts = students.map(function (s) { return '<option value="' + s.id + '">' + U.escapeHtml(s.name) + '</option>'; }).join('');
    if (!students.length) return '<div class="tsection"><h2 class="tsection__title">تحليل الأداء</h2>' +
      '<div class="panel"><p class="muted">أضف طلابًا أولًا من قسم إدارة الطلاب.</p></div></div>';

    return '<div class="tsection">' +
      '<h2 class="tsection__title">تحليل الأداء</h2>' +
      '<div class="panel">' +
        '<label class="field field--inline"><span class="field__label">اختر الطالب</span>' +
        '<select class="field__input" id="analysis-student"><option value="">— اختر —</option>' + opts + '</select></label>' +
      '</div>' +
      '<div id="analysis-out"></div>' +
      '<div class="panel"><h3 class="panel__title">متوسط الصف حسب المهارة</h3>' + classSkillBars() + '</div>' +
    '</div>';
  }

  function classSkillBars() {
    var results = ST.resultsAll();
    if (!results.length) return '<p class="muted">لا توجد نتائج بعد.</p>';
    var agg = {};
    results.forEach(function (r) {
      (r.categoryStats || []).forEach(function (c) {
        if (!agg[c.key]) agg[c.key] = { label: c.label, total: 0, correct: 0 };
        agg[c.key].total += c.total; agg[c.key].correct += c.correct;
      });
    });
    var keys = Object.keys(agg);
    if (!keys.length) return '<p class="muted">لا توجد بيانات تفصيلية.</p>';
    return '<div class="bars bars--light">' + keys.map(function (k) {
      var p = Math.round((agg[k].correct / agg[k].total) * 100);
      return '<div class="bar"><div class="bar__label">' + U.escapeHtml(agg[k].label) + '</div>' +
        '<div class="bar__track"><div class="bar__fill bar__fill--' + rankClass(p) + '" style="width:' + p + '%"></div></div>' +
        '<div class="bar__value">' + p + '%</div></div>';
    }).join('') + '</div>';
  }

  function bindAnalysis() {
    var sel = $('analysis-student');
    if (!sel) return;
    sel.addEventListener('change', function () {
      var out = $('analysis-out');
      var r = ST.latestResult(sel.value);
      if (!sel.value) { out.innerHTML = ''; return; }
      if (!r) { out.innerHTML = '<div class="panel"><p class="muted">لم يُكمل هذا الطالب الرحلة بعد.</p></div>'; return; }
      out.innerHTML = '<div class="panel">' + studentAnalysisHtml(r) + '</div>';
    });
  }

  function studentAnalysisHtml(r) {
    var bars = (r.categoryStats || []).map(function (c) {
      return '<div class="bar"><div class="bar__label">' + U.escapeHtml(c.label) + '</div>' +
        '<div class="bar__track"><div class="bar__fill bar__fill--' + rankClass(c.percentage) + '" style="width:' + c.percentage + '%"></div></div>' +
        '<div class="bar__value">' + c.percentage + '% <span class="muted small">(' + c.correct + '/' + c.total + ')</span></div></div>';
    }).join('');

    var weak = (r.categoryStats || []).filter(function (c) { return c.percentage < 70; })
      .map(function (c) { return c.label; });
    var advice = weak.length
      ? 'يحتاج الطالب إلى دعم في: ' + weak.join('، ') + '.'
      : 'أداء متوازن في جميع المهارات.';

    return '<h3 class="panel__title">' + U.escapeHtml(r.studentName) + ' — ' + r.rankIcon + ' ' + U.escapeHtml(r.rankTitle) + '</h3>' +
      '<p class="muted small">الدرجة ' + r.score + '/' + r.maxScore + ' · النسبة ' + r.percentage + '% · الزمن ' + r.timeText + ' · التاريخ ' + r.date + '</p>' +
      '<div class="bars bars--light">' + bars + '</div>' +
      '<p class="advice">🧭 ' + U.escapeHtml(advice) + '</p>';
  }

  /* ================= نافذة تفاصيل النتيجة ================= */
  function showResultModal(r) {
    var host = $('modal-host');
    var wrongs = (r.answers || []).filter(function (a) { return !a.isCorrect; });
    var items = wrongs.length ? wrongs.map(function (a, i) {
      return '<div class="mreview">' +
        '<div class="mreview__fig">' + (a.angle ? A.generateAngle(a.angle.degree, a.angle.rotation || 0, 120, { showMeasure: true, labels: false, tone: 'ink' }) : '🧩') + '</div>' +
        '<div><p class="mreview__q">' + (i + 1) + '. ' + U.escapeHtml(a.prompt) + '</p>' +
        '<p class="mreview__row"><span class="bad">إجابة الطالب:</span> ' + U.escapeHtml(a.studentAnswer) + '</p>' +
        '<p class="mreview__row"><span class="good">الصحيحة:</span> ' + U.escapeHtml(a.correctAnswer) + '</p>' +
        '<p class="mreview__why">' + U.escapeHtml(a.explanation) + '</p></div></div>';
    }).join('') : '<p class="muted">لا توجد أخطاء — إجابات كاملة الصحة.</p>';

    host.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-label="تفاصيل نتيجة الطالب">' +
        '<div class="modal__box">' +
          '<button class="modal__close" id="modal-close" type="button" aria-label="إغلاق">✕</button>' +
          studentAnalysisHtml(r) +
          '<h4 class="panel__title">الأسئلة التي أخطأ فيها (' + wrongs.length + ')</h4>' +
          items +
        '</div>' +
      '</div>';
    host.hidden = false;
    $('modal-close').addEventListener('click', closeModal);
    host.onclick = function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('modal')) closeModal();
    };
  }
  function closeModal() {
    var host = $('modal-host');
    host.innerHTML = ''; host.hidden = true;
  }

  /* ================= إعدادات اللعبة ================= */
  /* قوائم متتابعة: الفصل ← الوحدة ← الدرس */
  function lessonPickerHtml(currentId) {
    var C = MJ.Curriculum;
    var cur = C.lesson(currentId) || C.lesson(C.firstReady());
    var termId = cur ? cur.termId : C.terms()[0].id;
    var unitNo = cur ? cur.unitNo : C.unitsOf(termId)[0].no;

    function opt(v, label, sel, disabled) {
      return '<option value="' + U.escapeHtml(v) + '"' + (sel ? ' selected' : '') +
        (disabled ? ' disabled' : '') + '>' + U.escapeHtml(label) + '</option>';
    }

    var terms = C.terms().map(function (t) {
      return opt(t.id, t.name + ' — ' + t.book, t.id === termId);
    }).join('');

    var units = C.unitsOf(termId).map(function (u) {
      var ready = u.lessons.some(function (l) { return C.isReady(l.id); });
      return opt(u.no, (u.no ? 'الوحدة ' + u.no + ': ' : '') + u.name + (ready ? '' : ' (قيد الإعداد)'),
        String(u.no) === String(unitNo));
    }).join('');

    var lessons = C.lessonsOf(termId, unitNo).map(function (l) {
      var ready = C.isReady(l.id);
      return opt(l.id, l.code + ' ' + l.name + (ready ? ' ✓' : ' (قيد الإعداد)'),
        l.id === (cur && cur.id), !ready);
    }).join('');

    var st = C.stats();
    return '<div class="panel">' +
      '<h3 class="panel__title">📚 الدرس النشط</h3>' +
      '<p class="muted small">' + U.escapeHtml(C.grade) + ' · الدروس الجاهزة ' + st.ready + ' من ' + st.lessons +
      '. الدرس المختار هو ما يلعبه طلابك، ويُرسل مع رابط الصف.</p>' +
      '<div class="settings-grid">' +
        '<label class="field"><span class="field__label">الفصل الدراسي</span>' +
        '<select class="field__input" id="pick-term">' + terms + '</select></label>' +
        '<label class="field"><span class="field__label">الوحدة</span>' +
        '<select class="field__input" id="pick-unit">' + units + '</select></label>' +
        '<label class="field"><span class="field__label">الدرس</span>' +
        '<select class="field__input" id="pick-lesson">' + lessons + '</select></label>' +
      '</div>' +
      '<div id="lesson-info" class="advice">' + lessonInfoHtml(cur ? cur.id : null) + '</div>' +
    '</div>';
  }

  function lessonInfoHtml(lessonId) {
    var C = MJ.Curriculum, l = C.lesson(lessonId);
    if (!l) return 'لم يُختر درس بعد.';
    if (!C.isReady(l.id)) return '⏳ هذا الدرس قيد الإعداد، اختر درسًا عليه علامة ✓.';
    var bank = MJ.Questions.bankOf(l.id);
    var stages = bank.stages.map(function (s) { return s.icon + ' ' + s.title; }).join(' · ');
    return '✅ <b>' + U.escapeHtml(l.name) + '</b> — ' + bank.questions.length + ' سؤالًا في البنك' +
      (l.page ? '، من الكتاب ص ' + l.page : '') + '.<br><span class="small">' + U.escapeHtml(stages) + '</span>';
  }

  function bindLessonPicker() {
    var C = MJ.Curriculum;
    function fill(sel, html) { var e = $(sel); if (e) e.innerHTML = html; }
    function refresh(termId, unitNo, lessonId) {
      var units = C.unitsOf(termId);
      if (!unitNo) unitNo = units[0].no;
      fill('pick-unit', units.map(function (u) {
        var ready = u.lessons.some(function (l) { return C.isReady(l.id); });
        return '<option value="' + u.no + '"' + (String(u.no) === String(unitNo) ? ' selected' : '') + '>' +
          U.escapeHtml((u.no ? 'الوحدة ' + u.no + ': ' : '') + u.name + (ready ? '' : ' (قيد الإعداد)')) + '</option>';
      }).join(''));
      var lessons = C.lessonsOf(termId, unitNo);
      fill('pick-lesson', lessons.map(function (l) {
        var ready = C.isReady(l.id);
        return '<option value="' + l.id + '"' + (l.id === lessonId ? ' selected' : '') +
          (ready ? '' : ' disabled') + '>' + U.escapeHtml(l.code + ' ' + l.name + (ready ? ' ✓' : ' (قيد الإعداد)')) + '</option>';
      }).join(''));
      $('lesson-info').innerHTML = lessonInfoHtml($('pick-lesson').value);
    }

    if (!$('pick-term')) return;
    $('pick-term').addEventListener('change', function () { refresh(this.value, null, null); });
    $('pick-unit').addEventListener('change', function () { refresh($('pick-term').value, this.value, null); });
    $('pick-lesson').addEventListener('change', function () {
      $('lesson-info').innerHTML = lessonInfoHtml(this.value);
    });
  }

  function settingsView() {
    var s = S.getSettings();
    return '<div class="tsection"><h2 class="tsection__title">إعدادات اللعبة</h2>' +
      lessonPickerHtml(s.lesson) +
      '<div class="panel"><div class="settings-grid">' +
        numField('set-count', 'عدد أسئلة الرحلة', s.questionCount, 5, 60) +
        numField('set-points', 'نقاط الإجابة الصحيحة', s.pointsPerQuestion, 1, 100) +
        numField('set-bonus', 'نقاط السرعة الإضافية', s.speedBonus, 0, 50) +
        numField('set-hints', 'عدد التلميحات', s.hints, 0, 10) +
        numField('set-timer', 'مدة سؤال السرعة (بالثواني)', s.timerSeconds, 5, 120) +
        numField('set-fast', 'حد الإجابة السريعة (بالثواني)', s.fastAnswerSeconds, 3, 60) +
        '<label class="field"><span class="field__label">مستوى الصعوبة</span>' +
          '<select class="field__input" id="set-diff">' +
            '<option value="auto"' + (s.difficulty === 'auto' ? ' selected' : '') + '>تدريجي (موصى به)</option>' +
            '<option value="easy"' + (s.difficulty === 'easy' ? ' selected' : '') + '>سهل</option>' +
            '<option value="hard"' + (s.difficulty === 'hard' ? ' selected' : '') + '>متقدم</option>' +
          '</select></label>' +
        '<label class="field"><span class="field__label">المؤثرات الصوتية</span>' +
          '<select class="field__input" id="set-sound">' +
            '<option value="on"' + (s.sound ? ' selected' : '') + '>مفعّلة</option>' +
            '<option value="off"' + (!s.sound ? ' selected' : '') + '>متوقفة</option>' +
          '</select></label>' +
      '</div>' +
      '<div class="formrow">' +
        '<button class="btn btn--primary" id="save-settings" type="button">حفظ الإعدادات</button>' +
        '<button class="btn" id="reset-settings" type="button">استعادة الافتراضي</button>' +
      '</div>' +
      '<p class="muted small">الدرس الحالي: الزوايا · بنك الأسئلة يحتوي ' + MJ.Questions.count() + ' سؤالًا.</p>' +
      '</div></div>';
  }

  function numField(id, label, value, min, max) {
    return '<label class="field"><span class="field__label">' + label + '</span>' +
      '<input class="field__input" id="' + id + '" type="number" min="' + min + '" max="' + max + '" value="' + value + '" /></label>';
  }

  function bindSettings() {
    bindLessonPicker();
    $('save-settings').addEventListener('click', function () {
      var s = S.getSettings();
      if ($('pick-lesson') && $('pick-lesson').value && MJ.Curriculum.isReady($('pick-lesson').value)) {
        s.lesson = $('pick-lesson').value;
      }
      s.questionCount = U.clamp(parseInt($('set-count').value, 10) || 20, 5, 60);
      s.pointsPerQuestion = U.clamp(parseInt($('set-points').value, 10) || 10, 1, 100);
      s.speedBonus = U.clamp(parseInt($('set-bonus').value, 10) || 0, 0, 50);
      s.hints = U.clamp(parseInt($('set-hints').value, 10) || 0, 0, 10);
      s.timerSeconds = U.clamp(parseInt($('set-timer').value, 10) || 20, 5, 120);
      s.fastAnswerSeconds = U.clamp(parseInt($('set-fast').value, 10) || 10, 3, 60);
      s.difficulty = $('set-diff').value;
      s.sound = $('set-sound').value === 'on';
      S.setSettings(s);
      FX.toast('تم حفظ الإعدادات · الدرس: ' + MJ.Curriculum.shortLabel(s.lesson), 'ok');
      render();
    });
    $('reset-settings').addEventListener('click', function () {
      S.resetSettings();
      FX.toast('تمت استعادة الإعدادات الافتراضية.', 'ok');
      render();
    });
  }

  /* ================= إعدادات الحساب ================= */
  function accountView() {
    var t = MJ.Auth.current();
    var others = MJ.Auth.accounts().filter(function (a) { return a.id !== t.id; });
    var otherLine = others.length
      ? 'حسابات أخرى على هذا الجهاز: ' + others.map(function (a) {
          return U.escapeHtml(a.displayName) + ' (رقم ' + a.number + ')';
        }).join(' · ') + ' — بيانات كل حساب مستقلة تمامًا.'
      : 'هذا هو الحساب الوحيد على هذا الجهاز.';

    return '<div class="tsection"><h2 class="tsection__title">إعدادات الحساب</h2>' +
      '<div class="panel">' +
        '<div class="idcard">' +
          '<div class="idcard__num"><span>رقم المعلم</span><b>' + U.escapeHtml(t.number) + '</b></div>' +
          '<div class="idcard__meta">' +
            '<p><b>' + U.escapeHtml(t.displayName) + '</b></p>' +
            '<p class="muted small">اسم المستخدم: ' + U.escapeHtml(t.username) + '</p>' +
            '<p class="muted small">يمكنك الدخول باسم المستخدم أو برقم المعلم.</p>' +
          '</div>' +
        '</div>' +
        '<p class="muted small">' + otherLine + '</p>' +
      '</div>' +

      '<div class="panel">' +
        '<h3 class="panel__title">بيانات المعلم</h3>' +
        '<div class="settings-grid">' +
          '<label class="field"><span class="field__label">اسم المعلم</span>' +
          '<input class="field__input" id="acc-name" type="text" value="' + U.escapeHtml(t.displayName) + '" /></label>' +
          '<label class="field"><span class="field__label">اسم المستخدم</span>' +
          '<input class="field__input" id="acc-user" type="text" value="' + U.escapeHtml(t.username) + '" /></label>' +
        '</div>' +
        '<button class="btn btn--primary" id="save-account" type="button">حفظ البيانات</button>' +
        '<div id="acc-msg" class="inline-msg" role="status"></div>' +
      '</div>' +

      '<div class="panel">' +
        '<h3 class="panel__title">تغيير كلمة المرور</h3>' +
        '<div class="settings-grid">' +
          '<label class="field"><span class="field__label">كلمة المرور الحالية</span>' +
          '<input class="field__input" id="pw-current" type="password" autocomplete="current-password" /></label>' +
          '<label class="field"><span class="field__label">كلمة المرور الجديدة</span>' +
          '<input class="field__input" id="pw-new" type="password" autocomplete="new-password" /></label>' +
          '<label class="field"><span class="field__label">تأكيد كلمة المرور الجديدة</span>' +
          '<input class="field__input" id="pw-confirm" type="password" autocomplete="new-password" /></label>' +
        '</div>' +
        '<button class="btn btn--primary" id="change-pw" type="button">تغيير كلمة المرور</button>' +
        '<div id="pw-msg" class="inline-msg" role="status"></div>' +
      '</div>' +

      '<div class="panel panel--danger">' +
        '<h3 class="panel__title">حذف الحساب</h3>' +
        '<p class="muted small">يُحذف حسابك مع جميع طلابك ونتائجهم. حسابات المعلمين الآخرين على هذا الجهاز لا تتأثر.</p>' +
        '<div class="formrow">' +
          '<label class="field field--inline"><span class="field__label">كلمة المرور للتأكيد</span>' +
          '<input class="field__input" id="del-pw" type="password" autocomplete="current-password" /></label>' +
          '<button class="btn btn--danger" id="delete-account" type="button">حذف حسابي</button>' +
        '</div>' +
      '</div></div>';
  }

  function bindAccount() {
    $('save-account').addEventListener('click', function () {
      var msg = $('acc-msg');
      var r1 = MJ.Auth.changeDisplayName($('acc-name').value);
      var r2 = r1.ok ? MJ.Auth.changeUsername($('acc-user').value) : r1;
      var ok = r1.ok && r2.ok;
      msg.className = 'inline-msg ' + (ok ? 'inline-msg--ok' : 'inline-msg--bad');
      msg.textContent = (ok ? '✅ تم حفظ بيانات الحساب.' : '⚠️ ' + (r1.ok ? r2.message : r1.message));
      FX.toast(ok ? 'تم حفظ بيانات الحساب.' : (r1.ok ? r2.message : r1.message), ok ? 'ok' : 'warn');
      if (ok) render();
    });

    $('change-pw').addEventListener('click', function () {
      var r = MJ.Auth.changePassword($('pw-current').value, $('pw-new').value, $('pw-confirm').value);
      var msg = $('pw-msg');
      msg.className = 'inline-msg ' + (r.ok ? 'inline-msg--ok' : 'inline-msg--bad');
      msg.textContent = (r.ok ? '✅ ' : '⚠️ ') + r.message;
      FX.toast(r.message, r.ok ? 'ok' : 'warn');
      if (r.ok) { $('pw-current').value = ''; $('pw-new').value = ''; $('pw-confirm').value = ''; }
    });

    $('delete-account').addEventListener('click', function () {
      var pw = $('del-pw').value;
      MJ.UI.confirm({
        title: 'حذف الحساب',
        message: 'سيُحذف حسابك وجميع طلابك ونتائجهم من هذا الجهاز نهائيًا.',
        okText: 'حذف الحساب', danger: true
      }).then(function (ok) {
        if (!ok) return;
        var r = MJ.Auth.deleteAccount(pw);
        FX.toast(r.message, r.ok ? 'ok' : 'warn');
        if (r.ok) MJ.App.show('home');
      });
    });
  }


  /* جلب صامت للنتائج الجديدة عند فتح صفحة النتائج */
  function autoFetch() {
    if (!MJ.Sync.isOn() || !MJ.Auth.isLoggedIn()) return;
    MJ.Sync.fetchResults(MJ.Auth.current().id).then(function (r) {
      if (r.added) {
        FX.toast('وصلت ' + r.added + ' نتيجة جديدة من الخادم.', 'ok');
        if (view === 'results') { var host = $('teacher-view'); host.innerHTML = resultsView(); bindResults(); }
      }
    }).catch(function () { /* بلا إزعاج: تبقى الأكواد اليدوية متاحة */ });
  }

  /* ================= مشاركة الصف واستلام النتائج ================= */
  function shareView() {
    var teacher = MJ.Auth.current();
    var count = ST.all().length;
    var code = '', link = '', err = '';
    try { code = MJ.Share.encodeClass(teacher.id); link = MJ.Share.classLink(code); }
    catch (e) { err = e.message; }

    var hosted = MJ.Share.isHosted();
    var linkBlock = err ? '<p class="inline-msg inline-msg--bad">⚠️ ' + U.escapeHtml(err) + '</p>' :
      (hosted
        ? '<label class="field"><span class="field__label">رابط الصف — أرسله لطلابك</span>' +
          '<textarea class="field__input field__area" id="class-link" rows="3" readonly>' + U.escapeHtml(link) + '</textarea></label>' +
          '<div class="formrow"><button class="btn btn--primary" id="copy-link" type="button">نسخ الرابط</button>' +
          '<button class="btn" id="copy-code" type="button">نسخ كود الصف</button></div>'
        : '<div class="notice notice--warn">' +
          '<b>الملف مفتوح من جهازك (بدون إنترنت)، فالرابط لن يعمل عند غيرك.</b>' +
          '<p class="small">لتشغيل الرابط: انشر مجلد اللعبة على استضافة مجانية مثل GitHub Pages أو Netlify Drop، ' +
          'ثم عد إلى هذه الصفحة من العنوان المنشور وانسخ الرابط.</p>' +
          '<p class="small">حتى ذلك الحين استخدم <b>كود الصف</b> أدناه: أرسل ملف اللعبة لطلابك مع الكود، ' +
          'ويلصقونه في شاشة دخول الطالب.</p></div>' +
          '<div class="formrow"><button class="btn btn--primary" id="copy-code" type="button">نسخ كود الصف</button></div>');

    var syncOn = MJ.Sync.isOn();
    var cloudLink = syncOn ? MJ.Sync.classLink(teacher.id) : '';

    return '<div class="tsection"><h2 class="tsection__title">مشاركة الصف</h2>' +

      '<div class="panel">' +
        '<h3 class="panel__title">☁️ المزامنة التلقائية (مستحسن)</h3>' +
        '<p class="muted small">اربط اللعبة بخادمك على Cloudflare لتصل نتائج الطلاب إلى لوحتك تلقائيًا بلا أكواد. ' +
        'خطوات التركيب في ملف <b>server/README-worker.md</b>.</p>' +
        '<div class="formrow">' +
          '<label class="field field--inline" style="flex:1 1 320px"><span class="field__label">عنوان الخادم</span>' +
          '<input class="field__input" id="sync-url" type="url" dir="ltr" placeholder="https://math-journey-sync.workers.dev" value="' +
          U.escapeHtml(MJ.Sync.url()) + '" /></label>' +
          '<button class="btn" id="sync-test" type="button">فحص الاتصال</button>' +
          '<button class="btn btn--primary" id="sync-publish" type="button">حفظ ونشر الصف</button>' +
        '</div>' +
        (syncOn
          ? '<label class="field"><span class="field__label">رابط الصف التلقائي — أرسله لطلابك</span>' +
            '<textarea class="field__input field__area" id="cloud-link" rows="3" readonly>' + U.escapeHtml(cloudLink) + '</textarea></label>' +
            '<div class="formrow">' +
              '<button class="btn btn--primary" id="copy-cloud" type="button">نسخ الرابط</button>' +
              '<button class="btn" id="sync-fetch" type="button">جلب النتائج الآن</button>' +
            '</div>'
          : '') +
        '<div id="sync-msg" class="inline-msg" role="status"></div>' +
      '</div>' +

      '<div class="panel">' +
        '<h3 class="panel__title">1 · أرسل صفّك للطلاب (بدون خادم)</h3>' +
        '<p class="muted small">يحمل الكود أسماء طلابك (' + count + ') وإعدادات الرحلة. ' +
        'كرّر المشاركة بعد أي تعديل على القائمة ليصل الطلاب الجدد.</p>' +
        linkBlock +
        (err ? '' : '<label class="field"><span class="field__label">كود الصف</span>' +
          '<textarea class="field__input field__area" id="class-code" rows="4" readonly>' + U.escapeHtml(code) + '</textarea></label>') +
      '</div>' +

      '<div class="panel">' +
        '<h3 class="panel__title">2 · استلم نتيجة طالب</h3>' +
        '<p class="muted small">عند انتهاء الطالب على جهازه يظهر له «كود النتيجة». ' +
        'يرسله لك (واتساب أو بريد أو ملف)، فتلصقه هنا لتُضاف نتيجته الكاملة مع تفاصيل أخطائه.</p>' +
        '<label class="field"><span class="field__label">الصق كود النتيجة</span>' +
        '<textarea class="field__input field__area" id="result-code" rows="4" placeholder="MJR1...."></textarea></label>' +
        '<div class="formrow">' +
          '<button class="btn btn--primary" id="import-result" type="button">استلام النتيجة</button>' +
          '<label class="btn">استلام من ملف<input type="file" id="result-file" accept=".txt,.json,text/plain" hidden /></label>' +
        '</div>' +
        '<div id="share-msg" class="inline-msg" role="status"></div>' +
      '</div>' +

      '<div class="panel">' +
        '<h3 class="panel__title">كيف تعمل هذه الطريقة؟</h3>' +
        '<ol class="steps small">' +
          '<li>تضيف أسماء طلابك على جهازك كالمعتاد.</li>' +
          '<li>ترسل لهم الرابط (إن كان الموقع منشورًا) أو ملف اللعبة مع كود الصف.</li>' +
          '<li>يفتح كل طالب اللعبة على جهازه ويجد اسمه جاهزًا في القائمة.</li>' +
          '<li>بعد انتهائه يرسل لك كود النتيجة، فتلصقه هنا لتظهر في «نتائج الطلاب».</li>' +
        '</ol>' +
        '<p class="muted small">هذه الطريقة تعمل بلا خادم ولا اشتراك. لو أردت وصول النتائج تلقائيًا دون إرسال أكواد، ' +
        'فذلك يحتاج قاعدة بيانات على الإنترنت.</p>' +
      '</div></div>';
  }

  function bindShare() {
    function syncMsg(text, ok) {
      var el = $('sync-msg');
      if (!el) return;
      el.className = 'inline-msg ' + (ok ? 'inline-msg--ok' : 'inline-msg--bad');
      el.textContent = (ok ? '✅ ' : '⚠️ ') + text;
    }

    $('sync-test').addEventListener('click', function () {
      var u = $('sync-url').value;
      syncMsg('جارٍ الفحص…', true);
      MJ.Sync.ping(u).then(function () { syncMsg('الخادم يعمل ومستعد.', true); })
        .catch(function (e) { syncMsg(e.message, false); });
    });

    $('sync-publish').addEventListener('click', function () {
      var u = $('sync-url').value;
      if (!u) { syncMsg('اكتب عنوان الخادم أولًا.', false); return; }
      MJ.Sync.setUrl(u);
      syncMsg('جارٍ نشر الصف…', true);
      MJ.Sync.publishClass(MJ.Auth.current().id).then(function (r) {
        FX.toast('تم نشر الصف (' + r.count + ' طالبًا) على الخادم.', 'ok');
        render();
        syncMsg('تم نشر الصف. انسخ الرابط التلقائي وأرسله لطلابك.', true);
      }).catch(function (e) { syncMsg(e.message, false); });
    });

    if ($('sync-fetch')) {
      $('sync-fetch').addEventListener('click', function () {
        syncMsg('جارٍ جلب النتائج…', true);
        MJ.Sync.fetchResults(MJ.Auth.current().id).then(function (r) {
          syncMsg(r.added ? ('وصلت ' + r.added + ' نتيجة جديدة.') : 'لا توجد نتائج جديدة.', true);
          if (r.added) { FX.confetti(); FX.toast('وصلت ' + r.added + ' نتيجة جديدة.', 'ok'); }
        }).catch(function (e) { syncMsg(e.message, false); });
      });
    }
    if ($('copy-cloud')) $('copy-cloud').addEventListener('click', function () { copyFrom('cloud-link', 'الرابط'); });

    function copyFrom(id, label) {
      var el = $(id);
      if (!el) return;
      el.select();
      var done = false;
      try { done = doc.execCommand && doc.execCommand('copy'); } catch (e) { done = false; }
      if (!done && global.navigator && global.navigator.clipboard) {
        global.navigator.clipboard.writeText(el.value).then(function () { FX.toast('تم نسخ ' + label + '.', 'ok'); });
        return;
      }
      FX.toast(done ? 'تم نسخ ' + label + '.' : 'انسخ النص يدويًا من الحقل.', done ? 'ok' : 'warn');
    }
    if ($('copy-link')) $('copy-link').addEventListener('click', function () { copyFrom('class-link', 'الرابط'); });
    if ($('copy-code')) $('copy-code').addEventListener('click', function () { copyFrom('class-code', 'كود الصف'); });

    function receive(code) {
      var msg = $('share-msg');
      try {
        var r = MJ.Share.importResult(code, MJ.Auth.current().id);
        msg.className = 'inline-msg ' + (r.ok ? 'inline-msg--ok' : 'inline-msg--bad');
        msg.textContent = (r.ok ? '✅ ' : '⚠️ ') + r.message;
        FX.toast(r.message, r.ok ? 'ok' : 'warn');
        if (r.ok) { $('result-code').value = ''; FX.confetti(); }
      } catch (e) {
        msg.className = 'inline-msg inline-msg--bad';
        msg.textContent = '⚠️ ' + e.message;
        FX.toast(e.message, 'warn');
      }
    }

    $('import-result').addEventListener('click', function () { receive($('result-code').value); });
    $('result-file').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new global.FileReader();
      reader.onload = function () { receive(String(reader.result)); };
      reader.readAsText(file);
      e.target.value = '';
    });
  }


  /* ================= أسئلتي: استيراد من Excel ================= */
  function ownView() {
    var mine = MJ.OwnBank.list();
    var rows = mine.map(function (b) {
      return '<tr>' +
        '<td class="td-name">★ ' + U.escapeHtml(b.name) + '</td>' +
        '<td>' + b.questions.length + ' سؤالًا</td>' +
        '<td>' + U.escapeHtml(U.formatDate(b.createdAt)) + '</td>' +
        '<td class="td-actions">' +
          '<button class="ibtn" data-use="' + b.id + '" title="اجعله الدرس النشط">▶</button>' +
          '<button class="ibtn ibtn--danger" data-delbank="' + b.id + '" title="حذف">🗑</button>' +
        '</td></tr>';
    }).join('');

    return '<div class="tsection"><h2 class="tsection__title">أسئلتي (Excel)</h2>' +

      '<div class="panel">' +
        '<h3 class="panel__title">1 · جهّز أسئلتك</h3>' +
        '<p class="muted small">افتح القالب في Excel واكتب أسئلتك في الأعمدة، سطرًا لكل سؤال. ' +
        'الأعمدة بالترتيب:</p>' +
        '<div class="table-wrap"><table class="table"><thead><tr>' +
          MJ.OwnBank.HEADERS.map(function (h) { return '<th>' + U.escapeHtml(h) + '</th>'; }).join('') +
        '</tr></thead><tbody><tr>' +
          '<td>ما ناتج 7 × 8؟</td><td>54</td><td>56</td><td>48</td><td>64</td>' +
          '<td>2</td><td>1</td><td>تذكر جدول 7</td><td>7 × 8 = 56</td><td></td>' +
        '</tr></tbody></table></div>' +
        '<ul class="steps small">' +
          '<li><b>الإجابة</b>: اكتب رقم الخيار الصحيح (1 أو 2 أو 3 أو 4)، أو انسخ نصه.</li>' +
          '<li><b>المستوى</b>: من 1 إلى 4 لترتيب صعوبة المراحل. اتركه فارغًا ليوزّعه البرنامج تلقائيًا.</li>' +
          '<li><b>زاوية</b>: اكتب قياسًا مثل 120 ليرسم البرنامج الزاوية تلقائيًا، أو اتركه فارغًا.</li>' +
          '<li>يكفي خياران، والحد الأدنى 5 أسئلة صالحة.</li>' +
        '</ul>' +
        '<button class="btn btn--primary" id="own-template" type="button">تنزيل القالب (CSV)</button>' +
      '</div>' +

      '<div class="panel">' +
        '<h3 class="panel__title">2 · أدخل الأسئلة</h3>' +
        '<label class="field"><span class="field__label">اسم بنك الأسئلة</span>' +
        '<input class="field__input" id="own-name" type="text" placeholder="مثال: مراجعة الوحدة الرابعة" /></label>' +
        '<label class="field"><span class="field__label">الصق الخلايا المنسوخة من Excel هنا</span>' +
        '<textarea class="field__input field__area" id="own-paste" rows="7" ' +
        'placeholder="حدّد الخلايا في Excel ثم Ctrl+C ثم Ctrl+V هنا"></textarea></label>' +
        '<div class="formrow">' +
          '<button class="btn btn--primary" id="own-check" type="button">فحص الأسئلة</button>' +
          '<label class="btn">رفع ملف CSV<input type="file" id="own-file" accept=".csv,.txt,text/csv" hidden /></label>' +
          '<button class="btn" id="own-save" type="button" disabled>حفظ البنك</button>' +
        '</div>' +
        '<div id="own-msg" class="inline-msg" role="status"></div>' +
        '<div id="own-preview"></div>' +
      '</div>' +

      '<div class="panel">' +
        '<h3 class="panel__title">بنوكي المحفوظة</h3>' +
        (mine.length
          ? '<div class="table-wrap"><table class="table"><thead><tr><th>الاسم</th><th>العدد</th><th>التاريخ</th><th>الإجراءات</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
            '<p class="muted small">تظهر بنوكك في قائمة الدرس داخل الإعدادات تحت «أسئلتي»، وتُرسل مع رابط الصف تلقائيًا.</p>'
          : '<p class="muted">لا توجد بنوك محفوظة بعد.</p>') +
      '</div></div>';
  }

  var ownDraft = null;

  function bindOwn() {
    function msg(text, ok) {
      var el = $('own-msg');
      el.className = 'inline-msg ' + (ok ? 'inline-msg--ok' : 'inline-msg--bad');
      el.textContent = (ok ? '✅ ' : '⚠️ ') + text;
    }

    $('own-template').addEventListener('click', function () {
      U.downloadText('قالب-أسئلة-رحلة-الرياضيات.csv', MJ.OwnBank.template(), 'text/csv;charset=utf-8');
      FX.toast('تم تنزيل القالب. افتحه في Excel واكتب أسئلتك.', 'ok');
    });

    function check(text) {
      var name = $('own-name').value || 'أسئلتي';
      var rows = MJ.OwnBank.parse(text);
      if (!rows.length) { msg('لم أجد أي بيانات. الصق الخلايا أو ارفع ملف CSV.', false); return; }
      var res = MJ.OwnBank.build(name, rows);
      ownDraft = res.ok ? res.bank : null;
      $('own-save').disabled = !res.ok;

      var preview = res.bank.questions.slice(0, 5).map(function (q, i) {
        var correct = q.options.filter(function (o) { return o.id === q.correct; })[0];
        return '<tr><td>' + (i + 1) + '</td><td class="td-name">' + U.escapeHtml(q.prompt) + '</td>' +
          '<td>' + q.options.length + '</td><td>' + U.escapeHtml(correct.text) + '</td>' +
          '<td>' + q.level + '</td><td>' + (q.angle ? q.angle.degree + '°' : '—') + '</td></tr>';
      }).join('');

      $('own-preview').innerHTML =
        (res.errors.length
          ? '<div class="notice notice--warn"><b>أخطاء يجب تصحيحها (' + res.errors.length + '):</b><ul class="steps small">' +
            res.errors.slice(0, 8).map(function (e) { return '<li>' + U.escapeHtml(e) + '</li>'; }).join('') +
            (res.errors.length > 8 ? '<li>… وأخطاء أخرى</li>' : '') + '</ul></div>'
          : '') +
        (res.bank.questions.length
          ? '<p class="muted small">معاينة أول ' + Math.min(5, res.bank.questions.length) + ' أسئلة من أصل ' +
            res.bank.questions.length + ':</p>' +
            '<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>السؤال</th><th>الخيارات</th>' +
            '<th>الإجابة</th><th>المستوى</th><th>زاوية</th></tr></thead><tbody>' + preview + '</tbody></table></div>'
          : '');

      if (res.ok) msg('الأسئلة سليمة: ' + res.bank.questions.length + ' سؤالًا جاهزًا للحفظ.', true);
      else msg('صحّح الأخطاء أعلاه ثم أعد الفحص.', false);
    }

    $('own-check').addEventListener('click', function () { check($('own-paste').value); });

    $('own-file').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new global.FileReader();
      reader.onload = function () {
        $('own-paste').value = String(reader.result);
        if (!$('own-name').value) $('own-name').value = file.name.replace(/\.[^.]+$/, '');
        check($('own-paste').value);
      };
      reader.readAsText(file, 'utf-8');
      e.target.value = '';
    });

    $('own-save').addEventListener('click', function () {
      if (!ownDraft) return;
      ownDraft.name = $('own-name').value || ownDraft.name;
      var r = MJ.OwnBank.save(ownDraft);
      FX.toast(r.message, r.ok ? 'ok' : 'warn');
      if (r.ok) {
        var s = S.getSettings();
        s.lesson = r.id;
        S.setSettings(s);
        FX.confetti();
        ownDraft = null;
        render();
      }
    });

    doc.querySelectorAll('#teacher-view [data-use]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = S.getSettings();
        s.lesson = b.dataset.use;
        S.setSettings(s);
        FX.toast('صار «' + MJ.Banks[b.dataset.use].name + '» هو الدرس النشط.', 'ok');
        render();
      });
    });

    doc.querySelectorAll('#teacher-view [data-delbank]').forEach(function (b) {
      b.addEventListener('click', function () {
        MJ.UI.confirm({
          title: 'حذف بنك أسئلة',
          message: 'سيُحذف هذا البنك نهائيًا من هذا الجهاز.',
          okText: 'حذف', danger: true
        }).then(function (ok) {
          if (!ok) return;
          FX.toast(MJ.OwnBank.remove(b.dataset.delbank).message, 'ok');
          render();
        });
      });
    });
  }




  /* ================= مولّد الأسئلة بالذكاء الاصطناعي ================= */
  var AI_SUBJECTS = ["الرياضيات", "العلوم", "اللغة العربية", "اللغة الإنجليزية", "الدراسات الاجتماعية", "التربية الإسلامية", "تقنية المعلومات", "مادة أخرى"];
  var AI_GRADES = ["الصف الأول", "الصف الثاني", "الصف الثالث", "الصف الرابع", "الصف الخامس", "الصف السادس", "الصف السابع", "الصف الثامن", "الصف التاسع", "الصف العاشر", "الصف الحادي عشر", "الصف الثاني عشر"];

  function aiView() {
    var ready = MJ.Sync.isOn();
    return '<div class="tsection"><h2 class="tsection__title">مولّد الأسئلة</h2>' +

      (ready ? '' :
        '<div class="notice notice--warn"><b>يتطلب هذا القسم خادمك على Cloudflare.</b>' +
        '<p class="small">فعّل المزامنة من تبويب «مشاركة الصف»، ثم أضف مفتاح الذكاء الاصطناعي ' +
        'باسم <b>AI_KEY</b> في إعدادات الـ Worker. الخطوات في server/README-worker.md.</p></div>') +

      '<div class="panel">' +
        '<h3 class="panel__title">اكتب الموضوع ودع الباقي عليّ</h3>' +
        '<p class="muted small">أي مادة وأي صف. كلما كان الموضوع محددًا كانت الأسئلة أدق.</p>' +
        '<div class="settings-grid">' +
          '<label class="field"><span class="field__label">المادة</span>' +
          '<select class="field__input" id="ai-subject">' +
            AI_SUBJECTS.map(function (s) { return '<option>' + U.escapeHtml(s) + '</option>'; }).join('') +
          '</select></label>' +
          '<label class="field"><span class="field__label">الصف</span>' +
          '<select class="field__input" id="ai-grade">' +
            AI_GRADES.map(function (g) {
              return '<option' + (g === 'الصف الثامن' ? ' selected' : '') + '>' + U.escapeHtml(g) + '</option>';
            }).join('') +
          '</select></label>' +
          '<label class="field"><span class="field__label">عدد الأسئلة</span>' +
          '<select class="field__input" id="ai-count">' +
            [15, 20, 30, 40].map(function (c) { return '<option' + (c === 30 ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
          '</select></label>' +
          '<label class="field"><span class="field__label">مستوى الصعوبة</span>' +
          '<select class="field__input" id="ai-level">' +
            '<option>متدرّج</option><option>سهل</option><option>متوسط</option><option>متقدم</option>' +
          '</select></label>' +
        '</div>' +
        '<label class="field"><span class="field__label">موضوع الدرس</span>' +
        '<input class="field__input" id="ai-topic" type="text" ' +
        'placeholder="مثال: خصائص الزوايا ومجموع زوايا المثلث — أو: دورة حياة النبات" /></label>' +
        '<details class="bulk"><summary>الصق نص الدرس من الكتاب (اختياري لكنه يرفع الدقة كثيرًا)</summary>' +
          '<textarea class="field__input field__area" id="ai-notes" rows="7" ' +
          'placeholder="انسخ فقرات الدرس من الكتاب والصقها هنا، فتُبنى الأسئلة منها وحدها."></textarea>' +
        '</details>' +
        '<button class="btn btn--primary btn--lg" id="ai-run" type="button"' + (ready ? '' : ' disabled') + '>' +
        '🤖 ولّد الأسئلة</button>' +
        '<div id="ai-msg" class="inline-msg" role="status"></div>' +
      '</div>' +

      '<div class="panel"><h3 class="panel__title">النتيجة</h3><div id="ai-out">' +
        '<p class="muted">لم يبدأ التوليد بعد.</p></div></div>' +

      '<div class="panel">' +
        '<h3 class="panel__title">ملاحظات مهمة</h3>' +
        '<ul class="steps small">' +
          '<li>تُفحص كل الأسئلة آليًا: خيار صحيح واحد، بلا تكرار، بأرقام إنجليزية، ومع تلميح وشرح.</li>' +
          '<li>كل طالب يحصل على عيّنة مختلفة من البنك وبترتيب خيارات مختلف.</li>' +
          '<li><b>راجع الأسئلة قبل الحصة.</b> التوليد دقيق في الغالب لكنه ليس معصومًا، والمسؤولية عمّا يصل طلابك تبقى عليك.</li>' +
          '<li>لصق نص الدرس يجعل الأسئلة من الكتاب لا من معرفة عامة.</li>' +
        '</ul>' +
      '</div></div>';
  }

  var aiResult = null;

  function bindAI() {
    if (!$('ai-run')) return;

    function msg(text, ok) {
      var el = $('ai-msg');
      el.className = 'inline-msg ' + (ok === false ? 'inline-msg--bad' : 'inline-msg--ok');
      el.textContent = (ok === false ? '⚠️ ' : '⏳ ') + text;
    }

    $('ai-run').addEventListener('click', function () {
      $('ai-run').disabled = true;
      msg('جارٍ توليد الأسئلة… قد يستغرق نصف دقيقة.');

      MJ.AIGen.generate({
        subject: $('ai-subject').value,
        grade: $('ai-grade').value,
        topic: $('ai-topic').value,
        notes: $('ai-notes') ? $('ai-notes').value : '',
        level: $('ai-level').value,
        count: parseInt($('ai-count').value, 10) || 30
      }).then(function (result) {
        aiResult = result;
        var rows = result.questions.slice(0, 8).map(function (q, i) {
          var c = q.options.filter(function (o) { return o.id === q.correct; })[0];
          return '<tr><td>' + (i + 1) + '</td><td class="td-name">' + U.escapeHtml(q.prompt) + '</td>' +
            '<td>' + U.escapeHtml(c.text) + '</td><td>' + q.level + '</td></tr>';
        }).join('');

        $('ai-out').innerHTML =
          '<p><b>' + result.questions.length + ' سؤالًا</b> اجتازت الفحص من أصل ' + result.received +
          (result.dropped.length ? '، واستُبعد ' + result.dropped.length : '') + '.</p>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>السؤال</th>' +
          '<th>الإجابة الصحيحة</th><th>المستوى</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
          '<div class="formrow" style="margin-top:12px">' +
            '<button class="btn btn--primary" id="ai-save" type="button">اعتماد البنك وجعله الدرس النشط</button>' +
            '<button class="btn" id="ai-again" type="button">توليد من جديد</button>' +
          '</div>';

        msg('انتهى التوليد. راجع الأسئلة ثم اعتمدها.');
        $('ai-run').disabled = false;

        $('ai-save').addEventListener('click', function () {
          var r = MJ.AIGen.publish(aiResult);
          FX.toast(r.message, r.ok ? 'ok' : 'warn');
          if (r.ok) { FX.confetti(); render(); }
        });
        $('ai-again').addEventListener('click', function () { $('ai-run').click(); });
      }).catch(function (err) {
        msg(err.message, false);
        $('ai-run').disabled = false;
      });
    });
  }

  /* ================= النسخ الاحتياطي ================= */
  function backupView() {
    return '<div class="tsection"><h2 class="tsection__title">النسخ الاحتياطي</h2>' +
      '<div class="panel">' +
        '<p>احفظ نسخة من طلابك ونتائجهم، أو استعدها على جهاز آخر. الملف يخص حسابك وحدك.</p>' +
        '<p class="muted small">بيانات كل جهاز مستقلة: ما تسجّله هنا لا يظهر تلقائيًا على جهاز آخر، والاستيراد هو طريقة نقلها.</p>' +
        '<div class="formrow">' +
          '<button class="btn btn--primary" id="export-json" type="button">تصدير البيانات (JSON)</button>' +
          '<button class="btn" id="export-csv" type="button">تصدير النتائج (CSV)</button>' +
        '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 class="panel__title">استيراد البيانات</h3>' +
        '<div class="formrow">' +
          '<input class="field__input" id="import-file" type="file" accept="application/json,.json" />' +
          '<label class="field field--inline"><span class="field__label">طريقة الاستيراد</span>' +
            '<select class="field__input" id="import-mode">' +
              '<option value="replace">استبدال البيانات الحالية</option>' +
              '<option value="merge">دمج مع البيانات الحالية</option>' +
            '</select></label>' +
        '</div>' +
        '<div id="import-msg" class="inline-msg" role="status"></div>' +
      '</div>' +
      '<div class="panel panel--danger">' +
        '<h3 class="panel__title">منطقة الحذف</h3>' +
        '<p class="muted small">يحذف طلابك ونتائجهم ويعيد إعداداتك الافتراضية. حسابات المعلمين الآخرين لا تتأثر.</p>' +
        '<button class="btn btn--danger" id="wipe-all" type="button">حذف بيانات حسابي</button>' +
      '</div></div>';
  }

  function download(filename, content, mime) { return U.downloadText(filename, content, mime); }

  function bindBackup() {
    $('export-json').addEventListener('click', function () {
      var data = JSON.stringify(S.exportAll(), null, 2);
      var who = (MJ.Auth.current() || {}).number || 'data';
      var name = 'math-journey-' + who + '-' + new Date().toISOString().slice(0, 10) + '.json';
      FX.toast(download(name, data) ? 'تم تصدير ملف النسخة الاحتياطية.' : 'تعذّر التصدير في هذا المتصفح.', 'ok');
    });
    $('export-csv').addEventListener('click', function () {
      var csv = ST.resultsCSV();
      var name = 'math-journey-results-' + new Date().toISOString().slice(0, 10) + '.csv';
      FX.toast(download(name, csv, 'text/csv;charset=utf-8') ? 'تم تصدير ملف النتائج.' : 'تعذّر التصدير.', 'ok');
    });
    $('import-file').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      var msg = $('import-msg');
      if (!file) return;
      var reader = new global.FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          var res = S.importAll(data, $('import-mode').value);
          msg.className = 'inline-msg inline-msg--ok';
          msg.textContent = '✅ تم الاستيراد: ' + res.students + ' طالبًا و ' + res.results + ' نتيجة.';
          FX.toast('تم استيراد البيانات.', 'ok');
          view = 'overview'; render();
        } catch (err) {
          msg.className = 'inline-msg inline-msg--bad';
          msg.textContent = '⚠️ ' + (err.message || 'تعذّر قراءة الملف.');
        }
      };
      reader.onerror = function () {
        msg.className = 'inline-msg inline-msg--bad';
        msg.textContent = '⚠️ تعذّر قراءة الملف.';
      };
      reader.readAsText(file);
    });
    $('wipe-all').addEventListener('click', function () {
      MJ.UI.confirm({
        title: 'حذف جميع البيانات',
        message: 'سيُحذف جميع طلابك ونتائجهم نهائيًا وتعود إعداداتك إلى وضعها الافتراضي. صدّر نسخة احتياطية أولًا إن أردت.',
        okText: 'حذف كل شيء', danger: true
      }).then(function (ok) {
        if (!ok) return;
        S.wipeAll();
        FX.toast('تم حذف جميع البيانات.', 'ok');
        view = 'overview'; render();
      });
    });
  }

  MJ.Teacher = { open: open, render: render, closeModal: closeModal };

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
