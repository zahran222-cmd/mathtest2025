/* ============================================================
   رحلة الرياضيات — auth.js
   حسابات المعلمين المتعددة: إنشاء، دخول، تغيير كلمة المرور، حماية اللوحة
   كل معلم على هذا الجهاز له رقم واسم مستخدم وكلمة مرور وبيانات طلاب مستقلة.
   ============================================================ */
(function (global) {
  'use strict';

  var MJ = global.MJ = global.MJ || {};
  var U = MJ.Utils, S = MJ.Storage;

  var currentId = null;

  function clean(v) { return String(v === undefined || v === null ? '' : v).trim(); }

  var Auth = {
    isLoggedIn: function () { return currentId !== null && !!S.getTeacher(currentId); },

    current: function () { return currentId ? S.getTeacher(currentId) : null; },

    /* أسماء الحسابات المسجّلة على هذا الجهاز (لعرضها في شاشة الدخول) */
    accounts: function () {
      return S.getTeachers().map(function (t) {
        return { id: t.id, number: t.number, username: t.username, displayName: t.displayName };
      });
    },

    login: function (userOrNumber, password) {
      var q = clean(userOrNumber);
      if (!q) return { ok: false, message: 'اكتب اسم المستخدم أو رقم المعلم.' };
      var t = S.findTeacher(q);
      if (!t) return { ok: false, message: 'لا يوجد حساب بهذا الاسم أو الرقم على هذا الجهاز.' };
      if (U.hashString(clean(password)) !== t.passwordHash) {
        return { ok: false, message: 'كلمة المرور غير صحيحة.' };
      }
      currentId = t.id;
      S.setActiveTeacher(t.id);
      if (MJ.OwnBank) MJ.OwnBank.registerAll(t.id);   // إتاحة بنوك المعلم الخاصة
      return { ok: true, message: 'أهلًا بك ' + t.displayName + '.', teacher: t };
    },

    logout: function () {
      currentId = null;
      S.setActiveTeacher(null);
    },

    /* إنشاء حساب معلم جديد على هذا الجهاز */
    register: function (o) {
      o = o || {};
      var displayName = clean(o.displayName);
      var username = clean(o.username).toLowerCase();
      var password = clean(o.password);
      var confirm = clean(o.confirm);

      if (displayName.length < 3) return { ok: false, message: 'اكتب اسم المعلم كاملًا (3 أحرف على الأقل).' };
      if (username.length < 3) return { ok: false, message: 'اسم المستخدم يجب أن يكون 3 أحرف أو أكثر.' };
      if (/\s/.test(username)) return { ok: false, message: 'اسم المستخدم بدون مسافات.' };
      if (S.findTeacher(username)) return { ok: false, message: 'اسم المستخدم محجوز لحساب آخر على هذا الجهاز.' };
      if (password.length < 4) return { ok: false, message: 'كلمة المرور يجب أن تكون 4 أحرف أو أكثر.' };
      if (password !== confirm) return { ok: false, message: 'تأكيد كلمة المرور لا يطابق كلمة المرور.' };

      var teacher = {
        id: U.uid('tc'),
        number: S.nextTeacherNumber(),
        username: username,
        displayName: displayName,
        passwordHash: U.hashString(password),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      S.saveTeacher(teacher);
      S.resetSettings(teacher.id);
      return { ok: true, teacher: teacher, message: 'تم إنشاء الحساب. رقم المعلم الخاص بك: ' + teacher.number };
    },

    changePassword: function (current, next, confirm) {
      var t = this.current();
      if (!t) return { ok: false, message: 'يجب تسجيل الدخول أولًا.' };
      if (U.hashString(clean(current)) !== t.passwordHash) {
        return { ok: false, message: 'كلمة المرور الحالية غير صحيحة.' };
      }
      next = clean(next);
      if (next.length < 4) return { ok: false, message: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف أو أكثر.' };
      if (next !== clean(confirm)) return { ok: false, message: 'تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة.' };
      if (U.hashString(next) === t.passwordHash) return { ok: false, message: 'اختر كلمة مرور مختلفة عن الحالية.' };

      t.passwordHash = U.hashString(next);
      t.updatedAt = Date.now();
      S.saveTeacher(t);
      return { ok: true, message: 'تم تغيير كلمة المرور بنجاح.' };
    },

    changeUsername: function (next) {
      var t = this.current();
      if (!t) return { ok: false, message: 'يجب تسجيل الدخول أولًا.' };
      next = clean(next).toLowerCase();
      if (next.length < 3) return { ok: false, message: 'اسم المستخدم يجب أن يكون 3 أحرف أو أكثر.' };
      if (/\s/.test(next)) return { ok: false, message: 'اسم المستخدم بدون مسافات.' };
      var other = S.findTeacher(next);
      if (other && other.id !== t.id) return { ok: false, message: 'اسم المستخدم محجوز لحساب آخر.' };
      t.username = next;
      t.updatedAt = Date.now();
      S.saveTeacher(t);
      return { ok: true, message: 'تم تحديث اسم المستخدم.' };
    },

    changeDisplayName: function (next) {
      var t = this.current();
      if (!t) return { ok: false, message: 'يجب تسجيل الدخول أولًا.' };
      next = clean(next);
      if (next.length < 3) return { ok: false, message: 'اكتب اسم المعلم كاملًا.' };
      t.displayName = next;
      t.updatedAt = Date.now();
      S.saveTeacher(t);
      return { ok: true, message: 'تم تحديث اسم المعلم.' };
    },

    /* حذف الحساب الحالي مع كل طلابه ونتائجه */
    deleteAccount: function (password) {
      var t = this.current();
      if (!t) return { ok: false, message: 'يجب تسجيل الدخول أولًا.' };
      if (U.hashString(clean(password)) !== t.passwordHash) {
        return { ok: false, message: 'كلمة المرور غير صحيحة، لم يُحذف الحساب.' };
      }
      if (S.getTeachers().length <= 1) {
        return { ok: false, message: 'لا يمكن حذف الحساب الوحيد على هذا الجهاز.' };
      }
      S.removeTeacher(t.id);
      this.logout();
      return { ok: true, message: 'تم حذف الحساب وجميع بياناته.' };
    },

    guard: function () {
      if (!this.isLoggedIn()) {
        MJ.Effects.toast('لوحة المعلم تتطلب تسجيل الدخول.', 'warn');
        MJ.App.show('teacher-login');
        return false;
      }
      return true;
    }
  };

  MJ.Auth = Auth;

  if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
