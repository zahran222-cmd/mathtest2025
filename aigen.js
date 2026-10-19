/* ============================================================
   رحلة التعلّم — aigen.js
   توليد بنك أسئلة لأي مادة وأي موضوع بالذكاء الاصطناعي.

   المعلم يكتب: المادة + الصف + الموضوع (واختياريًّا نص الدرس)،
   فيصل الطلب إلى خادمه على Cloudflare حيث يقيم المفتاح بأمان،
   ويعود بأسئلة تُفحص آليًا قبل عرضها عليه لاعتمادها.

   المفتاح لا يصل إلى متصفح أحد إطلاقًا.
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var U = MJ.Utils, S = MJ.Storage;

  var AI = {
    /* فحص آلي صارم للأسئلة القادمة من النموذج */
    validate: function (list, subject) {
      var kept = [], dropped = [], seenPrompt = {};

      (list || []).forEach(function (q, i) {
        var line = i + 1;
        var prompt = String(q.prompt || q.question || '').trim();
        var options = (q.options || q.choices || []).map(function (o) { return String(o).trim(); })
          .filter(function (o) { return o !== ''; });
        var ci = Number(q.correct) - 1;

        if (prompt.length < 8) { dropped.push('سؤال ' + line + ': النص قصير جدًا.'); return; }
        if (options.length < 3) { dropped.push('سؤال ' + line + ': الخيارات ناقصة.'); return; }
        if (!(ci >= 0 && ci < options.length)) { dropped.push('سؤال ' + line + ': رقم الإجابة خارج النطاق.'); return; }

        var keyP = U.normalizeArabic(prompt);
        if (seenPrompt[keyP]) { dropped.push('سؤال ' + line + ': مكرر.'); return; }
        seenPrompt[keyP] = true;

        var seen = {}, dup = false;
        options.forEach(function (o) {
          var k = U.normalizeArabic(o);
          if (seen[k]) dup = true;
          seen[k] = true;
        });
        if (dup) { dropped.push('سؤال ' + line + ': خياران متطابقان.'); return; }
        if (/[٠-٩]/.test(prompt + options.join(''))) { dropped.push('سؤال ' + line + ': أرقام عربية هندية.'); return; }

        var level = Number(q.level);
        if (!(level >= 1 && level <= 4)) level = 1 + (i % 4);

        kept.push({
          id: 'ai-' + Date.now().toString(36) + '-' + line,
          level: level,
          category: level === 4 ? 'challenge' : 'own',
          typeName: 'سؤال مولّد',
          kind: 'mcq',
          prompt: prompt,
          angle: null,
          options: options.map(function (t, k) { return { id: 'o' + k, text: t }; }),
          correct: 'o' + ci,
          hint: String(q.hint || '').trim() || 'اقرأ السؤال بتأنٍّ وحدّد المطلوب منه أولًا.',
          explanation: String(q.explanation || '').trim() || 'الإجابة الصحيحة: ' + options[ci] + '.',
          timed: false
        });
      });

      return { questions: kept, dropped: dropped };
    },

    /* الطلب الكامل: إرسال ← فحص ← بنك جاهز للاعتماد */
    generate: function (o) {
      o = o || {};
      var base = MJ.Sync.url();
      if (!base) {
        return global.Promise.reject(new Error('فعّل المزامنة السحابية أولًا من تبويب «مشاركة الصف».'));
      }
      var teacher = MJ.Auth.current();
      if (!teacher) return global.Promise.reject(new Error('يجب تسجيل الدخول أولًا.'));
      if (String(o.topic || '').trim().length < 3) {
        return global.Promise.reject(new Error('اكتب موضوع الدرس بوضوح.'));
      }
      if (typeof global.fetch !== 'function') {
        return global.Promise.reject(new Error('هذا المتصفح لا يدعم الاتصال بالخادم.'));
      }

      var ctrl = (typeof global.AbortController === 'function') ? new global.AbortController() : null;
      var timer = global.setTimeout(function () { if (ctrl) ctrl.abort(); }, 90000);
      var self = this;

      return global.fetch(base.replace(/\/+$/, '') + '/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl ? ctrl.signal : undefined,
        body: JSON.stringify({
          key: MJ.Share.classKeyOf(teacher.id),
          token: MJ.Sync.tokenOf(teacher.id),
          subject: o.subject || '',
          grade: o.grade || '',
          topic: o.topic,
          notes: o.notes || '',
          level: o.level || 'متدرّج',
          count: Math.min(60, Math.max(5, Number(o.count) || 30))
        })
      }).then(function (res) {
        global.clearTimeout(timer);
        return res.json().then(function (data) {
          if (!res.ok || !data.ok) throw new Error(data && data.message ? data.message : 'تعذّر التوليد.');
          return data;
        });
      }, function (err) {
        global.clearTimeout(timer);
        throw new Error(err && err.name === 'AbortError'
          ? 'انتهت مهلة الانتظار. جرّب عددًا أقل من الأسئلة.'
          : 'تعذّر الوصول إلى الخادم. تحقق من الإنترنت ومن عنوان الخادم.');
      }).then(function (data) {
        var checked = self.validate(data.questions, o.subject);
        if (checked.questions.length < 5) {
          throw new Error('لم يجتز الفحص إلا ' + checked.questions.length +
            ' أسئلة، وهذا غير كافٍ. أعد المحاولة أو اكتب الموضوع بتفصيل أوضح.');
        }
        return {
          name: (o.subject ? o.subject + ' · ' : '') + String(o.topic).trim(),
          subject: o.subject || '',
          grade: o.grade || '',
          topic: o.topic,
          provider: data.provider,
          received: data.count,
          questions: checked.questions,
          dropped: checked.dropped
        };
      });
    },

    /* اعتماد البنك المولّد وجعله الدرس النشط */
    publish: function (result) {
      var r = MJ.OwnBank.save({ name: result.name, own: true, questions: result.questions });
      if (r.ok) {
        var s = S.getSettings();
        s.lesson = r.id;
        S.setSettings(s);
      }
      return r;
    }
  };

  MJ.AIGen = AI;

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
