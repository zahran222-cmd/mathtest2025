/* ============================================================
   رحلة الرياضيات — scoring.js
   النقاط، النجوم، التقييم، تحليل الأداء
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};

  var RANKS = [
    { min: 90, title: 'بطل الزوايا', icon: '🏆', note: 'أداء ممتاز! لقد أتقنت الزوايا.' },
    { min: 80, title: 'مستكشف رياضيات متميز', icon: '⭐', note: 'قريب جدًا من الإتقان الكامل.' },
    { min: 70, title: 'مغامر رياضي جيد', icon: '👏', note: 'أساس قوي ويحتاج لمسة أخيرة.' },
    { min: 60, title: 'تقدم جيد', icon: '👍', note: 'تقدّم واضح، واصل التمرين.' },
    { min: 0,  title: 'واصل التدريب', icon: '💪', note: 'راجع أنواع الزوايا ثم أعد الرحلة.' }
  ];

  function rankFor(percentage) {
    for (var i = 0; i < RANKS.length; i++) if (percentage >= RANKS[i].min) return RANKS[i];
    return RANKS[RANKS.length - 1];
  }

  /**
   * نقاط سؤال واحد
   * @param {object} o {isCorrect, timed, elapsedMs, hintUsed, settings}
   */
  function questionPoints(o) {
    var s = o.settings || MJ.Storage.getSettings();
    if (!o.isCorrect) return { points: 0, bonus: 0 };
    var pts = Number(s.pointsPerQuestion) || 10;
    var bonus = 0;
    if (o.timed && !o.hintUsed) {
      var fast = (Number(s.fastAnswerSeconds) || 10) * 1000;
      if (o.elapsedMs !== undefined && o.elapsedMs <= fast) bonus = Number(s.speedBonus) || 5;
    }
    return { points: pts, bonus: bonus };
  }

  /* نجوم المرحلة حسب نسبة الإجابات الصحيحة فيها */
  function starsForStage(correct, total) {
    if (!total) return 1;
    var p = (correct / total) * 100;
    if (p >= 90) return 3;
    if (p >= 60) return 2;
    return 1;
  }

  /* تحليل الأداء حسب الفئة */
  function analyze(answers) {
    var cats = {}, i, a;
    for (i = 0; i < answers.length; i++) {
      a = answers[i];
      if (!cats[a.category]) cats[a.category] = { total: 0, correct: 0 };
      cats[a.category].total++;
      if (a.isCorrect) cats[a.category].correct++;
    }
    var out = [];
    // الفئات المعروفة أولًا ثم أي فئة أخرى يقدّمها بنك الدرس الحالي
    var order = ['acute', 'right', 'obtuse', 'straight', 'measure', 'puzzle'];
    Object.keys(cats).forEach(function (k) { if (order.indexOf(k) === -1) order.push(k); });
    order.forEach(function (k) {
      if (!cats[k]) return;
      out.push({
        key: k,
        label: MJ.Questions.CATEGORY_LABEL[k] || k,
        total: cats[k].total,
        correct: cats[k].correct,
        percentage: Math.round((cats[k].correct / cats[k].total) * 100)
      });
    });
    return out;
  }

  /* إحصاءات الصف للمعلم */
  function classStats(results, students) {
    var st = students || [];
    var completed = {}, scores = [], i, r;
    for (i = 0; i < results.length; i++) {
      r = results[i];
      completed[r.studentId || r.studentName] = true;
      scores.push(r.percentage);
    }
    var high = scores.length ? Math.max.apply(null, scores) : 0;
    var low = scores.length ? Math.min.apply(null, scores) : 0;
    var avg = scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : 0;

    var totalQ = 0, totalC = 0;
    for (i = 0; i < results.length; i++) {
      totalQ += (results[i].correct + results[i].wrong);
      totalC += results[i].correct;
    }

    return {
      studentCount: st.length,
      completedCount: Object.keys(completed).length,
      attempts: results.length,
      highest: high,
      lowest: low,
      average: avg,
      accuracy: totalQ ? Math.round((totalC / totalQ) * 100) : 0
    };
  }

  MJ.Scoring = {
    RANKS: RANKS,
    rankFor: rankFor,
    questionPoints: questionPoints,
    starsForStage: starsForStage,
    analyze: analyze,
    classStats: classStats
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
