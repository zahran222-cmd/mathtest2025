/* ============================================================
   رحلة الرياضيات — curriculum.js
   كتالوج منهج الرياضيات للصف الثامن (سلطنة عُمان)
     الفصل الأول  : كتاب الطالب — الوحدات 1 إلى 8
     الفصل الثاني : كتاب النشاط — الوحدات 9 إلى 15
   كل درس له معرّف ثابت، ورقم صفحته في الكتاب، وحالة جاهزيته.
   إضافة بنك أسئلة لدرس = تسجيله في MJ.Banks بالمعرّف نفسه.
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};

  function L(code, name, page) { return { code: code, name: name, page: page }; }

  var TERMS = [
    {
      id: 't1',
      name: 'الفصل الدراسي الأول',
      book: 'كتاب الطالب',
      units: [
        { no: 1, name: 'الأعداد الصحيحة والقوى والجذور', lessons: [
          L('1-1', 'الأعداد المُوجَّهة', 16),
          L('2-1', 'الجذور التربيعية والجذور التكعيبية', 20),
          L('3-1', 'الأُسُس', 22),
          L('4-1', 'استخدام الأُسُس', 24)
        ] },
        { no: 2, name: 'القيمة المكانية والترتيب والتقريب', lessons: [
          L('1-2', 'ضرب الكسور العشرية وقسمتها ذهنيًّا', 31),
          L('2-2', 'الضرب في قوى العدد 10 والقسمة عليها', 35),
          L('3-2', 'التقريب', 38),
          L('4-2', 'ترتيب العمليات', 42)
        ] },
        { no: 3, name: 'الشبكات والزوايا', lessons: [
          L('1-3', 'رسم شبكات للمجسمات', 49),
          L('2-3', 'شرح خصائص الزوايا', 52),
          L('3-3', 'حل مسائل الزوايا', 56)
        ] },
        { no: 4, name: 'الكسور', lessons: [
          L('1-4', 'كتابة الكسور في أبسط صورة', 62),
          L('2-4', 'جمع الكسور وطرحها', 63),
          L('3-4', 'ضرب الكسور', 66),
          L('4-4', 'قسمة الكسور', 69),
          L('5-4', 'التعامل مع الكسور ذهنيًّا', 72)
        ] },
        { no: 5, name: 'المعادلات والعبارات الجبرية والصيغ', lessons: [
          L('1-5', 'كتابة المعادلات وحلها', 78),
          L('2-5', 'تبسيط العبارات الجبرية', 80),
          L('3-5', 'كتابة العبارات الجبرية', 82),
          L('4-5', 'التعويض في العبارات الجبرية', 85),
          L('5-5', 'الصيغ واستخدامها', 87),
          L('6-5', 'التحليل إلى عوامل', 90),
          L('7-5', 'جمع الكسور الجبرية وطرحها', 92),
          L('8-5', 'فك ناتج عبارتين خطيّتين', 95)
        ] },
        { no: 6, name: 'المساحة والمحيط والحجم', lessons: [
          L('1-6', 'تحويل وحدات المساحة والحجم', 101),
          L('2-6', 'حل مسائل الدائرة', 105),
          L('3-6', 'العمليات الحسابية المتعلقة بالمنشور والأسطوانة', 108)
        ] },
        { no: 7, name: 'الاحتمالات', lessons: [
          L('1-7', 'احتمال عدم حدوث نتيجة ما', 116),
          L('2-7', 'نتائج الاحتمالات المُرجَّحة بالتساوي', 118),
          L('3-7', 'كتابة قائمة بالنتائج المحتملة (فضاء الإمكانات)', 121),
          L('4-7', 'الاحتمالات التجريبية والنظرية', 124)
        ] },
        { no: 8, name: 'النسب المئوية', lessons: [
          L('1-8', 'استخدام الطرق الذهنية', 131),
          L('2-8', 'مقارنة الكميات المختلفة', 133),
          L('3-8', 'تغيّرات النسبة المئوية', 135),
          L('4-8', 'أمثلة عملية', 137)
        ] }
      ]
    },
    {
      id: 't2',
      name: 'الفصل الدراسي الثاني',
      book: 'كتاب النشاط',
      units: [
        { no: 9, name: 'النسبة والتناسب', lessons: [
          L('1-9', 'تبسيط النسب', 13),
          L('2-9', 'المشاركة بالنسب', 16),
          L('3-9', 'المقارنة واستخدام النسب', 19),
          L('4-9', 'حل المشكلات', 22)
        ] },
        { no: 10, name: 'المعادلات والمتباينات', lessons: [
          L('1-10', 'حل المعادلات الخطية', 25),
          L('2-10', 'حل المشكلات', 29),
          L('3-10', 'حل معادلتين آنيًا بالتعويض', 32),
          L('4-10', 'حل معادلتين آنيًا بالحذف', 34),
          L('5-10', 'المتباينات', 36)
        ] },
        { no: 11, name: 'الرسوم البيانية', lessons: [
          L('1-11', 'نقطة المنتصف للقطعة المستقيمة', 38),
          L('2-11', 'ميل الخط المستقيم', 40),
          L('3-11', 'معادلة الخط المستقيم ص = م س + ج', 42),
          L('4-11', 'الرسم البياني للخط المستقيم', 44),
          L('5-11', 'حل المعادلات الآنية بالرسم البياني', 47),
          L('6-11', 'التناسب الطردي', 50),
          L('7-11', 'الرسوم البيانية العملية', 53)
        ] },
        { no: 12, name: 'المضلعات والزوايا', lessons: [
          L('1-12', 'المضلعات المنتظمة', 57),
          L('2-12', 'المزيد من المضلعات', 59),
          L('3-12', 'الزوايا', 62),
          L('4-12', 'نظرية فيثاغورس', 65)
        ] },
        { no: 13, name: 'معالجة البيانات وعرضها', lessons: [
          L('1-13', 'حساب الإحصاء', 68),
          L('2-13', 'استخدام الإحصاء', 71)
        ] },
        { no: 14, name: 'الرسوم البيانية الواقعية والقياسات المركّبة', lessons: [
          L('1-14', 'الرسوم البيانية الواقعية (1)', 74),
          L('2-14', 'الرسوم البيانية الواقعية (2)', 78),
          L('3-14', 'حل مسائل القياس', 80),
          L('4-14', 'متوسط السرعة', 82),
          L('5-14', 'القياسات المركّبة', 84)
        ] },
        { no: 15, name: 'المخططات والجداول التكرارية', lessons: [
          L('1-15', 'استخدام الجداول التكرارية', 86),
          L('2-15', 'تفسير المخططات التكرارية ورسمها', 88),
          L('3-15', 'تفسير المضلعات التكرارية ورسمها', 91),
          L('4-15', 'تفسير الرسوم البيانية الخطية ورسمها', 94),
          L('5-15', 'مقارنة التوزيعات والتوصل إلى استنتاجات', 97)
        ] }
      ]
    }
  ];

  /* دروس إضافية خارج ترقيم الكتاب (مراجعة أو إثراء) */
  var EXTRAS = {
    id: 'tx',
    name: 'دروس إضافية',
    book: 'مراجعة وإثراء',
    units: [
      { no: 0, name: 'مراجعة سابقة', lessons: [
        L('0-0', 'مراجعة: أنواع الزوايا وقياساتها', 0)
      ] }
    ]
  };

  /* توليد معرّف ثابت للدرس: u3l2 */
  function lessonId(unitNo, index) { return 'u' + unitNo + 'l' + (index + 1); }

  var ALL = [];
  TERMS.concat([EXTRAS]).forEach(function (term) {
    term.units.forEach(function (unit) {
      unit.termId = term.id;
      unit.termName = term.name;
      unit.lessons.forEach(function (lesson, i) {
        lesson.id = lessonId(unit.no, i);
        lesson.unitNo = unit.no;
        lesson.unitName = unit.name;
        lesson.termId = term.id;
        lesson.termName = term.name;
        lesson.book = term.book;
        ALL.push(lesson);
      });
    });
  });

  /* دروس المعلم المستوردة من Excel */
  var CUSTOM = { id: 'own', name: 'أسئلتي', book: 'من Excel', units: [{ no: 0, name: 'بنوكي الخاصة', lessons: [] }] };
  CUSTOM.units[0].termId = 'own';
  CUSTOM.units[0].termName = CUSTOM.name;

  var Curriculum = {
    grade: 'الصف الثامن',
    CUSTOM: CUSTOM,

    addCustom: function (lesson) {
      var list = CUSTOM.units[0].lessons;
      var rec = {
        id: lesson.id, code: lesson.code || '★', name: lesson.name, page: 0,
        unitNo: 0, unitName: CUSTOM.units[0].name,
        termId: 'own', termName: CUSTOM.name, book: CUSTOM.book, custom: true
      };
      var i = list.map(function (l) { return l.id; }).indexOf(rec.id);
      if (i === -1) { list.push(rec); ALL.push(rec); }
      else { list[i] = rec; }
      return rec;
    },

    dropCustom: function (id) {
      CUSTOM.units[0].lessons = CUSTOM.units[0].lessons.filter(function (l) { return l.id !== id; });
      for (var i = ALL.length - 1; i >= 0; i--) if (ALL[i].id === id) ALL.splice(i, 1);
    },

    TERMS: TERMS,
    EXTRAS: EXTRAS,

    terms: function () {
      var list = TERMS.concat([EXTRAS]);
      if (CUSTOM.units[0].lessons.length) list.push(CUSTOM);
      return list;
    },

    term: function (id) {
      return this.terms().filter(function (t) { return t.id === id; })[0] || TERMS[0];
    },

    unitsOf: function (termId) { return this.term(termId).units; },

    lessonsOf: function (termId, unitNo) {
      var u = this.unitsOf(termId).filter(function (x) { return String(x.no) === String(unitNo); })[0];
      return u ? u.lessons : [];
    },

    lesson: function (id) {
      return ALL.filter(function (l) { return l.id === id; })[0] || null;
    },

    /* الدرس جاهز إذا كان له بنك أسئلة مسجّل */
    isReady: function (id) { return !!(MJ.Banks && MJ.Banks[id]); },

    readyLessons: function () {
      return ALL.filter(function (l) { return Curriculum.isReady(l.id); });
    },

    /* أول درس جاهز — يُستخدم كقيمة افتراضية */
    firstReady: function () {
      var r = this.readyLessons();
      return r.length ? r[0].id : null;
    },

    /* وصف مقروء: الوحدة 3 · 2-3 شرح خصائص الزوايا */
    label: function (id) {
      var l = this.lesson(id);
      if (!l) return 'درس غير معروف';
      return 'الوحدة ' + l.unitNo + ' · ' + l.code + ' ' + l.name;
    },

    shortLabel: function (id) {
      var l = this.lesson(id);
      return l ? l.name : 'درس';
    },

    stats: function () {
      return { lessons: ALL.length, ready: this.readyLessons().length };
    }
  };

  MJ.Curriculum = Curriculum;
  MJ.Banks = MJ.Banks || {};

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
