/* ============================================================
   رحلة الرياضيات — questions.js
   بنك الأسئلة (69 سؤالًا) + اختيار أسئلة الرحلة
   الفئات: acute | right | obtuse | straight | measure | puzzle
   الأنواع: mcq | text | pick | odd
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var A = MJ.Angles;
  var U = MJ.Utils;

  var TYPE_LABEL = { acute: 'حادة', right: 'قائمة', obtuse: 'منفرجة', straight: 'مستقيمة' };

  var CATEGORY_LABEL = {
    acute: 'التعرف على الزاوية الحادة',
    right: 'الزاوية القائمة',
    obtuse: 'الزاوية المنفرجة',
    straight: 'الزاوية المستقيمة',
    measure: 'قياس الزوايا',
    puzzle: 'الألغاز والاستنتاج'
  };

  var LEVEL_LABEL = {
    1: '🟢 المستوى 1 — سهل',
    2: '🟡 المستوى 2 — متوسط',
    3: '🟠 المستوى 3 — متقدم',
    4: '🔴 المستوى 4 — تحدٍ'
  };

  var idc = 0;
  function nid(p) { idc++; return p + '-' + idc; }

  function typeOptions() {
    return [
      { id: 'acute', text: 'حادة' },
      { id: 'right', text: 'قائمة' },
      { id: 'obtuse', text: 'منفرجة' },
      { id: 'straight', text: 'مستقيمة' }
    ];
  }

  function hintFor(key) {
    return {
      acute: 'تذكر: الزاوية الحادة أصغر من 90°، أي أضيق من ركن المربع.',
      right: 'تذكر: الزاوية القائمة قياسها 90° وتشبه ركن المربع تمامًا.',
      obtuse: 'تذكر: الزاوية المنفرجة أكبر من 90° وأصغر من 180°، أي أوسع من ركن المربع.',
      straight: 'تذكر: الزاوية المستقيمة قياسها 180° وتبدو كخط مستقيم واحد.'
    }[key] || 'قارن الزاوية بركن المربع (90°): أضيق منه أم أوسع؟';
  }

  function explainAngle(deg) {
    var k = A.getAngleType(deg);
    return 'قياس الزاوية ' + deg + '°، و' + A.TYPES[k].full + ' ' + A.TYPES[k].rule + '.';
  }

  /* ---------------- بناة الأسئلة ---------------- */

  // النوع 1 — تحديد نوع الزاوية من الرسم
  function qIdentify(deg, level, guide) {
    var key = A.getAngleType(deg);
    return {
      id: nid('id'), kind: 'mcq', category: key, level: level || 1, typeName: 'تحديد نوع الزاوية',
      prompt: 'ما نوع الزاوية الظاهرة أمامك؟',
      guide: guide || 'انظر جيدًا إلى فتحة الزاوية قبل أن تختار.',
      angle: { degree: deg, rotation: 0 }, randomizeRotation: true,
      options: typeOptions(), correct: key,
      hint: hintFor(key), explanation: explainAngle(deg)
    };
  }

  // النوع 2 — اكتب الإجابة
  function qWrite(deg, level, guide) {
    var key = A.getAngleType(deg);
    return {
      id: nid('wr'), kind: 'text', category: key, level: level || 1, typeName: 'اكتب الإجابة',
      prompt: 'اكتب نوع هذه الزاوية.',
      guide: guide || 'اكتب كلمة واحدة تكفي: حادة، قائمة، منفرجة، أو مستقيمة.',
      placeholder: 'مثال: حادة',
      angle: { degree: deg, rotation: 0 }, randomizeRotation: true,
      answerKey: key, correctText: A.TYPES[key].full,
      hint: hintFor(key), explanation: explainAngle(deg)
    };
  }

  // النوع 3 — تحديد القياس
  function qMeasure(deg, distractors, level, guide) {
    var opts = [{ id: 'd' + deg, text: deg + '°' }];
    for (var i = 0; i < distractors.length; i++) opts.push({ id: 'd' + distractors[i], text: distractors[i] + '°' });
    return {
      id: nid('ms'), kind: 'mcq', category: 'measure', level: level || 2, typeName: 'تحديد القياس',
      prompt: 'ما قياس هذه الزاوية؟',
      guide: guide || 'استعن بركن المربع 90° كمسطرة في ذهنك.',
      angle: { degree: deg, rotation: 0 }, randomizeRotation: true, showMeasureOnReveal: true,
      options: opts, correct: 'd' + deg,
      hint: 'قارن الفتحة بـ 90°: إن كانت نصف ركن المربع تقريبًا فهي قريبة من 45°.',
      explanation: 'قياس الزاوية ' + deg + '°، وهي ' + A.TYPES[A.getAngleType(deg)].full + '.'
    };
  }

  // النوع 4 — لغز رياضي
  function qRiddle(text, key, level, explanation, guide) {
    return {
      id: nid('rd'), kind: 'mcq', category: 'puzzle', level: level || 2, typeName: 'لغز رياضي',
      prompt: text, guide: guide || 'اللغز يصف الزاوية بكلمات. حوّل الكلمات إلى أرقام.',
      angle: null, options: typeOptions(), correct: key,
      hint: hintFor(key), explanation: explanation
    };
  }

  // النوع 5 — صح أم خطأ
  function qTF(statement, isTrue, explanation, level, category, angle) {
    return {
      id: nid('tf'), kind: 'mcq', category: category || 'puzzle', level: level || 1, typeName: 'صح أم خطأ',
      prompt: statement, guide: 'اقرأ العبارة بتأنٍّ، فكلمة واحدة قد تغيّر كل شيء.',
      angle: angle || null,
      options: [{ id: 'true', text: '✔ صح' }, { id: 'false', text: '✘ خطأ' }],
      correct: isTrue ? 'true' : 'false',
      hint: 'راجع تعريف كل نوع: 90° قائمة، أقل حادة، أكثر منفرجة، 180° مستقيمة.',
      explanation: explanation
    };
  }

  // النوع 6 — اكتشف الخطأ
  function qFindError(deg, claimedKey, level) {
    var realKey = A.getAngleType(deg);
    var correctChoice = (realKey === claimedKey) ? 'yes' : 'no';
    return {
      id: nid('fe'), kind: 'mcq', category: realKey, level: level || 2, typeName: 'اكتشف الخطأ',
      prompt: 'مكتوب تحت الرسم: «هذه زاوية ' + TYPE_LABEL[claimedKey] + '». هل التصنيف صحيح؟',
      guide: 'المستكشف الجيد يشك في اللافتات قبل أن يصدّقها.',
      angle: { degree: deg, rotation: 0 }, randomizeRotation: true, showMeasureOnReveal: true,
      options: [{ id: 'yes', text: '✔ التصنيف صحيح' }, { id: 'no', text: '✘ التصنيف خاطئ' }],
      correct: correctChoice,
      hint: hintFor(realKey),
      explanation: 'الزاوية قياسها ' + deg + '°، إذًا هي ' + A.TYPES[realKey].full +
        (realKey === claimedKey ? '، والتصنيف المكتوب صحيح.' : '، والتصنيف المكتوب خاطئ.')
    };
  }

  // النوع 7 — اختر الزاوية المطلوبة (4 رسومات)
  function qPick(targetKey, degrees, level, story) {
    var opts = degrees.map(function (d) { return { id: 'a' + d, angle: { degree: d, rotation: 0 } }; });
    var target = null;
    for (var i = 0; i < degrees.length; i++) if (A.getAngleType(degrees[i]) === targetKey) { target = 'a' + degrees[i]; break; }
    return {
      id: nid('pk'), kind: 'pick', category: targetKey, level: level || 2, typeName: 'اختر الزاوية المطلوبة',
      prompt: story || ('اختر الزاوية ' + TYPE_LABEL[targetKey] + ' من بين الزوايا الأربع.'),
      guide: 'قارن الفتحات الأربع، ثم اختر المطابقة للوصف.',
      angle: null, randomizeRotation: true,
      options: opts, correct: target,
      hint: hintFor(targetKey),
      explanation: 'المطلوب ' + A.TYPES[targetKey].full + ' (' + A.TYPES[targetKey].rule + ').'
    };
  }

  // النوع 8 — الزاوية المختلفة
  function qOdd(degrees, oddDeg, reason, level) {
    var opts = degrees.map(function (d) { return { id: 'o' + d, angle: { degree: d, rotation: 0 } }; });
    return {
      id: nid('od'), kind: 'odd', category: 'puzzle', level: level || 3, typeName: 'الزاوية المختلفة',
      prompt: 'أي زاوية تختلف عن البقية؟',
      guide: 'ابحث عن القاعدة التي تجمع ثلاث زوايا وتستثني واحدة.',
      angle: null, randomizeRotation: true, showMeasureOnReveal: true,
      options: opts, correct: 'o' + oddDeg,
      hint: 'صنّف كل زاوية أولًا، ثم ابحث عن الشاذة عن المجموعة.',
      explanation: reason
    };
  }

  // النوع 9 — تحدي التفكير
  function qThink(text, options, correctId, explanation, level, guide, hint) {
    return {
      id: nid('th'), kind: 'mcq', category: 'puzzle', level: level || 4, typeName: 'تحدي التفكير',
      prompt: text, guide: guide || 'الحل يحتاج خطوتين: احسب أولًا، ثم صنّف.',
      angle: null, options: options, correct: correctId,
      hint: hint || 'اكتب العملية الحسابية على ورقة ثم صنّف الناتج.',
      explanation: explanation
    };
  }

  // النوع 10 — تحدي السرعة
  function qSpeed(deg, level) {
    var key = A.getAngleType(deg);
    return {
      id: nid('sp'), kind: 'mcq', category: key, level: level || 3, typeName: '⏱️ تحدي السرعة', timed: true,
      prompt: 'بسرعة! ما نوع هذه الزاوية؟',
      guide: 'جسر السرعة يهتز… أجب بثقة وبدون تسرّع.',
      angle: { degree: deg, rotation: 0 }, randomizeRotation: true,
      options: typeOptions(), correct: key,
      hint: hintFor(key), explanation: explainAngle(deg)
    };
  }

  /* ---------------- بناء البنك ---------------- */
  function buildBank() {
    idc = 0;
    var b = [];

    /* --- 1) تحديد النوع (10) --- */
    b.push(qIdentify(35, 1, 'زاوية ضيقة تحرس البوابة الأولى.'));
    b.push(qIdentify(60, 1));
    b.push(qIdentify(90, 1, 'هذه الزاوية تشبه ركن الباب تمامًا.'));
    b.push(qIdentify(120, 1));
    b.push(qIdentify(150, 1));
    b.push(qIdentify(180, 1, 'انتبه: هل ترى خطًا واحدًا مستقيمًا؟'));
    b.push(qIdentify(25, 1));
    b.push(qIdentify(75, 1));
    b.push(qIdentify(135, 2));
    b.push(qIdentify(165, 2));

    /* --- 2) اكتب الإجابة (6) --- */
    b.push(qWrite(45, 1));
    b.push(qWrite(90, 1));
    b.push(qWrite(110, 2));
    b.push(qWrite(180, 1));
    b.push(qWrite(70, 1));
    b.push(qWrite(160, 2));

    /* --- 3) تحديد القياس (10) --- */
    b.push(qMeasure(30, [60, 90, 120], 2));
    b.push(qMeasure(45, [90, 135, 180], 2));
    b.push(qMeasure(60, [30, 90, 150], 2));
    b.push(qMeasure(90, [45, 120, 180], 2));
    b.push(qMeasure(120, [60, 90, 150], 2));
    b.push(qMeasure(135, [45, 90, 180], 2));
    b.push(qMeasure(150, [30, 90, 120], 2));
    b.push(qMeasure(180, [90, 120, 150], 2));
    b.push(qMeasure(15, [45, 75, 105], 3));
    b.push(qMeasure(105, [75, 135, 165], 3));

    /* --- 4) ألغاز (6) --- */
    b.push(qRiddle('أنا زاوية أكبر من 90° وأصغر من 180°. من أنا؟', 'obtuse', 2,
      'كل زاوية بين 90° و 180° هي زاوية منفرجة.'));
    b.push(qRiddle('أنا زاوية قياسي يساوي نصف الزاوية المستقيمة تمامًا. من أنا؟', 'right', 3,
      'الزاوية المستقيمة 180°، ونصفها 90°، وهي الزاوية القائمة.'));
    b.push(qRiddle('أنا زاوية أصغر من ركن المربع ولا أساويه. من أنا؟', 'acute', 2,
      'ركن المربع 90°، وكل زاوية أصغر منه (وأكبر من 0°) هي زاوية حادة.'));
    b.push(qRiddle('أنا زاوية ضلعاي يكوّنان خطًا مستقيمًا واحدًا. من أنا؟', 'straight', 2,
      'عندما يمتد الضلعان في اتجاهين متعاكسين يكون القياس 180°، أي زاوية مستقيمة.'));
    b.push(qRiddle('أنا زاوية قياسي ثلث الزاوية المستقيمة. من أنا؟', 'acute', 3,
      'ثلث 180° يساوي 60°، و 60° أصغر من 90°، إذًا هي زاوية حادة.'));
    b.push(qRiddle('أنا زاوية قياسي ضعف الزاوية التي قياسها 50°. من أنا؟', 'obtuse', 3,
      'ضعف 50° يساوي 100°، و 100° بين 90° و 180°، إذًا هي زاوية منفرجة.'));

    /* --- 5) صح أم خطأ (8) --- */
    b.push(qTF('الزاوية التي قياسها 90° هي زاوية قائمة.', true,
      'صحيح، فالزاوية القائمة قياسها 90° بالضبط.', 1, 'right'));
    b.push(qTF('كل زاوية أكبر من 90° تسمى زاوية حادة.', false,
      'خطأ، فالزاوية الأكبر من 90° والأصغر من 180° تسمى منفرجة، والحادة أصغر من 90°.', 1, 'acute'));
    b.push(qTF('الزاوية المستقيمة قياسها 180°.', true,
      'صحيح، والزاوية المستقيمة يظهر ضلعاها كخط مستقيم واحد.', 1, 'straight'));
    b.push(qTF('الزاوية التي قياسها 89° زاوية منفرجة.', false,
      'خطأ، فـ 89° أصغر من 90°، إذًا هي زاوية حادة. الفرق درجة واحدة فقط لكنه يغيّر النوع.', 2, 'acute'));
    b.push(qTF('الزاوية التي قياسها 91° زاوية منفرجة.', true,
      'صحيح، فـ 91° أكبر من 90° وأصغر من 180°.', 2, 'obtuse'));
    b.push(qTF('يمكن أن تكون زاوية حادة وقائمة في الوقت نفسه.', false,
      'خطأ، فلكل زاوية قياس واحد، والقائمة 90° بالضبط بينما الحادة أصغر من 90°.', 3, 'puzzle'));
    b.push(qTF('مجموع زاويتين قائمتين يساوي زاوية مستقيمة.', true,
      'صحيح: 90° + 90° = 180°، وهي الزاوية المستقيمة.', 3, 'straight'));
    b.push(qTF('الزاوية الحادة أكبر دائمًا من الزاوية المنفرجة.', false,
      'خطأ، فالحادة أصغر من 90° والمنفرجة أكبر من 90°، إذًا المنفرجة أكبر دائمًا.', 2, 'puzzle'));

    /* --- 6) اكتشف الخطأ (6) --- */
    b.push(qFindError(120, 'acute', 2));
    b.push(qFindError(90, 'right', 2));
    b.push(qFindError(40, 'obtuse', 2));
    b.push(qFindError(180, 'obtuse', 2));
    b.push(qFindError(65, 'acute', 2));
    b.push(qFindError(155, 'straight', 3));

    /* --- 7) اختر الزاوية المطلوبة (6) --- */
    b.push(qPick('right', [40, 90, 130, 180], 2,
      'الحارس لا يسمح لك بالمرور إلا إذا اخترت الزاوية التي تشبه ركن المربع. أي واحدة تختار؟'));
    b.push(qPick('obtuse', [30, 90, 125, 180], 2,
      'مفتاح الصندوق مخبأ خلف الزاوية المنفرجة. أين هو؟'));
    b.push(qPick('acute', [55, 90, 140, 180], 2,
      'الممر الضيق يقبل الزاوية الحادة فقط. اخترها لتعبر.'));
    b.push(qPick('straight', [35, 90, 110, 180], 2,
      'الجسر يُفتح عند اختيار الزاوية المستقيمة. أي رسم يمثلها؟'));
    b.push(qPick('obtuse', [20, 75, 100, 90], 3,
      'ثلاث زوايا خدّاعة وزاوية منفرجة واحدة. اكشفها.'));
    b.push(qPick('acute', [95, 100, 15, 180], 3,
      'البوصلة تشير إلى الزاوية الحادة وحدها. حدّدها بسرعة.'));

    /* --- 8) الزاوية المختلفة (5) --- */
    b.push(qOdd([45, 30, 60, 120], 120,
      'الزوايا 45° و 30° و 60° كلها حادة (أصغر من 90°)، أما 120° فهي منفرجة.', 3));
    b.push(qOdd([100, 110, 150, 80], 80,
      'الزوايا 100° و 110° و 150° منفرجة، أما 80° فهي حادة.', 3));
    b.push(qOdd([90, 90, 90, 135], 135,
      'ثلاث زوايا قياسها 90° أي قائمة، و 135° منفرجة.', 3));
    b.push(qOdd([180, 20, 40, 70], 180,
      'الزوايا 20° و 40° و 70° حادة، أما 180° فهي زاوية مستقيمة.', 3));
    b.push(qOdd([95, 130, 170, 90], 90,
      'الزوايا 95° و 130° و 170° منفرجة، أما 90° فهي قائمة بالضبط.', 4));

    /* --- 9) تحدي التفكير (6) --- */
    b.push(qThink('لديك زاوية قياسها 60°. إذا زاد قياسها 30°، فما نوع الزاوية الجديدة؟',
      typeOptions(), 'right',
      '60° + 30° = 90°، والزاوية التي قياسها 90° هي زاوية قائمة.', 4));
    b.push(qThink('زاوية قياسها 100°. إذا نقص قياسها 40°، فما نوع الزاوية الجديدة؟',
      typeOptions(), 'acute',
      '100° − 40° = 60°، و 60° أصغر من 90°، إذًا هي زاوية حادة.', 4));
    b.push(qThink('زاويتان متجاورتان قياس الأولى 90° والثانية 45°. ما نوع الزاوية الناتجة من ضمّهما؟',
      typeOptions(), 'obtuse',
      '90° + 45° = 135°، وهي بين 90° و 180°، إذًا منفرجة.', 4));
    b.push(qThink('قُسمت زاوية مستقيمة إلى زاويتين متساويتين. ما نوع كل زاوية منهما؟',
      typeOptions(), 'right',
      '180° ÷ 2 = 90°، إذًا كل زاوية قائمة.', 4));
    b.push(qThink('عقربا الساعة عند الثالثة تمامًا. ما نوع الزاوية بينهما؟',
      typeOptions(), 'right',
      'الساعة 12 قسمًا، وكل قسم 30°. بين 12 و 3 ثلاثة أقسام: 3 × 30° = 90°، إذًا زاوية قائمة.', 4,
      'تخيّل ميناء الساعة: كل ساعة تساوي 30°.',
      'قسّم 360° على 12، ثم اضرب في عدد الساعات بين العقربين.'));
    b.push(qThink('زاوية قياسها 3 أضعاف زاوية قياسها 60°. ما نوع الزاوية الناتجة؟',
      typeOptions(), 'straight',
      '3 × 60° = 180°، وهي الزاوية المستقيمة.', 4,
      'اضرب أولًا، ثم صنّف الناتج.', 'الناتج يساوي 180° بالضبط. ما اسم هذه الزاوية؟'));

    /* --- 10) تحدي السرعة (6) --- */
    b.push(qSpeed(50, 3));
    b.push(qSpeed(90, 3));
    b.push(qSpeed(140, 3));
    b.push(qSpeed(180, 4));
    b.push(qSpeed(85, 4));
    b.push(qSpeed(95, 4));

    return b;
  }

  var BANK = buildBank();

  /* ---------------- مراحل الرحلة ---------------- */
  var STAGES = [
    {
      id: 1, title: 'بوابة الزوايا', icon: '🏰', color: 'jade',
      intro: 'حارس البوابة لا يفتح إلا لمن يعرف أنواع الزوايا.',
      filter: function (q) { return q.level === 1 && !q.timed; }
    },
    {
      id: 2, title: 'وادي الألغاز', icon: '🌲', color: 'violet',
      intro: 'أشجار الوادي تهمس بالألغاز… أنصت جيدًا.',
      filter: function (q) { return q.level === 2 && q.category !== 'measure' && !q.timed; }
    },
    {
      id: 3, title: 'كهف القياسات', icon: '🕳️', color: 'teal',
      intro: 'في الكهف لا تنفع التخمينات، بل الأرقام.',
      filter: function (q) { return q.category === 'measure'; }
    },
    {
      id: 4, title: 'جسر السرعة وقلعة القياس', icon: '🏯', color: 'gold',
      intro: 'الجسر يهتز، والقلعة تنتظر مستكشفًا سريعًا ودقيقًا.',
      filter: function (q) { return q.level === 3; }
    },
    {
      id: 5, title: 'خزينة الكنز', icon: '💎', color: 'rose',
      intro: 'خطوة واحدة تفصلك عن الكنز… لكنها أصعب خطوة.',
      filter: function (q) { return q.level === 4; }
    }
  ];

  function poolFor(stage, bank, difficulty) {
    var pool = bank.filter(stage.filter);
    if (difficulty === 'easy') {
      var easy = bank.filter(function (q) { return q.level <= 2; });
      pool = pool.filter(function (q) { return q.level <= 2; });
      if (pool.length < 4) pool = easy;
    } else if (difficulty === 'hard') {
      var hard = bank.filter(function (q) { return q.level >= 3; });
      var p2 = pool.filter(function (q) { return q.level >= 3; });
      pool = p2.length >= 4 ? p2 : hard;
    }
    if (pool.length < 4) pool = bank.slice();
    return pool;
  }

  /* توزيع عدد الأسئلة على المراحل */
  function distribute(total, stages) {
    var base = Math.floor(total / stages), rest = total % stages, out = [], i;
    for (i = 0; i < stages; i++) out.push(base + (i < rest ? 1 : 0));
    return out;
  }

  function prepare(q) {
    // نسخة مستقلة لكل محاولة مع دوران عشوائي وترتيب خيارات عشوائي
    var c = JSON.parse(JSON.stringify(q));
    if (c.angle && c.randomizeRotation) c.angle.rotation = A.randomRotation(c.angle.degree);
    if (c.options) {
      c.options = c.options.map(function (o) {
        if (o.angle && c.randomizeRotation) o.angle.rotation = A.randomRotation(o.angle.degree);
        return o;
      });
      c.options = U.shuffle(c.options);
    }
    return c;
  }

  /**
   * بناء أسئلة رحلة كاملة موزعة على المراحل
   * returns [{stage, questions:[...]}, ...]
   */
  /* اختيار بنك الدرس النشط من MJ.Banks */
  function bankFor(settings) {
    var s = settings || MJ.Storage.getSettings();
    var b = MJ.Banks[s.lesson];
    if (!b && MJ.Curriculum) b = MJ.Banks[MJ.Curriculum.firstReady()];
    return b || MJ.Banks.u0l1;
  }

  /* دمج تسميات فئات الدرس في جدول التحليل */
  function useBank(bank) {
    if (bank && bank.categories) {
      for (var k in bank.categories) {
        if (Object.prototype.hasOwnProperty.call(bank.categories, k)) CATEGORY_LABEL[k] = bank.categories[k];
      }
    }
    return bank;
  }

  function buildJourney(settings) {
    var s = settings || MJ.Storage.getSettings();
    var bank = useBank(bankFor(s));
    var BANK = bank.questions;
    var STAGES = bank.stages;
    var total = Math.max(5, Math.min(60, Number(s.questionCount) || 20));
    total = Math.min(total, BANK.length);          // لا نطلب أكثر مما يحويه بنك الدرس
    var counts = distribute(total, STAGES.length);
    var used = {};
    var journey = [];
    var globalIndex = 0;

    STAGES.forEach(function (stage, si) {
      var pool = poolFor(stage, BANK, s.difficulty).filter(function (q) { return !used[q.id]; });
      if (pool.length < counts[si]) {
        var extra = BANK.filter(function (q) { return !used[q.id] && pool.indexOf(q) === -1; });
        pool = pool.concat(U.shuffle(extra));
      }
      var picked = U.sample(pool, counts[si]);
      var qs = picked.map(function (q) {
        used[q.id] = true;
        var p = prepare(q);
        globalIndex++;
        p.globalIndex = globalIndex;
        p.stageId = stage.id;
        return p;
      });
      journey.push({ stage: stage, questions: qs });
    });

    // إكمال العدد إن قصّرت بعض المراحل عن نصيبها
    var got = journey.reduce(function (t, st) { return t + st.questions.length; }, 0);
    if (got < total) {
      var rest = U.shuffle(BANK.filter(function (x) { return !used[x.id]; })).slice(0, total - got);
      rest.forEach(function (x, i) {
        used[x.id] = true;
        var target = journey[journey.length - 1 - (i % journey.length)];
        var p = prepare(x);
        p.stageId = target.stage.id;
        target.questions.push(p);
      });
      var k = 0;
      journey.forEach(function (st) { st.questions.forEach(function (p) { k++; p.globalIndex = k; }); });
    }

    return journey;
  }

  /* تسجيل بنك الزوايا الأساسي كدرس مراجعة */
  MJ.Banks.u0l1 = {
    id: 'u0l1',
    questions: BANK,
    stages: STAGES,
    categories: CATEGORY_LABEL
  };

  MJ.Questions = {
    BANK: BANK,
    banks: function () { return MJ.Banks; },
    bankOf: function (lessonId) { return MJ.Banks[lessonId] || null; },
    /* البحث في كل البنوك المسجّلة — تحتاجه مراجعة النتائج المستوردة */
    byId: function (id) {
      var keys = Object.keys(MJ.Banks), i, j, list;
      for (i = 0; i < keys.length; i++) {
        list = MJ.Banks[keys[i]].questions;
        for (j = 0; j < list.length; j++) if (list[j].id === id) return list[j];
      }
      return null;
    },
    stagesOf: function (lessonId) {
      var b = MJ.Banks[lessonId];
      return b ? b.stages : STAGES;
    },
    countOf: function (lessonId) {
      var b = MJ.Banks[lessonId];
      return b ? b.questions.length : 0;
    },
    STAGES: STAGES,
    CATEGORY_LABEL: CATEGORY_LABEL,
    LEVEL_LABEL: LEVEL_LABEL,
    TYPE_LABEL: TYPE_LABEL,
    buildBank: buildBank,
    buildJourney: buildJourney,
    prepare: prepare,
    count: function (lessonId) {
      if (lessonId) return this.countOf(lessonId);
      var s = MJ.Storage.getSettings();
      var b = MJ.Banks[s.lesson];
      return (b ? b.questions : BANK).length;
    },
    countAll: function () {
      var t = 0, k;
      for (k in MJ.Banks) if (Object.prototype.hasOwnProperty.call(MJ.Banks, k)) t += MJ.Banks[k].questions.length;
      return t;
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
