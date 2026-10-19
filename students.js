/* ============================================================
   رحلة الرياضيات — students.js
   إضافة/تعديل/حذف الطلاب + حفظ النتائج واستدعاؤها
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var U = MJ.Utils, S = MJ.Storage;

  /* معرّف المعلم النشط: كل العمليات أدناه مقصورة على طلابه ونتائجه */
  function owner() {
    var t = MJ.Auth && MJ.Auth.current();
    return t ? t.id : S.getActiveTeacherId();
  }

  var Students = {
    /* طلاب المعلم النشط فقط */
    all: function (teacherId) {
      var id = teacherId || owner();
      if (!id) return [];
      return S.getStudents().filter(function (s) { return s.teacherId === id; });
    },

    /* كل طلاب الجهاز مهما كان معلمهم (تُستخدم في دخول الطالب) */
    allDevice: function () { return S.getStudents(); },

    /* نتائج المعلم النشط فقط */
    resultsAll: function (teacherId) {
      var id = teacherId || owner();
      if (!id) return [];
      return S.getResults().filter(function (r) { return r.teacherId === id; });
    },

    get: function (id) {
      var list = S.getStudents(), i;
      for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },

    /* البحث داخل قائمة معلم محدد (أو المعلم النشط) */
    findByName: function (name, teacherId) {
      var n = U.normalizeArabic(name), list = this.all(teacherId), i;
      if (!n) return null;
      for (i = 0; i < list.length; i++) if (U.normalizeArabic(list[i].name) === n) return list[i];
      return null;
    },

    /* البحث في كل حسابات الجهاز — يعيد كل التطابقات مع معلم كل طالب */
    findMatches: function (name) {
      var n = U.normalizeArabic(name);
      if (!n) return [];
      var teachers = S.getTeachers();
      return S.getStudents()
        .filter(function (s) { return U.normalizeArabic(s.name) === n; })
        .map(function (s) {
          var t = null, i;
          for (i = 0; i < teachers.length; i++) if (teachers[i].id === s.teacherId) { t = teachers[i]; break; }
          return { student: s, teacher: t };
        });
    },

    add: function (name, teacherId) {
      var id = teacherId || owner();
      if (!id) return { ok: false, message: 'يجب تسجيل دخول المعلم أولًا.' };
      name = String(name || '').trim().replace(/\s+/g, ' ');
      if (name.length < 2) return { ok: false, message: 'اكتب اسم الطالب كاملًا (حرفان على الأقل).' };
      if (this.findByName(name, id)) return { ok: false, message: 'هذا الاسم مسجّل مسبقًا في قائمتك.' };
      var list = S.getStudents();
      var student = { id: U.uid('st'), name: name, teacherId: id, createdAt: Date.now() };
      list.push(student);
      S.setStudents(list);
      return { ok: true, message: 'تمت إضافة الطالب ' + name + '.', student: student };
    },

    addMany: function (text) {
      var names = String(text || '').split(/[\n،,]+/), added = 0, skipped = 0, i, r;
      for (i = 0; i < names.length; i++) {
        if (!names[i].trim()) continue;
        r = this.add(names[i]);
        if (r.ok) added++; else skipped++;
      }
      return { ok: added > 0, added: added, skipped: skipped, message: 'تمت إضافة ' + added + ' طالبًا، وتم تجاهل ' + skipped + '.' };
    },

    update: function (id, newName) {
      newName = String(newName || '').trim().replace(/\s+/g, ' ');
      if (newName.length < 2) return { ok: false, message: 'الاسم قصير جدًا.' };
      var target = this.get(id);
      var existing = target ? this.findByName(newName, target.teacherId) : null;
      if (existing && existing.id !== id) return { ok: false, message: 'يوجد طالب آخر بنفس الاسم في قائمتك.' };
      var list = S.getStudents(), i, done = false;
      for (i = 0; i < list.length; i++) {
        if (list[i].id === id) { list[i].name = newName; done = true; break; }
      }
      if (!done) return { ok: false, message: 'الطالب غير موجود.' };
      S.setStudents(list);
      // تحديث الاسم في النتائج المحفوظة
      var results = S.getResults();
      for (i = 0; i < results.length; i++) if (results[i].studentId === id) results[i].studentName = newName;
      S.setResults(results);
      return { ok: true, message: 'تم تحديث الاسم.' };
    },

    remove: function (id) {
      var list = S.getStudents().filter(function (s) { return s.id !== id; });
      S.setStudents(list);
      var results = S.getResults().filter(function (r) { return r.studentId !== id; });
      S.setResults(results);
      return { ok: true, message: 'تم حذف الطالب ونتائجه.' };
    },

    /* ---------------- النتائج ---------------- */
    resultsOf: function (studentId) {
      return S.getResults().filter(function (r) { return r.studentId === studentId; })
        .sort(function (a, b) { return b.createdAt - a.createdAt; });
    },

    latestResult: function (studentId) {
      var r = this.resultsOf(studentId);
      return r.length ? r[0] : null;
    },

    saveResult: function (result) {
      var list = S.getResults();
      list.push(result);
      S.setResults(list);
      return result;
    },

    deleteResult: function (resultId) {
      S.setResults(S.getResults().filter(function (r) { return r.id !== resultId; }));
      return { ok: true, message: 'تم حذف النتيجة.' };
    },

    resetStudentResults: function (studentId) {
      S.setResults(S.getResults().filter(function (r) { return r.studentId !== studentId; }));
      return { ok: true, message: 'تمت إعادة ضبط نتائج الطالب.' };
    },

    /* حالة الطالب: أكمل الرحلة أم لم يبدأ */
    statusOf: function (studentId) {
      var r = this.latestResult(studentId);
      if (!r) return { key: 'new', label: 'لم يبدأ', icon: '⏳' };
      return { key: 'done', label: 'أكمل الرحلة', icon: '✅', result: r };
    },

    /* تصدير CSV لنتائج المعلم النشط بدون مكتبات خارجية */
    resultsCSV: function () {
      var rows = [['الاسم', 'الدرجة', 'من', 'النسبة', 'الصحيح', 'الخطأ', 'النجوم', 'الزمن', 'التاريخ', 'التقييم']];
      this.resultsAll().sort(function (a, b) { return b.createdAt - a.createdAt; }).forEach(function (r) {
        rows.push([
          r.studentName, r.score, r.maxScore, r.percentage + '%',
          r.correct, r.wrong, r.stars, r.timeText, U.formatDate(r.createdAt), r.rankTitle
        ]);
      });
      return '\uFEFF' + rows.map(function (row) {
        return row.map(function (c) {
          var v = String(c === undefined || c === null ? '' : c);
          return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
        }).join(',');
      }).join('\r\n');
    }
  };

  MJ.Students = Students;

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
