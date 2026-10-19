/* ============================================================
   رحلة الرياضيات — storage.js
   إدارة التخزين المحلي + أدوات عامة
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};

  /* ---------------- مفاتيح التخزين ---------------- */
  var KEYS = {
    students: 'mathJourney_students',
    results:  'mathJourney_results',
    settings: 'mathJourney_settings',
    teacher:  'mathJourney_teacher',      // (قديم) حساب واحد — يُرحَّل تلقائيًا
    teachers: 'mathJourney_teachers',     // حسابات المعلمين على هذا الجهاز
    session:  'mathJourney_session',
    version:  'mathJourney_version'
  };

  var APP_VERSION = '2.0.0';

  /* ---------------- الإعدادات الافتراضية ---------------- */
  var DEFAULT_SETTINGS = {
    questionCount: 20,     // عدد أسئلة الرحلة
    pointsPerQuestion: 10, // نقاط الإجابة الصحيحة
    speedBonus: 5,         // نقاط إضافية للسرعة
    hints: 3,              // عدد التلميحات
    timerSeconds: 20,      // مدة سؤال التحدي السريع
    fastAnswerSeconds: 10, // الحد الذي يمنح نقاط السرعة
    sound: false,          // المؤثرات الصوتية (متوقفة افتراضيًا)
    difficulty: 'auto',  // auto | easy | hard
    lesson: 'u3l2'         // الدرس النشط من كتالوج المنهج
  };

  var DEFAULT_TEACHER = {
    username: 'teacher',
    displayName: 'المعلم',
    password: 'Math7'
  };

  /* المعلم النشط حاليًا: يحدد أي بيانات تُقرأ وتُكتب */
  var activeTeacherId = null;

  /* ---------------- طبقة تخزين آمنة ---------------- */
  var memoryFallback = {};
  var hasLS = (function () {
    try {
      var t = '__mj_test__';
      global.localStorage.setItem(t, '1');
      global.localStorage.removeItem(t);
      return true;
    } catch (e) { return false; }
  })();

  function rawGet(key) {
    if (hasLS) { try { return global.localStorage.getItem(key); } catch (e) { return null; } }
    return Object.prototype.hasOwnProperty.call(memoryFallback, key) ? memoryFallback[key] : null;
  }
  function rawSet(key, value) {
    if (hasLS) { try { global.localStorage.setItem(key, value); return true; } catch (e) { return false; } }
    memoryFallback[key] = value; return true;
  }
  function rawRemove(key) {
    if (hasLS) { try { global.localStorage.removeItem(key); } catch (e) {} }
    delete memoryFallback[key];
  }

  function read(key, fallback) {
    var raw = rawGet(key);
    if (raw === null || raw === undefined) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  function write(key, value) { return rawSet(key, JSON.stringify(value)); }

  /* ---------------- أدوات عامة ---------------- */
  function hashString(str) {
    // دالة تجزئة بسيطة (djb2) لتفادي تخزين كلمة المرور كنص صريح
    var h = 5381, i;
    str = String(str);
    for (i = 0; i < str.length; i++) { h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; }
    return 'h' + h.toString(16);
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function shuffle(arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sample(arr, n) { return shuffle(arr).slice(0, n); }

  function escapeHtml(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // توحيد النص العربي: إزالة التشكيل، توحيد الألف والياء والتاء المربوطة، حذف "ال"
  function normalizeArabic(str) {
    if (str === undefined || str === null) return '';
    var s = String(str).trim();
    s = s.replace(/[\u064B-\u0652\u0670\u0640]/g, '');   // تشكيل وتطويل
    s = s.replace(/[أإآٱ]/g, 'ا');
    s = s.replace(/ى/g, 'ي').replace(/ئ/g, 'ي').replace(/ؤ/g, 'و');
    s = s.replace(/ة/g, 'ه');
    s = s.replace(/[^\u0621-\u064A0-9a-zA-Z ]/g, ' ');   // رموز وعلامات
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/\bال(?=\S)/g, '');                    // أداة التعريف
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function formatTime(ms) {
    var total = Math.max(0, Math.round(ms / 1000));
    var m = Math.floor(total / 60), s = total % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  function formatDate(ts) {
    var d = new Date(ts);
    function p(n) { return n < 10 ? '0' + n : String(n); }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /* ---------------- واجهة التخزين ---------------- */
  var Storage = {
    KEYS: KEYS,
    APP_VERSION: APP_VERSION,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    available: hasLS,

    read: read,
    write: write,
    remove: rawRemove,

    /* الطلاب */
    getStudents: function () {
      var list = read(KEYS.students, []);
      return Array.isArray(list) ? list : [];
    },
    setStudents: function (list) { return write(KEYS.students, list || []); },

    /* النتائج */
    getResults: function () {
      var list = read(KEYS.results, []);
      return Array.isArray(list) ? list : [];
    },
    setResults: function (list) { return write(KEYS.results, list || []); },

    /* الإعدادات — لكل معلم إعداداته الخاصة على هذا الجهاز */
    settingsKeyFor: function (teacherId) { return teacherId || activeTeacherId || 'default'; },

    getSettings: function (teacherId) {
      var box = read(KEYS.settings, {}) || {};
      var by = box.byTeacher || {};
      var s = by[this.settingsKeyFor(teacherId)] || by['default'] || {};
      var out = {}, k;
      for (k in DEFAULT_SETTINGS) {
        if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, k)) {
          out[k] = (s[k] === undefined || s[k] === null) ? DEFAULT_SETTINGS[k] : s[k];
        }
      }
      return out;
    },
    setSettings: function (s, teacherId) {
      var box = read(KEYS.settings, {}) || {};
      if (!box.byTeacher) box.byTeacher = {};
      box.byTeacher[this.settingsKeyFor(teacherId)] = s;
      return write(KEYS.settings, box);
    },
    resetSettings: function (teacherId) {
      return this.setSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), teacherId);
    },

    /* ---------------- حسابات المعلمين ---------------- */
    getTeachers: function () {
      var list = read(KEYS.teachers, null);
      if (!Array.isArray(list) || !list.length) { this.migrate(); list = read(KEYS.teachers, []); }
      return Array.isArray(list) ? list : [];
    },
    setTeachers: function (list) { return write(KEYS.teachers, list || []); },

    getTeacher: function (id) {
      var list = this.getTeachers(), i;
      var key = id || activeTeacherId;
      for (i = 0; i < list.length; i++) if (list[i].id === key) return list[i];
      return null;
    },

    /* البحث باسم المستخدم أو برقم المعلم */
    findTeacher: function (userOrNumber) {
      var q = String(userOrNumber || '').trim().toLowerCase();
      if (!q) return null;
      var list = this.getTeachers(), i, t;
      for (i = 0; i < list.length; i++) {
        t = list[i];
        if (t.isLink) continue;   // حسابات الصفوف المشتركة للقراءة فقط ولا يُدخل بها
        if (String(t.username).toLowerCase() === q || String(t.number) === q) return t;
      }
      return null;
    },

    saveTeacher: function (teacher) {
      var list = this.getTeachers(), i, done = false;
      for (i = 0; i < list.length; i++) {
        if (list[i].id === teacher.id) { list[i] = teacher; done = true; break; }
      }
      if (!done) list.push(teacher);
      this.setTeachers(list);
      return teacher;
    },

    nextTeacherNumber: function () {
      var list = this.getTeachers(), max = 1000, i, n;
      for (i = 0; i < list.length; i++) {
        n = parseInt(list[i].number, 10);
        if (isFinite(n) && n > max) max = n;
      }
      return String(max + 1);
    },

    /* المعلم النشط: يُضبط عند تسجيل الدخول وعند بدء رحلة طالب */
    setActiveTeacher: function (id) { activeTeacherId = id || null; },
    getActiveTeacherId: function () { return activeTeacherId; },

    /* حذف حساب معلم مع كل بياناته */
    removeTeacher: function (id) {
      this.setTeachers(this.getTeachers().filter(function (t) { return t.id !== id; }));
      this.setStudents(this.getStudents().filter(function (s) { return s.teacherId !== id; }));
      this.setResults(this.getResults().filter(function (r) { return r.teacherId !== id; }));
      var box = read(KEYS.settings, {}) || {};
      if (box.byTeacher) { delete box.byTeacher[id]; write(KEYS.settings, box); }
      if (activeTeacherId === id) activeTeacherId = null;
      return true;
    },

    /* الجلسة */
    getSession: function () { return read(KEYS.session, null); },
    setSession: function (s) { return write(KEYS.session, s); },
    clearSession: function () { rawRemove(KEYS.session); },

    /* ترحيل بيانات النسخة الأولى (حساب معلم واحد) إلى نظام الحسابات المتعددة */
    migrate: function () {
      var list = read(KEYS.teachers, null);
      if (!Array.isArray(list) || !list.length) {
        var old = read(KEYS.teacher, null);
        list = [{
          id: 'tc_main',
          number: '1001',
          username: (old && old.username) || DEFAULT_TEACHER.username,
          displayName: DEFAULT_TEACHER.displayName,
          passwordHash: (old && old.passwordHash) || hashString(DEFAULT_TEACHER.password),
          createdAt: Date.now(),
          updatedAt: (old && old.updatedAt) || Date.now()
        }];
        write(KEYS.teachers, list);
      }
      var owner = list[0].id;

      // ربط الطلاب والنتائج القديمة بالحساب الأول
      var students = read(KEYS.students, []) || [], changed = false, i;
      for (i = 0; i < students.length; i++) {
        if (!students[i].teacherId) { students[i].teacherId = owner; changed = true; }
      }
      if (changed) write(KEYS.students, students);

      var results = read(KEYS.results, []) || [], rChanged = false, j, st;
      for (i = 0; i < results.length; i++) {
        if (!results[i].teacherId) {
          results[i].teacherId = owner;
          for (j = 0; j < students.length; j++) {
            if (students[j].id === results[i].studentId) { results[i].teacherId = students[j].teacherId; break; }
          }
          rChanged = true;
        }
      }
      if (rChanged) write(KEYS.results, results);

      // الإعدادات: من كائن مسطح إلى خريطة حسب المعلم
      var box = read(KEYS.settings, null);
      if (box && !box.byTeacher) write(KEYS.settings, { byTeacher: { 'default': box } });
      if (!box) write(KEYS.settings, { byTeacher: { 'default': JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) } });
      return true;
    },

    /* تهيئة أولية */
    init: function () {
      if (read(KEYS.version, null) !== APP_VERSION) write(KEYS.version, APP_VERSION);
      if (read(KEYS.students, null) === null) this.setStudents([]);
      if (read(KEYS.results, null) === null) this.setResults([]);
      this.migrate();
      return true;
    },

    /* نسخ احتياطي — بيانات المعلم النشط فقط */
    exportAll: function (teacherId) {
      var id = teacherId || activeTeacherId;
      var t = this.getTeacher(id);
      return {
        app: 'رحلة الرياضيات',
        version: APP_VERSION,
        exportedAt: new Date().toISOString(),
        teacher: t ? { number: t.number, username: t.username, displayName: t.displayName } : null,
        students: this.getStudents().filter(function (s) { return !id || s.teacherId === id; }),
        results: this.getResults().filter(function (r) { return !id || r.teacherId === id; }),
        settings: this.getSettings(id)
      };
    },

    /* استيراد — تُنسب البيانات المستوردة إلى المعلم النشط */
    importAll: function (data, mode, teacherId) {
      if (!data || typeof data !== 'object') throw new Error('الملف غير صالح');
      if (!Array.isArray(data.students) && !Array.isArray(data.results)) {
        throw new Error('الملف لا يحتوي على بيانات رحلة الرياضيات');
      }
      var id = teacherId || activeTeacherId;
      if (!id) throw new Error('يجب تسجيل الدخول قبل الاستيراد');

      var incomingS = (Array.isArray(data.students) ? data.students : []).map(function (s) {
        var c = JSON.parse(JSON.stringify(s)); c.teacherId = id; return c;
      });
      var incomingR = (Array.isArray(data.results) ? data.results : []).map(function (r) {
        var c = JSON.parse(JSON.stringify(r)); c.teacherId = id; return c;
      });

      var others = this.getStudents().filter(function (s) { return s.teacherId !== id; });
      var othersR = this.getResults().filter(function (r) { return r.teacherId !== id; });
      var mine = this.getStudents().filter(function (s) { return s.teacherId === id; });
      var mineR = this.getResults().filter(function (r) { return r.teacherId === id; });
      var i;

      if (mode === 'merge') {
        var seen = {};
        for (i = 0; i < mine.length; i++) seen[normalizeArabic(mine[i].name)] = true;
        for (i = 0; i < incomingS.length; i++) {
          if (!seen[normalizeArabic(incomingS[i].name)]) {
            mine.push(incomingS[i]); seen[normalizeArabic(incomingS[i].name)] = true;
          }
        }
        var seenR = {};
        for (i = 0; i < mineR.length; i++) seenR[mineR[i].id] = true;
        for (i = 0; i < incomingR.length; i++) if (!seenR[incomingR[i].id]) mineR.push(incomingR[i]);
        this.setStudents(others.concat(mine));
        this.setResults(othersR.concat(mineR));
      } else {
        this.setStudents(others.concat(incomingS));
        this.setResults(othersR.concat(incomingR));
      }
      if (data.settings) this.setSettings(data.settings, id);
      return { students: incomingS.length, results: incomingR.length };
    },

    /* حذف بيانات المعلم النشط وحده (لا يمس حسابات المعلمين الآخرين) */
    wipeAll: function (teacherId) {
      var id = teacherId || activeTeacherId;
      if (!id) return false;
      this.setStudents(this.getStudents().filter(function (s) { return s.teacherId !== id; }));
      this.setResults(this.getResults().filter(function (r) { return r.teacherId !== id; }));
      this.resetSettings(id);
      rawRemove(KEYS.session);
      return true;
    }
  };

  MJ.Utils = {
    /* تنزيل نص كملف — تُستخدم في النسخ الاحتياطي وفي إرسال نتيجة الطالب */
    downloadText: function (filename, content, mime) {
      try {
        var d = global.document;
        var blob = new global.Blob([content], { type: mime || 'application/json;charset=utf-8' });
        var url = global.URL.createObjectURL(blob);
        var a = d.createElement('a');
        a.href = url; a.download = filename;
        d.body.appendChild(a); a.click();
        d.body.removeChild(a);
        global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 1500);
        return true;
      } catch (e) { return false; }
    },

    hashString: hashString,
    uid: uid,
    shuffle: shuffle,
    sample: sample,
    escapeHtml: escapeHtml,
    normalizeArabic: normalizeArabic,
    formatTime: formatTime,
    formatDate: formatDate,
    clamp: clamp
  };

  MJ.Storage = Storage;

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
