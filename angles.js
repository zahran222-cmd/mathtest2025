/* ============================================================
   رحلة الرياضيات — angles.js
   منطق الزوايا + مولّد الرسم بـ SVG
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};

  /* ---------------- أنواع الزوايا ---------------- */
  var TYPES = {
    acute: {
      key: 'acute', name: 'حادة', full: 'الزاوية الحادة',
      rule: 'أكبر من 0° وأصغر من 90°', icon: '📐'
    },
    right: {
      key: 'right', name: 'قائمة', full: 'الزاوية القائمة',
      rule: 'قياسها 90° بالضبط', icon: '📏'
    },
    obtuse: {
      key: 'obtuse', name: 'منفرجة', full: 'الزاوية المنفرجة',
      rule: 'أكبر من 90° وأصغر من 180°', icon: '🔻'
    },
    straight: {
      key: 'straight', name: 'مستقيمة', full: 'الزاوية المستقيمة',
      rule: 'قياسها 180° بالضبط', icon: '➖'
    },
    reflex: {
      key: 'reflex', name: 'منعكسة', full: 'الزاوية المنعكسة',
      rule: 'أكبر من 180° وأصغر من 360°', icon: '🔄'
    }
  };

  var MAIN_TYPE_KEYS = ['acute', 'right', 'obtuse', 'straight'];

  /* المطلوب في المتطلبات: getAngleType(degree) */
  function getAngleType(degree) {
    var d = Number(degree);
    if (!isFinite(d)) return null;
    if (d > 0 && d < 90) return 'acute';
    if (d === 90) return 'right';
    if (d > 90 && d < 180) return 'obtuse';
    if (d === 180) return 'straight';
    if (d > 180 && d < 360) return 'reflex';
    return null;
  }

  function getTypeInfo(key) { return TYPES[key] || null; }
  function typeOf(degree) { return TYPES[getAngleType(degree)] || null; }
  function typeName(degree) { var t = typeOf(degree); return t ? t.name : '—'; }
  function typeFull(degree) { var t = typeOf(degree); return t ? t.full : '—'; }

  /* التحقق من إجابة نصية لنوع الزاوية */
  var ACCEPTED = {
    acute: ['حاده', 'زاويه حاده', 'حاد', 'زاويه حاد', 'حادة'],
    right: ['قائمه', 'زاويه قائمه', 'قايمه', 'قائم', 'زاويه قائم', 'قائمة'],
    obtuse: ['منفرجه', 'زاويه منفرجه', 'منفرج', 'زاويه منفرج', 'منفرجة'],
    straight: ['مستقيمه', 'زاويه مستقيمه', 'مستقيم', 'زاويه مستقيم', 'مسطحه', 'مستقيمة'],
    reflex: ['منعكسه', 'زاويه منعكسه', 'منعكس', 'منعكسة']
  };

  function matchTypeText(text) {
    var n = MJ.Utils.normalizeArabic(text);
    if (!n) return null;
    var key, i, list;
    for (key in ACCEPTED) {
      if (!Object.prototype.hasOwnProperty.call(ACCEPTED, key)) continue;
      list = ACCEPTED[key];
      for (i = 0; i < list.length; i++) {
        if (n === MJ.Utils.normalizeArabic(list[i])) return key;
      }
    }
    // مطابقة بالجذر إذا كتب الطالب جملة
    if (/حاد/.test(n)) return 'acute';
    if (/قائم|قايم/.test(n)) return 'right';
    if (/منفرج/.test(n)) return 'obtuse';
    if (/مستقيم|مسطح/.test(n)) return 'straight';
    if (/منعكس/.test(n)) return 'reflex';
    return null;
  }

  /* ---------------- مولّد رسم الزوايا ---------------- */
  var VB = 220;          // مساحة الرسم الداخلية
  var VX = 110, VY = 118; // رأس الزاوية الافتراضي
  var RAY = 84;          // طول الضلع الافتراضي

  function pt(cx, cy, angleDeg, len) {
    var r = angleDeg * Math.PI / 180;
    return { x: cx + len * Math.cos(r), y: cy - len * Math.sin(r) };
  }
  function n2(v) { return Math.round(v * 100) / 100; }

  /**
   * generateAngle(degree, rotation, size, options) -> نص SVG
   * degree   : قياس الزاوية بالدرجات
   * rotation : دوران الضلع الأول (بالدرجات، عكس عقارب الساعة)
   * size     : الحجم المعروض بالبكسل (عرض/ارتفاع المربع)
   * options  : { showMeasure, showArc, labels, rayLength, vertex:{x,y}, tone, id, title }
   */
  function generateAngle(degree, rotation, size, options) {
    var deg = Number(degree) || 0;
    var rot = Number(rotation) || 0;
    var px = Number(size) || 180;
    var o = options || {};

    var showMeasure = o.showMeasure === true;
    var showArc = o.showArc !== false;
    var labels = o.labels !== false;
    var L = o.rayLength || RAY;
    var vx = (o.vertex && o.vertex.x) || VX;
    var vy = (o.vertex && o.vertex.y) || VY;
    var tone = o.tone || 'gold';
    var title = o.title || ('زاوية قياسها ' + deg + ' درجة');

    var a1 = rot;
    var a2 = rot + deg;
    var p1 = pt(vx, vy, a1, L);
    var p2 = pt(vx, vy, a2, L);

    var arcR = Math.max(26, Math.min(46, L * 0.42));
    var q1 = pt(vx, vy, a1, arcR);
    var q2 = pt(vx, vy, a2, arcR);
    var largeArc = (deg % 360) > 180 ? 1 : 0;

    var parts = [];

    // قطاع الزاوية (تعبئة خفيفة)
    if (showArc && deg > 0) {
      if (deg >= 360) {
        parts.push('<circle cx="' + vx + '" cy="' + vy + '" r="' + arcR + '" class="mj-ang-fill"/>');
      } else {
        parts.push('<path class="mj-ang-fill" d="M ' + vx + ' ' + vy +
          ' L ' + n2(q1.x) + ' ' + n2(q1.y) +
          ' A ' + arcR + ' ' + arcR + ' 0 ' + largeArc + ' 0 ' + n2(q2.x) + ' ' + n2(q2.y) + ' Z"/>');
      }
    }

    // الأضلاع
    parts.push('<line class="mj-ang-ray" x1="' + vx + '" y1="' + vy + '" x2="' + n2(p1.x) + '" y2="' + n2(p1.y) + '"/>');
    parts.push('<line class="mj-ang-ray" x1="' + vx + '" y1="' + vy + '" x2="' + n2(p2.x) + '" y2="' + n2(p2.y) + '"/>');

    // علامة الزاوية القائمة أو قوس الزاوية
    if (showArc && deg > 0) {
      if (deg === 90) {
        var s = 20;
        var m1 = pt(vx, vy, a1, s);
        var m2 = pt(vx, vy, a2, s);
        var mc = { x: m1.x + (m2.x - vx), y: m1.y + (m2.y - vy) };
        parts.push('<path class="mj-ang-arc" d="M ' + n2(m1.x) + ' ' + n2(m1.y) +
          ' L ' + n2(mc.x) + ' ' + n2(mc.y) + ' L ' + n2(m2.x) + ' ' + n2(m2.y) + '" fill="none"/>');
      } else if (deg === 180) {
        parts.push('<path class="mj-ang-arc" fill="none" d="M ' + n2(q1.x) + ' ' + n2(q1.y) +
          ' A ' + arcR + ' ' + arcR + ' 0 0 0 ' + n2(q2.x) + ' ' + n2(q2.y) + '"/>');
      } else {
        parts.push('<path class="mj-ang-arc" fill="none" d="M ' + n2(q1.x) + ' ' + n2(q1.y) +
          ' A ' + arcR + ' ' + arcR + ' 0 ' + largeArc + ' 0 ' + n2(q2.x) + ' ' + n2(q2.y) + '"/>');
      }
    }

    // رأس الزاوية
    parts.push('<circle class="mj-ang-vertex" cx="' + vx + '" cy="' + vy + '" r="5"/>');

    // تسميات النقاط
    if (labels) {
      var lp1 = pt(vx, vy, a1, L + 16);
      var lp2 = pt(vx, vy, a2, L + 16);
      var lv = pt(vx, vy, a1 + deg / 2 + 180, 20);
      parts.push('<text class="mj-ang-label" x="' + n2(lp1.x) + '" y="' + n2(lp1.y + 5) + '">ب</text>');
      parts.push('<text class="mj-ang-label" x="' + n2(lp2.x) + '" y="' + n2(lp2.y + 5) + '">ج</text>');
      parts.push('<text class="mj-ang-label" x="' + n2(lv.x) + '" y="' + n2(lv.y + 5) + '">أ</text>');
    }

    // قياس الزاوية مكتوبًا
    if (showMeasure) {
      // في الزوايا الضيقة لا تتسع الفتحة للنص، فيوضع خارج الضلع العلوي
      var mAngle = (deg < 36) ? (a2 + 17) : (a1 + deg / 2);
      var mDist = (deg < 36) ? (arcR + 28) : (arcR + 24);
      var lm = pt(vx, vy, mAngle, mDist);
      parts.push('<text class="mj-ang-measure" x="' + n2(lm.x) + '" y="' + n2(lm.y + 6) + '">' + deg + '°</text>');
    }

    var cls = 'mj-angle mj-angle--' + tone;
    return '<svg class="' + cls + '" viewBox="0 0 ' + VB + ' ' + VB + '" width="' + px + '" height="' + px +
      '" role="img" aria-label="' + MJ.Utils.escapeHtml(title) + '" xmlns="http://www.w3.org/2000/svg">' +
      '<title>' + MJ.Utils.escapeHtml(title) + '</title>' +
      parts.join('') + '</svg>';
  }

  /* دوران عشوائي مناسب لكل زاوية بحيث تبقى داخل الإطار */
  function randomRotation(degree) {
    var options = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 90, 100, 110, 120, 135, 150, 160];
    var safe = options.filter(function (r) { return (r + degree) <= 350; });
    if (!safe.length) safe = [0];
    return safe[Math.floor(Math.random() * safe.length)];
  }

  MJ.Angles = {
    TYPES: TYPES,
    MAIN_TYPE_KEYS: MAIN_TYPE_KEYS,
    getAngleType: getAngleType,
    getTypeInfo: getTypeInfo,
    typeOf: typeOf,
    typeName: typeName,
    typeFull: typeFull,
    matchTypeText: matchTypeText,
    generateAngle: generateAngle,
    randomRotation: randomRotation
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
