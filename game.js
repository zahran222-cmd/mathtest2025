/* ============================================================
   رحلة الرياضيات — game.js
   محرك الرحلة: الخريطة، عرض الأسئلة، التصحيح، النتائج، المراجعة
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var U = MJ.Utils, S = MJ.Storage, A = MJ.Angles, Q = MJ.Questions, SC = MJ.Scoring, FX = MJ.Effects;
  var doc = global.document;

  function $(id) { return doc.getElementById(id); }
  function el(tag, cls, html) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  var state = null;
  var settings = null;
  var keyHandlerBound = false;

  /* ---------------- بدء الرحلة ---------------- */
  function start(student) {
    if (!student || !student.id) {
      MJ.Effects.toast('تعذّر بدء الرحلة: بيانات الطالب غير مكتملة.', 'warn');
      MJ.App.show('student-login');
      return false;
    }
    // إعدادات معلم الطالب هي التي تحكم الرحلة
    S.setActiveTeacher(student.teacherId || S.getActiveTeacherId());
    settings = S.getSettings(student.teacherId);
    var journey = Q.buildJourney(settings);
    var total = journey.reduce(function (n, s) { return n + s.questions.length; }, 0);

    state = {
      student: student,
      journey: journey,
      totalQuestions: total,
      stageIndex: 0,
      qIndex: 0,
      answeredCount: 0,
      score: 0,
      stars: 0,
      stageStars: [],
      hintsLeft: Number(settings.hints) || 3,
      answers: [],
      startedAt: Date.now(),
      questionStartedAt: 0,
      hintUsed: false,
      locked: false,
      timerId: null,
      timeLeft: 0,
      finished: false
    };

    S.setSession({ studentId: student.id, studentName: student.name, startedAt: state.startedAt });
    bindKeys();
    renderMap();
    MJ.App.show('map');
    return true;
  }

  function abandon() {
    stopTimer();
    S.clearSession();
    state = null;
  }

  /* ---------------- شريط الحالة ---------------- */
  function hudHtml() {
    var pct = state.totalQuestions ? Math.round((state.answeredCount / state.totalQuestions) * 100) : 0;
    var stage = state.journey[state.stageIndex] ? state.journey[state.stageIndex].stage : null;
    return '' +
      '<div class="hud">' +
        '<div class="hud__chip hud__chip--name"><span class="hud__icon">🧭</span>' + U.escapeHtml(state.student.name) + '</div>' +
        '<div class="hud__chip"><span class="hud__icon">⭐</span><span class="hud__value">' + state.score + '</span><span class="hud__label">نقطة</span></div>' +
        '<div class="hud__chip"><span class="hud__icon">🌟</span><span class="hud__value">' + state.stars + '</span><span class="hud__label">نجمة</span></div>' +
        '<div class="hud__chip"><span class="hud__icon">' + (stage ? stage.icon : '🗺️') + '</span>المرحلة ' + (state.stageIndex + 1) + '</div>' +
        '<div class="hud__chip"><span class="hud__icon">💡</span><span class="hud__value">' + state.hintsLeft + '</span></div>' +
        '<div class="hud__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="تقدم الرحلة">' +
          '<div class="hud__bar" style="width:' + pct + '%"></div>' +
          '<span class="hud__pct">السؤال ' + Math.min(state.answeredCount + 1, state.totalQuestions) + ' من ' + state.totalQuestions + '</span>' +
        '</div>' +
      '</div>';
  }

  function paintHud(containerId) {
    var host = $(containerId);
    if (host) host.innerHTML = hudHtml();
  }

  /* ---------------- خريطة الرحلة ---------------- */
  function renderMap() {
    paintHud('map-hud');
    var host = $('map-stages');
    if (!host) return;
    host.innerHTML = '';

    state.journey.forEach(function (item, i) {
      var stage = item.stage;
      var locked = i > state.stageIndex;
      var done = i < state.stageIndex;
      var current = i === state.stageIndex && !state.finished;
      var starsGot = state.stageStars[i] || 0;

      var node = el('button', 'stage' +
        (locked ? ' stage--locked' : '') +
        (done ? ' stage--done' : '') +
        (current ? ' stage--current' : ''));
      node.type = 'button';
      node.setAttribute('aria-disabled', locked ? 'true' : 'false');

      var starsHtml = '';
      for (var s = 0; s < 3; s++) starsHtml += '<span class="stage__star' + (s < starsGot ? ' is-on' : '') + '">★</span>';

      node.innerHTML =
        '<span class="stage__badge">' + (locked ? '🔒' : stage.icon) + '</span>' +
        '<span class="stage__body">' +
          '<span class="stage__num">المرحلة ' + (i + 1) + '</span>' +
          '<span class="stage__title">' + stage.title + '</span>' +
          '<span class="stage__intro">' + (locked ? 'تُفتح بعد إنهاء المرحلة السابقة' : stage.intro) + '</span>' +
          '<span class="stage__stars">' + starsHtml + '</span>' +
        '</span>' +
        '<span class="stage__meta">' + item.questions.length + ' أسئلة</span>';

      if (!locked && !done) {
        node.addEventListener('click', function () { FX.sound.click(); enterStage(i); });
      } else if (done) {
        node.addEventListener('click', function () { FX.toast('أنهيت هذه المرحلة بالفعل. تقدّم إلى التالية!', 'info'); });
      } else {
        node.addEventListener('click', function () { FX.toast('هذه المرحلة مقفلة 🔒 أكمل المرحلة الحالية أولًا.', 'warn'); });
      }
      host.appendChild(node);
    });

    var guide = $('map-guide');
    if (guide) {
      var st = state.journey[state.stageIndex];
      guide.innerHTML = guideHtml(state.finished
        ? 'رحلتك اكتملت! افتح شاشة النتائج لترى كنزك.'
        : 'مرحبًا يا ' + U.escapeHtml(state.student.name) + '! وجهتك التالية: ' + st.stage.title + '.');
    }
  }

  function guideHtml(text) {
    return '' +
      '<div class="guide">' +
        '<div class="guide__avatar" aria-hidden="true">' + mascotSvg() + '</div>' +
        '<p class="guide__bubble">' + text + '</p>' +
      '</div>';
  }

  function mascotSvg() {
    return '<svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="المرشد قِياس">' +
      '<circle cx="32" cy="32" r="30" fill="var(--jade-700)"/>' +
      '<path d="M12 40 L32 12 L52 40 Z" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M22 40 A 14 14 0 0 1 42 40" fill="none" stroke="var(--gold-200)" stroke-width="2"/>' +
      '<circle cx="25" cy="34" r="3" fill="#0B1E2D"/><circle cx="39" cy="34" r="3" fill="#0B1E2D"/>' +
      '<path d="M26 43 Q32 48 38 43" fill="none" stroke="#0B1E2D" stroke-width="2.4" stroke-linecap="round"/>' +
      '</svg>';
  }

  /* ---------------- الدخول إلى مرحلة ---------------- */
  function enterStage(i) {
    state.stageIndex = i;
    state.qIndex = 0;
    MJ.App.show('game');
    renderQuestion();
  }

  /* ---------------- عرض السؤال ---------------- */
  function currentStage() { return state.journey[state.stageIndex]; }
  function currentQuestion() { return currentStage().questions[state.qIndex]; }

  function angleSvg(a, size, opts) {
    if (!a) return '';
    var o = opts || {};
    return A.generateAngle(a.degree, a.rotation || 0, size || 200, o);
  }

  function renderQuestion() {
    stopTimer();
    var q = currentQuestion();
    state.locked = false;
    state.hintUsed = false;
    state.questionStartedAt = Date.now();

    paintHud('game-hud');

    var stage = currentStage().stage;
    var host = $('question-area');
    host.innerHTML = '';

    var card = el('section', 'qcard');
    card.setAttribute('aria-live', 'polite');

    // ترويسة السؤال
    card.appendChild(el('div', 'qcard__top',
      '<span class="qcard__stage">' + stage.icon + ' ' + stage.title + '</span>' +
      '<span class="qcard__type">' + U.escapeHtml(q.typeName) + '</span>' +
      '<span class="qcard__level">' + Q.LEVEL_LABEL[q.level] + '</span>'));

    // المرشد
    card.appendChild(el('div', 'qcard__guide', guideHtml(U.escapeHtml(q.guide || 'فكر بهدوء، أنت قادر.'))));

    // نص السؤال
    card.appendChild(el('h2', 'qcard__prompt', U.escapeHtml(q.prompt)));

    // المؤقت
    if (q.timed) {
      card.appendChild(el('div', 'timer',
        '<div class="timer__bar"><div class="timer__fill" id="timer-fill"></div></div>' +
        '<span class="timer__text" id="timer-text">' + (Number(settings.timerSeconds) || 20) + ' ثانية</span>'));
    }

    // الرسم
    if (q.angle || q.svg) {
      var fig = el('figure', 'qcard__figure');
      fig.innerHTML = '<div class="angle-frame" id="angle-frame">' +
        (q.angle ? angleSvg(q.angle, 220) : q.svg) + '</div>';
      card.appendChild(fig);
    }

    // منطقة الإجابات
    var ans = el('div', 'answers');
    if (q.kind === 'text') {
      ans.className = 'answers answers--text';
      ans.innerHTML =
        '<label class="field">' +
          '<span class="field__label">اكتب إجابتك هنا</span>' +
          '<input class="field__input" id="text-answer" type="text" autocomplete="off" ' +
          'placeholder="' + U.escapeHtml(q.placeholder || 'اكتب نوع الزاوية') + '" />' +
        '</label>' +
        '<button class="btn btn--primary" id="text-submit" type="button">تأكيد الإجابة</button>';
    } else if (q.kind === 'pick' || q.kind === 'odd') {
      ans.className = 'answers answers--grid';
      q.options.forEach(function (o, idx) {
        var b = el('button', 'opt opt--figure');
        b.type = 'button';
        b.dataset.optId = o.id;
        b.innerHTML = '<span class="opt__key">' + (idx + 1) + '</span>' +
          '<span class="opt__fig">' + (o.angle ? angleSvg(o.angle, 150) : (o.svg || '')) + '</span>' +
          (o.text ? '<span class="opt__cap">' + U.escapeHtml(o.text) + '</span>' : '');
        b.setAttribute('aria-label', 'الخيار رقم ' + (idx + 1));
        ans.appendChild(b);
      });
    } else {
      ans.className = 'answers answers--list' + (q.options.length === 2 ? ' answers--pair' : '');
      q.options.forEach(function (o, idx) {
        var b = el('button', 'opt');
        b.type = 'button';
        b.dataset.optId = o.id;
        b.innerHTML = '<span class="opt__key">' + (idx + 1) + '</span><span class="opt__text">' + U.escapeHtml(o.text) + '</span>';
        ans.appendChild(b);
      });
    }
    card.appendChild(ans);

    // أدوات
    var tools = el('div', 'qtools');
    tools.innerHTML =
      '<button class="btn btn--ghost" id="hint-btn" type="button">💡 تلميح (' + state.hintsLeft + ')</button>' +
      '<div class="qtools__spacer"></div>' +
      '<button class="btn btn--primary btn--next" id="next-btn" type="button" hidden>التالي ←</button>';
    card.appendChild(tools);

    // التغذية الراجعة
    card.appendChild(el('div', 'feedback', ''));

    host.appendChild(card);

    // الأحداث
    if (q.kind === 'text') {
      var input = $('text-answer');
      $('text-submit').addEventListener('click', function () { submit(input.value); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submit(input.value); }
      });
      input.focus();
    } else {
      Array.prototype.forEach.call(ans.querySelectorAll('.opt'), function (b) {
        b.addEventListener('click', function () { submit(b.dataset.optId, b); });
      });
    }

    $('hint-btn').addEventListener('click', useHint);
    $('next-btn').addEventListener('click', next);

    if (q.timed) startTimer(Number(settings.timerSeconds) || 20);
  }

  /* ---------------- المؤقت ---------------- */
  function startTimer(seconds) {
    state.timeLeft = seconds;
    var fill = $('timer-fill'), text = $('timer-text');
    if (fill) fill.style.width = '100%';
    state.timerId = global.setInterval(function () {
      state.timeLeft -= 1;
      if (text) text.textContent = Math.max(0, state.timeLeft) + ' ثانية';
      if (fill) fill.style.width = Math.max(0, (state.timeLeft / seconds) * 100) + '%';
      if (state.timeLeft <= 3 && state.timeLeft > 0) FX.sound.tick();
      if (state.timeLeft <= 0) {
        stopTimer();
        if (!state.locked) submit(null);
      }
    }, 1000);
  }
  function stopTimer() {
    if (state && state.timerId) { global.clearInterval(state.timerId); state.timerId = null; }
  }

  /* ---------------- التلميح ---------------- */
  function useHint() {
    if (state.locked) return;
    if (state.hintUsed) { FX.toast('استخدمت التلميح لهذا السؤال.', 'info'); return; }
    if (state.hintsLeft <= 0) { FX.toast('انتهت تلميحاتك في هذه الرحلة.', 'warn'); return; }
    var q = currentQuestion();
    state.hintsLeft--;
    state.hintUsed = true;
    FX.sound.click();
    var fb = doc.querySelector('.feedback');
    if (fb) {
      fb.className = 'feedback feedback--hint';
      fb.innerHTML = '<strong>💡 تلميح:</strong> ' + U.escapeHtml(q.hint || 'قارن الزاوية بـ 90°.');
    }
    var hb = $('hint-btn');
    if (hb) { hb.textContent = '💡 تلميح (' + state.hintsLeft + ')'; hb.disabled = true; }
    paintHud('game-hud');
  }

  /* ---------------- إرسال الإجابة ---------------- */
  function answerTextOf(q, value) {
    if (q.kind === 'text') return String(value === null ? '' : value).trim() || 'بدون إجابة';
    if (value === null) return 'انتهى الوقت';
    if (q.kind === 'pick' || q.kind === 'odd') {
      var idx = 0, i;
      for (i = 0; i < q.options.length; i++) if (q.options[i].id === value) idx = i + 1;
      var opt = q.options.filter(function (o) { return o.id === value; })[0];
      return 'الخيار ' + idx + (opt && opt.angle ? ' (' + opt.angle.degree + '°)' : '');
    }
    var o = q.options.filter(function (x) { return x.id === value; })[0];
    return o ? o.text : 'بدون إجابة';
  }

  function correctTextOf(q) {
    if (q.kind === 'text') return q.correctText;
    if (q.kind === 'pick' || q.kind === 'odd') {
      var idx = 0, i;
      for (i = 0; i < q.options.length; i++) if (q.options[i].id === q.correct) idx = i + 1;
      var opt = q.options.filter(function (o) { return o.id === q.correct; })[0];
      return 'الخيار ' + idx + (opt && opt.angle ? ' (زاوية ' + opt.angle.degree + '°)' : '');
    }
    var c = q.options.filter(function (x) { return x.id === q.correct; })[0];
    return c ? c.text : '';
  }

  function submit(value, buttonEl) {
    if (state.locked) return;
    var q = currentQuestion();
    stopTimer();
    state.locked = true;

    var isCorrect = false;
    if (q.kind === 'text') {
      var matched = A.matchTypeText(value);
      isCorrect = matched !== null && matched === q.answerKey;
    } else {
      isCorrect = value !== null && value === q.correct;
    }

    var elapsed = Date.now() - state.questionStartedAt;
    var pts = SC.questionPoints({
      isCorrect: isCorrect, timed: !!q.timed, elapsedMs: elapsed,
      hintUsed: state.hintUsed, settings: settings
    });
    state.score += pts.points + pts.bonus;
    state.answeredCount++;

    var displayAngle = q.angle || null;
    if (!displayAngle && (q.kind === 'pick' || q.kind === 'odd')) {
      var co = q.options.filter(function (o) { return o.id === q.correct; })[0];
      displayAngle = co ? co.angle : null;
    }

    state.answers.push({
      qid: q.id,
      prompt: q.prompt,
      typeName: q.typeName,
      category: q.category,
      level: q.level,
      stageId: q.stageId,
      angle: displayAngle,
      studentAnswer: answerTextOf(q, value),
      correctAnswer: correctTextOf(q),
      isCorrect: isCorrect,
      explanation: q.explanation,
      hintUsed: state.hintUsed,
      elapsedMs: elapsed,
      points: pts.points + pts.bonus
    });

    lockAnswers(q, value);
    showFeedback(q, isCorrect, pts, value === null);
    paintHud('game-hud');

    if (isCorrect) {
      FX.sound.correct();
      FX.confetti(28);
      if (buttonEl) FX.pop(buttonEl);
    } else {
      FX.sound.wrong();
      FX.shake(doc.querySelector('.qcard'));
    }

    var nb = $('next-btn');
    nb.hidden = false;
    var last = (state.qIndex === currentStage().questions.length - 1);
    nb.textContent = last
      ? (state.stageIndex === state.journey.length - 1 ? 'أنهِ الرحلة 🏁' : 'أكمل المرحلة ←')
      : 'التالي ←';
    nb.focus();
  }

  function lockAnswers(q, value) {
    var hintBtn = $('hint-btn');
    if (hintBtn) hintBtn.disabled = true;

    if (q.kind === 'text') {
      var input = $('text-answer'), sb = $('text-submit');
      if (input) { input.disabled = true; input.classList.add('is-locked'); }
      if (sb) sb.disabled = true;
      return;
    }
    Array.prototype.forEach.call(doc.querySelectorAll('.opt'), function (b) {
      b.disabled = true;
      if (b.dataset.optId === q.correct) b.classList.add('opt--correct');
      if (value !== null && b.dataset.optId === value && value !== q.correct) b.classList.add('opt--wrong');
    });

    // كشف القياس على الرسم بعد الإجابة
    if (q.showMeasureOnReveal) {
      var frame = $('angle-frame');
      if (frame && q.angle) frame.innerHTML = angleSvg(q.angle, 220, { showMeasure: true });
      Array.prototype.forEach.call(doc.querySelectorAll('.opt--figure'), function (b) {
        var o = q.options.filter(function (x) { return x.id === b.dataset.optId; })[0];
        if (o && o.angle) {
          var figHost = b.querySelector('.opt__fig');
          if (figHost) figHost.innerHTML = angleSvg(o.angle, 150, { showMeasure: true, labels: false });
        }
      });
    }
  }

  function showFeedback(q, isCorrect, pts, timedOut) {
    var fb = doc.querySelector('.feedback');
    if (!fb) return;
    if (isCorrect) {
      fb.className = 'feedback feedback--ok';
      fb.innerHTML = '<strong>🎉 أحسنت!</strong> إجابة صحيحة، لقد اكتشفت الزاوية! ' +
        '<span class="feedback__pts">+' + pts.points + (pts.bonus ? ' <em>و +' + pts.bonus + ' نقاط سرعة ⚡</em>' : '') + '</span>' +
        '<span class="feedback__why">' + U.escapeHtml(q.explanation) + '</span>';
    } else {
      fb.className = 'feedback feedback--no';
      fb.innerHTML = '<strong>' + (timedOut ? '⏱️ انتهى الوقت' : 'ليست الإجابة الصحيحة، لكن لا بأس!') + '</strong> ' +
        (timedOut ? 'لا بأس، السرعة تأتي مع التمرين.' : 'تعلمنا شيئًا جديدًا.') +
        '<span class="feedback__correct">الإجابة الصحيحة هي: <b>' + U.escapeHtml(correctTextOf(q)) + '</b></span>' +
        '<span class="feedback__why">' + U.escapeHtml(q.explanation) + '</span>';
    }
  }

  /* ---------------- الانتقال ---------------- */
  function next() {
    var stage = currentStage();
    if (state.qIndex < stage.questions.length - 1) {
      state.qIndex++;
      renderQuestion();
      return;
    }
    finishStage();
  }

  function finishStage() {
    var stage = currentStage();
    var ids = {}, i;
    stage.questions.forEach(function (q) { ids[q.id] = true; });
    var stageAnswers = state.answers.filter(function (a) { return ids[a.qid]; });
    var correct = stageAnswers.filter(function (a) { return a.isCorrect; }).length;
    var stars = SC.starsForStage(correct, stageAnswers.length);
    state.stageStars[state.stageIndex] = stars;
    state.stars += stars;

    FX.sound.stage();
    FX.confetti(70);

    var host = $('stage-done-body');
    var starsHtml = '';
    for (i = 0; i < 3; i++) starsHtml += '<span class="bigstar' + (i < stars ? ' is-on' : '') + '" style="animation-delay:' + (i * 0.15) + 's">★</span>';

    var isLast = state.stageIndex === state.journey.length - 1;
    host.innerHTML =
      '<div class="stagedone">' +
        '<div class="stagedone__icon">' + stage.stage.icon + '</div>' +
        '<h2 class="stagedone__title">اجتزت ' + stage.stage.title + '</h2>' +
        '<div class="stagedone__stars">' + starsHtml + '</div>' +
        '<p class="stagedone__stats">أجبت بشكل صحيح عن ' + correct + ' من ' + stageAnswers.length +
        ' · رصيدك ' + state.score + ' نقطة</p>' +
        guideHtml(isLast ? 'الخزينة أمامك مباشرة… لنرَ ما جمعته!' : 'أحسنت! المرحلة التالية فُتحت لك.') +
        '<button class="btn btn--primary btn--lg" id="stage-continue" type="button">' +
          (isLast ? 'افتح خزينة الكنز 💎' : 'إلى الخريطة 🗺️') + '</button>' +
      '</div>';

    MJ.App.show('stage-done');
    $('stage-continue').addEventListener('click', function () {
      FX.sound.click();
      if (isLast) { finish(); return; }
      state.stageIndex++;
      state.qIndex = 0;
      renderMap();
      MJ.App.show('map');
    });
  }

  /* ---------------- إنهاء الرحلة ---------------- */
  function finish() {
    state.finished = true;
    stopTimer();

    var correct = state.answers.filter(function (a) { return a.isCorrect; }).length;
    var wrong = state.answers.length - correct;
    var maxScore = state.totalQuestions * (Number(settings.pointsPerQuestion) || 10);
    var percentage = maxScore ? Math.round((state.score / maxScore) * 100) : 0;
    if (percentage > 100) percentage = 100;
    var elapsed = Date.now() - state.startedAt;
    var rank = SC.rankFor(percentage);

    var result = {
      id: U.uid('res'),
      studentId: state.student.id,
      studentName: state.student.name,
      teacherId: state.student.teacherId || null,
      score: state.score,
      maxScore: maxScore,
      percentage: percentage,
      correct: correct,
      wrong: wrong,
      stars: state.stars,
      timeMs: elapsed,
      timeText: U.formatTime(elapsed),
      createdAt: Date.now(),
      date: U.formatDate(Date.now()),
      rankTitle: rank.title,
      rankIcon: rank.icon,
      hintsUsed: (Number(settings.hints) || 3) - state.hintsLeft,
      lesson: settings.lesson || 'angles',
      categoryStats: SC.analyze(state.answers),
      answers: state.answers
    };

    MJ.Students.saveResult(result);
    cloudSubmit(result);
    S.clearSession();
    state.lastResult = result;

    renderResults(result);
    MJ.App.show('results');
    if (percentage >= 60) FX.confetti(160);
  }

  /* ---------------- شاشة النتائج ---------------- */
  function renderResults(result) {
    var host = $('results-body');
    var rank = SC.rankFor(result.percentage);
    var win = result.percentage >= 90;

    var catsHtml = result.categoryStats.map(function (c) {
      return '<div class="bar">' +
        '<div class="bar__label">' + U.escapeHtml(c.label) + '</div>' +
        '<div class="bar__track"><div class="bar__fill" style="width:' + c.percentage + '%"></div></div>' +
        '<div class="bar__value">' + c.percentage + '%</div>' +
      '</div>';
    }).join('');

    host.innerHTML =
      '<div class="result">' +
        '<div class="result__crown">' + rank.icon + '</div>' +
        '<h2 class="result__title">' + (win ? 'لقد أصبحت بطل الزوايا!' : 'لقد وصلت إلى نهاية الرحلة!') + '</h2>' +
        '<p class="result__sub">' + (win ? 'الكنز صار ملكك يا ' + U.escapeHtml(result.studentName) + '.' :
          'مغامرتك القادمة ستكون أقوى يا ' + U.escapeHtml(result.studentName) + '.') + '</p>' +

        '<div class="result__score">' +
          '<span class="result__big">' + result.score + '</span>' +
          '<span class="result__of">من ' + result.maxScore + '</span>' +
        '</div>' +

        '<div class="result__grid">' +
          '<div class="stat"><span class="stat__v">' + result.percentage + '%</span><span class="stat__k">النسبة</span></div>' +
          '<div class="stat"><span class="stat__v">' + result.correct + '</span><span class="stat__k">إجابات صحيحة</span></div>' +
          '<div class="stat"><span class="stat__v">' + result.wrong + '</span><span class="stat__k">إجابات خاطئة</span></div>' +
          '<div class="stat"><span class="stat__v">' + result.timeText + '</span><span class="stat__k">الوقت</span></div>' +
          '<div class="stat"><span class="stat__v">' + result.stars + ' ★</span><span class="stat__k">النجوم</span></div>' +
          '<div class="stat"><span class="stat__v">' + result.hintsUsed + '</span><span class="stat__k">تلميحات مستخدمة</span></div>' +
        '</div>' +

        '<div class="result__rank">' + rank.icon + ' ' + rank.title + ' — ' + rank.note + '</div>' +

        '<h3 class="result__h3">أداؤك حسب المهارة</h3>' +
        '<div class="bars">' + catsHtml + '</div>' +

        '<div class="result__actions">' +
          ((MJ.Share && MJ.Share.isLinkClass(result.teacherId))
            ? '<button class="btn btn--primary btn--lg" id="send-result" type="button">📤 أرسل نتيجتي للمعلم</button>' : '') +
          '<button class="btn btn--lg" id="review-btn" type="button">راجع أخطائي 🔍</button>' +
          '<button class="btn btn--ghost" id="exit-btn" type="button">إنهاء والخروج</button>' +
        '</div>' +
      '</div>';

    $('review-btn').addEventListener('click', function () { renderReview(result); MJ.App.show('review'); });

    if ($('send-result')) {
      $('send-result').addEventListener('click', function () { renderSendCode(result); });
    }
    $('exit-btn').addEventListener('click', function () {
      abandon();
      MJ.App.show('home');
    });
  }


  /* إرسال تلقائي إلى خادم المعلم إن كان الصف مربوطًا */
  function cloudSubmit(result) {
    if (!MJ.Sync || !MJ.Sync.canSubmit(result.teacherId)) return;
    MJ.Sync.submitResult(result).then(function () {
      MJ.Effects.toast('تم إرسال نتيجتك إلى معلمك تلقائيًا ✓', 'ok');
      var btn = $('send-result');
      if (btn) btn.textContent = '✓ وصلت نتيجتك للمعلم';
    }).catch(function () {
      MJ.Effects.toast('تعذّر الإرسال الآن، ستُرسل تلقائيًا عند عودة الإنترنت.', 'warn');
    });
  }

  /* ---------------- إرسال النتيجة إلى المعلم بكود ---------------- */
  function renderSendCode(result) {
    var code = MJ.Share.encodeResult(result);
    var box = $('send-code');
    box.value = code;
    $('send-msg').textContent = '';
    $('send-msg').className = 'inline-msg';

    $('copy-result').onclick = function () {
      box.select();
      var done = false;
      try { done = doc.execCommand && doc.execCommand('copy'); } catch (e) { done = false; }
      var msg = $('send-msg');
      if (!done && global.navigator && global.navigator.clipboard) {
        global.navigator.clipboard.writeText(code).then(function () {
          msg.className = 'inline-msg inline-msg--ok';
          msg.textContent = '✅ تم نسخ الكود. أرسله لمعلمك.';
        });
        return;
      }
      msg.className = 'inline-msg ' + (done ? 'inline-msg--ok' : 'inline-msg--bad');
      msg.textContent = done ? '✅ تم نسخ الكود. أرسله لمعلمك.' : '⚠️ انسخ النص يدويًا من الحقل.';
    };

    $('download-result').onclick = function () {
      var name = 'نتيجة-' + result.studentName.replace(/\s+/g, '-') + '.txt';
      U.downloadText(name, code, 'text/plain');
      $('send-msg').className = 'inline-msg inline-msg--ok';
      $('send-msg').textContent = '✅ تم تنزيل الملف. أرسله لمعلمك.';
    };

    $('send-back').onclick = function () { MJ.App.show('results'); };
    MJ.App.show('send');
  }

  /* ---------------- مراجعة الأخطاء ---------------- */
  function renderReview(result) {
    var host = $('review-body');
    var wrongs = result.answers.filter(function (a) { return !a.isCorrect; });

    if (!wrongs.length) {
      host.innerHTML = '<div class="review-empty">' +
        '<div class="review-empty__icon">🌟</div>' +
        '<h2>لا توجد أخطاء لمراجعتها</h2>' +
        '<p>أجبت عن كل الأسئلة إجابة صحيحة. أداء مثالي!</p>' +
        '</div>';
    } else {
      host.innerHTML = '<p class="review-lead">هذه الأسئلة التي أخطأت فيها. راجعها بهدوء، فهي أسرع طريق للإتقان.</p>' +
        wrongs.map(function (a, i) {
          return '<article class="review-item">' +
            '<div class="review-item__fig">' + (a.angle ? angleSvg(a.angle, 170, { showMeasure: true }) : '<div class="review-item__nofig">🧩</div>') + '</div>' +
            '<div class="review-item__body">' +
              '<span class="review-item__tag">' + U.escapeHtml(a.typeName) + '</span>' +
              '<h3 class="review-item__q">' + (i + 1) + '. ' + U.escapeHtml(a.prompt) + '</h3>' +
              '<p class="review-item__row review-item__row--bad"><span>إجابتك:</span> ' + U.escapeHtml(a.studentAnswer) + '</p>' +
              '<p class="review-item__row review-item__row--good"><span>الإجابة الصحيحة:</span> ' + U.escapeHtml(a.correctAnswer) + '</p>' +
              '<p class="review-item__why">' + U.escapeHtml(a.explanation) + '</p>' +
            '</div>' +
          '</article>';
        }).join('');
    }

    var back = $('review-back');
    if (back && !back.dataset.bound) {
      back.dataset.bound = '1';
      back.addEventListener('click', function () { MJ.App.show('results'); });
    }
  }

  /* ---------------- اختصارات لوحة المفاتيح ---------------- */
  function bindKeys() {
    if (keyHandlerBound || !doc) return;
    keyHandlerBound = true;
    doc.addEventListener('keydown', function (e) {
      var gameScreen = $('screen-game');
      if (!gameScreen || gameScreen.classList.contains('is-hidden')) return;
      if (!state || state.finished) return;
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea') return;

      if (/^[1-9]$/.test(e.key) && !state.locked) {
        var opts = doc.querySelectorAll('#question-area .opt');
        var idx = parseInt(e.key, 10) - 1;
        if (opts[idx]) { opts[idx].click(); e.preventDefault(); }
      } else if (e.key === 'Enter' && state.locked) {
        var nb = $('next-btn');
        if (nb && !nb.hidden) { nb.click(); e.preventDefault(); }
      } else if (e.key.toLowerCase() === 'h' && !state.locked) {
        useHint();
      }
    });
  }

  MJ.Game = {
    start: start,
    abandon: abandon,
    renderMap: renderMap,
    renderReview: renderReview,
    getState: function () { return state; },
    // للاختبار الآلي
    _submit: function (v) { submit(v); },
    _next: function () { next(); }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
