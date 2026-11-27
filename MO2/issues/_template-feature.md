# MO2-FEAT-XXXX — <اسم الميزة>

> قالب موحّد لكل ميزة جديدة أو تعديل سلوك قائم في **MO2 Loyalty App**.
> انسخ باسم `MO2-FEAT-<رقم>-<slug>.md` داخل `MO2/issues/`.

---

## 1. البيانات الأساسية

| الحقل | القيمة |
|---|---|
| **الرقم** | MO2-FEAT-XXXX |
| **المشروع** | MO2 Loyalty App |
| **العنوان** | |
| **النوع** | ميزة جديدة · تعديل سلوك قائم · تحسين أداء · تقني/ديون |
| **الأولوية** | P0 · P1 · P2 · P3 · P4 |
| **الحالة** | open · in-progress · review · done · rejected |
| **الطلب** | من (عميل / تاجر / صاحب المشروع) |
| **التاريخ** | YYYY-MM-DD |
| **الفرع** | `feat/...` من `main` |

---

## 2. القيمة والسبب التجاري

- **المشكلة التي يحلها:**
- **النتيجة المتوقعة:** (قابلة للقياس)
- **لو تأجل، ما الضرر:**

> ⛔ لو الطلب يحتاج قرار **نطاق أو تسعير أو تعاقد** → القسم 7 إجباري قبل أي كود.

---

## 3. المتطلبات (Requirements)

**يجب أن يفعل (Must):**
1.
2.

**خارج النطاق (Out of scope):**
-

**قواعد العمل الدقيقة:**
> اكتب القواعد بالأرقام والحالات الحدية (مثال: حدود النقاط، نسبة التحويل، مدة الصلاحية، صلاحيات الأدوار).

---

## 4. معايير القبول (Acceptance Criteria) — إجبارية قبل التنفيذ

- [ ] **AC1:** (سلوك API / UI ملموس قابل للاختبار)
- [ ] **AC2:** عزل تام بين الـ Tenants (`tenant_id = $n::uuid` + 404 على موارد Tenant آخر)
- [ ] **AC3:** إذا مسّت الواجهة: دعم عربي RTL / إنجليزي LTR عبر `UI/src/services/translations.ts` وألوان `UI/src/theme/tokens.css` (بلا ألوان hex ثابتة أو عربي مكتوب مباشرة في المكون)
- [ ] **AC4:** الحالات الحدية: صفر · سالب · رصيد غير كافٍ · طلب مكرر (idempotency) · مدخلات غير صالحة (Zod `400`)

---

## 5. الأثر التقني

| البُعد | التقييم |
|---|---|
| **الطبقات المتأثرة** | `DB/migrations/` · `routes/` · `middlewares/` · `controllers/` · `services/` · `helpers/` · `UI/src/` |
| **Migration جديدة؟** | ☐ لا ☐ نعم — `DB/migrations/NNN_*.sql` (append-only) + التسجيل في `docker-compose.yml` |
| **المناطق الحساسة** | ☐ `wallet_ledger` ☐ `FOR UPDATE` ☐ عزل `tenant_id` ☐ Auth/OTP/Roles ☐ Webhooks/BullMQ ☐ شبكات/تسويات ☐ `DB/migrations/` |
| **توثيق Swagger و Validation** | هل أُضيف `@swagger` في `routes/` و schema في `middlewares/validate.ts`؟ |
| **الأداء والفهارس** | هل الاستعلام مفهرس على `(tenant_id, ...)` أو يستخدم views (`customer_summary`)؟ |
| **التراجع (Rollback)** | كيف نرجع لو فشل في الإنتاج؟ |

---

## 6. خطة التنفيذ والاختبار

**الـ Skills الموجّهة من `.agents/skills/`:**
- (مثال: `api-design-principles`, `zod-validation-expert`, `database-migrations-sql-migrations`, `better-interface`, `tdd-workflow`)

**خطوات صغيرة قابلة للمراجعة:**
1.
2.

**اختبارات مطلوبة (`backend/src/**/__tests__/`):**
| النوع | الملف | ماذا يغطي |
|---|---|---|
| Pure Helpers | `backend/src/helpers/__tests__/...test.ts` | حسابات وقواعد نقية |
| Services | `backend/src/services/__tests__/...test.ts` | idempotency / عزل / معاملات |
| Security / Controller | `backend/src/controllers/__tests__/...test.ts` | صلاحيات / Zod / 404 |

**أوامر التحقق الإلزامية:**
- `cd backend; npm run build; npm test`
- `cd UI; npm run lint; npm run build`

---

## 7. قرار النطاق / التسعير (عند طلب عميل)

| البند | القرار |
|---|---|
| ما هو داخل العقد الحالي؟ | |
| ما يحتاج إضافة مدفوعة؟ | |
| تقدير الجهد / الجدول | |
| **موافقة صاحب المشروع** | ☐ موافق ☐ مرفوض — التاريخ: |

---

## 8. سجل الحالة

| التاريخ | من | التغيير |
|---|---|---|
| YYYY-MM-DD | | إنشاء الطلب (`open`) |

---

**إغلاق الميزة يُشترط:** كل AC معلّم ✓ · اختبارات Vitest تغطي المسارات الحساسة · `backend` (`tsc` + `vitest`) و `UI` (`tsc --noEmit` + `vite build`) نظيفة · تمت المزامنة عبر `MO2/scripts/sync_to_github_and_notion.ps1`.
