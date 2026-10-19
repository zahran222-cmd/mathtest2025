/* ============================================================
   رحلة الرياضيات — share.js
   مشاركة الصف مع الطلاب على أجهزتهم، واستلام نتائجهم.

   لا يوجد خادم في هذا الإصدار، لذا تنتقل البيانات على شكل "أكواد":
   • كود الصف   : يحمل أسماء الطلاب وإعدادات المعلم → من المعلم إلى الطلاب
                  (يمكن وضعه داخل رابط إن كان الموقع منشورًا على الإنترنت)
   • كود النتيجة: يحمل نتيجة الطالب وتفاصيل إجاباته → من الطالب إلى المعلم
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var U = MJ.Utils, S = MJ.Storage;

  var CLASS_PREFIX = 'tcl_';     // معرّف حساب الصف المشترك على جهاز الطالب

  /* ---------------- ترميز نصي آمن للعربية ---------------- */
  function toB64(str) {
    var bytes = unescape(encodeURIComponent(str));
    var b64 = (typeof global.btoa === 'function')
      ? global.btoa(bytes)
      : Buffer.from(bytes, 'binary').toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64(code) {
    var b64 = String(code || '').trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bytes = (typeof global.atob === 'function')
      ? global.atob(b64)
      : Buffer.from(b64, 'base64').toString('binary');
    return decodeURIComponent(escape(bytes));
  }
  function pack(prefix, obj) { return prefix + toB64(JSON.stringify(obj)); }
  function unpack(prefix, code, expectedType) {
    var raw = String(code || '').trim();
    var i = raw.indexOf(prefix);
    if (i === -1) throw new Error('الكود غير صالح أو ناقص.');
    var data;
    try { data = JSON.parse(fromB64(raw.slice(i + prefix.length))); }
    catch (e) { throw new Error('الكود تالف أو نُسخ ناقصًا. اطلب نسخة جديدة.'); }
    if (!data || data.t !== expectedType) throw new Error('نوع الكود غير متوقع.');
    return data;
  }

  var Share = {
    CLASS_PREFIX: CLASS_PREFIX,

    /* ============ 1) المعلم: توليد كود الصف ============ */
    encodeClass: function (teacherId) {
      var t = S.getTeacher(teacherId || S.getActiveTeacherId());
      if (!t) throw new Error('يجب تسجيل الدخول أولًا.');
      var students = S.getStudents().filter(function (s) { return s.teacherId === t.id; });
      if (!students.length) throw new Error('أضف طلابًا إلى قائمتك قبل مشاركة الصف.');

      // مفتاح صف فريد لهذا الحساب على هذا الجهاز، يمنع خلط نتائج صفوف مختلفة
      if (!t.classKey) {
        t.classKey = U.uid('ck') + '-' + Math.random().toString(36).slice(2, 8);
        S.saveTeacher(t);
      }
      var st = S.getSettings(t.id);
      var ownBank = (MJ.Banks[st.lesson] && MJ.Banks[st.lesson].own) ? {
        id: st.lesson, name: MJ.Banks[st.lesson].name, questions: MJ.Banks[st.lesson].questions
      } : null;
      return pack('MJC1.', {
        t: 'class',
        v: 2,
        ci: t.classKey,
        tn: t.displayName,
        tno: t.number,
        st: students.map(function (s) { return [s.id, s.name]; }),
        s: {
          questionCount: st.questionCount, pointsPerQuestion: st.pointsPerQuestion,
          speedBonus: st.speedBonus, hints: st.hints, timerSeconds: st.timerSeconds,
          fastAnswerSeconds: st.fastAnswerSeconds, difficulty: st.difficulty, lesson: st.lesson,
          allowRetry: st.allowRetry, sound: st.sound
        },
        ob: ownBank
      });
    },

    decodeClass: function (code) { return unpack('MJC1.', code, 'class'); },

    /* رابط الصف — يعمل فقط إذا كان الموقع منشورًا على الإنترنت */
    classLink: function (code) {
      var loc = global.location;
      if (!loc) return code;
      var base = loc.origin + loc.pathname;
      return base + '#class=' + encodeURIComponent(code);
    },
    isHosted: function () {
      return !!(global.location && /^https?:$/.test(global.location.protocol));
    },

    /* ============ 2) جهاز الطالب: تركيب الصف ============ */
    applyClass: function (data) {
      if (!data || data.t !== 'class' || !Array.isArray(data.st)) throw new Error('كود الصف غير صالح.');
      var localId = CLASS_PREFIX + data.ci;

      // حساب صف للقراءة فقط: لا يملك كلمة مرور فلا يمكن الدخول إلى لوحة المعلم منه
      var teachers = S.getTeachers().filter(function (x) { return x.id !== localId; });
      teachers.push({
        id: localId,
        number: data.tno || '—',
        username: 'class_' + data.ci,
        displayName: data.tn || 'معلم الصف',
        passwordHash: null,
        isLink: true,
        classId: data.ci,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      S.setTeachers(teachers);

      // استبدال قائمة هذا الصف مع الاحتفاظ بمعرّفات الطلاب الأصلية
      var others = S.getStudents().filter(function (s) { return s.teacherId !== localId; });
      var roster = data.st.map(function (pair) {
        return { id: pair[0], name: pair[1], teacherId: localId, createdAt: Date.now() };
      });
      S.setStudents(others.concat(roster));
      if (data.ob && MJ.OwnBank) MJ.OwnBank.register(data.ob);   // بنك أسئلة المعلم الخاص
      if (data.s) S.setSettings(data.s, localId);

      return { teacherId: localId, teacherName: data.tn, number: data.tno, count: roster.length };
    },

    /* ============ 3) الطالب: كود النتيجة ============ */
    resultPayload: function (result) {
      var t = S.getTeacher(result.teacherId);
      var classId = (t && t.classId) ? t.classId : String(result.teacherId || '').replace(CLASS_PREFIX, '');
      return {
        t: 'res',
        v: 2,
        ci: classId,
        sid: result.studentId,
        n: result.studentName,
        sc: result.score, mx: result.maxScore, pc: result.percentage,
        c: result.correct, w: result.wrong, sr: result.stars,
        ms: result.timeMs, cr: result.createdAt, h: result.hintsUsed,
        a: (result.answers || []).map(function (a) {
          return [
            a.qid, a.isCorrect ? 1 : 0, a.studentAnswer, a.correctAnswer,
            a.angle ? a.angle.degree : 0, a.angle ? a.angle.rotation : 0, a.points || 0
          ];
        })
      };
    },

    encodeResult: function (result) { return pack('MJR1.', this.resultPayload(result)); },

    /* ============ 4) المعلم: قراءة كود النتيجة ============ */
    decodeResult: function (code, teacherId) {
      return this.resultFromPayload(unpack('MJR1.', code, 'res'), teacherId);
    },

    /* بناء نتيجة كاملة من حمولة مضغوطة (من كود أو من الخادم) */
    resultFromPayload: function (data, teacherId) {
      var id = teacherId || S.getActiveTeacherId();
      var owner = S.getTeacher(id);
      if (!owner || !owner.classKey || data.ci !== owner.classKey) {
        throw new Error('هذه النتيجة تخص صفًا آخر، وليست من صفّك.');
      }

      var student = S.getStudents().filter(function (s) { return s.id === data.sid && s.teacherId === id; })[0];
      if (!student) throw new Error('الطالب "' + (data.n || '') + '" غير موجود في قائمتك الحالية.');

      var answers = (data.a || []).map(function (row) {
        var q = MJ.Questions.byId(row[0]) || {};
        return {
          qid: row[0],
          prompt: q.prompt || 'سؤال',
          typeName: q.typeName || '—',
          category: q.category || 'puzzle',
          level: q.level || 1,
          stageId: q.stageId || 1,
          angle: row[4] ? { degree: row[4], rotation: row[5] } : null,
          studentAnswer: row[2],
          correctAnswer: row[3],
          isCorrect: row[1] === 1,
          explanation: q.explanation || '',
          hintUsed: false,
          elapsedMs: 0,
          points: row[6] || 0
        };
      });

      var rank = MJ.Scoring.rankFor(data.pc);
      return {
        id: 'res_' + data.sid + '_' + data.cr,
        studentId: data.sid,
        studentName: student.name,
        teacherId: id,
        score: data.sc, maxScore: data.mx, percentage: data.pc,
        correct: data.c, wrong: data.w, stars: data.sr,
        timeMs: data.ms, timeText: U.formatTime(data.ms),
        createdAt: data.cr, date: U.formatDate(data.cr),
        rankTitle: rank.title, rankIcon: rank.icon,
        hintsUsed: data.h || 0,
        lesson: 'angles',
        viaCode: true,
        categoryStats: MJ.Scoring.analyze(answers),
        answers: answers
      };
    },

    /* حفظ نتيجة مستوردة مع منع التكرار */
    /* حفظ نتيجة جاهزة مع منع التكرار */
    saveResult: function (result) {
      var exists = S.getResults().some(function (r) { return r.id === result.id; });
      if (exists) return { ok: false, message: 'نتيجة ' + result.studentName + ' مستوردة مسبقًا.' };
      var list = S.getResults();
      list.push(result);
      S.setResults(list);
      return { ok: true, message: 'تم استلام نتيجة ' + result.studentName + ' (' + result.percentage + '%).', result: result };
    },

    /* حمولة الصف — تُستخدم في الكود وفي النشر السحابي */
    classPayload: function (teacherId) { return this.decodeClass(this.encodeClass(teacherId)); },

    /* مفتاح الصف الفريد لهذا الحساب */
    classKeyOf: function (teacherId) {
      var t = S.getTeacher(teacherId || S.getActiveTeacherId());
      if (!t) return null;
      if (!t.classKey) {
        t.classKey = U.uid('ck') + '-' + Math.random().toString(36).slice(2, 8);
        S.saveTeacher(t);
      }
      return t.classKey;
    },

    importResult: function (code, teacherId) {
      var result = this.decodeResult(code, teacherId);
      return this.saveResult(result);
    },

    /* هل هذا الطالب من صف مشترك (فيحتاج إرسال نتيجته بالكود)؟ */
    isLinkClass: function (teacherId) {
      var t = S.getTeacher(teacherId);
      return !!(t && t.isLink);
    }
  };

  MJ.Share = Share;

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
