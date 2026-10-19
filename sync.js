/* ============================================================
   رحلة الرياضيات — sync.js
   المزامنة السحابية عبر Cloudflare Worker.

   المعلم: ينشر قائمة صفّه مرة واحدة، وتصله نتائج الطلاب تلقائيًا.
   الطالب: يفتح الرابط فيجد اسمه، وتُرسل نتيجته فور انتهائه.
   عند انقطاع الإنترنت تُحفظ النتيجة في صندوق صادر ويُعاد إرسالها لاحقًا،
   ويبقى نظام الأكواد اليدوي عاملًا كخطة بديلة.
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var U = MJ.Utils, S = MJ.Storage;

  var CFG_KEY = 'mathJourney_sync';      // { url }
  var OUT_KEY = 'mathJourney_outbox';    // نتائج تنتظر الإرسال
  var TIMEOUT = 12000;

  function read(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function trimUrl(u) { return String(u || '').trim().replace(/\/+$/, ''); }

  function request(url, options) {
    if (typeof global.fetch !== 'function') {
      return global.Promise.reject(new Error('هذا المتصفح لا يدعم الاتصال بالخادم.'));
    }
    var opts = options || {};
    var ctrl = (typeof global.AbortController === 'function') ? new global.AbortController() : null;
    if (ctrl) opts.signal = ctrl.signal;
    var timer = global.setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);

    return global.fetch(url, opts).then(function (res) {
      global.clearTimeout(timer);
      return res.json().catch(function () { throw new Error('رد الخادم غير مفهوم.'); })
        .then(function (data) {
          if (!res.ok || !data.ok) throw new Error(data && data.message ? data.message : 'تعذّر الاتصال بالخادم.');
          return data;
        });
    }, function (err) {
      global.clearTimeout(timer);
      throw new Error(err && err.name === 'AbortError' ? 'انتهت مهلة الاتصال بالخادم.' : 'تعذّر الوصول إلى الخادم. تحقق من الإنترنت أو من العنوان.');
    });
  }
  function post(base, path, body) {
    return request(trimUrl(base) + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  var Sync = {
    /* ---------------- الإعداد ---------------- */
    url: function () { return trimUrl((read(CFG_KEY, {}) || {}).url || ''); },
    setUrl: function (u) { write(CFG_KEY, { url: trimUrl(u) }); return this.url(); },
    isOn: function () { return !!this.url(); },
    ping: function (u) { return request(trimUrl(u || this.url()) + '/ping'); },

    /* رمز المعلم السري — يُولَّد مرة واحدة ويُحفظ مع حسابه */
    tokenOf: function (teacherId) {
      var t = S.getTeacher(teacherId || S.getActiveTeacherId());
      if (!t) return null;
      if (!t.syncToken) {
        t.syncToken = U.uid('tk') + '-' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
        S.saveTeacher(t);
      }
      return t.syncToken;
    },

    /* ---------------- المعلم ---------------- */
    publishClass: function (teacherId) {
      var id = teacherId || S.getActiveTeacherId();
      var base = this.url();
      if (!base) return global.Promise.reject(new Error('لم تُحدَّد وصلة الخادم بعد.'));
      var payload;
      try { payload = MJ.Share.classPayload(id); }
      catch (e) { return global.Promise.reject(e); }

      return post(base, '/class', {
        key: payload.ci,
        token: this.tokenOf(id),
        teacherName: payload.tn,
        teacherNumber: payload.tno,
        students: payload.st,
        settings: payload.s,
        ownBank: payload.ob || null
      });
    },

    /* رابط الصف السحابي: يحمل مفتاح الصف وعنوان الخادم */
    classLink: function (teacherId) {
      var id = teacherId || S.getActiveTeacherId();
      var key = MJ.Share.classKeyOf(id);
      var loc = global.location;
      var base = loc ? (loc.origin + loc.pathname) : '';
      return base + '#c=' + encodeURIComponent(key) + '&s=' + encodeURIComponent(this.url());
    },

    /* جلب النتائج الجديدة وحفظها */
    fetchResults: function (teacherId) {
      var id = teacherId || S.getActiveTeacherId();
      var base = this.url();
      if (!base) return global.Promise.reject(new Error('لم تُحدَّد وصلة الخادم بعد.'));
      var key = MJ.Share.classKeyOf(id);
      var token = this.tokenOf(id);

      return request(base + '/results?key=' + encodeURIComponent(key) + '&token=' + encodeURIComponent(token))
        .then(function (data) {
          var added = 0, skipped = 0, failed = 0;
          (data.results || []).forEach(function (row) {
            try {
              var result = MJ.Share.resultFromPayload(row.payload, id);
              var r = MJ.Share.saveResult(result);
              if (r.ok) added++; else skipped++;
            } catch (e) { failed++; }
          });
          return { total: data.count || 0, added: added, skipped: skipped, failed: failed };
        });
    },

    deleteRemote: function (resultId, teacherId) {
      var id = teacherId || S.getActiveTeacherId();
      if (!this.isOn()) return global.Promise.resolve({ ok: true });
      return post(this.url(), '/result/delete', {
        key: MJ.Share.classKeyOf(id), token: this.tokenOf(id), id: resultId
      });
    },

    /* ---------------- الطالب ---------------- */
    /* جلب الصف من الخادم وتركيبه على جهاز الطالب */
    joinFromServer: function (classKey, serverUrl) {
      var base = trimUrl(serverUrl);
      var self = this;
      return request(base + '/class?key=' + encodeURIComponent(classKey)).then(function (data) {
        var info = MJ.Share.applyClass({
          t: 'class', v: 2, ci: classKey,
          tn: data.teacherName, tno: data.teacherNumber,
          st: data.students, s: data.settings, ob: data.ownBank || null
        });
        // اربط حساب الصف بالخادم ليُرسل إليه النتائج
        var teacher = S.getTeacher(info.teacherId);
        if (teacher) { teacher.syncUrl = base; S.saveTeacher(teacher); }
        self.setUrl(base);
        return info;
      });
    },

    /* إرسال نتيجة الطالب مع صندوق صادر عند الانقطاع */
    submitResult: function (result) {
      var teacher = S.getTeacher(result.teacherId);
      var base = trimUrl((teacher && teacher.syncUrl) || this.url());
      var key = (teacher && teacher.classId) || null;
      if (!base || !key) return global.Promise.reject(new Error('هذا الصف غير مربوط بخادم.'));

      var payload = MJ.Share.resultPayload(result);
      var self = this;
      return post(base, '/result', { key: key, result: payload })
        .then(function (data) { self.removeFromOutbox(result.id); return data; })
        .catch(function (err) { self.addToOutbox(result.id, base, key, payload); throw err; });
    },

    canSubmit: function (teacherId) {
      var t = S.getTeacher(teacherId);
      return !!(t && t.isLink && (t.syncUrl || this.url()) && t.classId);
    },

    /* ---------------- صندوق الصادر ---------------- */
    outbox: function () { return read(OUT_KEY, []) || []; },
    addToOutbox: function (id, base, key, payload) {
      var box = this.outbox().filter(function (x) { return x.id !== id; });
      box.push({ id: id, base: base, key: key, payload: payload, at: Date.now() });
      write(OUT_KEY, box.slice(-20));
    },
    removeFromOutbox: function (id) {
      write(OUT_KEY, this.outbox().filter(function (x) { return x.id !== id; }));
    },
    flushOutbox: function () {
      var box = this.outbox(), self = this;
      if (!box.length) return global.Promise.resolve({ sent: 0, left: 0 });
      var sent = 0;
      var chain = box.reduce(function (p, item) {
        return p.then(function () {
          return post(item.base, '/result', { key: item.key, result: item.payload })
            .then(function () { sent++; self.removeFromOutbox(item.id); })
            .catch(function () { /* يبقى في الصندوق للمحاولة القادمة */ });
        });
      }, global.Promise.resolve());
      return chain.then(function () { return { sent: sent, left: self.outbox().length }; });
    }
  };

  MJ.Sync = Sync;

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
