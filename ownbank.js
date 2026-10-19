/* ============================================================
   رحلة الرياضيات — ownbank.js
   بنوك أسئلة يكتبها المعلم بنفسه في Excel.
   ثلاث طرق للإدخال:
     1) نسخ الخلايا من Excel ولصقها مباشرة (مفصولة بـ Tab)
     2) رفع ملف CSV محفوظ من Excel
     3) تنزيل قالب جاهز وتعبئته
   ترتيب الأعمدة:
     السؤال | الخيار1 | الخيار2 | الخيار3 | الخيار4 | الإجابة | المستوى | التلميح | الشرح | زاوية
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var U = MJ.Utils, S = MJ.Storage;
  var KEY = 'mathJourney_ownbanks';

  MJ.Banks = MJ.Banks || {};

  var HEADERS = ['السؤال', 'الخيار1', 'الخيار2', 'الخيار3', 'الخيار4',
    'الإجابة', 'المستوى', 'التلميح', 'الشرح', 'زاوية'];

  /* ---------------- قراءة الملفات ---------------- */
  function splitCsvLine(line, sep) {
    var out = [], cur = '', quoted = false, i, ch;
    for (i = 0; i < line.length; i++) {
      ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === sep && !quoted) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(function (c) { return String(c).replace(/^\uFEFF/, '').trim(); });
  }

  function parse(text) {
    var raw = String(text || '').replace(/\r\n?/g, '\n').split('\n')
      .filter(function (l) { return l.trim() !== ''; });
    if (!raw.length) return [];
    var sep = raw[0].indexOf('\t') !== -1 ? '\t' : (raw[0].indexOf(';') !== -1 ? ';' : ',');
    var rows = raw.map(function (l) { return splitCsvLine(l, sep); });
    // تجاهل صف العناوين إن وُجد
    var first = (rows[0][0] || '');
    if (/السؤال|سؤال|question/i.test(first) && /خيار|option/i.test(rows[0][1] || '')) rows.shift();
    return rows;
  }

  /* موضع الإجابة الصحيحة: رقم، أو حرف عربي/إنجليزي، أو نص مطابق لأحد الخيارات */
  function correctIndex(value, options) {
    var v = String(value || '').trim();
    if (!v) return -1;
    var num = parseInt(v.replace(/[^\d]/g, ''), 10);
    if (num >= 1 && num <= options.length) return num - 1;
    var letters = { 'أ': 0, 'ا': 0, 'ب': 1, 'ج': 2, 'د': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
    if (letters[v.toLowerCase()] !== undefined && letters[v.toLowerCase()] < options.length) {
      return letters[v.toLowerCase()];
    }
    var norm = U.normalizeArabic(v);
    for (var i = 0; i < options.length; i++) {
      if (U.normalizeArabic(options[i]) === norm) return i;
    }
    return -1;
  }

  /* ---------------- بناء البنك من الصفوف ---------------- */
  function build(name, rows) {
    var errors = [], questions = [];

    rows.forEach(function (r, idx) {
      var line = idx + 1;
      var prompt = (r[0] || '').trim();
      if (!prompt) { errors.push('السطر ' + line + ': نص السؤال فارغ.'); return; }

      var options = [r[1], r[2], r[3], r[4]].map(function (x) { return String(x || '').trim(); })
        .filter(function (x) { return x !== ''; });
      if (options.length < 2) { errors.push('السطر ' + line + ': يجب كتابة خيارين على الأقل.'); return; }

      var ci = correctIndex(r[5], options);
      if (ci === -1) {
        errors.push('السطر ' + line + ': الإجابة الصحيحة غير واضحة. اكتب رقم الخيار (1 إلى ' + options.length + ') أو نصّه.');
        return;
      }

      var seen = {}, dup = false;
      options.forEach(function (o) { var k = U.normalizeArabic(o); if (seen[k]) dup = true; seen[k] = true; });
      if (dup) { errors.push('السطر ' + line + ': يوجد خياران متطابقان.'); return; }

      var level = parseInt(r[6], 10);
      if (!(level >= 1 && level <= 4)) level = 0;      // 0 = يُوزَّع تلقائيًا

      var angle = parseInt(r[9], 10);
      var hasAngle = angle >= 0 && angle <= 360;

      questions.push({
        id: 'own-' + Date.now().toString(36) + '-' + line,
        level: level,
        category: 'own',
        typeName: 'سؤال المعلم',
        kind: 'mcq',
        prompt: prompt,
        angle: hasAngle ? { degree: angle, rotation: 0 } : null,
        randomizeRotation: hasAngle,
        options: options.map(function (text, i) { return { id: 'o' + i, text: text }; }),
        correct: 'o' + ci,
        hint: (r[7] || '').trim() || 'اقرأ السؤال بتأنٍّ، وابحث عن الكلمة المفتاحية فيه.',
        explanation: (r[8] || '').trim() || 'الإجابة الصحيحة هي: ' + options[ci] + '.',
        timed: false
      });
    });

    if (questions.length < 5) {
      errors.push('البنك يحتاج 5 أسئلة صالحة على الأقل، والموجود ' + questions.length + '.');
    }

    // توزيع المستويات تلقائيًا لمن لم يحدده المعلم
    var auto = questions.filter(function (q) { return q.level === 0; });
    auto.forEach(function (q, i) {
      q.level = Math.min(4, Math.floor(i / Math.max(1, Math.ceil(auto.length / 4))) + 1);
    });

    return {
      ok: errors.length === 0,
      errors: errors,
      bank: {
        id: null,
        name: String(name || 'أسئلتي').trim() || 'أسئلتي',
        own: true,
        questions: questions,
        stages: stagesForOwn(),
        categories: { own: 'أسئلة المعلم', challenge: 'أسئلة التحدي' }
      }
    };
  }

  function stagesForOwn() {
    return [
      { id: 1, title: 'بوابة الانطلاق', icon: '🏰', color: 'jade',
        intro: 'أسئلة معلمك تنتظرك. ابدأ بالأسهل.',
        filter: function (q) { return q.level === 1; } },
      { id: 2, title: 'وادي التطبيق', icon: '🌲', color: 'violet',
        intro: 'طبّق ما فهمته، ولا تتعجل.',
        filter: function (q) { return q.level === 2; } },
      { id: 3, title: 'كهف التحليل', icon: '🕳️', color: 'teal',
        intro: 'هنا تحتاج إلى تفكير أعمق قليلًا.',
        filter: function (q) { return q.level === 3; } },
      { id: 4, title: 'قلعة الإتقان', icon: '🏯', color: 'gold',
        intro: 'اقتربت من الكنز، فأتقن كل خطوة.',
        filter: function (q) { return q.level === 4; } },
      { id: 5, title: 'مرحلة التحدي', icon: '💎', color: 'rose',
        intro: 'أصعب ما لدى معلمك… أرِه ما تستطيع.',
        filter: function (q) { return q.level >= 3; } }
    ];
  }

  /* ---------------- الحفظ والتسجيل ---------------- */
  function readAll() {
    try {
      var raw = global.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function writeAll(map) {
    try { global.localStorage.setItem(KEY, JSON.stringify(map)); return true; }
    catch (e) { return false; }
  }

  var Own = {
    HEADERS: HEADERS,
    parse: parse,
    build: build,

    /* بنوك المعلم النشط */
    list: function (teacherId) {
      var id = teacherId || S.getActiveTeacherId();
      var all = readAll();
      return (all[id] || []).slice();
    },

    save: function (bank, teacherId) {
      var id = teacherId || S.getActiveTeacherId();
      if (!id) return { ok: false, message: 'يجب تسجيل الدخول أولًا.' };
      var all = readAll();
      var mine = all[id] || [];
      var slug = 'own_' + id + '_' + Date.now().toString(36);
      var exists = mine.filter(function (b) { return b.name === bank.name; })[0];
      bank.id = exists ? exists.id : slug;
      bank.createdAt = Date.now();
      bank.teacherId = id;
      mine = mine.filter(function (b) { return b.id !== bank.id; });
      mine.push({ id: bank.id, name: bank.name, createdAt: bank.createdAt, questions: bank.questions });
      all[id] = mine;
      if (!writeAll(all)) return { ok: false, message: 'تعذّر الحفظ: مساحة المتصفح ممتلئة.' };
      this.registerAll(id);
      return { ok: true, message: 'تم حفظ «' + bank.name + '» (' + bank.questions.length + ' سؤالًا).', id: bank.id };
    },

    remove: function (bankId, teacherId) {
      var id = teacherId || S.getActiveTeacherId();
      var all = readAll();
      all[id] = (all[id] || []).filter(function (b) { return b.id !== bankId; });
      writeAll(all);
      delete MJ.Banks[bankId];
      if (MJ.Curriculum) MJ.Curriculum.dropCustom(bankId);
      var s = S.getSettings(id);
      if (s.lesson === bankId) { s.lesson = 'u3l2'; S.setSettings(s, id); }
      return { ok: true, message: 'تم حذف البنك.' };
    },

    /* تسجيل بنوك المعلم في المحرك وفي قائمة الدروس */
    registerAll: function (teacherId) {
      var mine = this.list(teacherId), i;
      for (i = 0; i < mine.length; i++) this.register(mine[i]);
      return mine.length;
    },

    register: function (saved) {
      MJ.Banks[saved.id] = {
        id: saved.id,
        name: saved.name,
        own: true,
        questions: saved.questions,
        stages: stagesForOwn(),
        categories: { own: 'أسئلة المعلم', challenge: 'أسئلة التحدي' }
      };
      if (MJ.Curriculum) MJ.Curriculum.addCustom({ id: saved.id, name: saved.name, code: '★' });
      return MJ.Banks[saved.id];
    },

    /* قالب جاهز بصيغة CSV يفتحه Excel مباشرة */
    template: function () {
      var rows = [HEADERS];
      rows.push(['ما ناتج 7 × 8؟', '54', '56', '48', '64', '2', '1',
        'تذكر جدول الضرب للعدد 7.', '7 × 8 = 56.', '']);
      rows.push(['زاوية قياسها 120° تُسمى…', 'حادة', 'قائمة', 'منفرجة', 'مستقيمة', '3', '1',
        'قارنها بالزاوية القائمة 90°.', 'لأنها أكبر من 90° وأصغر من 180°.', '120']);
      rows.push(['إذا كان س + 5 = 12 فما قيمة س؟', '5', '6', '7', '17', '7', '2',
        'اطرح 5 من الطرفين.', 'س = 12 − 5 = 7.', '']);
      return '\uFEFF' + rows.map(function (r) {
        return r.map(function (c) {
          var v = String(c === undefined ? '' : c);
          return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
        }).join(',');
      }).join('\r\n');
    }
  };

  MJ.OwnBank = Own;

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
