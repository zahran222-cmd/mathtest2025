/* ============================================================
   رحلة الرياضيات — figures.js
   مولّدات رسوم SVG ديناميكية لدروس الهندسة:
     خط مستقيم · زوايا حول نقطة · متقابلة بالرأس ·
     متوازيان وقاطع · مثلث · رباعي أضلاع · شبكات المجسمات
   كل الرسوم تُبنى بالحساب لا بالصور الجاهزة، وتتكيف مع أي قياس.
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var rad = function (d) { return d * Math.PI / 180; };
  var r1 = function (n) { return Math.round(n * 10) / 10; };

  function esc(t) { return MJ.Utils.escapeHtml(String(t)); }

  /* ---------- أدوات بناء SVG مع إطار يتسع للمحتوى ---------- */
  function Canvas() {
    this.parts = [];
    this.minX = 1e9; this.minY = 1e9; this.maxX = -1e9; this.maxY = -1e9;
  }
  Canvas.prototype.fit = function (x, y) {
    if (x < this.minX) this.minX = x;
    if (y < this.minY) this.minY = y;
    if (x > this.maxX) this.maxX = x;
    if (y > this.maxY) this.maxY = y;
  };
  Canvas.prototype.line = function (x1, y1, x2, y2, cls) {
    this.fit(x1, y1); this.fit(x2, y2);
    this.parts.push('<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) +
      '" y2="' + r1(y2) + '" class="' + (cls || 'fg-line') + '" />');
    return this;
  };
  Canvas.prototype.poly = function (pts, cls) {
    var self = this;
    pts.forEach(function (p) { self.fit(p[0], p[1]); });
    this.parts.push('<polygon points="' + pts.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' ') +
      '" class="' + (cls || 'fg-shape') + '" />');
    return this;
  };
  Canvas.prototype.dot = function (x, y, cls) {
    this.fit(x, y);
    this.parts.push('<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="4" class="' + (cls || 'fg-vertex') + '" />');
    return this;
  };
  Canvas.prototype.text = function (x, y, t, cls) {
    this.fit(x - 14, y - 12); this.fit(x + 14, y + 6);
    this.parts.push('<text x="' + r1(x) + '" y="' + r1(y) + '" class="' + (cls || 'fg-label') +
      '" text-anchor="middle" direction="ltr">' + esc(t) + '</text>');
    return this;
  };
  /* قوس زاوية عند رأس، من الزاوية a1 إلى a2 (بالدرجات، عكس عقارب الساعة) */
  Canvas.prototype.arc = function (vx, vy, a1, a2, r, cls) {
    var p1 = [vx + Math.cos(rad(a1)) * r, vy - Math.sin(rad(a1)) * r];
    var p2 = [vx + Math.cos(rad(a2)) * r, vy - Math.sin(rad(a2)) * r];
    var span = ((a2 - a1) % 360 + 360) % 360;
    this.fit(p1[0], p1[1]); this.fit(p2[0], p2[1]);
    this.parts.push('<path d="M ' + r1(p1[0]) + ' ' + r1(p1[1]) + ' A ' + r + ' ' + r + ' 0 ' +
      (span > 180 ? 1 : 0) + ' 0 ' + r1(p2[0]) + ' ' + r1(p2[1]) + '" class="' + (cls || 'fg-arc') + '" />');
    return this;
  };
  /* علامة الزاوية القائمة */
  Canvas.prototype.rightMark = function (vx, vy, a1, s) {
    var s2 = s || 14;
    var p1 = [vx + Math.cos(rad(a1)) * s2, vy - Math.sin(rad(a1)) * s2];
    var p3 = [vx + Math.cos(rad(a1 + 90)) * s2, vy - Math.sin(rad(a1 + 90)) * s2];
    var p2 = [p1[0] + (p3[0] - vx), p1[1] + (p3[1] - vy)];
    return this.poly([[vx, vy], p1, p2, p3], 'fg-right');
  };
  /* وسم زاوية: قوس + نص عند منتصفها */
  Canvas.prototype.angle = function (vx, vy, a1, a2, label, opts) {
    var o = opts || {};
    var r = o.r || 26;
    // لا نرسم علامة الزاوية القائمة على زاوية مجهولة حتى لا تكشف الإجابة
    if (Math.abs(((a2 - a1) % 360 + 360) % 360 - 90) < 0.6 && !o.forceArc && !o.unknown) this.rightMark(vx, vy, a1, 15);
    else this.arc(vx, vy, a1, a2, r, o.cls);
    if (label !== undefined && label !== null && label !== '') {
      var mid = a1 + (((a2 - a1) % 360 + 360) % 360) / 2;
      var d = r + (o.gap || 20);
      this.text(vx + Math.cos(rad(mid)) * d, vy - Math.sin(rad(mid)) * d + 5, label,
        o.unknown ? 'fg-unknown' : 'fg-measure');
    }
    return this;
  };
  Canvas.prototype.svg = function (pad) {
    var p = pad || 20;
    var w = (this.maxX - this.minX) + p * 2;
    var h = (this.maxY - this.minY) + p * 2;
    return '<svg class="fig" viewBox="' + r1(this.minX - p) + ' ' + r1(this.minY - p) + ' ' +
      r1(w) + ' ' + r1(h) + '" xmlns="http://www.w3.org/2000/svg" role="img" ' +
      'preserveAspectRatio="xMidYMid meet">' + this.parts.join('') + '</svg>';
  };

  var ARABIC = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح'];

  var Figures = {
    /* ===== زوايا على خط مستقيم: parts = [{v:130}, {v:'س', unknown:true}] ===== */
    straightLine: function (parts) {
      var c = new Canvas(), L = 120, vx = 0, vy = 0, acc = 0;
      c.line(vx - L, vy, vx + L, vy, 'fg-base');
      parts.forEach(function (p, i) {
        var a1 = acc, a2 = acc + p.deg;
        if (i < parts.length - 1) {
          c.line(vx, vy, vx + Math.cos(rad(a2)) * L, vy - Math.sin(rad(a2)) * L, 'fg-ray');
        }
        c.angle(vx, vy, a1, a2, p.label, { r: 30 + (i % 2) * 10, unknown: p.unknown });
        acc = a2;
      });
      c.dot(vx, vy);
      return c.svg();
    },

    /* ===== زوايا حول نقطة ===== */
    aroundPoint: function (parts) {
      var c = new Canvas(), L = 105, vx = 0, vy = 0, acc = 20;
      parts.forEach(function (p, i) {
        var a1 = acc, a2 = acc + p.deg;
        c.line(vx, vy, vx + Math.cos(rad(a1)) * L, vy - Math.sin(rad(a1)) * L, 'fg-ray');
        c.angle(vx, vy, a1, a2, p.label, { r: 30 + (i % 2) * 8, unknown: p.unknown });
        acc = a2;
      });
      c.dot(vx, vy);
      return c.svg();
    },

    /* ===== خطان متقاطعان: زوايا متقابلة بالرأس ===== */
    verticallyOpposite: function (deg, labels) {
      var c = new Canvas(), L = 115, vx = 0, vy = 0;
      c.line(vx - L, vy, vx + L, vy, 'fg-base');
      c.line(vx - Math.cos(rad(deg)) * L, vy + Math.sin(rad(deg)) * L,
             vx + Math.cos(rad(deg)) * L, vy - Math.sin(rad(deg)) * L, 'fg-base');
      var l = labels || {};
      c.angle(vx, vy, 0, deg, l.a, { r: 30, unknown: l.aUnknown });
      c.angle(vx, vy, deg, 180, l.b, { r: 38, unknown: l.bUnknown });
      c.angle(vx, vy, 180, 180 + deg, l.c, { r: 30, unknown: l.cUnknown });
      c.angle(vx, vy, 180 + deg, 360, l.d, { r: 38, unknown: l.dUnknown });
      c.dot(vx, vy);
      return c.svg();
    },

    /* ===== مستقيمان متوازيان وقاطع =====
       marks: { p1:{a,b,c,d}, p2:{a,b,c,d} } لكل موضع نص أو null
       المواضع حول كل تقاطع: a أعلى يمين، b أعلى يسار، c أسفل يسار، d أسفل يمين */
    parallelLines: function (deg, marks) {
      var c = new Canvas(), L = 135, gap = 110, t = deg || 55;
      var m = marks || {};
      var y1 = 0, y2 = gap;
      // نقطتا التقاطع
      var x1 = 0, x2 = x1 + gap / Math.tan(rad(t));
      c.line(x1 - L, y1, x1 + L, y1, 'fg-base');
      c.line(x2 - L, y2, x2 + L, y2, 'fg-base');
      // القاطع يمتد فوق وتحت
      var ex = 60;
      c.line(x1 - Math.cos(rad(t)) * ex, y1 + Math.sin(rad(t)) * ex * -1 + 0,
             x2 + Math.cos(rad(180 + t)) * -ex, y2 + Math.sin(rad(t)) * ex, 'fg-base');
      // أسهم التوازي
      c.text(x1 - L + 16, y1 - 10, '›', 'fg-mark');
      c.text(x2 - L + 16, y2 - 10, '›', 'fg-mark');

      function place(px, py, set) {
        if (!set) return;
        var pos = [
          { key: 'a', a1: 0, a2: t },
          { key: 'b', a1: t, a2: 180 },
          { key: 'c', a1: 180, a2: 180 + t },
          { key: 'd', a1: 180 + t, a2: 360 }
        ];
        pos.forEach(function (p, i) {
          var v = set[p.key];
          if (v === undefined || v === null) return;
          c.angle(px, py, p.a1, p.a2, v, { r: 26 + (i % 2) * 8, unknown: /[سصع]/.test(String(v)) });
        });
      }
      place(x1, y1, m.p1);
      place(x2, y2, m.p2);
      c.dot(x1, y1); c.dot(x2, y2);
      return c.svg();
    },

    /* ===== مثلث بزواياه =====
       o = { A, B, C (بالدرجات), labels:{A,B,C}, exterior:'C', vertices:true } */
    triangle: function (o) {
      var A = o.A, B = o.B, C = 180 - A - B;
      var c = new Canvas(), base = 190;
      // الرأس ب في الأصل، ج على المحور الأفقي
      var Bp = [0, 0], Cp = [base, 0];
      // الرأس أ من تقاطع الشعاعين
      var hx = base * Math.tan(rad(C)) / (Math.tan(rad(B)) + Math.tan(rad(C)));
      var hy = hx * Math.tan(rad(B));
      var Ap = [hx, -hy];
      c.poly([Ap, Bp, Cp], 'fg-shape');

      var lab = o.labels || {};
      function ang(P, Q, R, text, unknown) {   // الزاوية عند P بين الشعاعين نحو Q و R
        var a1 = Math.atan2(-(Q[1] - P[1]), Q[0] - P[0]) * 180 / Math.PI;
        var a2 = Math.atan2(-(R[1] - P[1]), R[0] - P[0]) * 180 / Math.PI;
        var span = ((a2 - a1) % 360 + 360) % 360;
        if (span > 180) { var tmp = a1; a1 = a2; a2 = tmp; }
        c.angle(P[0], P[1], a1, a2, text, { r: 24, gap: 16, unknown: unknown });
      }
      ang(Ap, Bp, Cp, lab.A, /[سصع]/.test(String(lab.A)));
      ang(Bp, Cp, Ap, lab.B, /[سصع]/.test(String(lab.B)));
      ang(Cp, Ap, Bp, lab.C, /[سصع]/.test(String(lab.C)));

      if (o.exterior) {                        // امتداد القاعدة لإظهار الزاوية الخارجية عند ج
        var ext = [Cp[0] + 70, Cp[1]];
        c.line(Cp[0], Cp[1], ext[0], ext[1], 'fg-dash');
        var a1 = Math.atan2(-(Ap[1] - Cp[1]), Ap[0] - Cp[0]) * 180 / Math.PI;
        c.angle(Cp[0], Cp[1], 0, a1, o.exterior, { r: 34, gap: 16, unknown: /[سصع]/.test(String(o.exterior)) });
      }
      if (o.vertices !== false) {
        c.text(Ap[0], Ap[1] - 14, 'أ', 'fg-point');
        c.text(Bp[0] - 14, Bp[1] + 18, 'ب', 'fg-point');
        c.text(Cp[0] + 14, Cp[1] + 18, 'ج', 'fg-point');
      }
      c.dot(Ap[0], Ap[1]); c.dot(Bp[0], Bp[1]); c.dot(Cp[0], Cp[1]);
      return c.svg();
    },

    /* ===== شكل رباعي الأضلاع بزواياه ===== */
    quad: function (labels, shape) {
      var c = new Canvas();
      var pts = (shape === 'parallelogram')
        ? [[30, -110], [190, -110], [160, 0], [0, 0]]
        : [[20, -120], [200, -95], [175, 0], [0, -15]];
      c.poly(pts, 'fg-shape');
      var L = labels || [];
      pts.forEach(function (P, i) {
        var Q = pts[(i + 1) % 4], R = pts[(i + 3) % 4];
        var a1 = Math.atan2(-(Q[1] - P[1]), Q[0] - P[0]) * 180 / Math.PI;
        var a2 = Math.atan2(-(R[1] - P[1]), R[0] - P[0]) * 180 / Math.PI;
        var span = ((a2 - a1) % 360 + 360) % 360;
        if (span > 180) { var t = a1; a1 = a2; a2 = t; }
        if (L[i]) c.angle(P[0], P[1], a1, a2, L[i], { r: 24, gap: 16, unknown: /[سصع]/.test(String(L[i])) });
        c.dot(P[0], P[1]);
      });
      return c.svg();
    },

    /* ===== شبكات المجسمات ===== */
    net: function (kind) {
      var c = new Canvas(), u = 42;
      function sq(cx, cy, cls) {
        c.poly([[cx * u, cy * u], [(cx + 1) * u, cy * u], [(cx + 1) * u, (cy + 1) * u], [cx * u, (cy + 1) * u]],
          cls || 'fg-face');
      }
      function rect(cx, cy, w, h, cls) {
        c.poly([[cx * u, cy * u], [(cx + w) * u, cy * u], [(cx + w) * u, (cy + h) * u], [cx * u, (cy + h) * u]],
          cls || 'fg-face');
      }
      function tri(pts, cls) { c.poly(pts.map(function (p) { return [p[0] * u, p[1] * u]; }), cls || 'fg-face2'); }

      var maps = {
        /* شبكات مكعب صحيحة */
        cubeCross: [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
        cubeT:     [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]],
        cubeZ:     [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
        cubeStair: [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 0]],
        /* شبكات غير صحيحة للمكعب */
        badO:      [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],   // 2×3 صحيحة فعليًا؟ لا: هذه تكوّن مكعبًا ناقصًا
        badPlus:   [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]]    // صحيحة
      };

      if (kind === 'cuboid') {                      // متوازي مستطيلات
        rect(1, 0, 2, 1); rect(0, 1, 1, 2); rect(1, 1, 2, 2);
        rect(3, 1, 1, 2); rect(4, 1, 2, 2, 'fg-face2'); rect(1, 3, 2, 1);
      } else if (kind === 'triPrism') {             // منشور ثلاثي القاعدة
        rect(0, 0, 3, 1); rect(0, 1, 3, 1, 'fg-face2'); rect(0, 2, 3, 1);
        tri([[0, 1], [0, 2], [-1, 1.5]], 'fg-face3');
        tri([[3, 1], [3, 2], [4, 1.5]], 'fg-face3');
      } else if (kind === 'squarePyramid') {        // هرم رباعي منتظم
        sq(1, 1);
        tri([[1, 1], [2, 1], [1.5, 0]], 'fg-face2');
        tri([[1, 2], [2, 2], [1.5, 3]], 'fg-face2');
        tri([[1, 1], [1, 2], [0, 1.5]], 'fg-face2');
        tri([[2, 1], [2, 2], [3, 1.5]], 'fg-face2');
      } else if (kind === 'tetrahedron') {          // هرم ثلاثي (رباعي الأوجه)
        tri([[0, 1], [2, 1], [1, 0]], 'fg-face');
        tri([[0, 1], [2, 1], [1, 2]], 'fg-face2');
        tri([[0, 1], [1, 0], [-1, 0]], 'fg-face2');
        tri([[2, 1], [1, 0], [3, 0]], 'fg-face2');
      } else if (kind === 'cylinder') {             // أسطوانة
        rect(0, 1, 4, 1.6);
        c.parts.push('<circle cx="' + (2 * u) + '" cy="' + (0.5 * u) + '" r="' + (0.62 * u) + '" class="fg-face2" />');
        c.fit(2 * u - 0.7 * u, 0.5 * u - 0.7 * u); c.fit(2 * u + 0.7 * u, 0.5 * u + 0.7 * u);
        c.parts.push('<circle cx="' + (2 * u) + '" cy="' + (3.3 * u) + '" r="' + (0.62 * u) + '" class="fg-face2" />');
        c.fit(2 * u - 0.7 * u, 3.3 * u - 0.7 * u); c.fit(2 * u + 0.7 * u, 3.3 * u + 0.7 * u);
      } else {                                      // شبكات مكعب بأنماط مختلفة
        (maps[kind] || maps.cubeCross).forEach(function (p) { sq(p[0], p[1]); });
      }
      return c.svg(16);
    },

    /* مجسّم ثلاثي الأبعاد مبسّط (منظور) */
    solid: function (kind) {
      var c = new Canvas(), w = 120, h = 90, d = 42, o = 34;
      if (kind === 'cube' || kind === 'cuboid') {
        var W = kind === 'cube' ? 100 : 160;
        c.poly([[0, 0], [W, 0], [W, h], [0, h]], 'fg-shape');
        c.poly([[0, 0], [o, -o], [W + o, -o], [W, 0]], 'fg-face2');
        c.poly([[W, 0], [W + o, -o], [W + o, h - o], [W, h]], 'fg-face3');
      } else if (kind === 'triPrism') {
        c.poly([[0, h], [w, h], [w / 2, 0]], 'fg-shape');
        c.poly([[0, h], [o, h - o], [w / 2 + o, -o], [w / 2, 0]], 'fg-face2');
        c.poly([[w, h], [w + o, h - o], [w / 2 + o, -o], [w / 2, 0]], 'fg-face3');
      } else if (kind === 'squarePyramid') {
        c.poly([[0, h], [w, h], [w / 2 + o / 2, h - o / 2 - 0]], 'fg-face2');
        c.poly([[0, h], [w, h], [w / 2, -20]], 'fg-shape');
        c.poly([[w, h], [w + o, h - o], [w / 2, -20]], 'fg-face3');
      } else if (kind === 'cylinder') {
        c.parts.push('<ellipse cx="60" cy="0" rx="52" ry="16" class="fg-face2" />');
        c.parts.push('<rect x="8" y="0" width="104" height="' + h + '" class="fg-shape" />');
        c.parts.push('<ellipse cx="60" cy="' + h + '" rx="52" ry="16" class="fg-face2" />');
        c.fit(-4, -20); c.fit(124, h + 20);
      }
      return c.svg();
    },

    ARABIC: ARABIC
  };

  MJ.Figures = Figures;

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
