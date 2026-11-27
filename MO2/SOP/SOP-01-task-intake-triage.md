# SOP-01 — استقبال الطلبات والفرز (Task Intake & Triage)

| | |
|---|---|
| **المشروع** | `MO2 Loyalty App` |
| **الحالة** | معتمد |
| **المالك** | صاحب المشروع |
| **ينطبق على** | كل طلب قادم من صاحب المشروع أو عميل (Tenant) أو وكيل ذكاء اصطناعي |
| **المرجع الأعلى** | `AGENTS.md` — هذا الإجراء لا يُنشئ ولا يُلغي أي قاعدة فيه |
| **الناتج** | ملف قضية واحد داخل `MO2/issues/` باسم `MO2-BUG-XXXX-<slug>.md` أو `MO2-FEAT-XXXX-<slug>.md` |
| **المزامنة** | `MO2/scripts/sync_to_github_and_notion.ps1` |

> **قاعدة هذا الإجراء:** لا يبدأ أي تعديل على `backend/src/` أو `UI/src/` أو `DB/migrations/` قبل تصنيف الطلب عبر هذا الإجراء، إلا لو كان الطلب من نوع **حادثة إنتاج P1** — عندها تبدأ استجابة الحادثة فورًا بالتوازي مع إكمال الفرز.

---

## A. متى يُستخدم هذا الإجراء

يُطبَّق إلزاميًا على كل طلب جديد لم يسبق تصنيفه.

**استثناء وحيد:** طلب صريح وموثّق من صاحب المشروع يحمل تصنيفًا ونطاقًا ومعيار قبول — فيُسجَّل مباشرة بالحالة `open` ويبدأ مساره من قالبه.

### أنواع الطلبات السبعة

| الرمز | النوع | التمييز |
|---|---|---|
| **A** | حادثة إنتاج / خلل حرج | خلل **حاصل فعلًا عند عميل/تاجر في بيئة إنتاج**: توقف، تسريب بيانات بين Tenants، خطأ في رصيد النقاط/الاسترداد، فشل Webhook لـ POS فعلي، أو ثغرة أمنية |
| **B** | عيب عادي | سلوك مخالف للمواصفة، في بيئة تطوير أو اختبار، ولا يوقف عمل تاجر |
| **C** | ميزة جديدة | سلوك غير موجود أصلًا |
| **D** | تعديل سلوك قائم | السلوك موجود ويعمل، والمطلوب تغييره |
| **E** | Refactoring / ديون تقنية | تغيير داخلي بلا تغيير في السلوك المرئي |
| **F** | بحث أو سؤال معلوماتي | لا يُنتج كودًا؛ ناتجه وثيقة أو إجابة مسنَدة |
| **G** | طلب عميل بنطاق أو تسعير | يحتاج قرار تجاري قبل أي كود |

**فاصل حاسم بين A و B:** هل يوجد تاجر أو عميل متأثر الآن في الإنتاج؟ إن نعم ← **A**. إن كان الخلل في التطوير/الاختبار فقط ← **B**.

---

## B. المدخلات المطلوبة

### B.1 إلزامية لكل طلب

| الحقل | مصدره في القالب | ملاحظة |
|---|---|---|
| وصف الطلب ومصدره | `العنوان` + `المُبلّغ / الطلب` | |
| المشروع | `MO2 Loyalty App` | ثابت لكل تذاكر هذا المستودع |
| نوع الطلب (A–G) | `النوع` | ناتج عن هذا الإجراء |
| الأولوية | `الأولوية` | حسب القسم D (`P0`..`P4`) |
| السطح المتأثر | `السطح / المسارات` | Customer PWA · Admin · Cashier · SuperAdmin · Backend API · Worker · DB |
| المسار التالي | القسم C | |

### B.2 إلزامية حسب نوع الطلب

| النوع | إضافات إلزامية |
|---|---|
| **A** | الأثر على الإنتاج · الـ Tenants المتأثرة · هل تأثر `wallet_ledger` أو أرصدة أو أمان |
| **B** | خطوات إعادة الإنتاج · النتيجة المتوقعة مقابل الفعلية · التكرار · الـ `tenant` (slug/UUID) والدور |
| **C · D · E** | معايير القبول (AC) بصيغة قابلة للاختبار |
| **F** | السؤال الدقيق والمصدر المطلوب الرجوع إليه |
| **G** | بنود الباقة/العقد · ما هو مشمول · ما يحتاج إضافة مدفوعة |

---

## C. التصنيف والتوجيه

| النوع | الأولوية الافتراضية | الإجراء التالي | القالب | موافقة صاحب المشروع مطلوبة |
|---|---|---|---|---|
| **A** حادثة إنتاج | **P1** | احتواء فوري + `SOP-02` بالتوازي | `_template-bug.md` (`MO2-BUG-XXXX`) | ✅ إلزامية قبل أي تغيير كود |
| **B** عيب عادي | P2 / P3 | `SOP-02` | `_template-bug.md` (`MO2-BUG-XXXX`) | ❌ لا، إلا لو مسّ منطقة حساسة (§E) |
| **C** ميزة جديدة | P3 | تصميم/تفويض (`mo2-delegation`) | `_template-feature.md` (`MO2-FEAT-XXXX`) أو `DELEG` | ✅ قبل التنفيذ + معايير القبول |
| **D** تعديل سلوك | P2 / P3 | تحليل الأثر + تنفيذ | `_template-feature.md` (`MO2-FEAT-XXXX`) | ✅ — لأن السلوك الحالي قد يكون مقصودًا |
| **E** ديون تقنية | P4 | تنفيذ منضبط | `_template-feature.md` (`MO2-FEAT-XXXX`) | ❌ للعناصر البسيطة، ✅ للتي تمس بنية النظام |
| **F** بحث | P4 | **بلا كود** | `_template-feature.md` اختياري | ❌ |
| **G** طلب عميل | يُحدَّد بعد النطاق | حسم النطاق أولًا (القسم 7) | `_template-feature.md` + القسم 7 | ✅ إلزامية قبل أي كود |

---

## D. تعريفات الأولوية

الأولوية تُشتق من **الأثر**، لا من نبرة الطلب:

| الأولوية | المعيار الحاكم | أمثلة في MO2 Loyalty |
|---|---|---|
| **P0 / P1** | خلل شاغل في الإنتاج، أو خطر سلامة بيانات/أرصدة/عزل/أمان | تسريب بين Tenants · تخطي `LedgerService.insert` · كسر Webhook HMAC · تعطل OTP/Auth · كشف سر/JWT |
| **P2** | مسار أساسي معطّل **وبلا** حل بديل، ولا يوجد عميل متوقف الآن | فشل استرداد مكافأة · فشل تسجيل نقاط طلب POS · كسر شاشة الكاشير أو لوحة المدير |
| **P3** | خلل أو تحسين **له** حل بديل، أو عيب محدود الأثر | خلل تنسيق RTL/UI · بطء استعلام تقرير · نص ناقص في `translations.ts` |
| **P4** | لا أثر على العمل اليومي؛ ديون تقنية، بحث، أو تحسين مستقبلي | تنظيف كود · رفع تغطية Vitest · توثيق |

---

## E. قواعد التوقف والسؤال (المناطق الحساسة لـ MO2)

> **تمييز أساسي:** التشخيص للقراءة فقط (فحص، بحث، قراءة سجلات، كتابة اختبار Vitest فاشل) **مسموح دائمًا**. ما يحتاج موافقة هو **التنفيذ** الذي يغيّر سلوكًا أو بيانات.

### E.1 يتوقف قبل التنفيذ — المناطق الحساسة في MO2

| المنطقة | يُسمح بالقراءة والتشخيص | يتطلب موافقة صاحب المشروع قبل التنفيذ |
|---|---|---|
| **`wallet_ledger` والرصيد والانتهاء** | فحص `services/ledger.ts`، `services/expiry.ts`، `services/loyalty.ts` | أي تغيير في قواعد الكسب/الخصم/الاسترداد/FIFO أو تجاوز `LedgerService.insert` + `idempotency_key` |
| **أقفال التزامن (`FOR UPDATE`)** | تتبع معاملات `BEGIN/COMMIT/ROLLBACK` | تعديل منطق قفل الصفوف في `redeemReward` أو `adjustPoints` أو `cashierProcessRedemption` |
| **عزل Multi-Tenancy** | مراجعة فلاتر `tenant_id = $n::uuid` و `deleted_at IS NULL` و `resolveTenantId()` | أي استعلام يقرأ عبر أكثر من Tenant (خارج `networks` / `superadmin`) |
| **المصادقة والصلاحيات و `branch_id`** | فحص `middlewares/auth.ts`، `services/otp.ts`، أدوار `owner/manager/cashier/superadmin` | أي تغيير في JWT، OTP hashing، `requireRole`، `requireSubscription`، أو عزل فروع الكاشير |
| **Webhooks و BullMQ** | فحص `webhookController.ts` و `webhookProcessor.ts` و `pos/` | تغيير التحقق من HMAC (`timingSafeEqual`) أو سياسة الـ fail-closed أو retries |
| **الشبكات والتسويات العابرة** | فحص `services/network.ts` وجداول الشبكات | تغيير أسعار الصرف أو قيود التسوية المالية |
| **`DB/migrations/`** | قراءة `DB/schema.sql` و `DB/migrations/*.sql` | **أي** تعديل على migration مطبّقة ممنوع (`AGENTS.md` §4.3)؛ الجديد يكون append-only ويُسجَّل في `docker-compose.yml` |

### E.2 قاعدة التعارض مع وكيل آخر

قبل تعديل أي ملف: افحص `git status -sb` وملف [INTEGRATION_LOCK.md](file:///g:/development/Loyality%20Project/MO2/INTEGRATION_LOCK.md). إن كان الفرع مقفولًا أو الملف معدَّلًا من وكيل آخر ← **توقّف وأبلغ**.

---

## F. مسموح وممنوع أثناء الفرز

- **مسموح بلا موافقة:** القراءة والبحث (`rg`)، تشغيل `npm test` أو `tsc --noEmit` للقراءة فقط، إنشاء وتحديث ملف التذكرة في `MO2/issues/`، أو أوامر Git للقراءة (`status`, `log`, `diff`).
- **ممنوع أثناء الفرز:** تعديل `backend/src/` أو `UI/src/` أو `DB/` (إلا P1 باحتواء معتمد)، تعديل migration قديمة أو `DB/schema.sql`، `git reset`/`git clean`/`git push --force`، أو لصق أرقام هواتف/OTP/أسرار حقيقية في التذاكر.

---

## G. خريطة التوجيه للـ Skills الموجودة (Multi-Skill Stacking)

> **قاعدة التجميع (Stacking Rule):** لا تعتمد على skill واحدة عامة إذا كان هناك مهارات متكاملة في `.agents/skills/`. اجمع **2–4 مهارات** تغطي: (1) النطاق/المعمارية، (2) حزمة الاختبار، (3) الأمان والعزل، و(4) التحقق.

| نوع العمل | حزمة الـ Skills المعتمدة (Stack) |
|---|---|
| **الفرز والتخطيط** | `ask-questions-if-underspecified` · `concise-planning` · `writing-plans` · `product-design` |
| **تتبع الأخطاء (SOP-02)** | `mo2-bug-hunt` + `systematic-debugging` + `phase-gated-debugging` + `bug-hunter` + `find-bugs` + `mock-hunter` |
| **اختبار الباك إند والمنطق (Unit/TDD)** | `vitest` + `tdd-workflow` + `test-driven-development` + `javascript-testing-patterns` + `unit-testing-test-generate` + `pypict-skill` + `mutation-testing` |
| **اختبار الأمان والعزل (Security/API)** | `api-security-testing` + `idor-testing` + `sql-injection-testing` + `web-security-testing` + `api-testing-observability-api-mock` |
| **اختبار الواجهة و E2E والأداء** | `react-testing` + `playwright-best-practices` + `e2e-testing-patterns` + `webapp-testing` + `screen-reader-testing` + `state-machine` + `break` + `k6-load-testing` |
| **إصلاح الاختبارات المكسورة** | `test-fixing` + `test-automator` + `tdd-orchestrator` |
| **قواعد البيانات والـ Multi-Tenancy** | `database-migrations-sql-migrations` + `postgres-best-practices` + `postgresql` + `saas-multi-tenant` |
| **الباك إند والأمان والـ API** | `api-design-principles` + `api-endpoint-builder` + `zod-validation-expert` + `backend-security-coder` + `auth-implementation-patterns` + `007` |
| **التفويض والمراجعة وتقليل التوكنز** | `mo2-delegation` + `opencode-delegate` + `differential-review` + `fix-review` + `code-review-checklist` + `using-git-worktrees` + `subagent-orchestrator` |
| **الواجهة والـ RTL والأنيميشن** | `better-interface` + `better-ui` + `better-layout` + `motion` + `i18n-localization` + `impeccable` |
| **التحقق والرفع** | `verification-before-completion` + `lint-and-validate` + `codebase-audit-pre-push` + `commit` + `git-pushing` |
| **إدارة وتدقيق المهارات** | `skill-router` · `project-skill-audit` |

---

## H. دورة الحياة والمزامنة مع GitHub و Notion

`open → in-progress → review → done` (أو `rejected` مع ذكر السبب).

- كل انتقال يُحدَّث داخل حقل `الحالة` في القسم 1 ويُسجَّل بصف في القسم 8 (سجل الحالة).
- **إلزام المزامنة:** بعد إنشاء أو تحديث أو إغلاق أي تذكرة في `MO2/issues/` أو `MO2/delegation/`، شغّل:

```powershell
# مزامنة تذكرة واحدة (المشروع: MO2 Loyalty App):
powershell -ExecutionPolicy Bypass -File "MO2/scripts/sync_to_github_and_notion.ps1" -File "MO2/issues/MO2-BUG-0001-example.md"

# مزامنة كل التذاكر دفعة واحدة:
powershell -ExecutionPolicy Bypass -File "MO2/scripts/sync_to_github_and_notion.ps1" -All
```
